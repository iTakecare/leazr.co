/**
 * fix-billing-clients-2023.js
 *
 * Met à jour billing_data.contract_data (client_name + client_company + client_email)
 * pour les 49 factures ITC-2023 avec écarts, en prenant les vraies valeurs de la DB.
 *
 * Cas spéciaux hardcodés :
 *  - ITC-2023-0020 : "Madalin Draghiceanu" → DM carrelages (vérification manuelle)
 *  - ITC-2023-0024 : "Bastien Heynderickx - Apik #1" → "Bastien Heynderickx" / "Apik SRL"
 *  - ITC-2023-0052 : "Bastien Heynderickx - Apik #2" → "Bastien Heynderickx" / "Apik SRL"
 *  - ITC-2023-0027 : "Prosper Naci" → "Naci-Prosper Ndayishimiye" / "Coach Naci"
 *  - ITC-2023-006x/007x : "Nicolas Ceron" → "AR Saint Ghislain"
 *
 * Usage :
 *   node scripts/fix-billing-clients-2023.js          → dry-run
 *   node scripts/fix-billing-clients-2023.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// Overrides manuels (invoice_number → {name, company, client_id})
// Pour les cas où le client DB ne correspond pas ou le titre stocké est incorrect
const CLIENT_OVERRIDES = {
  // Bastien Heynderickx - nettoyage du suffixe "#1"
  'ITC-2023-0024': { name: 'Bastien Heynderickx', company: 'Apik SRL',    email: '', client_id: '494dfa25-7bef-428f-ab7d-efea33bff4f6' },
  // Bastien Heynderickx - nettoyage du suffixe "#2"
  'ITC-2023-0052': { name: 'Bastien Heynderickx', company: 'Apik SRL',    email: '', client_id: '494dfa25-7bef-428f-ab7d-efea33bff4f6' },
  // Nicolas Ceron → AR Saint Ghislain (cohérence avec 2024)
  'ITC-2023-0064': { name: 'AR Saint Ghislain',   company: '',            email: '', client_id: '8ac70f53-8ee6-4095-b18c-fe67761ceaf2' },
  'ITC-2023-0068': { name: 'AR Saint Ghislain',   company: '',            email: '', client_id: '8ac70f53-8ee6-4095-b18c-fe67761ceaf2' },
  'ITC-2023-0073': { name: 'AR Saint Ghislain',   company: '',            email: '', client_id: '8ac70f53-8ee6-4095-b18c-fe67761ceaf2' },
  'ITC-2023-0074': { name: 'AR Saint Ghislain',   company: '',            email: '', client_id: '8ac70f53-8ee6-4095-b18c-fe67761ceaf2' },
};

// Factures à signaler mais ne pas modifier automatiquement (vérification manuelle)
const MANUAL_CHECK = {};

async function main() {
  console.log(`\n🔧 FIX BILLING CLIENTS 2023 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // Toutes les factures 2023 avec billing_data
  const { data: invoices, error } = await sb
    .from('invoices')
    .select('id, invoice_number, offer_id, billing_data')
    .eq('company_id', COMPANY_ID)
    .like('invoice_number', 'ITC-2023-%')
    .not('billing_data', 'is', null)
    .order('invoice_number');

  if (error) { console.error('❌', error.message); return; }

  // Récupérer offers + clients
  const offerIds = [...new Set(invoices.filter(i => i.offer_id).map(i => i.offer_id))];
  const { data: offers } = await sb.from('offers').select('id, client_id').in('id', offerIds);
  const clientIds = [...new Set((offers||[]).filter(o => o.client_id).map(o => o.client_id))];
  const { data: clients } = await sb.from('clients').select('id, name, company, email').in('id', clientIds);

  const offerMap  = Object.fromEntries((offers||[]).map(o => [o.id, o]));
  const clientMap = Object.fromEntries((clients||[]).map(c => [c.id, c]));

  let nUpdated = 0, nSkipped = 0, nManual = 0;

  for (const inv of invoices) {
    const bd  = inv.billing_data;
    const num = inv.invoice_number;

    if (!bd?.contract_data) continue;

    // Signalement manuel
    if (MANUAL_CHECK[num]) {
      console.log(`  ⚠️  ${num} — vérification manuelle requise`);
      console.log(`       → ${MANUAL_CHECK[num]}`);
      nManual++;
      continue;
    }

    // Override manuel
    let targetName, targetCompany, targetEmail;
    if (CLIENT_OVERRIDES[num]) {
      targetName    = CLIENT_OVERRIDES[num].name;
      targetCompany = CLIENT_OVERRIDES[num].company;
      targetEmail   = CLIENT_OVERRIDES[num].email;
    } else {
      // Prendre depuis la DB via offer → client
      const offer  = inv.offer_id ? offerMap[inv.offer_id] : null;
      const client = offer?.client_id ? clientMap[offer.client_id] : null;
      if (!client) { nSkipped++; continue; }
      targetName    = client.name    || '';
      targetCompany = client.company || '';
      targetEmail   = client.email   || '';
    }

    const storedName    = bd.contract_data.client_name    || '';
    const storedCompany = bd.contract_data.client_company || '';

    const nameOk    = storedName.toLowerCase()    === targetName.toLowerCase();
    const companyOk = storedCompany.toLowerCase() === targetCompany.toLowerCase();

    if (nameOk && companyOk) { nSkipped++; continue; }

    console.log(`  ${APPLY ? '✅' : '🔄'} ${num}`);
    if (!nameOk)    console.log(`       name    : "${storedName}" → "${targetName}"`);
    if (!companyOk) console.log(`       company : "${storedCompany}" → "${targetCompany}"`);

    if (APPLY) {
      const newBd = {
        ...bd,
        contract_data: {
          ...bd.contract_data,
          client_name:    targetName,
          client_company: targetCompany,
          client_email:   targetEmail || bd.contract_data.client_email || '',
        }
      };
      const { error: upErr } = await sb
        .from('invoices')
        .update({ billing_data: newBd, updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      if (upErr) console.log(`       ❌ ${upErr.message}`);
    }
    nUpdated++;
  }

  console.log(`\n══ RÉSUMÉ ══`);
  console.log(`  Mis à jour   : ${nUpdated}`);
  console.log(`  Déjà OK      : ${nSkipped}`);
  console.log(`  Vérif manuelle : ${nManual}`);
  if (!APPLY && nUpdated > 0) console.log(`\n  → Relance avec --apply pour appliquer\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
