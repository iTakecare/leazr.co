/**
 * link-credit-notes.js
 *
 * Lie les notes de crédit aux factures originales via les colonnes
 * credit_note_id et credited_amount sur la facture source.
 *
 * ITC-2024-0034 ← NC-002  (3913.11€)
 * ITC-2024-0038 ← NC-001  (8352.20€)
 *
 * Usage :
 *   node scripts/link-credit-notes.js          → dry-run
 *   node scripts/link-credit-notes.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔗 LIER NC AUX FACTURES SOURCES — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // Récupère les 4 factures concernées
  const { data, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_type, amount, credit_note_id, credited_amount')
    .eq('company_id', COMPANY_ID)
    .in('invoice_number', ['ITC-2024-0034', 'ITC-2024-0038', 'ITC-2024-NC-001', 'ITC-2024-NC-002']);

  if (error) { console.error('❌', error.message); return; }

  const inv0034 = data.find(i => i.invoice_number === 'ITC-2024-0034');
  const inv0038 = data.find(i => i.invoice_number === 'ITC-2024-0038');
  const nc001   = data.find(i => i.invoice_number === 'ITC-2024-NC-001');
  const nc002   = data.find(i => i.invoice_number === 'ITC-2024-NC-002');

  console.log('  État actuel :');
  console.log(`  ITC-2024-0034 : credit_note_id=${inv0034?.credit_note_id || 'null'} | credited_amount=${inv0034?.credited_amount || 'null'}`);
  console.log(`  ITC-2024-0038 : credit_note_id=${inv0038?.credit_note_id || 'null'} | credited_amount=${inv0038?.credited_amount || 'null'}`);
  console.log(`  NC-001 id     : ${nc001?.id}`);
  console.log(`  NC-002 id     : ${nc002?.id}`);
  console.log('');

  const updates = [
    {
      label: 'ITC-2024-0034 ← NC-002',
      id: inv0034?.id,
      fields: { credit_note_id: nc002?.id, credited_amount: 3913.11 },
    },
    {
      label: 'ITC-2024-0038 ← NC-001',
      id: inv0038?.id,
      fields: { credit_note_id: nc001?.id, credited_amount: 8352.20 },
    },
  ];

  for (const { label, id, fields } of updates) {
    if (!id) { console.log(`  ❌ ${label} : facture introuvable`); continue; }
    console.log(`  🔗 ${label}`);
    console.log(`     credit_note_id   : ${fields.credit_note_id}`);
    console.log(`     credited_amount  : ${fields.credited_amount}€`);

    if (APPLY) {
      const { error: updErr } = await sb.from('invoices').update(fields).eq('id', id);
      if (updErr) console.log(`     ❌ ${updErr.message}`);
      else        console.log(`     ✅ OK`);
    }
    console.log('');
  }

  if (!APPLY) console.log('  → Relance avec --apply pour appliquer\n');
  else console.log('  ✅ Terminé — les NC sont liées aux factures sources.\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
