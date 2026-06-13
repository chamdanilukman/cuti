-- 0004_dashboard_stats_rpc.sql
-- Server-side aggregation RPC for dashboard to reduce egress

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_year integer DEFAULT NULL::integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
  v_year integer;
  v_pending integer;
  v_approved_coordinator integer;
  v_approved_admin integer;
  v_document_issued integer;
  v_rejected integer;
  v_monthly jsonb;
  v_districts jsonb;
  v_jenjang jsonb;
  v_leave_types jsonb;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);

  -- Per-status counts
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::integer,
    COUNT(*) FILTER (WHERE status = 'approved_coordinator')::integer,
    COUNT(*) FILTER (WHERE status = 'approved_admin')::integer,
    COUNT(*) FILTER (WHERE status = 'document_issued')::integer,
    COUNT(*) FILTER (WHERE status = 'rejected')::integer
  INTO v_pending, v_approved_coordinator, v_approved_admin, v_document_issued, v_rejected
  FROM leave_requests
  WHERE tanggal_mulai >= (v_year::text || '-01-01')::date
    AND tanggal_mulai <= (v_year::text || '-12-31')::date;

  -- Monthly breakdown
  SELECT jsonb_agg(m ORDER BY m->>'month')
  INTO v_monthly
  FROM (
    SELECT jsonb_build_object(
      'month', EXTRACT(MONTH FROM tanggal_mulai::date)::integer,
      'approved', COUNT(*) FILTER (WHERE status IN ('approved_coordinator', 'approved_admin'))::integer,
      'pending', COUNT(*) FILTER (WHERE status = 'pending')::integer,
      'total', COUNT(*)::integer
    ) AS m
    FROM leave_requests
    WHERE tanggal_mulai >= (v_year::text || '-01-01')::date
      AND tanggal_mulai <= (v_year::text || '-12-31')::date
    GROUP BY EXTRACT(MONTH FROM tanggal_mulai::date)
  ) sub;

  -- Top 8 districts
  SELECT jsonb_agg(d ORDER BY d->>'count' DESC)
  INTO v_districts
  FROM (
    SELECT jsonb_build_object(
      'district', koordinator_wilayah,
      'count', COUNT(*)::integer
    ) AS d
    FROM leave_requests
    WHERE tanggal_mulai >= (v_year::text || '-01-01')::date
      AND tanggal_mulai <= (v_year::text || '-12-31')::date
      AND koordinator_wilayah IS NOT NULL
      AND TRIM(koordinator_wilayah) <> ''
    GROUP BY koordinator_wilayah
    ORDER BY COUNT(*) DESC
    LIMIT 8
  ) sub;

  -- Jenjang breakdown
  SELECT jsonb_agg(j ORDER BY j->>'jenjang')
  INTO v_jenjang
  FROM (
    SELECT jsonb_build_object(
      'jenjang', jenjang,
      'count', COUNT(*)::integer
    ) AS j
    FROM leave_requests
    WHERE tanggal_mulai >= (v_year::text || '-01-01')::date
      AND tanggal_mulai <= (v_year::text || '-12-31')::date
      AND jenjang IS NOT NULL
      AND TRIM(jenjang) <> ''
    GROUP BY jenjang
  ) sub;

  -- Detailed leave types
  SELECT jsonb_agg(t ORDER BY t->>'count' DESC)
  INTO v_leave_types
  FROM (
    SELECT jsonb_build_object(
      'type', jenis_cuti,
      'count', COUNT(*)::integer
    ) AS t
    FROM leave_requests
    WHERE tanggal_mulai >= (v_year::text || '-01-01')::date
      AND tanggal_mulai <= (v_year::text || '-12-31')::date
      AND jenis_cuti IS NOT NULL
    GROUP BY jenis_cuti
  ) sub;

  result := jsonb_build_object(
    'year', v_year,
    'pending', v_pending,
    'approved_coordinator', v_approved_coordinator,
    'approved_admin', v_approved_admin,
    'document_issued', v_document_issued,
    'rejected', v_rejected,
    'monthly_data', COALESCE(v_monthly, '[]'::jsonb),
    'district_data', COALESCE(v_districts, '[]'::jsonb),
    'jenjang_data', COALESCE(v_jenjang, '[]'::jsonb),
    'detailed_leave_types', COALESCE(v_leave_types, '[]'::jsonb)
  );

  RETURN result;
END;
$$;
