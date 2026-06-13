-- =====================================================================
-- DROP & RECREATE schema dengan struktur yang BENAR (sesuai CSV)
-- Jalankan di SQL Editor project BARU untuk reset sebelum import CSV
-- =====================================================================

drop table if exists public.leave_requests cascade;
drop table if exists public.admin_users cascade;
drop table if exists public.work_calendar_days cascade;
drop table if exists public.user_nips cascade;
drop function if exists public.admin_login(text, text) cascade;
drop function if exists public.admin_get_user(text) cascade;
drop function if exists public.admin_set_password(text, text) cascade;
drop function if exists public.get_work_calendar_days(date, date) cascade;
drop function if exists public.upsert_work_calendar_day(text, date, text, text) cascade;
drop function if exists public.delete_work_calendar_day(text, date) cascade;
drop function if exists public.get_dashboard_stats(integer) cascade;
drop function if exists public.touch_work_calendar_days_updated_at() cascade;

-- 1. Extension
create extension if not exists pgcrypto;

-- 2. Tabel admin_users (uuid PK)
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null default 'placeholder',
  nama text not null,
  role text not null,
  permissions jsonb default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabel leave_requests (varchar id, JSON files)
create table public.leave_requests (
  id text primary key,
  nama text,
  nip text,
  pangkat_golongan text,
  jabatan text,
  koordinator_wilayah text,
  jenjang text,
  sekolah text,
  jenis_cuti text,
  tanggal_mulai date,
  tanggal_selesai date,
  alasan_cuti text,
  files jsonb default '[]'::jsonb,
  status text default 'pending',
  rejection_reason text,
  submission_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  drive_link text,
  coordinator_approval_date date,
  admin_approval_date date,
  is_revised boolean default false,
  original_rejection_reason text,
  final_letter_url text
);

-- 4. Tabel work_calendar_days
create table public.work_calendar_days (
  id uuid primary key default gen_random_uuid(),
  calendar_date date not null unique,
  type text not null check (type in ('national_holiday', 'joint_leave')),
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Tabel user_nips (untuk fitur search by NIP)
create table public.user_nips (
  id uuid primary key default gen_random_uuid(),
  nip text unique not null,
  nama text,
  pangkat_golongan text,
  jabatan text,
  koordinator_wilayah text,
  jenjang text,
  sekolah text,
  created_at timestamptz not null default now()
);

-- 6. Grant akses
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
