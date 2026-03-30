/**
 * apply-extended-status-fix.js
 *
 * Applique directement via l'API Supabase le patch SQL
 * qui ajoute 'extended' dans get_monthly_financial_data.
 *
 * Usage : node scripts/apply-extended-status-fix.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(__dirname, '../supabase/migrations/20260326120000_add_extended_status_to_financial_function.sql'),
  'utf8'
);

async function main() {
  console.log('\n🔧 Application du patch SQL : ajout de \'extended\' dans get_monthly_financial_data...\n');

  const { error } = await sb.rpc('exec_sql', { sql }).catch(() => ({ error: { message: 'exec_sql non disponible' } }));

  if (error) {
    // Fallback : POST direct à l'endpoint SQL de Supabase
    console.log('  → Tentative via REST SQL endpoint...');
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    if (!resp.ok) {
      console.log('\n❌ Impossible d\'appliquer via API.');
      console.log('   → Lance plutôt depuis le terminal :');
      console.log('   npx supabase db push\n');
      console.log('   Ou copie ce SQL dans l\'éditeur Supabase (SQL Editor → New query) :\n');
      console.log('─'.repeat(60));
      console.log(sql);
      console.log('─'.repeat(60));
      return;
    }
    console.log('✅ Patch appliqué via REST !');
  } else {
    console.log('✅ Patch appliqué !');
  }

  // Vérification
  console.log('\n📊 Vérification janvier 2023 après patch...');
  const { data } = await sb.rpc('get_monthly_financial_data', { p_year: 2023 });
  const jan = data?.find(r => r.month_number === 1);
  if (jan) {
    const pur = parseFloat(jan.purchases);
    const rev = parseFloat(jan.revenue);
    console.log(`  Janvier: CA=${rev.toFixed(2)}€  Achats=${pur.toFixed(2)}€  Marge=${(rev-pur).toFixed(2)}€`);
    const ok = Math.abs(pur - 36257.84) < 1;
    console.log(`  Achats cible: 36 257,84€ → ${ok ? '✅ CORRECT' : '⚠️  Écart: ' + (pur - 36257.84).toFixed(2) + '€'}`);
  }

  // Q1 total
  const q1 = data?.filter(r => r.month_number <= 3);
  const q1Marge = q1?.reduce((s, r) => s + parseFloat(r.margin), 0) || 0;
  console.log(`\n  Q1 marge: ${q1Marge.toFixed(2)}€`);
  console.log(`  Cible   : 84 951,76€`);
  console.log(`  Écart   : ${(q1Marge - 84951.76).toFixed(2)}€ ${Math.abs(q1Marge - 84951.76) < 1 ? '✅' : '⚠️'}`);
}

main().catch(e => console.error('💥', e.message));
