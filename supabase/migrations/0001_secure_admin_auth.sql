-- =====================================================================
-- Migration: Secure admin authentication (server-side bcrypt + RLS)
-- Tujuan: memindahkan verifikasi password ke sisi server (database),
--         mengganti "hash" btoa yang lemah, dan menutup akses langsung
--         anon ke tabel admin_users (termasuk password_hash).
--
-- CARA MENJALANKAN:
--   Supabase Dashboard -> SQL Editor -> tempel seluruh isi file ini -> Run.
-- =====================================================================

-- 1) Ekstensi untuk bcrypt (crypt() / gen_salt())
create extension if not exists pgcrypto;

-- 2) Aktifkan Row Level Security & cabut akses langsung anon/authenticated.
--    Setelah ini, ANON_KEY TIDAK bisa lagi membaca/menulis admin_users
--    secara langsung. Semua akses sah dilakukan lewat fungsi RPC di bawah
--    (SECURITY DEFINER) yang tidak pernah membocorkan password_hash.
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon;
revoke all on public.admin_users from authenticated;

-- =====================================================================
-- 3) RPC: admin_login(username, password)
--    Mengembalikan data user (TANPA password_hash) hanya bila password
--    cocok. Mengembalikan NULL untuk user tidak ditemukan / password salah
--    (tidak membedakan keduanya -> mencegah enumerasi username).
-- =====================================================================
create or replace function public.admin_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.admin_users;
  v_ok   boolean := false;
begin
  select * into v_user
  from public.admin_users
  where username = p_username
    and is_active = true;

  if not found then
    return null;
  end if;

  -- Verifikasi bcrypt. Dibungkus exception agar hash lama (format btoa)
  -- yang bukan salt valid tidak melempar error, cukup dianggap gagal.
  begin
    v_ok := (v_user.password_hash = crypt(p_password, v_user.password_hash));
  exception when others then
    v_ok := false;
  end;

  if not v_ok then
    return null;
  end if;

  return jsonb_build_object(
    'id',          v_user.id,
    'nama',        v_user.nama,
    'username',    v_user.username,
    'role',        v_user.role,
    'permissions', v_user.permissions,
    'created_at',  v_user.created_at,
    'updated_at',  v_user.updated_at
  );
end;
$$;

-- =====================================================================
-- 4) RPC: admin_get_user(id)
--    Dipakai oleh refreshUser. Mengembalikan data user TANPA password_hash.
-- =====================================================================
create or replace function public.admin_get_user(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.admin_users;
begin
  select * into v_user
  from public.admin_users
  where id::text = p_id
    and is_active = true;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id',          v_user.id,
    'nama',        v_user.nama,
    'username',    v_user.username,
    'role',        v_user.role,
    'permissions', v_user.permissions,
    'created_at',  v_user.created_at,
    'updated_at',  v_user.updated_at
  );
end;
$$;

-- =====================================================================
-- 5) RPC: admin_set_password(username, password)
--    Untuk MIGRASI/RESET password ke bcrypt. SENGAJA TIDAK diberikan ke
--    anon -> hanya bisa dipanggil dari SQL Editor (service_role).
-- =====================================================================
create or replace function public.admin_set_password(p_username text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.admin_users
  set password_hash = crypt(p_password, gen_salt('bf', 10)),
      updated_at    = now()
  where username = p_username;
end;
$$;

-- 6) Hak akses: hanya login & get_user yang boleh dipanggil ANON_KEY.
revoke all on function public.admin_login(text, text)        from public;
revoke all on function public.admin_get_user(text)           from public;
revoke all on function public.admin_set_password(text, text) from public;

grant execute on function public.admin_login(text, text)  to anon;
grant execute on function public.admin_get_user(text)     to anon;
-- admin_set_password sengaja TIDAK di-grant ke anon.

-- =====================================================================
-- 7) RESET PASSWORD ADMIN (WAJIB, satu kali setelah migrasi)
--    Password lama (format btoa) tidak akan berfungsi lagi. Jalankan baris
--    berikut untuk setiap akun admin. Ganti username & password sesuai data.
--
--    Contoh:
--      select public.admin_set_password('admin_disdik', 'PasswordBaruYangKuat');
--      select public.admin_set_password('korwil_gubug', 'PasswordBaruYangKuat');
--
--    (Hapus komentar dan sesuaikan sebelum dijalankan.)
-- =====================================================================
