/**
 * verify-winlease-phase1.mjs — vérifie les RPC Winlease Phase 1 après reload du cache.
 * Usage : node scripts/verify-winlease-phase1.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await sb.rpc('get_financeur_by_slug', { financeur_slug: '___nope___' });
console.log(error ? `❌ get_financeur_by_slug : ${error.message}` : `✅ get_financeur_by_slug OK (rows: ${data?.length ?? 0})`);

// service_role n'est pas un partenaire : on attend l'erreur "aucun partenaire actif"
const { error: e2 } = await sb.rpc('create_financing_request', {
  p_client: {},
  p_equipment: [],
  p_duration: 36,
});
console.log(`ℹ️ create_financing_request → ${e2 ? e2.message : 'OK (inattendu)'}`);
