-- =====================================================================
-- MIGRATION 0008 — Fix Admin Dinas Reject Permission
-- 
-- Masalah: Tombol "Revisi" di EnhancedAdminPanel tidak bisa digunakan
-- karena validasi di update_leave_request_status tidak mengizinkan
-- admin_disdik untuk reject dari status 'approved_admin'
--
-- Solusi: Tambahkan 'approved_admin' ke daftar status yang boleh
-- di-reject oleh admin_disdik
-- =====================================================================

-- =====================================================================
-- FIX: update_leave_request_status — izinkan reject dari approved_admin
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
      -- korwil/smp_admin bisa reject pending
      -- admin_disdik bisa reject dari pending, approved_coordinator, ATAU approved_admin (revisi)
      if not (
        (v_role in ('korwil', 'smp_admin') and v_current_status = 'pending')
        or (v_role = 'admin_disdik' and v_current_status in ('pending', 'approved_coordinator', 'approved_admin'))
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
-- VERIFIKASI
-- =====================================================================
do $$
begin
  raise notice '=== MIGRATION 0008 SELESAI ===';
  raise notice 'Fix: Admin Dinas sekarang bisa reject dari status approved_admin';
  raise notice 'Tombol "Revisi" di EnhancedAdminPanel sekarang berfungsi';
end $$;
