/**
 * create-nc-2025-001.js
 *
 * Crée ITC-2025-NC-001 dans la table credit_notes
 * Annule ITC-2025-0014 (dossier 180-26982)
 *   - MacBook Air M2 15 8Go 256Go RFB GR A | SN: JW4XWR744     → 1,200.00€
 *   - iPhone 15 Pro 128Go RFB GR A | SN: 359473646858528        →   995.05€
 *   Total excl. TVA : 2,195.05€  |  Date : 03/06/2025
 *
 * Usage :
 *   node scripts/create-nc-2025-001.js          → dry-run
 *   node scripts/create-nc-2025-001.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔧 CREATE ITC-2025-NC-001 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── 1. Vérifie si NC existe déjà ──────────────────────────────────────────
  const { data: existing } = await sb
    .from('credit_notes')
    .select('id, credit_note_number, amount')
    .eq('company_id', COMPANY_ID)
    .eq('credit_note_number', 'ITC-2025-NC-001')
    .maybeSingle();

  if (existing) {
    console.log(`  ⚠️  ITC-2025-NC-001 existe déjà dans credit_notes (${existing.id}, ${existing.amount}€)`);
    return;
  }

  // ── 2. Trouve la facture source ITC-2025-0014 ─────────────────────────────
  const { data: inv, error } = await sb
    .from('invoices')
    .select('id, invoice_number, amount, credit_note_id, credited_amount, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2025-0014')
    .maybeSingle();

  if (error) { console.error('❌', error.message); return; }

  if (!inv) {
    console.log('  ❌ ITC-2025-0014 introuvable en DB !');
    return;
  }

  console.log(`  ITC-2025-0014 : id=${inv.id} | amount=${inv.amount}€ | credit_note_id=${inv.credit_note_id || 'null'}`);
  console.log(`  billing_data  : ${JSON.stringify(inv.billing_data?.contract_data || {})}\n`);

  // ── 3. Définition de la NC ────────────────────────────────────────────────
  const ncRecord = {
    company_id:         COMPANY_ID,
    invoice_id:         inv.id,
    credit_note_number: 'ITC-2025-NC-001',
    amount:             2195.05,
    reason:             'Annulation contrat',
    status:             'applied',
    issued_at:          '2025-06-03T00:00:00.000+00:00',
    billing_data: {
      leaser_data: {
        name:        'GRENKE LEASE',
        address:     'Ruisbroeksesteenweg 76',
        postal_code: '1180',
        city:        'Ukkel',
        country:     'Belgique',
        vat_number:  'BE 0873.803.219',
      },
      contract_data: inv.billing_data?.contract_data || {},
      equipment_data: [
        {
          title:         'MacBook Air M2 15 8Go 256Go RFB GR A',
          serial_number: 'JW4XWR744',
          purchase_price: 1200.00,
          quantity:      1,
        },
        {
          title:         'iPhone 15 Pro 128Go RFB GR A',
          serial_number: '359473646858528',
          purchase_price: 995.05,
          quantity:      1,
        },
      ],
      invoice_totals: {
        total_excl_vat: 2195.05,
        vat_amount:     460.96,
        total_incl_vat: 2656.01,
      },
    },
  };

  console.log(`  📄 ITC-2025-NC-001`);
  console.log(`     invoice_id  : ${ncRecord.invoice_id}`);
  console.log(`     amount      : ${ncRecord.amount}€`);
  console.log(`     issued_at   : ${ncRecord.issued_at}`);
  console.log(`     reason      : ${ncRecord.reason}`);

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour créer\n');
    return;
  }

  // ── 4. Insertion ──────────────────────────────────────────────────────────
  const { data: created, error: insErr } = await sb
    .from('credit_notes')
    .insert(ncRecord)
    .select('id, credit_note_number')
    .single();

  if (insErr) {
    console.log(`\n  ❌ Erreur : ${insErr.message}`);
    return;
  }
  console.log(`\n  ✅ Créée : ${created.credit_note_number} (${created.id})`);

  // ── 5. Mise à jour de la facture source ───────────────────────────────────
  const { error: updErr } = await sb
    .from('invoices')
    .update({ credit_note_id: created.id, credited_amount: 2195.05 })
    .eq('id', inv.id);

  if (updErr) console.log(`  ❌ Liaison facture : ${updErr.message}`);
  else        console.log(`  ✅ ITC-2025-0014 liée → credit_note_id=${created.id}\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
