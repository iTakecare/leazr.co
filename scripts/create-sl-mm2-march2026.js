/**
 * create-sl-mm2-march2026.js
 *
 * LOC-ITC-2026-03003 (Eric Bruyr / M&M2 SRL, 338.48€/mois)
 * La première mensualité de mars 2026 a été prélevée manuellement via Mollie
 * mais n'a pas d'enregistrement dans invoices.
 * Ce script crée l'invoice SL manquante.
 *
 * Usage :
 *   node scripts/create-sl-mm2-march2026.js          → dry-run
 *   node scripts/create-sl-mm2-march2026.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔧 CREATE SL MARS 2026 — M&M2 SRL — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── 1. Trouve le contrat LOC-ITC-2026-03003 ───────────────────────────────
  const { data: contract, error } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, monthly_payment, contract_start_date, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('contract_number', 'LOC-ITC-2026-03003')
    .maybeSingle();

  if (error || !contract) { console.error('❌', error?.message || 'Contrat introuvable'); return; }

  console.log(`  Contrat      : ${contract.contract_number}`);
  console.log(`  Client       : ${contract.client_name}`);
  console.log(`  Mensualité   : ${contract.monthly_payment}€`);
  console.log(`  Start        : ${contract.contract_start_date}`);

  // ── 2. Vérifie si une facture mars 2026 existe déjà ──────────────────────
  const { data: existing } = await sb
    .from('invoices')
    .select('invoice_number, amount, invoice_date')
    .eq('company_id', COMPANY_ID)
    .eq('contract_id', contract.id)
    .gte('invoice_date', '2026-03-01')
    .lte('invoice_date', '2026-03-31');

  if (existing?.length) {
    console.log('\n  ⚠️  Invoice mars 2026 existe déjà pour ce contrat :');
    existing.forEach(i => console.log(`    ${i.invoice_number} | ${i.amount}€ | ${i.invoice_date}`));
    return;
  }
  console.log('\n  ❌ Aucune facture mars 2026 trouvée pour LOC-ITC-2026-03003 → création nécessaire');

  // ── 3. Référence un exemple SL pour calquer la structure ─────────────────
  const { data: sampleSL } = await sb
    .from('invoices')
    .select('invoice_number, invoice_type, integration_type, status, billing_data')
    .eq('company_id', COMPANY_ID)
    .ilike('invoice_number', 'SL-2026-03-%')
    .limit(1)
    .maybeSingle();

  console.log(`\n  Modèle SL    : ${sampleSL?.invoice_number || '(aucun)'}`);

  // Génère un numéro SL unique
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const invoiceNumber = `SL-2026-03-${rand}`;

  const invoiceRecord = {
    company_id:       COMPANY_ID,
    invoice_number:   invoiceNumber,
    invoice_type:     'leasing',
    integration_type: 'mollie',
    amount:           parseFloat(contract.monthly_payment),
    status:           'paid',
    invoice_date:     '2026-03-26',   // date de début du contrat
    paid_at:          '2026-03-26T00:00:00.000+00:00',
    contract_id:      contract.id,
    offer_id:         null,
    billing_data:     contract.billing_data || {
      contract_data: {
        client_name:    contract.client_name,
        monthly_payment: contract.monthly_payment,
      }
    },
  };

  console.log(`\n  📄 À créer :`);
  console.log(`     invoice_number : ${invoiceRecord.invoice_number}`);
  console.log(`     amount         : ${invoiceRecord.amount}€`);
  console.log(`     invoice_date   : ${invoiceRecord.invoice_date}`);
  console.log(`     contract_id    : ${invoiceRecord.contract_id}`);
  console.log(`     integration_type: ${invoiceRecord.integration_type}`);

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour créer\n');
    return;
  }

  const { data: created, error: insErr } = await sb
    .from('invoices')
    .insert(invoiceRecord)
    .select('id, invoice_number')
    .single();

  if (insErr) console.log(`\n  ❌ Erreur : ${insErr.message}`);
  else        console.log(`\n  ✅ Créée : ${created.invoice_number} (${created.id})\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
