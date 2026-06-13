const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEW_VITE_SUPABASE_URL, process.env.NEW_VITE_SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
(async () => {
  const a = await s.from('admin_users').select('*', { count: 'exact', head: true });
  console.log('admin_users count:', a.count);
  const l = await s.from('leave_requests').select('*', { count: 'exact', head: true });
  console.log('leave_requests count:', l.count);
  const c = await s.from('work_calendar_days').select('*', { count: 'exact', head: true });
  console.log('work_calendar_days count:', c.count);
})();
