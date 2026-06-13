-- pg_dump partial: tables, data, functions
-- Run this in Supabase SQL Editor to backup data

-- 1. leave_requests (data utama)
\COPY (SELECT * FROM leave_requests ORDER BY created_at) TO '/tmp/leave_requests.csv' CSV HEADER

-- 2. admin_users (skip, password hash only matters for self-hosted auth)
-- 3. work_calendar_days
\COPY (SELECT * FROM work_calendar_days) TO '/tmp/work_calendar.csv' CSV HEADER

-- 4. Functions: get_dashboard_stats, get_work_calendar_days, admin_login, admin_get_user
-- Get DDL dari Supabase: Dashboard -> Database -> Functions -> lihat source

-- ATAU, lebih mudah:
-- Di Supabase CLI lokal (jika ada), jalankan:
-- supabase db dump --project-id YOUR_PROJECT_ID -f backup.sql
