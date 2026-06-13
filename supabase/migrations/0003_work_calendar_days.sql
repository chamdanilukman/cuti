-- =====================================================================
-- Migration: Work calendar days for annual leave quota calculation
-- Tujuan: menyimpan libur nasional dan cuti bersama agar Admin Dinas
--         dapat mengelola kalender tahun berikutnya tanpa rilis aplikasi.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.work_calendar_days (
  id uuid primary key default gen_random_uuid(),
  calendar_date date not null unique,
  type text not null check (type in ('national_holiday', 'joint_leave')),
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_calendar_days enable row level security;

create or replace function public.touch_work_calendar_days_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_work_calendar_days_updated_at on public.work_calendar_days;
create trigger trg_touch_work_calendar_days_updated_at
before update on public.work_calendar_days
for each row execute function public.touch_work_calendar_days_updated_at();

create or replace function public.get_work_calendar_days(p_start date, p_end date)
returns table (
  id uuid,
  calendar_date date,
  type text,
  description text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, calendar_date, type, description, is_active, created_at, updated_at
  from public.work_calendar_days
  where calendar_date between p_start and p_end
  order by calendar_date asc;
$$;

create or replace function public.upsert_work_calendar_day(
  p_admin_user_id text,
  p_calendar_date date,
  p_type text,
  p_description text
)
returns public.work_calendar_days
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_row public.work_calendar_days;
begin
  select role into v_role
  from public.admin_users
  where id::text = p_admin_user_id
    and is_active = true;

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
  p_admin_user_id text,
  p_calendar_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.admin_users
  where id::text = p_admin_user_id
    and is_active = true;

  if v_role is distinct from 'admin_disdik' then
    raise exception 'Hanya Admin Dinas yang dapat menghapus kalender kerja.';
  end if;

  insert into public.work_calendar_days(calendar_date, type, description, is_active)
  values (p_calendar_date, 'national_holiday', 'Dinonaktifkan oleh Admin Dinas', false)
  on conflict (calendar_date)
  do update set is_active = false;
end;
$$;

revoke all on public.work_calendar_days from anon;
revoke all on public.work_calendar_days from authenticated;
revoke all on function public.get_work_calendar_days(date, date) from public;
revoke all on function public.upsert_work_calendar_day(text, date, text, text) from public;
revoke all on function public.delete_work_calendar_day(text, date) from public;

grant execute on function public.get_work_calendar_days(date, date) to anon;
grant execute on function public.upsert_work_calendar_day(text, date, text, text) to anon;
grant execute on function public.delete_work_calendar_day(text, date) to anon;
