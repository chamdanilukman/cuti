const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEW_VITE_SUPABASE_URL;
const key = process.env.NEW_VITE_SUPABASE_SERVICE_KEY;
const s = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
(async () => {
  const r = await s.from('admin_users').select('id').limit(1);
  console.log('admin_users:', JSON.stringify(r, null, 2));
  const r2 = await s.from('leave_requests').select('id').limit(1);
  console.log('leave_requests:', JSON.stringify(r2, null, 2));
  const r3 = await s.rpc('get_dashboard_stats', { p_year: 2026 });
  console.log('get_dashboard_stats:', JSON.stringify(r3, null, 2));
})();
