/**
 * diagnose-august-contracts.js
 *
 * Trouve les invoices d'août 2023 en DB, leur contract_equipment,
 * et identifie les dossiers 180-19681 (Davy Loomans) et 180-19695 (William Elong).
 * Aussi cherche les records protégés Février (ITC-2023-007/008).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

  // ── 1. Toutes les invoices 2023 avec company_id ───────────────────────────
  const { data: all2023 } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, contract_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-12-31')
    .order('invoice_date');

  console.log(`\n📋 ${all2023?.length || 0} invoices 2023 avec company_id`);
  for (const inv of all2023 || []) {
    console.log(`  ${inv.invoice_number?.padEnd(25) || '?'.padEnd(25)} date=${inv.invoice_date?.substring(0,10)}  montant=${(inv.amount||0).toFixed(2).padStart(10)}€  contract=${inv.contract_id?.substring(0,8)||'null'}…`);
  }

  // ── 2. Invoices Août (mois 8) ────────────────────────────────────────────
  const aoutInvs = (all2023 || []).filter(i => {
    const m = new Date(i.invoice_date).getUTCMonth() + 1;
    return m === 8;
  });

  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`AOÛT : ${aoutInvs.length} invoice(s)`);
  console.log(`══════════════════════════════════════════════════════════`);

  for (const inv of aoutInvs) {
    console.log(`\n  Invoice: ${inv.invoice_number}  montant=${inv.amount}€  contract=${inv.contract_id}`);

    if (inv.contract_id) {
      // Get contract → offer → dossier_number
      const { data: contract } = await sb.from('contracts')
        .select('id, offer_id')
        .eq('id', inv.contract_id)
        .single();

      if (contract?.offer_id) {
        const { data: offer } = await sb.from('offers')
          .select('id, dossier_number, client_name')
          .eq('id', contract.offer_id)
          .single();
        console.log(`  Dossier: ${offer?.dossier_number}  Client: ${offer?.client_name}`);
      }

      const { data: ceRows } = await sb.from('contract_equipment')
        .select('id, title, quantity, purchase_price, actual_purchase_price')
        .eq('contract_id', inv.contract_id);

      const total = (ceRows||[]).reduce((s, e) =>
        s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity||1), 0);
      console.log(`  contract_equipment: ${ceRows?.length||0} lignes, total=${total.toFixed(2)}€`);
      for (const e of ceRows||[]) {
        const pp = e.actual_purchase_price ?? e.purchase_price ?? 0;
        console.log(`    [${e.id.substring(0,8)}] ${(e.title||'?').substring(0,40).padEnd(40)} qty=${e.quantity}  pp=${pp.toFixed(2)}€`);
      }
    }
  }

  // ── 3. Cherche les dossiers Août par dossier_number dans offers ──────────
  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`RECHERCHE par dossier_number :`);
  for (const dn of ['180-19681', '180-19695']) {
    const { data: offers } = await sb.from('offers').select('id, dossier_number, client_name').eq('dossier_number', dn);
    if (offers?.length) {
      console.log(`  ✅ ${dn}: offre trouvée → ${offers[0].id.substring(0,8)}… client=${offers[0].client_name}`);
    } else {
      // Try partial search
      const { data: likeOffers } = await sb.from('offers').select('id, dossier_number, client_name').ilike('dossier_number', `%19681%`);
      const { data: likeOffers2 } = await sb.from('offers').select('id, dossier_number, client_name').ilike('dossier_number', `%19695%`);
      console.log(`  ❌ ${dn}: introuvable`);
      if (likeOffers?.length) console.log(`     Similaires 19681: ${likeOffers.map(o=>o.dossier_number).join(', ')}`);
      if (likeOffers2?.length) console.log(`     Similaires 19695: ${likeOffers2.map(o=>o.dossier_number).join(', ')}`);
    }
  }

  // ── 4. Invoices Février (pour trouver ITC-2023-007/008) ──────────────────
  const fevInvs = (all2023 || []).filter(i => {
    const m = new Date(i.invoice_date).getUTCMonth() + 1;
    return m === 2;
  });

  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`FÉVRIER : ${fevInvs.length} invoice(s)`);
  console.log(`══════════════════════════════════════════════════════════`);

  for (const inv of fevInvs) {
    console.log(`\n  Invoice: ${inv.invoice_number}  montant=${inv.amount}€  contract=${inv.contract_id}`);

    if (inv.contract_id) {
      const { data: ceRows } = await sb.from('contract_equipment')
        .select('id, title, quantity, purchase_price, actual_purchase_price')
        .eq('contract_id', inv.contract_id);

      const total = (ceRows||[]).reduce((s, e) =>
        s + (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity||1), 0);
      console.log(`  CE total: ${total.toFixed(2)}€ (${ceRows?.length||0} lignes)`);
      for (const e of ceRows||[]) {
        const pp = e.actual_purchase_price ?? e.purchase_price ?? 0;
        console.log(`    [${e.id.substring(0,8)}] ${(e.title||'?').substring(0,40).padEnd(40)} qty=${e.quantity}  pp=${pp.toFixed(2)}€`);
      }
    }
  }

  // ── 5. Cherche invoice_type pour tout 2023 ────────────────────────────────
  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`INVOICE TYPES 2023 :`);
  const { data: withTypes } = await sb
    .from('invoices')
    .select('invoice_number, invoice_type, invoice_date, amount, company_id')
    .gte('invoice_date', '2023-01-01')
    .lte('invoice_date', '2023-12-31')
    .order('invoice_date');

  for (const inv of withTypes || []) {
    const hasCompany = inv.company_id === COMPANY_ID ? '✅' : '❌';
    console.log(`  ${hasCompany} ${(inv.invoice_number||'?').padEnd(25)} type=${inv.invoice_type?.padEnd(15)||'null           '}  date=${inv.invoice_date?.substring(0,10)}  montant=${(inv.amount||0).toFixed(2)}€`);
  }
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
