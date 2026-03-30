/**
 * fix-itc2024-0081-final.js
 *
 * Finalise le fix pour ITC-2024-0081 (Antoine Sottiaux / LeGrow Studio) :
 * - Le contrat 64716254-8c36-4c66-98e7-f61fea1e8b94 a été créé par fix-pa-leasing-2024.js
 * - L'invoice ne peut pas avoir offer_id=0de098bb (déjà pris par une autre invoice)
 * - Solution : patch uniquement contract_id sur l'invoice (le dashboard utilise contract_id pour le PA)
 * - Créer contract_equipment (PA=1099€) si manquant
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const INVOICE_ID    = '7c71e4c8-dcfc-4abb-b004-1377b2a4b396';  // ITC-2024-0081
const CONTRACT_ID   = '64716254-8c36-4c66-98e7-f61fea1e8b94';  // créé par fix-pa-leasing-2024.js
const INVOICE_DATE  = '2024-08-01';
const PURCHASE_PRICE = 1099.00;
const FA             = 1756.87;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('\n🔧 FIX ITC-2024-0081 FINAL\n');

  // 1. Patch invoice.contract_id (sans toucher offer_id)
  const { error: invErr } = await sb
    .from('invoices')
    .update({ contract_id: CONTRACT_ID, updated_at: new Date().toISOString() })
    .eq('id', INVOICE_ID);

  if (invErr) {
    console.error(`❌ Patch invoice: ${invErr.message}`);
  } else {
    console.log(`✅ invoice.contract_id → ${CONTRACT_ID}`);
  }

  // 2. Vérifier / créer contract_equipment
  const { data: existingCE } = await sb
    .from('contract_equipment')
    .select('id, purchase_price')
    .eq('contract_id', CONTRACT_ID);

  if (existingCE?.length) {
    const totalPA = existingCE.reduce((s, e) => s + (e.purchase_price || 0), 0);
    console.log(`ℹ️  contract_equipment déjà présent (PA=${totalPA}€) — skip`);
  } else {
    const margin = FA - PURCHASE_PRICE;
    const { error: ceErr } = await sb.from('contract_equipment').insert({
      contract_id:     CONTRACT_ID,
      title:           'Voir facture',
      quantity:        1,
      purchase_price:  PURCHASE_PRICE,
      margin:          margin,
      monthly_payment: 0,
    });
    if (ceErr) {
      console.error(`❌ contract_equipment: ${ceErr.message}`);
    } else {
      console.log(`✅ contract_equipment créé: PA=${PURCHASE_PRICE}€, marge=${margin.toFixed(2)}€`);
    }
  }

  console.log('\n→ Lance diagnose-2024.js pour vérifier le PA total\n');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
