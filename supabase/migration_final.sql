-- =====================================================================
-- MIGRATION FINAL — Si CERDAS (Project Baru)
-- Jalankan SEKALI di SQL Editor project Supabase baru
-- 
-- Mencakup: schema tabel + auth bcrypt + RLS + dashboard RPC
-- Password admin dipreserve dari export (bcrypt), tidak perlu reset.
-- =====================================================================

-- 1. Bersihkan jika ada sisa
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

-- 2. Extension
create extension if not exists pgcrypto;

-- =====================================================================
-- 3. TABEL
-- =====================================================================

-- admin_users
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  nama text not null,
  role text not null,
  permissions jsonb default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- leave_requests
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
  files text default '[]',
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

-- work_calendar_days
create table public.work_calendar_days (
  id uuid primary key default gen_random_uuid(),
  calendar_date date not null unique,
  type text not null check (type in ('national_holiday', 'joint_leave')),
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- user_nips
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

-- =====================================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================================

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon;
revoke all on public.admin_users from authenticated;

alter table public.work_calendar_days enable row level security;
revoke all on public.work_calendar_days from anon;
revoke all on public.work_calendar_days from authenticated;

-- =====================================================================
-- 5. RPC FUNCTIONS — Auth
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
  where username = p_username and is_active = true;
  if not found then return null; end if;
  begin
    v_ok := (v_user.password_hash = crypt(p_password, v_user.password_hash));
  exception when others then v_ok := false; end;
  if not v_ok then return null; end if;
  return jsonb_build_object(
    'id', v_user.id, 'nama', v_user.nama, 'username', v_user.username,
    'role', v_user.role, 'permissions', v_user.permissions,
    'created_at', v_user.created_at, 'updated_at', v_user.updated_at
  );
end;
$$;

create or replace function public.admin_get_user(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.admin_users;
begin
  select * into v_user from public.admin_users
  where id::text = p_id and is_active = true;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_user.id, 'nama', v_user.nama, 'username', v_user.username,
    'role', v_user.role, 'permissions', v_user.permissions,
    'created_at', v_user.created_at, 'updated_at', v_user.updated_at
  );
end;
$$;

create or replace function public.admin_set_password(p_username text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.admin_users
  set password_hash = crypt(p_password, gen_salt('bf', 10)), updated_at = now()
  where username = p_username;
end;
$$;

revoke all on function public.admin_login(text, text) from public;
revoke all on function public.admin_get_user(text) from public;
revoke all on function public.admin_set_password(text, text) from public;
grant execute on function public.admin_login(text, text) to anon;
grant execute on function public.admin_get_user(text) to anon;

-- =====================================================================
-- 6. RPC FUNCTIONS — Work Calendar
-- =====================================================================

create or replace function public.touch_work_calendar_days_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_touch_work_calendar_days_updated_at on public.work_calendar_days;
create trigger trg_touch_work_calendar_days_updated_at
before update on public.work_calendar_days
for each row execute function public.touch_work_calendar_days_updated_at();

create or replace function public.get_work_calendar_days(p_start date, p_end date)
returns table (
  id uuid, calendar_date date, type text, description text,
  is_active boolean, created_at timestamptz, updated_at timestamptz
)
language sql security definer set search_path = public
as $$
  select id, calendar_date, type, description, is_active, created_at, updated_at
  from public.work_calendar_days
  where calendar_date between p_start and p_end order by calendar_date asc;
$$;

create or replace function public.upsert_work_calendar_day(
  p_admin_user_id text, p_calendar_date date, p_type text, p_description text
)
returns public.work_calendar_days
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
  v_row public.work_calendar_days;
begin
  select role into v_role from public.admin_users
  where id::text = p_admin_user_id and is_active = true;
  if v_role is distinct from 'admin_disdik' then
    raise exception 'Hanya Admin Dinas yang dapat mengubah kalender kerja.';
  end if;
  insert into public.work_calendar_days(calendar_date, type, description, is_active)
  values (p_calendar_date, p_type, p_description)
  on conflict (calendar_date)
  do update set type = excluded.type, description = excluded.description, is_active = true
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.delete_work_calendar_day(
  p_admin_user_id text, p_calendar_date date
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.admin_users
  where id::text = p_admin_user_id and is_active = true;
  if v_role is distinct from 'admin_disdik' then
    raise exception 'Hanya Admin Dinas yang dapat menghapus kalender kerja.';
  end if;
  insert into public.work_calendar_days(calendar_date, type, description, is_active)
  values (p_calendar_date, 'national_holiday', 'Dinonaktifkan oleh Admin Dinas', false)
  on conflict (calendar_date) do update set is_active = false;
end;
$$;

revoke all on function public.get_work_calendar_days(date, date) from public;
revoke all on function public.upsert_work_calendar_day(text, date, text, text) from public;
revoke all on function public.delete_work_calendar_day(text, date) from public;
grant execute on function public.get_work_calendar_days(date, date) to anon;
grant execute on function public.upsert_work_calendar_day(text, date, text, text) to anon;
grant execute on function public.delete_work_calendar_day(text, date) to anon;

-- =====================================================================
-- 7. RPC FUNCTIONS — Dashboard Stats (mengurangi egress)
-- =====================================================================

create or replace function public.get_dashboard_stats(p_year integer default null::integer)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  result jsonb;
  v_year integer;
  v_pending integer; v_approved_coordinator integer;
  v_approved_admin integer; v_document_issued integer; v_rejected integer;
  v_monthly jsonb; v_districts jsonb; v_jenjang jsonb; v_leave_types jsonb;
begin
  v_year := coalesce(p_year, extract(year from current_date)::integer);

  select
    count(*) filter (where status = 'pending')::integer,
    count(*) filter (where status = 'approved_coordinator')::integer,
    count(*) filter (where status = 'approved_admin')::integer,
    count(*) filter (where status = 'document_issued')::integer,
    count(*) filter (where status = 'rejected')::integer
  into v_pending, v_approved_coordinator, v_approved_admin, v_document_issued, v_rejected
  from leave_requests
  where tanggal_mulai >= (v_year::text || '-01-01')::date
    and tanggal_mulai <= (v_year::text || '-12-31')::date;

  select jsonb_agg(m order by m->>'month') into v_monthly
  from (
    select jsonb_build_object(
      'month', extract(month from tanggal_mulai::date)::integer,
      'approved', count(*) filter (where status in ('approved_coordinator','approved_admin'))::integer,
      'pending', count(*) filter (where status = 'pending')::integer,
      'total', count(*)::integer
    ) as m
    from leave_requests
    where tanggal_mulai >= (v_year::text || '-01-01')::date
      and tanggal_mulai <= (v_year::text || '-12-31')::date
    group by extract(month from tanggal_mulai::date)
  ) sub;

  select jsonb_agg(d order by d->>'count' desc) into v_districts
  from (
    select jsonb_build_object('district', koordinator_wilayah, 'count', count(*)::integer) as d
    from leave_requests
    where tanggal_mulai >= (v_year::text || '-01-01')::date
      and tanggal_mulai <= (v_year::text || '-12-31')::date
      and koordinator_wilayah is not null and trim(koordinator_wilayah) <> ''
    group by koordinator_wilayah order by count(*) desc limit 8
  ) sub;

  select jsonb_agg(j order by j->>'jenjang') into v_jenjang
  from (
    select jsonb_build_object('jenjang', jenjang, 'count', count(*)::integer) as j
    from leave_requests
    where tanggal_mulai >= (v_year::text || '-01-01')::date
      and tanggal_mulai <= (v_year::text || '-12-31')::date
      and jenjang is not null and trim(jenjang) <> ''
    group by jenjang
  ) sub;

  select jsonb_agg(t order by t->>'count' desc) into v_leave_types
  from (
    select jsonb_build_object('type', jenis_cuti, 'count', count(*)::integer) as t
    from leave_requests
    where tanggal_mulai >= (v_year::text || '-01-01')::date
      and tanggal_mulai <= (v_year::text || '-12-31')::date
      and jenis_cuti is not null
    group by jenis_cuti
  ) sub;

  result := jsonb_build_object(
    'year', v_year,
    'pending', v_pending, 'approved_coordinator', v_approved_coordinator,
    'approved_admin', v_approved_admin, 'document_issued', v_document_issued,
    'rejected', v_rejected,
    'monthly_data', coalesce(v_monthly, '[]'::jsonb),
    'district_data', coalesce(v_districts, '[]'::jsonb),
    'jenjang_data', coalesce(v_jenjang, '[]'::jsonb),
    'detailed_leave_types', coalesce(v_leave_types, '[]'::jsonb)
  );
  return result;
end;
$$;

-- =====================================================================
-- 8. GRANTS (anon bisa baca selain admin_users & work_calendar_days)
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- =====================================================================
-- 9. VERIFIKASI
-- =====================================================================

do $$
begin
  raise notice '=== MIGRATION SELESAI ===';
  raise notice 'Tabel: admin_users, leave_requests, work_calendar_days, user_nips';
  raise notice 'Functions: admin_login, admin_get_user, admin_set_password,';
  raise notice '  get_work_calendar_days, upsert_work_calendar_day,';
  raise notice '  delete_work_calendar_day, get_dashboard_stats';
  raise notice 'RLS: admin_users & work_calendar_days (protected)';
  raise notice 'Next: import data dengan import-data.cjs';
end $$;
