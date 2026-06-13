const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEW_VITE_SUPABASE_URL, process.env.NEW_VITE_SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
(async () => {
  const r1 = await s.rpc('admin_login', { p_username: 'test', p_password: 'test' });
  console.log('admin_login:', JSON.stringify(r1));
  const r2 = await s.rpc('get_work_calendar_days', { p_start: '2026-01-01', p_end: '2026-12-31' });
  console.log('get_work_calendar_days:', JSON.stringify(r2).substring(0, 300));
  const r3 = await s.rpc('admin_get_user', { p_id: 'test' });
  console.log('admin_get_user:', JSON.stringify(r3));
})();
