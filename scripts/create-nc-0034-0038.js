/**
 * create-nc-0034-0038.js
 *
 * ITC-2024-0034 et ITC-2024-0038 existent déjà dans la DB.
 * Ce script :
 *   1. Affiche leur état actuel (billing_data, offer_id, contract_id)
 *   2. Crée ITC-2024-NC-002 (annule ITC-2024-0034, -3913.11€, 2024-11-29)
 *   3. Crée ITC-2024-NC-001 (annule ITC-2024-0038, -8352.20€, 2024-09-30)
 *
 * Usage :
 *   node scripts/create-nc-0034-0038.js          → dry-run
 *   node scripts/create-nc-0034-0038.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔧 CRÉER NC-002 & NC-001 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── 1. Vérification des factures existantes ─────────────────────────────────
  const { data: existing, error: fetchErr } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_type, amount, invoice_date, status, offer_id, contract_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .in('invoice_number', ['ITC-2024-0034', 'ITC-2024-0038', 'ITC-2024-NC-001', 'ITC-2024-NC-002']);

  if (fetchErr) { console.error('❌', fetchErr.message); return; }

  const inv0034 = existing.find(i => i.invoice_number === 'ITC-2024-0034');
  const inv0038 = existing.find(i => i.invoice_number === 'ITC-2024-0038');
  const nc001   = existing.find(i => i.invoice_number === 'ITC-2024-NC-001');
  const nc002   = existing.find(i => i.invoice_number === 'ITC-2024-NC-002');

  console.log('  État des factures existantes :');
  if (inv0034) {
    console.log(`  ✅ ITC-2024-0034 : id=${inv0034.id.slice(0,8)} | ${inv0034.amount}€ | offer=${inv0034.offer_id?.slice(0,8)||'null'} | contract=${inv0034.contract_id?.slice(0,8)||'null'}`);
  } else {
    console.log('  ❌ ITC-2024-0034 introuvable !');
    return;
  }
  if (inv0038) {
    console.log(`  ✅ ITC-2024-0038 : id=${inv0038.id.slice(0,8)} | ${inv0038.amount}€ | offer=${inv0038.offer_id?.slice(0,8)||'null'} | contract=${inv0038.contract_id?.slice(0,8)||'null'}`);
  } else {
    console.log('  ❌ ITC-2024-0038 introuvable !');
    return;
  }
  console.log('');

  // ── 2. Vérification NC existantes ──────────────────────────────────────────
  if (nc002) { console.log(`  ⚠️  ITC-2024-NC-002 existe déjà (${nc002.amount}€), ignorée`); }
  if (nc001) { console.log(`  ⚠️  ITC-2024-NC-001 existe déjà (${nc001.amount}€), ignorée`); }
  if (nc001 && nc002) { console.log('\n  Les deux NC sont déjà créées. Rien à faire.\n'); return; }

  // ── 3. Définition des NC à créer ────────────────────────────────────────────
  const toCreate = [];

  if (!nc002) {
    toCreate.push({
      label: 'ITC-2024-NC-002 (annule ITC-2024-0034)',
      record: {
        company_id:      COMPANY_ID,
        invoice_number:  'ITC-2024-NC-002',
        invoice_type:    'credit_note',
        amount:          -3913.11,
        invoice_date:    '2024-11-29',
        status:          'sent',
        leaser_name:     'Grenke',
        integration_type: 'leasing',
        offer_id:        null,
        contract_id:     null,
        billing_data: {
          credit_note: {
            cancels_invoice:        'ITC-2024-0034',
            cancels_invoice_id:     inv0034.id,
            reason:                 'Annulation contrat',
          },
          contract_data: inv0034.billing_data?.contract_data || null,
          leaser_data:   inv0034.billing_data?.leaser_data   || null,
        },
      },
    });
  }

  if (!nc001) {
    toCreate.push({
      label: 'ITC-2024-NC-001 (annule ITC-2024-0038)',
      record: {
        company_id:      COMPANY_ID,
        invoice_number:  'ITC-2024-NC-001',
        invoice_type:    'credit_note',
        amount:          -8352.20,
        invoice_date:    '2024-09-30',
        status:          'sent',
        leaser_name:     'Grenke',
        integration_type: 'leasing',
        offer_id:        null,
        contract_id:     null,
        billing_data: {
          credit_note: {
            cancels_invoice:        'ITC-2024-0038',
            cancels_invoice_id:     inv0038.id,
            reason:                 'Annulation contrat',
          },
          contract_data: inv0038.billing_data?.contract_data || null,
          leaser_data:   inv0038.billing_data?.leaser_data   || null,
        },
      },
    });
  }

  // ── 4. Dry-run ou Apply ─────────────────────────────────────────────────────
  for (const { label, record } of toCreate) {
    console.log(`  📄 ${label}`);
    console.log(`     invoice_date : ${record.invoice_date}`);
    console.log(`     amount       : ${record.amount}€`);
    console.log(`     offer_id     : ${record.offer_id?.slice(0,8)||'null'}`);
    console.log(`     contract_id  : ${record.contract_id?.slice(0,8)||'null'}`);
    console.log('');

    if (APPLY) {
      const { data: created, error: insErr } = await sb
        .from('invoices')
        .insert(record)
        .select('id, invoice_number')
        .single();
      if (insErr) {
        console.log(`  ❌ Erreur : ${insErr.message}`);
      } else {
        console.log(`  ✅ Créée : ${created.invoice_number} (${created.id})`);
      }
    }
  }

  if (!APPLY && toCreate.length > 0) {
    console.log('  → Relance avec --apply pour créer les NC\n');
  } else if (APPLY) {
    console.log('\n  ✅ Terminé. Vérification CA leasing :');
    console.log('     Avant  : 324,919.15€ (avec 0034+0038 non annulées)');
    console.log('     Impact : -3,913.11 - 8,352.20 = -12,265.31€');
    console.log('     Après  : 312,653.84€ ✅\n');
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
