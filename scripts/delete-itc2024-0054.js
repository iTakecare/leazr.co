/**
 * delete-itc2024-0054.js
 *
 * Supprime ITC-2024-0054 (L'Acqua e Farina 2018, 199€, 29/05/2024)
 * qui est en DB mais ne figure pas dans la référence ventes directes 2024.
 *
 * Usage :
 *   node scripts/delete-itc2024-0054.js          → dry-run (affiche la facture)
 *   node scripts/delete-itc2024-0054.js --apply  → supprime
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🗑️  SUPPRESSION ITC-2024-0054 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const { data: inv, error } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, billing_data, invoice_type, status')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2024-0054')
    .maybeSingle();

  if (error) { console.error('❌', error.message); return; }
  if (!inv) { console.log('  ✅ ITC-2024-0054 n\'existe pas en DB — rien à faire.\n'); return; }

  const client = inv.billing_data?.contract_data?.client_name
    || inv.billing_data?.client?.name
    || inv.billing_data?.equipment_data?.[0]?.title
    || '?';

  console.log(`  Facture trouvée :`);
  console.log(`    id           : ${inv.id}`);
  console.log(`    numéro       : ${inv.invoice_number}`);
  console.log(`    date         : ${inv.invoice_date}`);
  console.log(`    montant      : ${inv.amount} €`);
  console.log(`    type         : ${inv.invoice_type}`);
  console.log(`    statut       : ${inv.status}`);
  console.log(`    client/info  : ${client}\n`);

  if (!APPLY) {
    console.log('  → Relance avec --apply pour supprimer\n');
    return;
  }

  const { error: delErr } = await sb
    .from('invoices')
    .delete()
    .eq('id', inv.id);

  if (delErr) { console.error(`  ❌ Erreur suppression : ${delErr.message}\n`); return; }
  console.log(`  ✅ ITC-2024-0054 supprimée (${inv.amount}€)\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
