/**
 * fix-billing-clients-2024.js
 *
 * Corrige les noms clients dans billing_data pour toutes les factures leasing 2024.
 * Sources : client_id via offers (auto) + correspondances manuelles confirmées.
 *
 * Corrections appliquées :
 *   — ITC-2024-0002  Bastien Heyderickx     → Bastien Heynderickx  (Apik SRL)
 *   — ITC-2024-0005  Alarmes De Clerck #2   → Thibaud de Clerck    (Alarme De Clerck SRL)
 *   — ITC-2024-0006  Bastien Hendricks      → Bastien Heynderickx  (Apik SRL)
 *   — ITC-2024-0010  Nicolas Ceron          → Xavier Gorskis       (Athénée Royal Saint Ghislain)
 *   — ITC-2024-0016  Nicolas Ceron          → Xavier Gorskis       (Athénée Royal Saint Ghislain)
 *   — ITC-2024-0017  Nicolas Ceron          → Xavier Gorskis       (Athénée Royal Saint Ghislain)
 *   — ITC-2024-0018  Nicolas Ceron          → Xavier Gorskis       (Athénée Royal Saint Ghislain)
 *   — ITC-2024-0020  Bastien Hendricks      → Bastien Heynderickx  (Apik SRL)
 *   — ITC-2024-0029  Alarmes De Clerck #3   → Thibaud de Clerck    (Alarme De Clerck SRL)
 *   — ITC-2024-0070  Nicolas Ceron          → Xavier Gorskis       (Athénée Royal Saint Ghislain)
 *   — ITC-2024-0080  Juan Schmitz           → Juan Schmitz         (SalesRise) [ajout entreprise]
 *   — ITC-2024-0081  Antoine Sottiaux       → Antoine Sottiaux     (LeGrow Studio) [ajout entreprise]
 *   — ITC-2024-0082  Jean-Francois Verlinden→ Jean-Francois Verlinden (Solutions mobilité) [ajout]
 *   — ITC-2024-0085  Frédéric Mizero        → Frédéric Mizero      (normalisation)
 *   — ITC-2024-0086  Xprove SCS #2          → Xprove SCS
 *   — ITC-2024-0089  Be Grateful SRL        → Olivier Ranocha      (Be Grateful SRL)
 *   — ITC-2024-0090  Hubert Halbrecq        → Thibaut Halbrecq     (TalentSquare SRL)
 *   — ITC-2024-0104  Davy Loomans - JNS... → Davy Loomans         (JNS Lightning)
 *   — ITC-2024-0109  Gregory Ilnicki - ... → Gregory Ilnicki      (Infra Route SRL)
 *   — ITC-2024-0111  Nicolas Ceron          → Xavier Gorskis       (Athénée Royal Saint Ghislain)
 *   — ITC-2024-0114  Nicolas Ceron          → Xavier Gorskis       (Athénée Royal Saint Ghislain)
 *   — ITC-2024-0115  Nicolas Ceron          → Xavier Gorskis       (Athénée Royal Saint Ghislain)
 *
 * Usage :
 *   node scripts/fix-billing-clients-2024.js            → dry-run
 *   node scripts/fix-billing-clients-2024.js --apply    → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ─── Table de corrections confirmées ──────────────────────────────────────
// clé = invoice_number
// valeur = { name, company } à mettre dans billing_data
const CORRECTIONS = {
  'ITC-2024-0002':  { name: 'Bastien Heynderickx',  company: 'Apik SRL' },
  'ITC-2024-0005':  { name: 'Thibaud de Clerck',     company: 'Alarme De Clerck SRL' },
  'ITC-2024-0006':  { name: 'Bastien Heynderickx',  company: 'Apik SRL' },
  'ITC-2024-0010':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain' },
  'ITC-2024-0016':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain' },
  'ITC-2024-0017':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain' },
  'ITC-2024-0018':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain' },
  'ITC-2024-0020':  { name: 'Bastien Heynderickx',  company: 'Apik SRL' },
  'ITC-2024-0029':  { name: 'Thibaud de Clerck',     company: 'Alarme De Clerck SRL' },
  'ITC-2024-0070':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain' },
  'ITC-2024-0080':  { name: 'Juan Schmitz',           company: 'SalesRise' },
  'ITC-2024-0081':  { name: 'Antoine Sottiaux',       company: 'LeGrow Studio' },
  'ITC-2024-0082':  { name: 'Jean-Francois Verlinden',company: 'Solutions mobilité' },
  'ITC-2024-0085':  { name: 'Frédéric Mizero',        company: 'MIZERO FREDERIC CONSULTANCE SRL' },
  'ITC-2024-0086':  { name: 'Xprove SCS',             company: '' },
  'ITC-2024-0089':  { name: 'Olivier Ranocha',        company: 'Be Grateful SRL' },
  'ITC-2024-0090':  { name: 'Thibaut Halbrecq',       company: 'TalentSquare SRL' },
  'ITC-2024-0104':  { name: 'Davy Loomans',           company: 'JNS Lightning' },
  'ITC-2024-0109':  { name: 'Gregory Ilnicki',        company: 'Infra Route SRL' },
  'ITC-2024-0111':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain' },
  'ITC-2024-0114':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain' },
  'ITC-2024-0115':  { name: 'Xavier Gorskis',        company: 'Athénée Royal Saint Ghislain' },
};

async function main() {
  console.log(`\n🔧 FIX BILLING CLIENTS 2024 — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // Récupérer toutes les factures concernées
  const invoiceNumbers = Object.keys(CORRECTIONS);
  const { data: invoices, error } = await sb
    .from('invoices')
    .select('id, invoice_number, billing_data')
    .eq('company_id', COMPANY_ID)
    .in('invoice_number', invoiceNumbers)
    .order('invoice_number');

  if (error) { console.error('❌ invoices:', error.message); return; }

  console.log(`Factures trouvées : ${invoices.length} / ${invoiceNumbers.length}\n`);
  console.log(`${'Invoice'.padEnd(22)} ${'Actuel'.padEnd(38)} → ${'Nouveau'.padEnd(35)} ${'Entreprise'}`);
  console.log('─'.repeat(130));

  let nOk = 0, nChanged = 0, nErr = 0;

  for (const inv of invoices) {
    const fix = CORRECTIONS[inv.invoice_number];
    if (!fix) continue;

    const currentName = (
      inv.billing_data?.contract_data?.client_name ||
      inv.billing_data?.client_name || ''
    ).trim();

    const currentCompany = (
      inv.billing_data?.contract_data?.client_company ||
      inv.billing_data?.client_company || ''
    ).trim();

    const nameChanged    = currentName    !== fix.name;
    const companyChanged = currentCompany !== fix.company;
    const changed        = nameChanged || companyChanged;

    const status = changed ? '🔄' : '✅';
    console.log(`${inv.invoice_number.padEnd(22)} ${currentName.padEnd(38)} → ${fix.name.padEnd(35)} ${fix.company}  ${status}`);

    if (!changed) { nOk++; continue; }

    if (!APPLY) { nChanged++; continue; }

    // Patch billing_data
    const newBillingData = {
      ...(inv.billing_data || {}),
      contract_data: {
        ...(inv.billing_data?.contract_data || {}),
        client_name:    fix.name,
        client_company: fix.company,
      },
      client_name:    fix.name,
      client_company: fix.company,
    };

    const { error: ue } = await sb
      .from('invoices')
      .update({ billing_data: newBillingData, updated_at: new Date().toISOString() })
      .eq('id', inv.id);

    if (ue) { console.log(`   ❌ ${inv.invoice_number}: ${ue.message}`); nErr++; }
    else { nChanged++; }
  }

  // Factures manquantes
  const found = new Set(invoices.map(i => i.invoice_number));
  const missing = invoiceNumbers.filter(n => !found.has(n));
  if (missing.length) {
    console.log(`\n⚠️  Non trouvées en DB : ${missing.join(', ')}`);
  }

  console.log('\n' + '─'.repeat(130));
  if (APPLY) {
    console.log(`  ✅ Déjà corrects    : ${nOk}`);
    console.log(`  🔄 Mis à jour       : ${nChanged}`);
    if (nErr) console.log(`  ❌ Erreurs          : ${nErr}`);
  } else {
    console.log(`  ✅ Déjà corrects    : ${nOk}`);
    console.log(`  🔄 À corriger       : ${nChanged}`);
    console.log('\n  → Relance avec --apply pour appliquer\n');
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
