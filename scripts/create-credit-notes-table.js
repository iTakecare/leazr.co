/**
 * create-credit-notes-table.js
 *
 * Crée les enregistrements dans la table `credit_notes` pour :
 *   - NC-002 : annule ITC-2024-0034 (ADS Immo SRL, -3913.11€, 2024-11-29)
 *   - NC-001 : annule ITC-2024-0038 (-8352.20€, 2024-09-30)
 * Puis met à jour credit_note_id + credited_amount sur les factures sources.
 *
 * Usage :
 *   node scripts/create-credit-notes-table.js          → dry-run
 *   node scripts/create-credit-notes-table.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔧 CREATE CREDIT_NOTES TABLE RECORDS — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── 1. Inspect une NC existante pour comprendre la convention ──────────────
  const { data: sample } = await sb
    .from('credit_notes')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .limit(1)
    .single();

  if (sample) {
    console.log('  Exemple de NC existante :');
    console.log(JSON.stringify(sample, null, 4));
    console.log('');
  }

  // ── 2. Récupère les factures sources ───────────────────────────────────────
  const { data: invoices, error } = await sb
    .from('invoices')
    .select('id, invoice_number, amount, credit_note_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .in('invoice_number', ['ITC-2024-0034', 'ITC-2024-0038']);

  if (error) { console.error('❌', error.message); return; }

  const inv0034 = invoices.find(i => i.invoice_number === 'ITC-2024-0034');
  const inv0038 = invoices.find(i => i.invoice_number === 'ITC-2024-0038');

  console.log(`  ITC-2024-0034 id=${inv0034?.id} | credit_note_id=${inv0034?.credit_note_id || 'null'}`);
  console.log(`  ITC-2024-0038 id=${inv0038?.id} | credit_note_id=${inv0038?.credit_note_id || 'null'}`);
  console.log('');

  // ── 3. Vérifie si NC déjà dans credit_notes ────────────────────────────────
  const { data: existing } = await sb
    .from('credit_notes')
    .select('id, credit_note_number, amount, invoice_id')
    .eq('company_id', COMPANY_ID)
    .in('credit_note_number', ['ITC-2024-NC-001', 'ITC-2024-NC-002']);

  const existNC001 = existing?.find(n => n.credit_note_number === 'ITC-2024-NC-001');
  const existNC002 = existing?.find(n => n.credit_note_number === 'ITC-2024-NC-002');

  if (existNC001) console.log(`  ⚠️  ITC-2024-NC-001 existe déjà dans credit_notes (${existNC001.id})`);
  if (existNC002) console.log(`  ⚠️  ITC-2024-NC-002 existe déjà dans credit_notes (${existNC002.id})`);

  // ── 4. Définition des NC à créer ───────────────────────────────────────────
  // Convention amount : positif dans credit_notes (représente la réduction)
  // → à confirmer par l'exemple ci-dessus
  const toCreate = [];

  if (!existNC002 && inv0034) {
    toCreate.push({
      label: 'NC-002 → ITC-2024-0034 (ADS Immo SRL)',
      invoice: inv0034,
      record: {
        company_id:         COMPANY_ID,
        invoice_id:         inv0034.id,
        credit_note_number: 'ITC-2024-NC-002',
        amount:             3913.11,   // positif = montant annulé
        reason:             'Annulation contrat',
        status:             'applied',
        issued_at:          '2024-11-29T00:00:00.000+00:00',
        billing_data: {
          leaser_data:   inv0034.billing_data?.leaser_data   || { name: 'GRENKE LEASE' },
          contract_data: { ...( inv0034.billing_data?.contract_data || {}), client_name: 'ADS Immo SRL', client_company: 'ADS Immo SRL' },
        },
      },
    });
  }

  if (!existNC001 && inv0038) {
    toCreate.push({
      label: 'NC-001 → ITC-2024-0038',
      invoice: inv0038,
      record: {
        company_id:         COMPANY_ID,
        invoice_id:         inv0038.id,
        credit_note_number: 'ITC-2024-NC-001',
        amount:             8352.20,
        reason:             'Annulation contrat',
        status:             'applied',
        issued_at:          '2024-09-30T00:00:00.000+00:00',
        billing_data: {
          leaser_data:   inv0038.billing_data?.leaser_data   || { name: 'GRENKE LEASE' },
          contract_data: inv0038.billing_data?.contract_data || {},
        },
      },
    });
  }

  // ── 5. Dry-run ou Apply ────────────────────────────────────────────────────
  const createdIds = {};

  for (const { label, invoice, record } of toCreate) {
    console.log(`\n  📄 ${label}`);
    console.log(`     credit_note_number : ${record.credit_note_number}`);
    console.log(`     invoice_id         : ${record.invoice_id}`);
    console.log(`     amount             : ${record.amount}€`);
    console.log(`     issued_at          : ${record.issued_at}`);

    if (APPLY) {
      const { data: created, error: insErr } = await sb
        .from('credit_notes')
        .insert(record)
        .select('id, credit_note_number')
        .single();

      if (insErr) {
        console.log(`     ❌ Erreur insert : ${insErr.message}`);
        continue;
      }
      console.log(`     ✅ Créée : ${created.credit_note_number} (${created.id})`);
      createdIds[invoice.invoice_number] = { cnId: created.id, amount: record.amount };
    }
  }

  // Ajoute les NC déjà existantes
  if (existNC001 && inv0038) createdIds[inv0038.invoice_number] = { cnId: existNC001.id, amount: Math.abs(existNC001.amount) };
  if (existNC002 && inv0034) createdIds[inv0034.invoice_number] = { cnId: existNC002.id, amount: Math.abs(existNC002.amount) };

  // ── 6. Mise à jour credit_note_id sur les factures sources ─────────────────
  console.log('\n  🔗 Liaison credit_note_id sur les factures sources :');
  for (const [invNum, { cnId, amount }] of Object.entries(createdIds)) {
    console.log(`     ${invNum} → credit_note_id=${cnId} | credited_amount=${amount}€`);
    if (APPLY) {
      const { error: updErr } = await sb
        .from('invoices')
        .update({ credit_note_id: cnId, credited_amount: amount })
        .eq('company_id', COMPANY_ID)
        .eq('invoice_number', invNum);
      if (updErr) console.log(`     ❌ ${updErr.message}`);
      else        console.log(`     ✅ OK`);
    }
  }

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour appliquer\n');
  } else {
    console.log('\n  ✅ Terminé.\n');
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
