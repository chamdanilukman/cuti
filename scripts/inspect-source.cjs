const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
(async () => {
  for (const t of ['admin_users', 'leave_requests', 'work_calendar_days', 'user_nips']) {
    const r = await s.from(t).select('*').limit(1);
    if (r.data && r.data[0]) {
      console.log(`\n=== ${t} ===`);
      console.log('Columns:', Object.keys(r.data[0]).join(', '));
    } else {
      console.log(`\n=== ${t} === kosong atau error: ${r.error?.message}`);
    }
  }
  // Sample leave_requests
  const lr = await s.from('leave_requests').select('*').limit(2);
  console.log('\n=== leave_requests sample (2 rows) ===');
  console.log(JSON.stringify(lr.data, null, 2));
})();
