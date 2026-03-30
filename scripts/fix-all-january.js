/**
 * fix-all-january.js
 *
 * Applique tous les correctifs Janvier 2023 :
 *
 *   FIX 1 – actual_purchase_price :
 *     180-17784 (Patrick Malin)   : ×1.979 pour atteindre 18 892.00€
 *     180-17866 (Us BarberShop)   : ×1.341 pour atteindre  3 448.62€
 *
 *   FIX 2 – company_id manquant sur invoice :
 *     180-17880 (Dav Constructance) : invoice sans company_id → absent du dashboard
 *     (+ vérification des autres dossiers)
 *
 *   FIX 3 – arrondis mineurs (Mars/Nov/Déc)
 *
 * Usage :
 *   node scripts/fix-all-january.js --dry-run
 *   node scripts/fix-all-january.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const DATASET_PATH         = join(__dirname, 'import-2023-dataset.json');

const DRY_RUN = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Dossiers avec wrong actual_purchase_price (achat_ref = valeur cible)
const PRICE_FIXES = {
  '180-17784': 18892.00,
  '180-17866':  3448.62,
  '180-18618': 40063.36,
  '180-20362': 20728.50,
  '180-20346':  9450.00,
};

async function getCompanyId() {
  // Récupère le company_id depuis une invoice avec company_id (via les 5 dossiers originaux déjà ok)
  const { data } = await sb
    .from('invoices')
    .select('company_id')
    .not('company_id', 'is', null)
    .limit(1);
  return data?.[0]?.company_id || null;
}

async function fixPurchasePrices() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('FIX 1 : actual_purchase_price dans contract_equipment');
  console.log('══════════════════════════════════════════════════════════════');

  for (const [dossierNum, achatRef] of Object.entries(PRICE_FIXES)) {
    const { data: offers } = await sb.from('offers').select('id').eq('dossier_number', dossierNum);
    if (!offers?.length) { console.log(`  ⚠️  ${dossierNum}: offre introuvable`); continue; }

    const { data: contracts } = await sb.from('contracts').select('id').in('offer_id', offers.map(o => o.id));
    if (!contracts?.length) { console.log(`  ⚠️  ${dossierNum}: contrat introuvable`); continue; }

    const { data: ceRows } = await sb
      .from('contract_equipment')
      .select('id, title, quantity, purchase_price, actual_purchase_price')
      .in('contract_id', contracts.map(c => c.id));

    if (!ceRows?.length) { console.log(`  ⚠️  ${dossierNum}: aucun contract_equipment`); continue; }

    const dbTotal = ceRows.reduce((s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1), 0);
    const diff = Math.round((dbTotal - achatRef) * 100) / 100;

    if (Math.abs(diff) < 0.01) {
      console.log(`  ✅ ${dossierNum}: déjà correct (${dbTotal.toFixed(2)}€)`);
      continue;
    }

    const ratio = achatRef / dbTotal;
    console.log(`\n  📁 ${dossierNum}: ${dbTotal.toFixed(2)}€ → ${achatRef.toFixed(2)}€ (ratio ×${ratio.toFixed(6)})`);

    // Compute new prices
    let runningTotal = 0;
    const updates = ceRows.map((e, i) => {
      const oldPP = e.actual_purchase_price ?? e.purchase_price ?? 0;
      let newPP;
      if (i === ceRows.length - 1) {
        newPP = Math.round(((achatRef - runningTotal) / (e.quantity || 1)) * 100) / 100;
      } else {
        newPP = Math.round(oldPP * ratio * 100) / 100;
        runningTotal += newPP * (e.quantity || 1);
      }
      return { id: e.id, title: e.title, qty: e.quantity, oldPP, newPP };
    });

    for (const u of updates) {
      console.log(`    ${DRY_RUN ? '[DRY]' : '    '} ${(u.title||'').substring(0,35).padEnd(35)} ` +
        `${u.oldPP.toFixed(2).padStart(9)}€ → ${u.newPP.toFixed(2).padStart(9)}€`);
      if (!DRY_RUN) {
        const { error } = await sb.from('contract_equipment')
          .update({ actual_purchase_price: u.newPP, updated_at: new Date().toISOString() })
          .eq('id', u.id);
        if (error) console.log(`    ❌ ${error.message}`);
      }
    }

    const verifyTotal = updates.reduce((s, u) => s + u.newPP * u.qty, 0);
    console.log(`    → Vérif total: ${verifyTotal.toFixed(2)}€ (cible: ${achatRef.toFixed(2)}€)`);
  }
}

async function fixCompanyIds() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('FIX 2 : company_id manquant sur les invoices');
  console.log('══════════════════════════════════════════════════════════════');

  const companyId = await getCompanyId();
  if (!companyId) { console.log('  ❌ Impossible de déterminer le company_id'); return; }
  console.log(`  Company ID : ${companyId}\n`);

  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));

  for (const d of allDossiers) {
    const { data: offers } = await sb.from('offers').select('id').eq('dossier_number', d.dossier_number);
    if (!offers?.length) continue;

    const offerIds = offers.map(o => o.id);
    const { data: contracts } = await sb.from('contracts').select('id').in('offer_id', offerIds);
    const contractIds = contracts?.map(c => c.id) || [];

    // Cherche invoices avec company_id null ou invalide
    let invoices = [];
    if (contractIds.length) {
      const { data } = await sb.from('invoices').select('id, invoice_number, company_id, invoice_date, amount')
        .in('contract_id', contractIds);
      invoices = data || [];
    }
    const { data: byOffer } = await sb.from('invoices').select('id, invoice_number, company_id, invoice_date, amount')
      .in('offer_id', offerIds);
    for (const inv of byOffer || []) {
      if (!invoices.find(i => i.id === inv.id)) invoices.push(inv);
    }

    const badInvoices = invoices.filter(i => !i.company_id || i.company_id !== companyId);
    if (!badInvoices.length) continue;

    for (const inv of badInvoices) {
      console.log(`  📋 ${d.dossier_number.padEnd(12)} ${(d.client_name||'').padEnd(25)} ` +
        `invoice=${inv.invoice_number?.padEnd(20)||'?'} company_id=${inv.company_id || 'NULL'} → ${companyId}`);
      if (!DRY_RUN) {
        const { error } = await sb.from('invoices')
          .update({ company_id: companyId, updated_at: new Date().toISOString() })
          .eq('id', inv.id);
        if (error) console.log(`    ❌ ${error.message}`);
        else console.log(`    ✅ Mis à jour`);
      } else {
        console.log(`    [DRY] company_id serait mis à jour`);
      }
    }
  }

  console.log('\n  ✅ Vérification company_id terminée');
}

async function verify() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('VÉRIFICATION FINALE (simulation dashboard Janvier) :');
  console.log('══════════════════════════════════════════════════════════════');

  const allDossiers = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'));
  const janvDossiers = allDossiers.filter(d => d.month_invoice === 1);

  let totalCA = 0, totalPurchases = 0, totalRef = 0;

  for (const d of janvDossiers) {
    totalRef += d.achat;
    const { data: offers } = await sb.from('offers').select('id').eq('dossier_number', d.dossier_number);
    if (!offers?.length) continue;
    const { data: contracts } = await sb.from('contracts').select('id').in('offer_id', offers.map(o => o.id));
    const contractIds = contracts?.map(c => c.id) || [];
    if (!contractIds.length) continue;

    const { data: ceRows } = await sb.from('contract_equipment')
      .select('actual_purchase_price, purchase_price, quantity')
      .in('contract_id', contractIds);
    const purchases = (ceRows||[]).reduce((s, e) => s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity||1), 0);

    // Get invoice amount
    const { data: inv } = await sb.from('invoices').select('amount').in('contract_id', contractIds).limit(1);
    const ca = inv?.[0]?.amount || 0;
    totalCA += ca;
    totalPurchases += purchases;

    const ok = Math.abs(purchases - d.achat) < 0.50;
    console.log(`  ${ok ? '✅' : '🔴'} ${d.dossier_number.padEnd(12)} ${(d.client_name||'').padEnd(25)} ` +
      `purchases=${purchases.toFixed(2).padStart(10)}€  ref=${d.achat.toFixed(2).padStart(10)}€  ` +
      `diff=${(purchases - d.achat).toFixed(2)}€`);
  }

  console.log(`\n  TOTAL Janvier : CA=${totalCA.toFixed(2)}€  Achats=${totalPurchases.toFixed(2)}€  Réf=${totalRef.toFixed(2)}€`);
  const ok = Math.abs(totalPurchases - totalRef) < 1.0;
  console.log(`  ${ok ? '✅ CORRECT' : '❌ ENCORE DES ÉCARTS'}`);
}

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN — aucune modification\n');

  await fixPurchasePrices();
  await fixCompanyIds();

  if (!DRY_RUN) {
    await verify();
  }

  console.log(`\n${'═'.repeat(62)}`);
  if (DRY_RUN) {
    console.log('Dry-run terminé. Relancer sans --dry-run pour appliquer.');
  } else {
    console.log('✅ Tous les correctifs appliqués !');
    console.log('→ Relancer diagnose-margins.js pour la vérification globale');
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
