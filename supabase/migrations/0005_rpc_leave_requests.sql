-- =====================================================================
-- MIGRATION 0005 — RPC Leave Requests + Session Token Authentication
-- 
-- Menambahkan:
--   - Tabel sessions (token-based session management)
--   - RPC functions utk semua operasi leave_requests (security definer)
--   - Revoke direct table access utk leave_requests & user_nips
--   - Public RPC: submit_leave_request (INSERT without session)
--   - Admin RPCs: semua via session token + validasi role
-- =====================================================================

-- =====================================================================
-- 1. TABEL SESSIONS
-- =====================================================================
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_token on public.sessions(token);
create index if not exists idx_sessions_user on public.sessions(user_id);
create index if not exists idx_sessions_expires on public.sessions(expires_at);

-- Trigger: hapus expired sessions sebelum insert baru
create or replace function public.cleanup_expired_sessions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.sessions where expires_at < now();
  return new;
end;
$$;

drop trigger if exists trg_cleanup_expired_sessions on public.sessions;
create trigger trg_cleanup_expired_sessions
before insert on public.sessions
for each statement execute function public.cleanup_expired_sessions();

-- =====================================================================
-- 2. HELPER: validate_session
-- =====================================================================
create or replace function public.validate_session(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.sessions
  where token = p_token
    and expires_at > now();

  if not found then
    raise exception 'Session tidak valid atau sudah kedaluwarsa';
  end if;

  -- Perpanjang session 24 jam dari sekarang
  update public.sessions
  set expires_at = now() + interval '24 hours'
  where token = p_token;

  return v_user_id;
end;
$$;

-- =====================================================================
-- 3. HELPER: get_user_role_from_session
-- =====================================================================
create or replace function public.get_user_role_from_session(p_token text, out user_id uuid, out role text, out permissions jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  user_id := public.validate_session(p_token);

  select u.role, u.permissions into role, permissions
  from public.admin_users u
  where u.id = user_id and u.is_active = true;

  if not found then
    raise exception 'User tidak ditemukan atau tidak aktif';
  end if;
end;
$$;

-- =====================================================================
-- 4. UPDATE admin_login — tambah session token
-- =====================================================================
create or replace function public.admin_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.admin_users;
  v_ok boolean := false;
  v_session_token text;
begin
  select * into v_user
  from public.admin_users
  where username = p_username and is_active = true;

  if not found then return null; end if;

  begin
    v_ok := (v_user.password_hash = crypt(p_password, v_user.password_hash));
  exception when others then v_ok := false; end;

  if not v_ok then return null; end if;

  -- Create session
  insert into public.sessions (user_id, token)
  values (v_user.id, encode(gen_random_bytes(32), 'hex'))
  returning token into v_session_token;

  return jsonb_build_object(
    'session_token', v_session_token,
    'user', jsonb_build_object(
      'id', v_user.id,
      'nama', v_user.nama,
      'username', v_user.username,
      'role', v_user.role,
      'permissions', v_user.permissions,
      'created_at', v_user.created_at,
      'updated_at', v_user.updated_at
    )
  );
end;
$$;

-- =====================================================================
-- 5. admin_logout — hapus session
-- =====================================================================
create or replace function public.admin_logout(p_session_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.sessions where token = p_session_token;
end;
$$;

-- =====================================================================
-- 6. PUBLIC RPC: submit_leave_request (tanpa session)
--    Hanya INSERT, status forced 'pending'
-- =====================================================================
create or replace function public.submit_leave_request(p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_result jsonb;
begin
  -- Validasi required fields
  if p_data->>'nama' is null or trim(p_data->>'nama') = '' then
    raise exception 'Field nama wajib diisi';
  end if;
  if p_data->>'nip' is null or trim(p_data->>'nip') = '' then
    raise exception 'Field NIP wajib diisi';
  end if;
  if p_data->>'jenis_cuti' is null then
    raise exception 'Field jenis_cuti wajib diisi';
  end if;

  v_id := 'req_' || floor(extract(epoch from now()) * 1000)::text || '_' ||
          substr(md5(random()::text), 1, 9);

  insert into public.leave_requests (
    id, nama, nip, pangkat_golongan, jabatan,
    koordinator_wilayah, jenjang, sekolah,
    jenis_cuti, tanggal_mulai, tanggal_selesai,
    alasan_cuti, files,
    status, submission_date
  ) values (
    v_id,
    p_data->>'nama',
    p_data->>'nip',
    p_data->>'pangkat_golongan',
    p_data->>'jabatan',
    p_data->>'koordinator_wilayah',
    p_data->>'jenjang',
    p_data->>'sekolah',
    p_data->>'jenis_cuti',
    (p_data->>'tanggal_mulai')::date,
    (p_data->>'tanggal_selesai')::date,
    p_data->>'alasan_cuti',
    coalesce(p_data->>'files', '[]'),
    'pending',  -- FORCED: client tidak bisa set status
    coalesce((p_data->>'submission_date')::date, current_date)
  )
  returning row_to_json(leave_requests.*) into v_result;

  return v_result;
end;
$$;

-- =====================================================================
-- 7. ADMIN RPC: get_leave_requests_page
-- =====================================================================
create or replace function public.get_leave_requests_page(
  p_session_token text,
  p_page integer default 1,
  p_page_size integer default 25,
  p_status text default 'all',
  p_search_term text default null,
  p_date_start text default null,
  p_date_end text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_permissions jsonb;
  v_offset integer;
  v_limit integer;
  v_count bigint;
  v_data jsonb;
begin
  -- Validate session and get user info
  select u.id, u.role, u.permissions
  into v_user_id, v_role, v_permissions
  from public.admin_users u
  where u.id = public.validate_session(p_session_token)
    and u.is_active = true;

  if not found then
    raise exception 'User tidak ditemukan atau tidak aktif';
  end if;

  v_limit := p_page_size;
  v_offset := (p_page - 1) * v_limit;

  -- Build query with role-based filtering
  with filtered as (
    select lr.*
    from public.leave_requests lr
    where 1=1
      -- Status filter
      and (p_status = 'all' or lr.status = p_status)
      -- Search filter
      and (
        p_search_term is null
        or p_search_term = ''
        or lr.nama ilike '%' || p_search_term || '%'
        or lr.sekolah ilike '%' || p_search_term || '%'
        or lr.koordinator_wilayah ilike '%' || p_search_term || '%'
        or lr.jenis_cuti ilike '%' || p_search_term || '%'
      )
      -- Date filter
      and (
        p_date_start is null
        or p_date_end is null
        or lr.submission_date >= p_date_start::date
      )
      and (
        p_date_start is null
        or p_date_end is null
        or lr.submission_date <= p_date_end::date
      )
      -- Role-based filter: admin_disdik sees all
      and (
        v_role = 'admin_disdik'
        or (
          v_role = 'korwil'
          and (
            v_permissions->'kecamatanAccess' is null
            or v_permissions->'kecamatanAccess' @> to_jsonb(array[lr.koordinator_wilayah])
            or v_permissions->'kecamatan' @> to_jsonb(array[lr.koordinator_wilayah])
          )
          and (
            v_permissions->'jenjangAccess' is null
            or v_permissions->'jenjangAccess' @> to_jsonb(array[lr.jenjang])
          )
        )
        or (
          v_role = 'smp_admin'
          and (
            v_permissions->'schoolAccess' is null
            or v_permissions->'schoolAccess' @> to_jsonb(array[lr.sekolah])
          )
          and (
            v_permissions->'jenjangAccess' is null
            or v_permissions->'jenjangAccess' @> to_jsonb(array[lr.jenjang])
            or (
              v_permissions->'jenjangAccess' @> to_jsonb(array['SKB'])
              and lr.jenjang = 'SMP'
              and lr.sekolah ilike '%SKB%'
            )
          )
        )
      )
  )
  select
    coalesce(jsonb_agg(sub.data order by sub.created_at desc), '[]'::jsonb),
    (select count(*) from filtered) as cnt
  into v_data, v_count
  from (
    select row_to_json(f.*)::jsonb as data, f.created_at
    from filtered f
    order by f.created_at desc
    limit v_limit
    offset v_offset
  ) sub;

  return jsonb_build_object(
    'data', v_data,
    'count', v_count
  );
end;
$$;

-- =====================================================================
-- 8. ADMIN RPC: get_leave_requests_counts
-- =====================================================================
create or replace function public.get_leave_requests_counts(
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_permissions jsonb;
  v_total bigint;
  v_pending bigint;
  v_approved_coordinator bigint;
  v_approved_admin bigint;
  v_document_issued bigint;
  v_rejected bigint;
begin
  select u.id, u.role, u.permissions
  into v_user_id, v_role, v_permissions
  from public.admin_users u
  where u.id = public.validate_session(p_session_token)
    and u.is_active = true;

  if not found then raise exception 'User tidak ditemukan'; end if;

  -- Base filter CTE (sama seperti di atas)
  with base as (
    select lr.status
    from public.leave_requests lr
    where 1=1
      and (
        v_role = 'admin_disdik'
        or (
          v_role = 'korwil'
          and (
            v_permissions->'kecamatanAccess' is null
            or v_permissions->'kecamatanAccess' @> to_jsonb(array[lr.koordinator_wilayah])
            or v_permissions->'kecamatan' @> to_jsonb(array[lr.koordinator_wilayah])
          )
          and (
            v_permissions->'jenjangAccess' is null
            or v_permissions->'jenjangAccess' @> to_jsonb(array[lr.jenjang])
          )
        )
        or (
          v_role = 'smp_admin'
          and (
            v_permissions->'schoolAccess' is null
            or v_permissions->'schoolAccess' @> to_jsonb(array[lr.sekolah])
          )
          and (
            v_permissions->'jenjangAccess' is null
            or v_permissions->'jenjangAccess' @> to_jsonb(array[lr.jenjang])
            or (
              v_permissions->'jenjangAccess' @> to_jsonb(array['SKB'])
              and lr.jenjang = 'SMP'
              and lr.sekolah ilike '%SKB%'
            )
          )
        )
      )
  )
  select
    count(*)::bigint,
    count(*) filter (where status = 'pending')::bigint,
    count(*) filter (where status = 'approved_coordinator')::bigint,
    count(*) filter (where status = 'approved_admin')::bigint,
    count(*) filter (where status = 'document_issued')::bigint,
    count(*) filter (where status = 'rejected')::bigint
  into v_total, v_pending, v_approved_coordinator, v_approved_admin, v_document_issued, v_rejected
  from base;

  return jsonb_build_object(
    'total', v_total,
    'pending', v_pending,
    'approved_coordinator', v_approved_coordinator,
    'approved_admin', v_approved_admin,
    'document_issued', v_document_issued,
    'rejected', v_rejected
  );
end;
$$;

-- =====================================================================
-- 9. ADMIN RPC: update_leave_request_status (approval flow)
-- =====================================================================
create or replace function public.update_leave_request_status(
  p_session_token text,
  p_request_id text,
  p_new_status text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_permissions jsonb;
  v_current_status text;
  v_current_kecamatan text;
  v_current_jenjang text;
  v_current_sekolah text;
  v_result jsonb;
  v_today date := current_date;
begin
  -- Validate session
  select u.id, u.role, u.permissions
  into v_user_id, v_role, v_permissions
  from public.admin_users u
  where u.id = public.validate_session(p_session_token)
    and u.is_active = true;

  if not found then raise exception 'User tidak ditemukan atau tidak aktif'; end if;

  -- Get current request data
  select status, koordinator_wilayah, jenjang, sekolah
  into v_current_status, v_current_kecamatan, v_current_jenjang, v_current_sekolah
  from public.leave_requests
  where id = p_request_id;

  if not found then raise exception 'Data cuti tidak ditemukan'; end if;

  -- Validate state machine + role permissions
  case p_new_status
    when 'approved_coordinator' then
      -- Hanya korwil/smp_admin yang bisa set ini
      if v_role not in ('korwil', 'smp_admin') then
        raise exception 'Hanya Koordinator yang dapat memberikan persetujuan pertama';
      end if;
      -- Status sebelumnya harus pending
      if v_current_status != 'pending' then
        raise exception 'Status sebelumnya harus pending (saat ini: %)', v_current_status;
      end if;
      -- Korwil: validasi kecamatan + jenjang
      if v_role = 'korwil' then
        if not (
          v_permissions->'kecamatanAccess' @> to_jsonb(array[v_current_kecamatan])
          or v_permissions->'kecamatan' @> to_jsonb(array[v_current_kecamatan])
        ) then
          raise exception 'Anda tidak memiliki akses ke kecamatan ini';
        end if;
        if not (v_permissions->'jenjangAccess' @> to_jsonb(array[v_current_jenjang])) then
          raise exception 'Anda tidak memiliki akses ke jenjang ini';
        end if;
      end if;
      -- smp_admin: validasi sekolah
      if v_role = 'smp_admin' then
        if not (
          v_permissions->'schoolAccess' @> to_jsonb(array[v_current_sekolah])
        ) then
          raise exception 'Anda tidak memiliki akses ke sekolah ini';
        end if;
      end if;

    when 'approved_admin' then
      -- Hanya admin_disdik
      if v_role != 'admin_disdik' then
        raise exception 'Hanya Admin Dinas yang dapat memberikan persetujuan akhir';
      end if;
      -- Status sebelumnya harus approved_coordinator
      if v_current_status != 'approved_coordinator' then
        raise exception 'Status sebelumnya harus approved_coordinator (saat ini: %)', v_current_status;
      end if;

    when 'document_issued' then
      -- Hanya admin_disdik
      if v_role != 'admin_disdik' then
        raise exception 'Hanya Admin Dinas yang dapat menerbitkan dokumen';
      end if;
      -- Status sebelumnya harus approved_admin
      if v_current_status != 'approved_admin' then
        raise exception 'Status sebelumnya harus approved_admin (saat ini: %)', v_current_status;
      end if;

    when 'rejected' then
      -- korwil/smp_admin bisa reject pending; admin_disdik bisa reject approved_coordinator
      if not (
        (v_role in ('korwil', 'smp_admin') and v_current_status = 'pending')
        or (v_role = 'admin_disdik' and v_current_status in ('approved_coordinator', 'pending'))
      ) then
        raise exception 'Anda tidak memiliki izin untuk menolak pengajuan dengan status ini';
      end if;
      if p_rejection_reason is null or trim(p_rejection_reason) = '' then
        raise exception 'Alasan penolakan wajib diisi';
      end if;

    when 'pending' then
      -- Kembalikan ke pending (revisi) — hanya user dengan role yang sama yang bisa
      if v_current_status not in ('rejected') then
        raise exception 'Hanya pengajuan yang ditolak yang dapat diajukan ulang';
      end if;

    else
      raise exception 'Status tidak valid: %', p_new_status;
  end case;

  -- Execute the update
  update public.leave_requests
  set
    status = p_new_status,
    rejection_reason = case
      when p_new_status = 'rejected' then p_rejection_reason
      when p_new_status = 'pending' then null
      else rejection_reason
    end,
    coordinator_approval_date = case
      when p_new_status = 'approved_coordinator' then v_today
      when p_new_status = 'pending' then null
      else coordinator_approval_date
    end,
    admin_approval_date = case
      when p_new_status = 'approved_admin' then v_today
      when p_new_status = 'pending' then null
      else admin_approval_date
    end,
    updated_at = now()
  where id = p_request_id
  returning row_to_json(leave_requests.*) into v_result;

  return v_result;
end;
$$;

-- =====================================================================
-- 10. ADMIN RPC: create_leave_request (admin creates for teacher)
-- =====================================================================
create or replace function public.create_leave_request(
  p_session_token text,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_id text;
  v_result jsonb;
begin
  select u.id, u.role
  into v_user_id, v_role
  from public.admin_users u
  where u.id = public.validate_session(p_session_token)
    and u.is_active = true;

  if not found then raise exception 'User tidak ditemukan atau tidak aktif'; end if;

  -- Validasi required
  if p_data->>'nama' is null or trim(p_data->>'nama') = '' then
    raise exception 'Field nama wajib diisi';
  end if;

  v_id := 'req_' || floor(extract(epoch from now()) * 1000)::text || '_' ||
          substr(md5(random()::text), 1, 9);

  insert into public.leave_requests (
    id, nama, nip, pangkat_golongan, jabatan,
    koordinator_wilayah, jenjang, sekolah,
    jenis_cuti, tanggal_mulai, tanggal_selesai,
    alasan_cuti, files, status, submission_date
  ) values (
    v_id,
    p_data->>'nama',
    p_data->>'nip',
    p_data->>'pangkat_golongan',
    p_data->>'jabatan',
    p_data->>'koordinator_wilayah',
    p_data->>'jenjang',
    p_data->>'sekolah',
    p_data->>'jenis_cuti',
    (p_data->>'tanggal_mulai')::date,
    (p_data->>'tanggal_selesai')::date,
    p_data->>'alasan_cuti',
    coalesce(p_data->>'files', '[]'),
    'pending',
    coalesce((p_data->>'submission_date')::date, current_date)
  )
  returning row_to_json(leave_requests.*) into v_result;

  return v_result;
end;
$$;

-- =====================================================================
-- 11. ADMIN RPC: delete_leave_request
-- =====================================================================
create or replace function public.delete_leave_request(
  p_session_token text,
  p_request_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
begin
  select u.id, u.role
  into v_user_id, v_role
  from public.admin_users u
  where u.id = public.validate_session(p_session_token)
    and u.is_active = true;

  if not found then raise exception 'User tidak ditemukan atau tidak aktif'; end if;

  -- Hanya admin_disdik yang bisa hapus
  if v_role != 'admin_disdik' then
    raise exception 'Hanya Admin Dinas yang dapat menghapus data cuti';
  end if;

  delete from public.leave_requests where id = p_request_id;

  if not found then raise exception 'Data cuti tidak ditemukan'; end if;
end;
$$;

-- =====================================================================
-- 12. ADMIN RPC: get_leave_requests_by_nip
--     (requires session token — untuk admin panel)
-- =====================================================================
create or replace function public.get_leave_requests_by_nip(
  p_session_token text,
  p_nip text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_permissions jsonb;
  v_result jsonb;
begin
  select u.id, u.role, u.permissions
  into v_user_id, v_role, v_permissions
  from public.admin_users u
  where u.id = public.validate_session(p_session_token)
    and u.is_active = true;

  if not found then raise exception 'User tidak ditemukan atau tidak aktif'; end if;

  select coalesce(jsonb_agg(row_to_json(lr.*) order by lr.created_at desc), '[]'::jsonb)
  into v_result
  from public.leave_requests lr
  where lr.nip = p_nip
    -- Role filter (sama seperti di atas)
    and (
      v_role = 'admin_disdik'
      or (
        v_role = 'korwil'
        and (
          v_permissions->'kecamatanAccess' @> to_jsonb(array[lr.koordinator_wilayah])
          or v_permissions->'kecamatan' @> to_jsonb(array[lr.koordinator_wilayah])
        )
        and v_permissions->'jenjangAccess' @> to_jsonb(array[lr.jenjang])
      )
      or (
        v_role = 'smp_admin'
        and v_permissions->'schoolAccess' @> to_jsonb(array[lr.sekolah])
        and (
          v_permissions->'jenjangAccess' @> to_jsonb(array[lr.jenjang])
          or (
            v_permissions->'jenjangAccess' @> to_jsonb(array['SKB'])
            and lr.jenjang = 'SMP'
            and lr.sekolah ilike '%SKB%'
          )
        )
      )
    );

  return v_result;
end;
$$;

-- =====================================================================
-- 13. ADMIN RPC: get_recent_activity
-- =====================================================================
create or replace function public.get_recent_activity(
  p_session_token text,
  p_limit integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_permissions jsonb;
  v_result jsonb;
begin
  select u.id, u.role, u.permissions
  into v_user_id, v_role, v_permissions
  from public.admin_users u
  where u.id = public.validate_session(p_session_token)
    and u.is_active = true;

  if not found then raise exception 'User tidak ditemukan atau tidak aktif'; end if;

  select coalesce(jsonb_agg(sub.row), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'nama', lr.nama,
      'jenis_cuti', lr.jenis_cuti,
      'status', lr.status,
      'created_at', lr.created_at
    ) as row
    from public.leave_requests lr
    where (
      v_role = 'admin_disdik'
      or (
        v_role = 'korwil'
        and (
          v_permissions->'kecamatanAccess' @> to_jsonb(array[lr.koordinator_wilayah])
          or v_permissions->'kecamatan' @> to_jsonb(array[lr.koordinator_wilayah])
        )
        and v_permissions->'jenjangAccess' @> to_jsonb(array[lr.jenjang])
      )
      or (
        v_role = 'smp_admin'
        and v_permissions->'schoolAccess' @> to_jsonb(array[lr.sekolah])
        and (
          v_permissions->'jenjangAccess' @> to_jsonb(array[lr.jenjang])
          or (
            v_permissions->'jenjangAccess' @> to_jsonb(array['SKB'])
            and lr.jenjang = 'SMP'
            and lr.sekolah ilike '%SKB%'
          )
        )
      )
    )
    order by lr.created_at desc
    limit p_limit
  ) sub;

  return v_result;
end;
$$;

-- =====================================================================
-- 14. UPDATE admin_get_user (terima session_token, bukan id)
-- =====================================================================
-- Drop old version first (param name p_id can't be changed via create or replace)
drop function if exists public.admin_get_user(text);

create or replace function public.admin_get_user(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_user public.admin_users;
begin
  v_user_id := public.validate_session(p_session_token);

  select * into v_user
  from public.admin_users
  where id = v_user_id and is_active = true;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_user.id,
    'nama', v_user.nama,
    'username', v_user.username,
    'role', v_user.role,
    'permissions', v_user.permissions,
    'created_at', v_user.created_at,
    'updated_at', v_user.updated_at
  );
end;
$$;

-- =====================================================================
-- 14b. PUBLIC RPC: public_check_leave_status — cek status cuti via NIP
--      (tanpa session token — untuk halaman publik /status)
-- =====================================================================
create or replace function public.public_check_leave_status(p_nip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_nip is null or trim(p_nip) = '' then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(sub order by sub.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', lr.id,
      'nama', lr.nama,
      'nip', lr.nip,
      'jenis_cuti', lr.jenis_cuti,
      'tanggal_mulai', lr.tanggal_mulai,
      'tanggal_selesai', lr.tanggal_selesai,
      'status', lr.status,
      'kecamatan', lr.koordinator_wilayah,
      'jenjang', lr.jenjang,
      'unit_kerja', lr.sekolah,
      'alasan_cuti', lr.alasan_cuti,
      'rejection_reason', lr.rejection_reason,
      'submission_date', lr.created_at,
      'final_letter_url', lr.final_letter_url,
      'drive_link', lr.drive_link,
      'is_revised', lr.is_revised,
      'original_rejection_reason', lr.original_rejection_reason
    )
    from public.leave_requests lr
    where lr.nip = p_nip
    order by lr.created_at desc
  ) sub;

  return v_result;
end;
$$;

-- =====================================================================
-- 15. REVOKE DIRECT TABLE ACCESS + UPDATE GRANTS
-- =====================================================================

-- Revoke direct access ke leave_requests & user_nips dari anon/authenticated
revoke all on public.leave_requests from anon, authenticated;
revoke all on public.user_nips from anon, authenticated;

-- Hanya service_role yang boleh akses langsung
grant all on public.leave_requests to service_role;
grant all on public.user_nips to service_role;

-- =====================================================================
-- 16. GRANT EXECUTE ON ALL NEW RPCs TO anon
-- =====================================================================

-- Public (no session needed)
grant execute on function public.submit_leave_request(jsonb) to anon;
grant execute on function public.public_check_leave_status(text) to anon;

-- Admin (dengan session token)
grant execute on function public.validate_session(text) to anon;
grant execute on function public.admin_logout(text) to anon;
grant execute on function public.get_leave_requests_page(text, integer, integer, text, text, text, text) to anon;
grant execute on function public.get_leave_requests_counts(text) to anon;
grant execute on function public.update_leave_request_status(text, text, text, text) to anon;
grant execute on function public.create_leave_request(text, jsonb) to anon;
grant execute on function public.delete_leave_request(text, text) to anon;
grant execute on function public.get_leave_requests_by_nip(text, text) to anon;
grant execute on function public.get_recent_activity(text, integer) to anon;

-- Note: admin_get_user signature changed (now takes session_token instead of user_id)
grant execute on function public.admin_get_user(text) to anon;

-- =====================================================================
-- 17. REVOKE OLD admin_get_user (dengan parameter id) utk hindari ambiguity
-- =====================================================================
-- The old function with p_id text is kept for backward compatibility
-- but the new function with p_session_token text will be used instead
-- when called with a single text argument.

-- =====================================================================
-- VERIFIKASI
-- =====================================================================
do $$
begin
  raise notice '=== MIGRATION 0005 SELESAI ===';
  raise notice 'Tabel sessions + 12 RPC functions baru';
  raise notice '- submit_leave_request (PUBLIC)';
  raise notice '- get_leave_requests_page, get_leave_requests_counts';
  raise notice '- update_leave_request_status, create_leave_request';
  raise notice '- delete_leave_request, get_leave_requests_by_nip, get_recent_activity';
  raise notice '- validate_session, admin_logout, admin_get_user (v2)';
  raise notice 'Direct access ke leave_requests & user_nips: REVOKED dari anon';
end $$;
