/**
 * remove-nc-from-invoices.js
 *
 * Supprime ITC-2024-NC-001 et ITC-2024-NC-002 de la table invoices.
 * Ces NC sont déjà correctement enregistrées dans la table credit_notes.
 *
 * Usage :
 *   node scripts/remove-nc-from-invoices.js          → dry-run
 *   node scripts/remove-nc-from-invoices.js --apply  → supprime
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🗑️  SUPPRIMER NC DE LA TABLE INVOICES — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const { data, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_type, amount, invoice_date')
    .eq('company_id', COMPANY_ID)
    .in('invoice_number', ['ITC-2024-NC-001', 'ITC-2024-NC-002']);

  if (error) { console.error('❌', error.message); return; }

  if (!data?.length) {
    console.log('  Aucune NC trouvée dans invoices. Rien à faire.\n');
    return;
  }

  console.log(`  ${data.length} enregistrement(s) à supprimer de invoices :\n`);
  for (const inv of data) {
    console.log(`  🔴 ${inv.invoice_number} | ${inv.invoice_type} | ${inv.amount}€ | ${inv.invoice_date} | id=${inv.id}`);
  }

  if (APPLY) {
    const ids = data.map(i => i.id);
    const { error: delErr } = await sb
      .from('invoices')
      .delete()
      .in('id', ids);

    if (delErr) {
      console.log(`\n  ❌ Erreur suppression : ${delErr.message}`);
    } else {
      console.log(`\n  ✅ ${data.length} enregistrement(s) supprimé(s) de invoices.`);
      console.log('  Les NC restent correctement dans la table credit_notes.\n');
    }
  } else {
    console.log('\n  → Relance avec --apply pour supprimer\n');
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
