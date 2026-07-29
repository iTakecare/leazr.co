/**
 * inspect-profiles-rls.mjs
 * Lecture seule : liste les policies RLS de public.profiles et les définitions
 * des helpers qui s'appuient sur profiles, avant sécurisation côté client.
 * Usage : node scripts/inspect-profiles-rls.mjs "<sql lecture seule>"
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sql = process.argv[2] ?? `
  select policyname, cmd, permissive, roles::text, qual, with_check
  from pg_policies where tablename = 'profiles' order by policyname`;

const { data, error } = await sb.rpc('kpi_run_query', { p_sql: sql });
if (error) {
  console.error('❌', error.message);
  process.exit(1);
}
console.log(JSON.stringify(data, null, 1));
