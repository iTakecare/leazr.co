/**
 * fix-loc-2026-01003.js
 *
 * LOC-ITC-2026-01003 (Patrick Grasseels, 131.85€/mois) a
 * contract_start_date = 2025-10-01 → pollue le dashboard 2025.
 * Le premier paiement est le 2026-02-28 → start corrigé à 2026-02-01.
 *
 * Usage :
 *   node scripts/fix-loc-2026-01003.js          → dry-run
 *   node scripts/fix-loc-2026-01003.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔧 FIX LOC-ITC-2026-01003 START DATE — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const { data: contract, error } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, contract_start_date, contract_end_date, status, monthly_payment, is_self_leasing')
    .eq('company_id', COMPANY_ID)
    .eq('contract_number', 'LOC-ITC-2026-01003')
    .maybeSingle();

  if (error || !contract) { console.error('❌', error?.message || 'Contrat introuvable'); return; }

  console.log('  État actuel :');
  console.log(`  contract_number    : ${contract.contract_number}`);
  console.log(`  client_name        : ${contract.client_name}`);
  console.log(`  is_self_leasing    : ${contract.is_self_leasing}`);
  console.log(`  contract_start_date: ${contract.contract_start_date}  ← INCORRECT (pollue 2025)`);
  console.log(`  contract_end_date  : ${contract.contract_end_date}`);
  console.log(`  monthly_payment    : ${contract.monthly_payment}€`);
  console.log(`  status             : ${contract.status}`);

  // Correction : 1er paiement = 2026-02-28 → start = 2026-02-01, end = 2029-02-01
  const newStart = '2026-02-01';
  const newEnd   = '2029-02-01';

  console.log(`\n  Correction :`);
  console.log(`  contract_start_date: ${newStart}`);
  console.log(`  contract_end_date  : ${newEnd}`);
  console.log(`  status             : active`);

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour appliquer\n');
    return;
  }

  const { error: updErr } = await sb
    .from('contracts')
    .update({
      contract_start_date: newStart,
      contract_end_date:   newEnd,
      status:              'active',
      updated_at:          new Date().toISOString(),
    })
    .eq('id', contract.id);

  if (updErr) console.log(`\n  ❌ ${updErr.message}`);
  else        console.log(`\n  ✅ Contrat mis à jour. Self-leasing 2025 = 0€ désormais.\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
