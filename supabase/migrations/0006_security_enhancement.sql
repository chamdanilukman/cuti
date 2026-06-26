-- =====================================================================
-- MIGRATION 0006 — Security Enhancement: Rate Limit, Audit Log, Admin Users
--
-- 1. Rate limiting di admin_login (5x gagal = lock 15 menit)
-- 2. Audit log untuk approval/rejection
-- 3. Session tracking (login/logout time per admin)
-- 4. Tambah 2 admin_disdik baru: Ilham Kustiyani, Pujiyono
-- 5. Force password change untuk admin baru
-- =====================================================================

-- =====================================================================
-- 1. TAMBAH KOLOM RATE LIMITING + PASSWORD CHANGE DI admin_users
-- =====================================================================
alter table public.admin_users add column if not exists login_attempts integer not null default 0;
alter table public.admin_users add column if not exists locked_until timestamptz;
alter table public.admin_users add column if not exists password_must_change boolean not null default false;
alter table public.admin_users add column if not exists last_login_at timestamptz;

-- =====================================================================
-- 2. TAMBAH COLUMN logged_out_at DI sessions (untuk tracking logout)
-- =====================================================================
alter table public.sessions add column if not exists logged_out_at timestamptz;

-- =====================================================================
-- 3. TABEL AUDIT LOG
-- =====================================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_users(id),
  admin_nama text not null,
  admin_username text not null,
  action text not null, -- 'approve_coordinator','approve_admin','reject','revise','delete','login','logout'
  request_id text references public.leave_requests(id) on delete set null,
  old_status text,
  new_status text,
  rejection_reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_admin on public.audit_log(admin_id);
create index if not exists idx_audit_log_request on public.audit_log(request_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);
create index if not exists idx_audit_log_action on public.audit_log(action);

-- =====================================================================
-- 4. UPDATE admin_login — tambah rate limiting + reset attempts on success
-- =====================================================================
-- Harus drop dulu karena body berubah
drop function if exists public.admin_login(text, text);

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
  -- Cari user
  select * into v_user
  from public.admin_users
  where username = p_username and is_active = true;

  if not found then
    -- Delay untuk hindari enumerasi username
    perform pg_sleep(1);
    return null;
  end if;

  -- Cek lock
  if v_user.locked_until is not null and v_user.locked_until > now() then
    perform pg_sleep(1);
    return null;
  end if;

  -- Verifikasi password
  begin
    v_ok := (v_user.password_hash = crypt(p_password, v_user.password_hash));
  exception when others then v_ok := false; end;

  if not v_ok then
    -- Increment failed attempts
    update public.admin_users
    set login_attempts = login_attempts + 1,
        locked_until = case
          when login_attempts + 1 >= 5 then now() + interval '15 minutes'
          else locked_until
        end
    where id = v_user.id;
    perform pg_sleep(1);
    return null;
  end if;

  -- Sukses — reset attempts, update last_login
  update public.admin_users
  set login_attempts = 0,
      locked_until = null,
      last_login_at = now()
  where id = v_user.id;

  -- Buat session
  insert into public.sessions (user_id, token)
  values (v_user.id, encode(gen_random_bytes(32), 'hex'))
  returning token into v_session_token;

  -- Log login ke audit
  insert into public.audit_log (admin_id, admin_nama, admin_username, action)
  values (v_user.id, v_user.nama, v_user.username, 'login');

  return jsonb_build_object(
    'session_token', v_session_token,
    'password_must_change', v_user.password_must_change,
    'user', jsonb_build_object(
      'id', v_user.id,
      'nama', v_user.nama,
      'username', v_user.username,
      'role', v_user.role,
      'permissions', v_user.permissions,
      'password_must_change', v_user.password_must_change,
      'created_at', v_user.created_at,
      'updated_at', v_user.updated_at
    )
  );
end;
$$;

-- =====================================================================
-- 5. UPDATE admin_logout — catat logged_out_at (bukan delete)
-- =====================================================================
drop function if exists public.admin_logout(text);

create or replace function public.admin_logout(p_session_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_nama text;
  v_username text;
begin
  -- Dapatkan info user sebelum update
  select s.user_id, u.nama, u.username
  into v_user_id, v_nama, v_username
  from public.sessions s
  join public.admin_users u on u.id = s.user_id
  where s.token = p_session_token and s.logged_out_at is null;

  -- Tandai logout
  update public.sessions
  set logged_out_at = now()
  where token = p_session_token and logged_out_at is null;

  -- Log logout
  if v_user_id is not null then
    insert into public.audit_log (admin_id, admin_nama, admin_username, action)
    values (v_user_id, v_nama, v_username, 'logout');
  end if;
end;
$$;

-- =====================================================================
-- 6. UPDATE update_leave_request_status — tambah audit logging
-- =====================================================================
-- Harus drop dulu karena body berubah
drop function if exists public.update_leave_request_status(text, text, text, text);

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
  v_nama text;
  v_username text;
  v_current_status text;
  v_current_kecamatan text;
  v_current_jenjang text;
  v_current_sekolah text;
  v_result jsonb;
  v_today date := current_date;
  v_action text;
begin
  -- Validate session & get user info
  select u.id, u.role, u.permissions, u.nama, u.username
  into v_user_id, v_role, v_permissions, v_nama, v_username
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
      if v_role not in ('korwil', 'smp_admin') then
        raise exception 'Hanya Koordinator yang dapat memberikan persetujuan pertama';
      end if;
      if v_current_status != 'pending' then
        raise exception 'Status sebelumnya harus pending (saat ini: %)', v_current_status;
      end if;
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
      if v_role = 'smp_admin' then
        if not (v_permissions->'schoolAccess' @> to_jsonb(array[v_current_sekolah])) then
          raise exception 'Anda tidak memiliki akses ke sekolah ini';
        end if;
      end if;
      v_action := 'approve_coordinator';

    when 'approved_admin' then
      if v_role != 'admin_disdik' then
        raise exception 'Hanya Admin Dinas yang dapat memberikan persetujuan akhir';
      end if;
      if v_current_status != 'approved_coordinator' then
        raise exception 'Status sebelumnya harus approved_coordinator (saat ini: %)', v_current_status;
      end if;
      v_action := 'approve_admin';

    when 'document_issued' then
      if v_role != 'admin_disdik' then
        raise exception 'Hanya Admin Dinas yang dapat menerbitkan dokumen';
      end if;
      if v_current_status != 'approved_admin' then
        raise exception 'Status sebelumnya harus approved_admin (saat ini: %)', v_current_status;
      end if;
      v_action := 'document_issued';

    when 'rejected' then
      if not (
        (v_role in ('korwil', 'smp_admin') and v_current_status = 'pending')
        or (v_role = 'admin_disdik' and v_current_status in ('approved_coordinator', 'pending'))
      ) then
        raise exception 'Anda tidak memiliki izin untuk menolak pengajuan dengan status ini';
      end if;
      if p_rejection_reason is null or trim(p_rejection_reason) = '' then
        raise exception 'Alasan penolakan wajib diisi';
      end if;
      v_action := 'reject';

    when 'pending' then
      if v_current_status not in ('rejected') then
        raise exception 'Hanya pengajuan yang ditolak yang dapat diajukan ulang';
      end if;
      v_action := 'revise';

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

  -- Write audit log
  insert into public.audit_log (
    admin_id, admin_nama, admin_username,
    action, request_id, old_status, new_status, rejection_reason
  ) values (
    v_user_id, v_nama, v_username,
    v_action, p_request_id, v_current_status, p_new_status,
    case when p_new_status = 'rejected' then p_rejection_reason else null end
  );

  return v_result;
end;
$$;

-- =====================================================================
-- 7. TAMBAH 2 ADMIN DISDIK BARU
-- =====================================================================

-- Ilham Kustiyani — NIP: 197603032014092002
-- username login: ilham_kustiyani (atau sesuai kebijakan)
insert into public.admin_users (id, username, nama, role, permissions, is_active, password_must_change, password_hash)
values (
  gen_random_uuid(),
  'ilham_kustiyani',
  'Ilham Kustiyani, S.Pd., M.Pd.',
  'admin_disdik',
  '{"canAccessAll": true}'::jsonb,
  true,
  true,
  crypt('admin_disdik', gen_salt('bf', 10))
);

-- Pujiyono — NIP: 197702052014091002
insert into public.admin_users (id, username, nama, role, permissions, is_active, password_must_change, password_hash)
values (
  gen_random_uuid(),
  'pujiyono',
  'Pujiyono, S.Pd., M.M.',
  'admin_disdik',
  '{"canAccessAll": true}'::jsonb,
  true,
  true,
  crypt('admin_disdik', gen_salt('bf', 10))
);

-- =====================================================================
-- 8. SET PASSWORD DEFAULT UNTUK KEDUA ADMIN BARU
-- =====================================================================
-- Password default: `admin_disdik` (harus diganti saat login pertama)
select public.admin_set_password('ilham_kustiyani', 'admin_disdik');
select public.admin_set_password('pujiyono', 'admin_disdik');

-- =====================================================================
-- 9. RPC: change_password — ganti password (validasi old password)
-- =====================================================================
create or replace function public.admin_change_password(
  p_session_token text,
  p_old_password text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_user public.admin_users;
  v_ok boolean := false;
begin
  v_user_id := public.validate_session(p_session_token);

  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'Password baru minimal 6 karakter';
  end if;

  if p_old_password is null or p_old_password = '' then
    raise exception 'Password lama wajib diisi';
  end if;

  -- Verifikasi password lama
  select * into v_user
  from public.admin_users
  where id = v_user_id and is_active = true;

  if not found then raise exception 'User tidak ditemukan'; end if;

  begin
    v_ok := (v_user.password_hash = crypt(p_old_password, v_user.password_hash));
  exception when others then v_ok := false; end;

  if not v_ok then
    raise exception 'Password lama salah';
  end if;

  -- Update password + reset flag
  update public.admin_users
  set password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      password_must_change = false,
      updated_at = now()
  where id = v_user_id;

  -- Log ke audit
  insert into public.audit_log (admin_id, admin_nama, admin_username, action)
  values (v_user.id, v_user.nama, v_user.username, 'change_password');

  return jsonb_build_object('success', true, 'message', 'Password berhasil diubah');
end;
$$;

-- =====================================================================
-- 10. RPC: get_audit_log — lihat audit trail (admin_disdik only)
-- =====================================================================
create or replace function public.get_audit_log(
  p_session_token text,
  p_limit integer default 50,
  p_offset integer default 0,
  p_request_id text default null,
  p_action text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_result jsonb;
begin
  select u.id, u.role
  into v_user_id, v_role
  from public.admin_users u
  where u.id = public.validate_session(p_session_token)
    and u.is_active = true;

  if not found then raise exception 'User tidak ditemukan atau tidak aktif'; end if;

  -- admin_disdik bisa lihat semua; korwil/smp_admin lihat log sendiri
  select coalesce(jsonb_agg(sub order by sub.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select row_to_json(al.*)::jsonb
    from public.audit_log al
    where (v_role = 'admin_disdik' or al.admin_id = v_user_id)
      and (p_request_id is null or al.request_id = p_request_id)
      and (p_action is null or al.action = p_action)
    order by al.created_at desc
    limit p_limit
    offset p_offset
  ) sub;

  return v_result;
end;
$$;

-- =====================================================================
-- 11. RPC: get_session_log — lihat riwayat login/logout (admin sendiri)
-- =====================================================================
create or replace function public.get_session_log(
  p_session_token text,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_role text;
  v_result jsonb;
begin
  select u.id, u.role
  into v_user_id, v_role
  from public.admin_users u
  where u.id = public.validate_session(p_session_token)
    and u.is_active = true;

  if not found then raise exception 'User tidak ditemukan atau tidak aktif'; end if;

  -- admin_disdik bisa lihat semua; korwil/smp_admin lihat sendiri
  select coalesce(jsonb_agg(sub order by sub.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'admin_nama', u.nama,
      'admin_username', u.username,
      'logged_in_at', s.created_at,
      'logged_out_at', s.logged_out_at,
      'is_active', case when s.logged_out_at is null and s.expires_at > now() then true else false end
    )
    from public.sessions s
    join public.admin_users u on u.id = s.user_id
    where (v_role = 'admin_disdik' or s.user_id = v_user_id)
    order by s.created_at desc
    limit p_limit
  ) sub;

  return v_result;
end;
$$;

-- =====================================================================
-- 12. GRANTS
-- =====================================================================
grant execute on function public.admin_change_password(text, text, text) to anon;
grant execute on function public.get_audit_log(text, integer, integer, text, text) to anon;
grant execute on function public.get_session_log(text, integer) to anon;

-- =====================================================================
-- 13. UPDATE client-side types (komentar untuk referensi)
-- =====================================================================
-- Login response sekarang punya field baru: password_must_change (boolean)
-- Client side perlu cek: if result.password_must_change → redirect ke halaman ganti password

-- =====================================================================
-- VERIFIKASI
-- =====================================================================
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.admin_users where role = 'admin_disdik';
  raise notice '=== MIGRATION 0006 SELESAI ===';
  raise notice 'Jumlah Admin Dinas: % (termasuk Ilham Kustiyani & Pujiyono)', v_count;
  raise notice 'Tabel audit_log: siap';
  raise notice 'Rate limiting: 5x gagal = lock 15 menit';
  raise notice 'Password default 1: ilham_kustiyani / admin_disdik';
  raise notice 'Password default 2: pujiyono / admin_disdik';
  raise notice 'WAJIB GANTI PASSWORD SAAT LOGIN PERTAMA!';
end $$;
