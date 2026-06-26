-- =====================================================================
-- Migration 0007: Fix public_check_leave_status
-- 
-- Masalah: fungsi lama mengembalikan kolom dengan nama berbeda
-- (kecamatan, unit_kerja) sehingga tidak cocok dengan LeaveRequestDB
-- di frontend, menyebabkan data tidak ter-render dengan benar.
--
-- Solusi: gunakan row_to_json(lr.*) agar semua kolom dikembalikan
-- dengan nama asli dari tabel, sama seperti RPC lainnya.
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

  select coalesce(jsonb_agg(row_to_json(lr.*)::jsonb order by lr.created_at desc), '[]'::jsonb)
  into v_result
  from public.leave_requests lr
  where lr.nip = p_nip;

  return v_result;
end;
$$;

-- Grant tetap dipertahankan (sudah ada dari migration 0005)
grant execute on function public.public_check_leave_status(text) to anon;

do $$
begin
  raise notice '=== MIGRATION 0007 SELESAI ===';
  raise notice 'public_check_leave_status sekarang mengembalikan row_to_json(lr.*)';
end $$;
