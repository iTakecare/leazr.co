/**
 * import-direct-sales.js
 *
 * Importe les factures de vente directe 2023 (non-Grenke) dans Leazr.
 *
 * Pour chaque facture :
 *   1. Cherche le client dans la DB par nom (fuzzy match)
 *   2. Crée une offre (is_purchase=true, workflow_status='financed')
 *   3. Crée les lignes d'équipement (offer_equipment)
 *   4. Crée la facture (invoice_type='purchase')
 *
 * ⚠️ À exécuter depuis le Mac (pas la VM) :
 *   node scripts/import-direct-sales.js --dry-run   ← vérification
 *   node scripts/import-direct-sales.js             ← import réel
 *   node scripts/import-direct-sales.js rollback    ← annuler
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const MANIFEST_PATH        = join(__dirname, 'import-manifest-direct-sales-2023.json');

const args    = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const ROLLBACK = args.includes('rollback');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const INVOICES_DATA = JSON.parse(
  readFileSync(join(__dirname, 'direct-sales-invoices.json'), 'utf-8')
);

// ── Client matching helpers ────────────────────────────────────────────────────
function normalizeStr(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a, b) {
  const ta = new Set(normalizeStr(a).split(' ').filter(w => w.length > 2));
  const tb = new Set(normalizeStr(b).split(' ').filter(w => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  const common = [...ta].filter(x => tb.has(x));
  return common.length / Math.max(ta.size, tb.size);
}

function findBestClient(ref, clients) {
  let best = null, bestScore = 0;
  for (const c of clients) {
    // Try company name and name
    const score = Math.max(
      tokenOverlap(ref, c.company || ''),
      tokenOverlap(ref, c.name || ''),
      tokenOverlap(ref, `${c.name} ${c.company}`)
    );
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 0.6 ? { client: best, score: bestScore } : null;
}

// Manual overrides for known client refs → client names in DB
const CLIENT_OVERRIDES = {
  'PRINTBOX SPRL':                              'PrintBox SRL',      // may appear as SRL not SPRL
  'LE-CHIFFRE':                                 'Le Chiffre SRL',
  'SALES KONSUL':                               'Sales Konsul SRL',
  'Debacker, Anthony':                          'Us BarberShop',     // Anthony Debacker
  'Dereume, Jérôme':                            'Jérôme Dereume',
  'Nizet, Marie-Laure':                         'Marie Laure Nizet',
  'MIG DP S.P.R.L.':                           'Nicolas Breban',    // Mig DP SRL
  'A2Com SRL':                                  'A2Com SRL',
  'ATHENEE ROYAL SAINT GHISLAIN':               'Athénée Royal Saint Ghislain',
  'ALTA TAURUS SL':                             'Alta Taurus SL',
  'Appetito Box PDA - Taverne Lecoq SPRL CA CONSTRUCT- STARTER BVBA': 'Appetito PDA Box - Taverne Lecoq',
  'Appetito Box PDA - Little Italy Pizzeria Mons Little Italy': 'Appetito PDA Box - Little Italy',
  'Appetito Box PDA - Cap Spartel Cap Spartel': 'Appetito PDA Box - Cap Spartel',
  'Appetito PDA Box (Francesco Brancato)':      'Francesco Brancato',
  'Repairo':                                    'Repairo',
  'MA.DE Management':                           'MA.DE Management',
  'DOSSIER 021-202304-0033 OLINN BELGIUM':     'Olinn Belgium',     // B2B leasing company
  'Bouvier-Gaz, Yohann':                       'Yohann Bouvier-Gaz',
};

// Purchase prices from image (achat HTVA) for records without full equipment detail
// Format: invoice_number → { achat: X, items: [{title, purchase_price, selling_price, qty}] }
const PURCHASE_DATA = {
  'ITC-2023-006': { achat: 1569.47,  // Yohann Bouvier-Gaz - MacBook Pro 14" M1 Pro
    items: [{ title: 'Apple MacBook Pro 14" M1 Pro AZERTY 8-core 512GB Space Gray - s/n: KK4CT9D9V9', purchase_price: 1569.47, selling_price: 1570.47, quantity: 1 }]
  },
  // From user's image - PA HTVA values
  'ITC-2023-0009': { achat: 798.48,   // PrintBox iPad 3x
    items: [{ title: 'Apple iPad 10,2\'\' modèle 2020 - 32 Go - Wifi', purchase_price: 266.16, selling_price: 286.16, quantity: 3 }]
  },
  'ITC-2023-0015': { achat: 1046.42,  // Le Chiffre 2 smartphones
    items: null  // Will use PDF data
  },
  'ITC-2023-0022': { achat: 1820.91,  // Sales Konsul - marge 0€ (pas de marge)
    items: null
  },
  'ITC-2023-0028': { achat: 506.16,   // PrintBox 3 smartphones
    items: null
  },
  'ITC-2023-0034': { achat: 3139.67,  // Altataurus MacBook
    items: [{ title: 'Apple Macbook Pro (2023) MNWA3FN/A - 16 pouces - Apple M2 Max', purchase_price: 3139.86, selling_price: 3339.86, quantity: 1 }]
  },
  'ITC-2023-0038': { achat: 4795.93,  // Anthony Debacker 1 mac + 3 smartphones
    items: null
  },
  'ITC-2023-0039': { achat: 350.0,    // Repairo 2 tablettes
    items: [{ title: 'Tablette (réparation)', purchase_price: 175.0, selling_price: 200.0, quantity: 2 }]
  },
  'ITC-2023-0040': { achat: 0.0,      // MA.DE Management - achat 0€
    items: null
  },
  'ITC-2023-0041': { achat: 207.87,   // Cap Spartel 1 smartphone
    items: [{ title: 'Smartphone / Tablette PDA Box', purchase_price: 207.87, selling_price: 299.0, quantity: 1 }]
  },
  'ITC-2023-0031': { achat: 207.87,
    items: [{ title: 'Smartphone / Tablette PDA Box - Taverne Lecoq', purchase_price: 207.87, selling_price: 299.0, quantity: 1 }]
  },
  'ITC-2023-0032': { achat: 207.87,
    items: [{ title: 'Smartphone / Tablette PDA Box - Little Italy', purchase_price: 207.87, selling_price: 299.0, quantity: 1 }]
  },
  'ITC-2023-0054': { achat: 18841.67, // Athénée - 33 PC + 33 écrans + 33 casques + 1 imprimante
    items: null  // Will use PDF data (we have it)
  },
  'ITC-2023-0048': { achat: 204.50,   // Jerome Dereume 1/10
    items: null
  },
  'ITC-2023-0050': { achat: 204.50,
    items: null
  },
  'ITC-2023-0055': { achat: 204.50,
    items: null
  },
  'ITC-2023-0062': { achat: 204.50,
    items: null
  },
  'ITC-2023-0072': { achat: 204.50,
    items: null
  },
  'ITC-2023-0058': { achat: 207.87,   // Brancato Francesco
    items: [{ title: 'Smartphone / Tablette PDA Box - Francesco Brancato', purchase_price: 207.87, selling_price: 299.0, quantity: 1 }]
  },
  'ITC-2023-0059': { achat: 651.85,   // MigDP
    items: null
  },
  'ITC-2023-0065': { achat: 810.0,    // A2Com - marge 0€
    items: null
  },
  'ITC-2023-0069': { achat: 37.87,    // Nizet Marie-Laure
    items: null
  },
  'ITC-2023-0023': { achat: 9975.0,   // Olinn Belgium (estimé)
    items: null
  },
};

// ── Rollback ───────────────────────────────────────────────────────────────────
async function doRollback() {
  console.log('\n🔄 ROLLBACK import-direct-sales-2023');
  if (!existsSync(MANIFEST_PATH)) { console.error('❌ Manifest introuvable'); process.exit(1); }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

  const del = async (table, ids) => {
    if (!ids || ids.length === 0) return;
    const { error } = await sb.from(table).delete().in('id', ids);
    if (error) console.error(`  ❌ Erreur delete ${table}: ${error.message}`);
    else console.log(`  🗑️  ${table}: ${ids.length} supprimés`);
  };

  await del('invoices', manifest.invoices);
  await del('offer_equipment', manifest.offer_equipment);
  await del('offers', manifest.offers);
  console.log('✅ Rollback terminé');
  process.exit(0);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  if (ROLLBACK) { await doRollback(); return; }

  console.log(`\n🛒 IMPORT VENTES DIRECTES 2023 ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}`);
  console.log(`📋 ${INVOICES_DATA.length} factures à traiter\n`);

  // Load all clients for this company
  const { data: allClients, error: clientErr } = await sb
    .from('clients')
    .select('id, name, company, email, vat_number')
    .eq('company_id', COMPANY_ID);

  if (clientErr) { console.error('❌ Erreur clients:', clientErr.message); process.exit(1); }
  console.log(`📦 ${allClients.length} clients chargés depuis DB\n`);

  // Check which invoice_numbers already exist in DB (avoid duplicates)
  const allInvoiceNums = INVOICES_DATA.map(d => d.invoice_number).filter(Boolean);
  const { data: existingInvoices } = await sb
    .from('invoices')
    .select('invoice_number')
    .in('invoice_number', allInvoiceNums);
  const existingNums = new Set((existingInvoices || []).map(i => i.invoice_number));
  console.log(`  Factures déjà en DB: ${existingNums.size}\n`);

  const manifest = { offers: [], offer_equipment: [], invoices: [], created_at: new Date().toISOString() };
  let imported = 0, skipped = 0, errors = 0;

  for (const inv of INVOICES_DATA) {
    const { invoice_number, invoice_date, client_ref, total_htva, tva_rate, equipment } = inv;

    // Skip if already exists
    if (existingNums.has(invoice_number)) {
      console.log(`  ⏭️  ${invoice_number} déjà en DB — skip`);
      skipped++;
      continue;
    }

    // Find client
    const overrideName = CLIENT_OVERRIDES[client_ref] || client_ref;
    let clientMatch = findBestClient(overrideName, allClients);
    if (!clientMatch) clientMatch = findBestClient(client_ref, allClients);

    let clientId = null;
    let clientName = client_ref;

    if (clientMatch) {
      clientId = clientMatch.client.id;
      clientName = clientMatch.client.company || clientMatch.client.name;
      console.log(`  🔍 ${invoice_number} → client: "${clientName}" (score: ${clientMatch.score.toFixed(2)})`);
    } else {
      console.log(`  ⚠️  ${invoice_number} → client "${client_ref}" INTROUVABLE en DB`);
      // We'll import without client_id (use null)
    }

    // Get equipment data (from PDF or from PURCHASE_DATA override)
    const purchaseData = PURCHASE_DATA[invoice_number];
    let equipmentLines = equipment;

    if (purchaseData?.items) {
      // Use manual purchase data for items
      equipmentLines = purchaseData.items;
    } else if (equipmentLines.length === 0) {
      // Create a single summary line
      const achat = purchaseData?.achat || 0;
      equipmentLines = [{
        title: client_ref || 'Équipement',
        serial_number: null,
        quantity: 1,
        unit_price_htva: total_htva,
        total_htva: total_htva,
        tva_pct: tva_rate
      }];
    }

    // Calculate total purchase (achat) price
    const totalAchat = purchaseData?.achat
      || equipmentLines.reduce((s, e) => s + ((e.purchase_price || e.unit_price_htva || 0) * (e.quantity || 1)), 0);

    console.log(`    📄 ${invoice_number} | ${invoice_date} | CA: ${total_htva}€ | Achat: ${totalAchat}€ | ${equipmentLines.length} ligne(s)`);

    if (DRY_RUN) { imported++; continue; }

    try {
      // 1. Create offer
      const offerData = {
        company_id: COMPANY_ID,
        client_id: clientId,
        client_name: clientName,
        workflow_status: 'financed',
        is_purchase: true,
        amount: total_htva,
        monthly_payment: 0,
        remarks: `[import-direct-2023] Facture ${invoice_number}`,
        created_at: invoice_date ? new Date(invoice_date).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: offer, error: offerErr } = await sb
        .from('offers')
        .insert(offerData)
        .select('id')
        .single();

      if (offerErr) throw new Error(`Offer insert: ${offerErr.message}`);
      manifest.offers.push(offer.id);

      // 2. Create equipment lines
      for (const item of equipmentLines) {
        const sellingPrice = item.selling_price || item.unit_price_htva || 0;
        const purchasePrice = item.purchase_price || (purchaseData?.achat
          ? purchaseData.achat / equipmentLines.reduce((s, e) => s + (e.quantity || 1), 0)
          : sellingPrice);
        const marginPct = sellingPrice > 0
          ? Math.round((sellingPrice - purchasePrice) / sellingPrice * 100)
          : 0;
        const monthlyPayment = 0; // Direct sale, no monthly payment

        const eqData = {
          offer_id: offer.id,
          title: item.title,
          purchase_price: purchasePrice,
          selling_price: sellingPrice,
          quantity: item.quantity || 1,
          margin: marginPct,
          monthly_payment: monthlyPayment,
          serial_number: item.serial_number || null,
          duration: 0,
          order_status: 'delivered',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: eq, error: eqErr } = await sb
          .from('offer_equipment')
          .insert(eqData)
          .select('id')
          .single();

        if (eqErr) throw new Error(`Equipment insert: ${eqErr.message}`);
        manifest.offer_equipment.push(eq.id);
      }

      // 3. Create invoice
      const invoiceData = {
        company_id: COMPANY_ID,
        offer_id: offer.id,
        contract_id: null,
        invoice_type: 'purchase',
        invoice_number: invoice_number,
        amount: total_htva,
        status: 'paid',
        leaser_name: 'Direct',
        integration_type: 'direct',
        invoice_date: invoice_date,
        created_at: invoice_date ? new Date(invoice_date).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        billing_data: {
          client_ref,
          client_vat: inv.client_vat,
          tva_rate,
          total_htva,
          equipment: equipmentLines,
          imported: true,
          source: 'import-direct-sales-2023'
        }
      };

      const { data: invoice, error: invoiceErr } = await sb
        .from('invoices')
        .insert(invoiceData)
        .select('id')
        .single();

      if (invoiceErr) throw new Error(`Invoice insert: ${invoiceErr.message}`);
      manifest.invoices.push(invoice.id);

      console.log(`    ✅ Importé: offer=${offer.id.slice(0,8)}... invoice=${invoice.id.slice(0,8)}...`);
      imported++;

    } catch (err) {
      console.error(`    ❌ Erreur pour ${invoice_number}: ${err.message}`);
      errors++;
    }
  }

  // Save manifest
  if (!DRY_RUN) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n💾 Manifest sauvegardé: ${MANIFEST_PATH}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`  ✅ Importées   : ${imported}`);
  console.log(`  ⏭️  Ignorées    : ${skipped}`);
  console.log(`  ❌ Erreurs     : ${errors}`);
  if (DRY_RUN) console.log('\n  (mode dry-run : aucune modification effectuée)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
