/**
 * fix-itc2024-0034-client.js
 *
 * ITC-2024-0034 a le mauvais client en DB (Nicolas Lehette au lieu de ADS Immo)
 * Ce script :
 *   1. Affiche le billing_data actuel complet
 *   2. Corrige client_name → ADS Immo dans billing_data.contract_data
 *   3. Vérifie et affiche le offer/contract lié
 *
 * Usage :
 *   node scripts/fix-itc2024-0034-client.js          → dry-run
 *   node scripts/fix-itc2024-0034-client.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔧 FIX ITC-2024-0034 CLIENT — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── Fetch facture ──────────────────────────────────────────────────────────
  const { data: inv, error } = await sb
    .from('invoices')
    .select('id, invoice_number, amount, offer_id, contract_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2024-0034')
    .single();

  if (error || !inv) { console.error('❌', error?.message || 'Introuvable'); return; }

  console.log(`  ID            : ${inv.id}`);
  console.log(`  Amount        : ${inv.amount}€`);
  console.log(`  Offer ID      : ${inv.offer_id || 'null'}`);
  console.log(`  Contract ID   : ${inv.contract_id || 'null'}`);
  console.log('\n  billing_data actuel :');
  console.log(JSON.stringify(inv.billing_data, null, 4));

  // ── Vérifier l'offre liée ──────────────────────────────────────────────────
  if (inv.offer_id) {
    const { data: offer } = await sb
      .from('offers')
      .select('id, client_name, status, workflow_status, amount')
      .eq('id', inv.offer_id)
      .single();
    if (offer) {
      console.log(`\n  Offre liée : ${offer.id.slice(0,8)} | client_name=${offer.client_name} | ${offer.amount}€ | status=${offer.status}`);
    }
  }

  // ── Calcul du nouveau billing_data ────────────────────────────────────────
  const currentBD = inv.billing_data || {};
  const newBD = {
    ...currentBD,
    contract_data: {
      ...(currentBD.contract_data || {}),
      client_name:    'ADS Immo SRL',
      client_company: 'ADS Immo SRL',
      dossier:        '180-22627',
    },
  };

  console.log('\n  billing_data corrigé :');
  console.log(JSON.stringify(newBD, null, 4));

  if (APPLY) {
    const { error: updErr } = await sb
      .from('invoices')
      .update({ billing_data: newBD })
      .eq('id', inv.id);
    if (updErr) {
      console.log(`\n  ❌ Erreur : ${updErr.message}`);
    } else {
      console.log('\n  ✅ billing_data mis à jour : ADS Immo SRL');
    }
  } else {
    console.log('\n  → Relance avec --apply pour appliquer\n');
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
