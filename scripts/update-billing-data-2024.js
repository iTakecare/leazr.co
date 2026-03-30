/**
 * update-billing-data-2024.js
 *
 * Met à jour billing_data et contract_equipment.title pour toutes les factures
 * leasing 2024, en combinant :
 *   — Les équipements + numéros de série extraits des PDFs Grenke (JSON)
 *   — Les données client DB (via offer.client_id + corrections manuelles)
 *   — Les données contrat DB (contract_id, offer_id, status)
 *
 * Structure billing_data résultante :
 *   leaser_data     : infos Grenke
 *   contract_data   : id, offer_id, created_at, status, client_name, client_email
 *   equipment_data  : [{title, serial_number, selling_price_excl_vat, quantity}]
 *   invoice_totals  : {total_excl_vat, vat_amount, total_incl_vat}
 *
 * Usage :
 *   node scripts/update-billing-data-2024.js            → dry-run
 *   node scripts/update-billing-data-2024.js --apply    → applique
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const JSON_PATH            = new URL('./grenke-equipment-2024.json', import.meta.url).pathname;
const VAT_RATE             = 0.21;

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ── Corrections manuelles de clients (nom dans billing_data → {name, company, clientId}) ──
// clientId = id dans la table clients (pour cohérence)
const CLIENT_OVERRIDES = {
  // invoice_number → {name, company, client_id}
  'ITC-2024-0002':  { name: 'Bastien Heynderickx',  company: 'Apik SRL',                         client_id: '494dfa25-7bef-428f-ab7d-efea33bff4f6' },
  'ITC-2024-0005':  { name: 'Thibaud de Clerck',     company: 'Alarme De Clerck SRL',              client_id: null },
  'ITC-2024-0006':  { name: 'Bastien Heynderickx',  company: 'Apik SRL',                         client_id: '494dfa25-7bef-428f-ab7d-efea33bff4f6' },
  'ITC-2024-0010':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain',     client_id: '50871de4-272b-45fd-8baa-2d1f0facafe3' },
  'ITC-2024-0016':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain',     client_id: '50871de4-272b-45fd-8baa-2d1f0facafe3' },
  'ITC-2024-0017':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain',     client_id: '50871de4-272b-45fd-8baa-2d1f0facafe3' },
  'ITC-2024-0018':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain',     client_id: '50871de4-272b-45fd-8baa-2d1f0facafe3' },
  'ITC-2024-0020':  { name: 'Bastien Heynderickx',  company: 'Apik SRL',                         client_id: '494dfa25-7bef-428f-ab7d-efea33bff4f6' },
  'ITC-2024-0029':  { name: 'Thibaud de Clerck',     company: 'Alarme De Clerck SRL',              client_id: null },
  'ITC-2024-0070':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain',     client_id: '50871de4-272b-45fd-8baa-2d1f0facafe3' },
  'ITC-2024-0080':  { name: 'Juan Schmitz',           company: 'SalesRise',                        client_id: '9bdcc714-9933-48fd-a728-bae74e5d56a6' },
  'ITC-2024-0081':  { name: 'Antoine Sottiaux',       company: 'LeGrow Studio',                    client_id: 'adabeb0e-824d-4ea3-bc1f-c59e812ad53e' },
  'ITC-2024-0082':  { name: 'Jean-Francois Verlinden',company: 'Solutions mobilité',               client_id: '698d5ece-9384-495d-a5ac-bfc045bea993' },
  'ITC-2024-0085':  { name: 'Frédéric Mizero',        company: 'MIZERO FREDERIC CONSULTANCE SRL',  client_id: null },
  'ITC-2024-0086':  { name: 'Xprove SCS',             company: '',                                 client_id: null },
  'ITC-2024-0089':  { name: 'Olivier Ranocha',        company: 'Be Grateful SRL',                 client_id: null },
  'ITC-2024-0090':  { name: 'Thibaut Halbrecq',       company: 'TalentSquare SRL',                client_id: '603dcba7-d1c7-4a78-9098-a1bca1bb1766' },
  'ITC-2024-0104':  { name: 'Davy Loomans',           company: 'JNS Lightning',                   client_id: 'be4dba3c-6458-4591-95d8-b65e30e39537' },
  'ITC-2024-0109':  { name: 'Gregory Ilnicki',        company: 'Infra Route SRL',                  client_id: 'c1da41be-792a-4fbc-ac68-6a20b1ddfe6e' },
  'ITC-2024-0111':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain',     client_id: '50871de4-272b-45fd-8baa-2d1f0facafe3' },
  'ITC-2024-0114':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain',     client_id: '50871de4-272b-45fd-8baa-2d1f0facafe3' },
  'ITC-2024-0115':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain',     client_id: '50871de4-272b-45fd-8baa-2d1f0facafe3' },
};

function buildEquipmentTitle(items) {
  if (!items || items.length === 0) return 'Équipement';
  if (items.length === 1) {
    const it = items[0];
    const sn = (it.serial_number || []).join(', ');
    return it.title + (sn ? ` | SN: ${sn}` : '');
  }
  // Plusieurs items : résumé
  return items.map(it => {
    const sn = (it.serial_number || []).join(', ');
    return it.title + (sn ? ` | SN: ${sn}` : '');
  }).join(' / ');
}

async function main() {
  console.log(`\n🔧 UPDATE BILLING DATA 2024 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── Charger JSON équipements ──────────────────────────────────────────
  let equipmentJson;
  try {
    equipmentJson = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  } catch (e) {
    console.error(`❌ Impossible de lire ${JSON_PATH}:`, e.message);
    return;
  }
  console.log(`  📄 JSON chargé: ${Object.keys(equipmentJson).length} factures\n`);

  // ── Factures leasing 2024 ─────────────────────────────────────────────
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, invoice_number, offer_id, contract_id, billing_data, invoice_date')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_type', 'leasing')
    .gte('invoice_date', '2024-01-01')
    .lte('invoice_date', '2024-12-31')
    .order('invoice_number');

  // ── Offers ────────────────────────────────────────────────────────────
  const offerIds = [...new Set(invoices.map(i => i.offer_id).filter(Boolean))];
  const { data: offers } = offerIds.length
    ? await sb.from('offers').select('id, client_id, client_name, dossier_number').in('id', offerIds)
    : { data: [] };
  const offerMap = new Map((offers || []).map(o => [o.id, o]));

  // ── Clients ───────────────────────────────────────────────────────────
  const clientIds = [...new Set([
    ...(offers || []).map(o => o.client_id),
    ...Object.values(CLIENT_OVERRIDES).map(c => c.client_id),
  ].filter(Boolean))];
  const { data: clients } = clientIds.length
    ? await sb.from('clients').select('id, name, company, email, first_name, last_name').in('id', clientIds)
    : { data: [] };
  const clientMap = new Map((clients || []).map(c => [c.id, c]));

  // ── Contracts ─────────────────────────────────────────────────────────
  const contractIds = [...new Set(invoices.map(i => i.contract_id).filter(Boolean))];
  const { data: contracts } = contractIds.length
    ? await sb.from('contracts').select('id, offer_id, created_at, status').in('id', contractIds)
    : { data: [] };
  const contractMap = new Map((contracts || []).map(c => [c.id, c]));

  // ── Contract_equipment ────────────────────────────────────────────────
  const { data: ceRows } = contractIds.length
    ? await sb.from('contract_equipment').select('id, contract_id, title, purchase_price, quantity, margin, monthly_payment').in('contract_id', contractIds)
    : { data: [] };
  // Group by contract_id
  const ceMap = new Map();
  for (const row of (ceRows || [])) {
    if (!ceMap.has(row.contract_id)) ceMap.set(row.contract_id, []);
    ceMap.get(row.contract_id).push(row);
  }

  // ── Traitement ────────────────────────────────────────────────────────
  let nUpdated = 0, nSkipped = 0, nMissing = 0, nErrors = 0;

  console.log(`${'Invoice'.padEnd(22)} ${'Client'.padEnd(30)} ${'Équipements'.padEnd(6)} ${'Total'.padEnd(12)} Statut`);
  console.log('─'.repeat(90));

  for (const inv of invoices) {
    const pdfData = equipmentJson[inv.invoice_number];
    if (!pdfData) {
      console.log(`${inv.invoice_number.padEnd(22)} ${''.padEnd(30)} — ${''.padEnd(12)} ⚠️  pas dans JSON`);
      nMissing++;
      continue;
    }

    const offer    = offerMap.get(inv.offer_id);
    const contract = contractMap.get(inv.contract_id);

    // ── Résoudre client ────────────────────────────────────────────────
    let clientName    = '';
    let clientCompany = '';
    let clientEmail   = '';

    const override = CLIENT_OVERRIDES[inv.invoice_number];
    if (override) {
      const dbClient = override.client_id ? clientMap.get(override.client_id) : null;
      clientName    = override.name;
      clientCompany = override.company;
      clientEmail   = dbClient?.email || '';
    } else if (offer?.client_id) {
      const dbClient = clientMap.get(offer.client_id);
      if (dbClient) {
        clientName    = dbClient.name || `${dbClient.first_name || ''} ${dbClient.last_name || ''}`.trim();
        clientCompany = dbClient.company || '';
        clientEmail   = dbClient.email || '';
      } else {
        clientName = offer.client_name || '';
      }
    } else {
      // Fallback: garder le nom actuel
      clientName    = inv.billing_data?.contract_data?.client_name || offer?.client_name || '';
      clientCompany = inv.billing_data?.contract_data?.client_company || '';
      clientEmail   = inv.billing_data?.contract_data?.client_email || '';
    }

    // ── Construire billing_data ────────────────────────────────────────
    const equipmentData = pdfData.equipment_data || [];
    const totalExclVat  = Math.round(equipmentData.reduce((s, it) => s + it.selling_price_excl_vat * it.quantity, 0) * 100) / 100;

    const newBillingData = {
      leaser_data: pdfData.leaser_data,
      contract_data: {
        id:         contract?.id        || inv.contract_id || null,
        offer_id:   contract?.offer_id  || inv.offer_id    || null,
        created_at: contract?.created_at || null,
        status:     contract?.status    || 'active',
        client_name:    clientName,
        client_company: clientCompany,
        client_email:   clientEmail,
      },
      equipment_data: equipmentData,
      invoice_totals: {
        total_excl_vat: totalExclVat,
        vat_amount:     Math.round(totalExclVat * VAT_RATE * 100) / 100,
        total_incl_vat: Math.round(totalExclVat * (1 + VAT_RATE) * 100) / 100,
      },
    };

    console.log(`${inv.invoice_number.padEnd(22)} ${(clientName + (clientCompany ? ` (${clientCompany})` : '')).substring(0,29).padEnd(30)} ${String(equipmentData.length).padEnd(6)} ${totalExclVat.toFixed(2).padEnd(12)} 🔄`);

    if (!APPLY) { nSkipped++; continue; }

    // ── Mettre à jour billing_data ─────────────────────────────────────
    const { error: invErr } = await sb
      .from('invoices')
      .update({ billing_data: newBillingData, updated_at: new Date().toISOString() })
      .eq('id', inv.id);

    if (invErr) {
      console.log(`  ❌ billing_data: ${invErr.message}`);
      nErrors++;
      continue;
    }

    // ── Mettre à jour contract_equipment.title ─────────────────────────
    if (inv.contract_id && equipmentData.length > 0) {
      const existingCe = ceMap.get(inv.contract_id) || [];

      if (existingCe.length === 1 && equipmentData.length === 1) {
        // 1 ligne CE, 1 équipement PDF → mise à jour directe du titre
        const it  = equipmentData[0];
        const sn  = (it.serial_number || []).join(', ');
        const newTitle = it.title + (sn ? ` | SN: ${sn}` : '');
        await sb.from('contract_equipment')
          .update({ title: newTitle, updated_at: new Date().toISOString() })
          .eq('id', existingCe[0].id);

      } else if (existingCe.length === 1 && equipmentData.length > 1) {
        // 1 ligne CE, plusieurs équipements → concatener dans le titre
        const newTitle = buildEquipmentTitle(equipmentData);
        await sb.from('contract_equipment')
          .update({ title: newTitle, updated_at: new Date().toISOString() })
          .eq('id', existingCe[0].id);
      }
      // Si plusieurs lignes CE et plusieurs équipements → on laisse tel quel
    }

    nUpdated++;
  }

  console.log('\n' + '─'.repeat(90));
  if (APPLY) {
    console.log(`  ✅ Mis à jour    : ${nUpdated}`);
    console.log(`  ⚠️  Pas dans JSON : ${nMissing}`);
    if (nErrors) console.log(`  ❌ Erreurs       : ${nErrors}`);
  } else {
    console.log(`  🔄 À mettre à jour : ${invoices.length - nMissing}`);
    console.log(`  ⚠️  Pas dans JSON  : ${nMissing}`);
    console.log(`\n  → Relance avec --apply pour appliquer\n`);
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
