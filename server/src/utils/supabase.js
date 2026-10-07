const { createClient } = require('@supabase/supabase-js');

function createSupabase(url, key) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

module.exports = { createSupabase };
