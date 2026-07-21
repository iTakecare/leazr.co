/**
 * create-demo-client-env.mjs
 *
 * Crée un environnement CLIENT DE DÉMO complet pour les présentations prospects :
 *   - Client "NovaTech Consulting" (has_custom_catalog = true)
 *   - Compte de connexion client (email + mot de passe, sans email d'activation)
 *   - 8 collaborateurs (employés + freelances)
 *   - 2 contrats actifs avec 24 équipements (MacBooks, PC portables, fixes, accessoires)
 *     → ~15 assignés à des collaborateurs, ~9 non assignés (pour démo drag & drop)
 *   - 1 demande en cours (5× MacBook Air) visible dans "Mes demandes"
 *   - Catalogue sur mesure : 15 produits avec prix démo (base × PRICE_FACTOR) via
 *     client_custom_prices + client_custom_variant_prices sur toutes leurs variantes
 *
 * Réexécutable sans doublons : relancer --apply met à jour les prix du catalogue
 * (utile après changement de PRICE_FACTOR) sans recréer contrats ni demandes.
 *
 * Usage :
 *   node scripts/create-demo-client-env.mjs            → dry-run (montre ce qui sera créé)
 *   node scripts/create-demo-client-env.mjs --apply    → crée tout
 *   node scripts/create-demo-client-env.mjs --cleanup  → supprime tout l'environnement démo
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
// Les contrats/offres démo sont rattachés à "Broker Demo" (société fantôme) pour ne pas
// polluer les vues admin iTakecare (listes, dashboards, KPI filtrent par company_id).
// Le client, lui, y accède via client_id (RLS auth_client_ids) — la démo reste intacte.
const SHADOW_COMPANY_ID    = '0d405693-6880-4f88-b857-f659c8912ffe';
const ADMIN_USER_ID        = '673c3806-1584-495b-a148-ae298639aa65';
const LEASER_ID            = 'd60b86d7-a129-4a17-a877-e8e5caa66949'; // Grenke Lease

const APPLY   = process.argv.includes('--apply');
const CLEANUP = process.argv.includes('--cleanup');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ────────────────────────────────────────────────────────────
// Configuration de la démo
// ────────────────────────────────────────────────────────────
const DEMO = {
  client: {
    name: 'NovaTech Consulting',
    company: 'NovaTech Consulting SRL',
    email: 'demo.novatech@leazr.co',
    first_name: 'Claire',
    last_name: 'Fontaine',
    contact_name: 'Claire Fontaine',
    phone: '+32 471 12 34 56',
    address: 'Avenue Louise 149',
    city: 'Bruxelles',
    postal_code: '1050',
    country: 'BE',
    status: 'active',
    has_custom_catalog: true,
    company_id: COMPANY_ID,
    notes: 'ENVIRONNEMENT DE DÉMO — créé par scripts/create-demo-client-env.mjs. Ne pas facturer.',
  },
  password: 'DemoLeazr2026!',
};

const COLLABORATORS = [
  { name: 'Claire Fontaine',  role: 'CEO',                    email: 'claire@novatech-demo.be', is_primary: true },
  { name: 'Thomas Meunier',   role: 'Développeur senior',     email: 'thomas@novatech-demo.be' },
  { name: 'Sarah El Amrani',  role: 'Designer UX',            email: 'sarah@novatech-demo.be' },
  { name: 'Julien Petit',     role: 'Développeur (freelance)', email: 'julien@novatech-demo.be' },
  { name: 'Emma Verhoeven',   role: 'Marketing manager',      email: 'emma@novatech-demo.be' },
  { name: 'Nicolas Dumont',   role: 'Data analyst (freelance)', email: 'nicolas@novatech-demo.be' },
  { name: 'Laura Rossi',      role: 'Office manager',         email: 'laura@novatech-demo.be' },
  { name: 'Maxime Charlier',  role: 'Développeur (freelance)', email: 'maxime@novatech-demo.be' },
];

// assignTo = index dans COLLABORATORS, null = non assigné (pour la démo d'attribution)
const CONTRACT_1_EQUIPMENT = [
  { title: 'MacBook Pro 14 M4 16Go/512Go',        sn: 'C02T4NOVA001', monthly: 62.95, price: 1179, assignTo: 0 },
  { title: 'MacBook Pro 14 M4 16Go/512Go',        sn: 'C02T4NOVA002', monthly: 62.95, price: 1179, assignTo: 1 },
  { title: 'MacBook Pro 14 M4 16Go/512Go',        sn: 'C02T4NOVA003', monthly: 62.95, price: 1179, assignTo: 3 },
  { title: 'MacBook Pro 14 M4 16Go/1To',          sn: 'C02T4NOVA004', monthly: 71.95, price: 1355, assignTo: 2 },
  { title: 'MacBook Pro 14 M4 16Go/1To',          sn: 'C02T4NOVA005', monthly: 71.95, price: 1355, assignTo: null },
  { title: 'MacBook Air 13 M4 16Go/256Go',        sn: 'C02TANOVA006', monthly: 40.95, price: 719,  assignTo: 4 },
  { title: 'MacBook Air 13 M4 16Go/256Go',        sn: 'C02TANOVA007', monthly: 40.95, price: 719,  assignTo: 6 },
  { title: 'MacBook Air 13 M4 16Go/512Go',        sn: 'C02TANOVA008', monthly: 44.95, price: 849,  assignTo: null },
  { title: 'HP EliteBook 860 G11 Ultra 5 16Go/512Go', sn: '5CG4NOVA0009', monthly: 48.95, price: 915, assignTo: 5 },
  { title: 'HP EliteBook 860 G11 Ultra 5 16Go/512Go', sn: '5CG4NOVA0010', monthly: 48.95, price: 915, assignTo: null },
  { title: 'HP ProBook 460 G11 16Go/512Go',       sn: '5CG4NOVA0011', monthly: 39.95, price: 720,  assignTo: null },
  { title: 'HP ProBook 460 G11 16Go/512Go',       sn: '5CG4NOVA0012', monthly: 39.95, price: 720,  assignTo: null },
  { title: 'Mac mini M4 16Go/256Go',              sn: 'C07TNOVA0013', monthly: 34.95, price: 649,  assignTo: 2 },
  { title: 'iMac 24 pouces M3 16Go/512Go',        sn: 'C02VNOVA0014', monthly: 69.95, price: 1350, assignTo: 6 },
  { title: 'iPhone 16 128Go',                     sn: 'F2LNOVA00015', monthly: 37.95, price: 719,  assignTo: 0 },
  { title: 'Écran Dell UltraSharp U2724D 27"',    sn: 'CN0NOVA00016', monthly: 12.95, price: 285,  assignTo: 1 },
  { title: 'Écran Dell UltraSharp U2724D 27"',    sn: 'CN0NOVA00017', monthly: 12.95, price: 285,  assignTo: null },
  { title: 'Dock USB-C Ugreen Revodock 105',      sn: null,           monthly: 1.95,  price: 35,   assignTo: 1 },
];

const CONTRACT_2_EQUIPMENT = [
  { title: 'MacBook Pro 16 M4 Pro 24Go/512Go',    sn: 'C02T6NOVA018', monthly: 104.95, price: 2199, assignTo: 7 },
  { title: 'MacBook Air 13 M4 16Go/256Go',        sn: 'C02TANOVA019', monthly: 40.95,  price: 719,  assignTo: null },
  { title: 'MacBook Air 13 M4 16Go/256Go',        sn: 'C02TANOVA020', monthly: 40.95,  price: 719,  assignTo: null },
  { title: 'Écran Dell UltraSharp U2724D 27"',    sn: 'CN0NOVA00021', monthly: 12.95,  price: 285,  assignTo: 7 },
  { title: 'Ensemble Logitech MX Keys (clavier + souris)', sn: null,  monthly: 4.95,   price: 105,  assignTo: 7 },
  { title: 'Casque Jabra Evolve2 65',             sn: null,           monthly: 5.95,   price: 125,  assignTo: null },
];

// Catalogue sur mesure : produits actifs (admin_only = false) du catalogue iTakecare.
// Les mensualités affichées = tarif de base × PRICE_FACTOR.
const CUSTOM_CATALOG_PRODUCT_IDS = [
  'e414a247-0c60-4ad6-b1a5-f9ecde8c24f5', // MacBook Pro 14 M4
  '52605c7f-fe21-442d-9d5c-e827240fa763', // MacBook Pro 16 M4 Pro
  'bfa977e6-42b1-49b3-ba75-11c9a5a9f249', // MacBook Air 13 M4
  '6cbef9c9-3d44-49ab-bf3b-9ecbb45df04c', // MacBook Air 15 M3
  '43283a37-f8c8-48f3-b90d-846459a3a66a', // iMac 24 M3
  'e52aaa12-eedd-4cdf-a21f-e7322e24745d', // Mac mini M4
  '7e958944-0599-403f-a084-462b48100bc9', // HP EliteBook 860 G11
  '644e4d05-6c26-47bd-b6b9-5656d1e58eac', // HP ProBook 460 G11
  '7d0d10a6-6a15-4815-82df-08d90d8430fa', // HP EliteBook 6 G1i AI PC
  '042809a0-3b4b-4da7-bb89-6cf12b901d3b', // Microsoft Surface Laptop 15
  '2b5c3e7a-b0fe-4527-8e64-238b9277edf7', // iPhone 16
  '341a1c72-8bd2-48a4-8622-a1ee53e592f7', // iPhone 16 Pro
  'e96269e0-466c-4b7d-861d-9e8c19dc80e9', // iPad Pro M4 11 pouces
  '45bcf475-961a-4a4a-93b2-9e5f196cabe9', // Logitech Combo Touch iPad Pro 11
  '8056b477-898d-4185-a663-1e0ce8247183', // Logitech Combo Touch iPad Pro 13
];
// Facteur appliqué aux prix catalogue de base pour la démo. Les tarifs internes
// iTakecare paraissaient trop bas vs marché en présentation → on affiche +15%.
const PRICE_FACTOR = 1.15;

const r2 = (n) => Math.round(n * 100) / 100;
const sumMonthly = (eq) => r2(eq.reduce((s, e) => s + e.monthly, 0));

function equipmentDescriptionJson(equipment) {
  return JSON.stringify(equipment.map((e, i) => ({
    id: `demo-eq-${i}`,
    productId: null,
    title: e.title,
    purchasePrice: e.price,
    quantity: 1,
    margin: 15,
    monthlyPayment: e.monthly,
    serialNumber: e.sn || '',
  })));
}

// ────────────────────────────────────────────────────────────
// CLEANUP
// ────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('\n🧹 CLEANUP environnement démo NovaTech\n');

  const { data: client } = await sb.from('clients')
    .select('id, user_id, name')
    .eq('email', DEMO.client.email)
    .eq('company_id', COMPANY_ID)
    .maybeSingle();

  if (!client) { console.log('   Aucun client démo trouvé — rien à nettoyer.'); return; }
  console.log(`   Client démo : ${client.name} (${client.id})`);

  const { data: contracts } = await sb.from('contracts').select('id').eq('client_id', client.id);
  for (const c of contracts || []) {
    await sb.from('contract_equipment').delete().eq('contract_id', c.id);
  }
  const del = async (table, col, val) => {
    const { error, count } = await sb.from(table).delete({ count: 'exact' }).eq(col, val);
    console.log(`   ${table}: ${error ? '❌ ' + error.message : (count ?? 0) + ' supprimé(s)'}`);
  };
  await del('contracts', 'client_id', client.id);
  await del('offers', 'client_id', client.id);
  await del('client_custom_variant_prices', 'client_id', client.id);
  await del('client_custom_prices', 'client_id', client.id);
  await del('collaborators', 'client_id', client.id);

  if (client.user_id) {
    await sb.from('user_roles').delete().eq('user_id', client.user_id);
    await sb.from('profiles').delete().eq('id', client.user_id);
    const { error } = await sb.auth.admin.deleteUser(client.user_id);
    console.log(`   auth user: ${error ? '❌ ' + error.message : 'supprimé'}`);
  }
  await del('clients', 'id', client.id);
  console.log('\n✅ Nettoyage terminé.\n');
}

// ────────────────────────────────────────────────────────────
// CREATE
// ────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎬 DEMO CLIENT ENV — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);
  console.log(`   Client   : ${DEMO.client.company}`);
  console.log(`   Login    : ${DEMO.client.email} / ${DEMO.password}`);
  console.log(`   Collabs  : ${COLLABORATORS.length}`);
  console.log(`   Contrat 1: ${CONTRACT_1_EQUIPMENT.length} équipements — ${sumMonthly(CONTRACT_1_EQUIPMENT)} €/mois`);
  console.log(`   Contrat 2: ${CONTRACT_2_EQUIPMENT.length} équipements — ${sumMonthly(CONTRACT_2_EQUIPMENT)} €/mois`);
  console.log(`   Catalogue: ${CUSTOM_CATALOG_PRODUCT_IDS.length} produits sur mesure (base × ${PRICE_FACTOR})`);

  if (!APPLY) { console.log('\n   → Relance avec --apply pour créer.\n'); return; }

  // 1. Client (find or create)
  let { data: client } = await sb.from('clients')
    .select('id, user_id')
    .eq('email', DEMO.client.email)
    .eq('company_id', COMPANY_ID)
    .maybeSingle();

  if (!client) {
    const { data, error } = await sb.from('clients').insert(DEMO.client).select('id, user_id').single();
    if (error) throw new Error(`clients: ${error.message}`);
    client = data;
    console.log(`\n✅ Client créé: ${client.id}`);
  } else {
    console.log(`\nℹ️  Client existant réutilisé: ${client.id}`);
  }

  // 2. Compte de connexion (auth user + profile + rôle)
  let userId = client.user_id;
  if (!userId) {
    const { data: created, error: authErr } = await sb.auth.admin.createUser({
      email: DEMO.client.email,
      password: DEMO.password,
      email_confirm: true,
      user_metadata: { first_name: DEMO.client.first_name, last_name: DEMO.client.last_name, role: 'client' },
    });
    if (authErr) throw new Error(`auth.createUser: ${authErr.message}`);
    userId = created.user.id;

    const { error: profErr } = await sb.from('profiles').upsert({
      id: userId,
      first_name: DEMO.client.first_name,
      last_name: DEMO.client.last_name,
      email: DEMO.client.email,
      role: 'client',
      company_id: COMPANY_ID,
      client_id: client.id,
    });
    if (profErr) throw new Error(`profiles: ${profErr.message}`);

    const { error: roleErr } = await sb.from('user_roles').insert({ user_id: userId, role: 'client' });
    if (roleErr && !roleErr.message.includes('duplicate')) console.log(`   ⚠️ user_roles: ${roleErr.message}`);

    await sb.from('clients').update({
      user_id: userId,
      has_user_account: true,
      user_account_created_at: new Date().toISOString(),
    }).eq('id', client.id);
    console.log(`✅ Compte client créé: ${userId}`);
  } else {
    await sb.auth.admin.updateUserById(userId, { password: DEMO.password });
    console.log(`ℹ️  Compte existant, mot de passe réinitialisé: ${userId}`);
  }

  // 3. Collaborateurs
  const collabIds = [];
  for (const c of COLLABORATORS) {
    const { data: existing } = await sb.from('collaborators')
      .select('id').eq('client_id', client.id).eq('name', c.name).maybeSingle();
    if (existing) { collabIds.push(existing.id); continue; }
    const { data, error } = await sb.from('collaborators')
      .insert({ ...c, client_id: client.id }).select('id').single();
    if (error) throw new Error(`collaborators: ${error.message}`);
    collabIds.push(data.id);
  }
  console.log(`✅ Collaborateurs: ${collabIds.length}`);

  // 4. Contrats + équipements (sautés s'il en existe déjà — réexécution sans doublons)
  const contracts = [
    { label: 'Parc initial — janvier 2026',  equipment: CONTRACT_1_EQUIPMENT, start: '2026-01-15' },
    { label: 'Extension équipe — juin 2026', equipment: CONTRACT_2_EQUIPMENT, start: '2026-06-01' },
  ];
  const { count: existingContractsCount } = await sb.from('contracts')
    .select('id', { count: 'exact', head: true }).eq('client_id', client.id);
  if (existingContractsCount && existingContractsCount > 0) {
    console.log(`ℹ️  ${existingContractsCount} contrat(s) déjà présent(s) — création sautée`);
    contracts.length = 0;
  }

  for (const [i, cfg] of contracts.entries()) {
    const monthly = sumMonthly(cfg.equipment);
    const endDate = new Date(cfg.start);
    endDate.setMonth(endDate.getMonth() + 36);
    const end = endDate.toISOString().slice(0, 10);

    // Offre convertie (les contrats référencent une offre)
    const { data: offer, error: offErr } = await sb.from('offers').insert({
      user_id: ADMIN_USER_ID,
      client_id: client.id,
      client_name: DEMO.client.name,
      client_email: DEMO.client.email,
      company_id: SHADOW_COMPANY_ID,
      leaser_id: LEASER_ID,
      equipment_description: equipmentDescriptionJson(cfg.equipment),
      amount: r2(cfg.equipment.reduce((s, e) => s + e.price, 0)),
      monthly_payment: monthly,
      coefficient: 3.2,
      status: 'accepted',
      workflow_status: 'financed',
      type: 'admin_offer',
      converted_to_contract: true,
      duration: 36,
      contract_duration: 36,
      remarks: `DÉMO — ${cfg.label}`,
    }).select('id').single();
    if (offErr) throw new Error(`offers (contrat ${i + 1}): ${offErr.message}`);

    const { data: contract, error: ctErr } = await sb.from('contracts').insert({
      offer_id: offer.id,
      client_id: client.id,
      client_name: DEMO.client.name,
      client_email: DEMO.client.email,
      monthly_payment: monthly,
      status: 'active',
      leaser_name: 'Grenke Lease',
      leaser_id: LEASER_ID,
      user_id: ADMIN_USER_ID,
      company_id: SHADOW_COMPANY_ID,
      contract_duration: 36,
      contract_start_date: cfg.start,
      contract_end_date: end,
    }).select('id').single();
    if (ctErr) throw new Error(`contracts (${i + 1}): ${ctErr.message}`);

    const rows = cfg.equipment.map((e) => ({
      contract_id: contract.id,
      title: e.title,
      quantity: 1,
      serial_number: e.sn,
      monthly_payment: e.monthly,
      purchase_price: e.price,
      margin: 15,
      collaborator_id: e.assignTo !== null ? collabIds[e.assignTo] : null,
    }));
    const { error: eqErr } = await sb.from('contract_equipment').insert(rows);
    if (eqErr) throw new Error(`contract_equipment (${i + 1}): ${eqErr.message}`);
    console.log(`✅ Contrat ${i + 1} (${cfg.label}): ${rows.length} équipements, ${monthly} €/mois`);
  }

  // 5. Demande en cours (visible dans "Mes demandes")
  const pendingEq = [
    { title: 'MacBook Air 13 M4 16Go/256Go', sn: null, monthly: 40.95, price: 719 },
    { title: 'MacBook Air 13 M4 16Go/256Go', sn: null, monthly: 40.95, price: 719 },
    { title: 'MacBook Air 13 M4 16Go/256Go', sn: null, monthly: 40.95, price: 719 },
    { title: 'MacBook Air 13 M4 16Go/256Go', sn: null, monthly: 40.95, price: 719 },
    { title: 'MacBook Air 13 M4 16Go/256Go', sn: null, monthly: 40.95, price: 719 },
  ];
  const { count: existingPendingCount } = await sb.from('offers')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client.id).eq('converted_to_contract', false);
  if (existingPendingCount && existingPendingCount > 0) {
    console.log(`ℹ️  Demande en cours déjà présente — création sautée`);
  } else {
  const { data: pendingOffer, error: poErr } = await sb.from('offers').insert({
    user_id: ADMIN_USER_ID,
    client_id: client.id,
    client_name: DEMO.client.name,
    client_email: DEMO.client.email,
    company_id: SHADOW_COMPANY_ID,
    leaser_id: LEASER_ID,
    equipment_description: equipmentDescriptionJson(pendingEq),
    amount: r2(pendingEq.reduce((s, e) => s + e.price, 0)),
    monthly_payment: sumMonthly(pendingEq),
    coefficient: 3.2,
    status: 'pending',
    workflow_status: 'sent',
    type: 'client_request',
    converted_to_contract: false,
    duration: 36,
    contract_duration: 36,
    remarks: 'DÉMO — Demande extension 5 machines',
  }).select('id').single();
  if (poErr) { console.log(`⚠️ Demande en cours non créée: ${poErr.message}`); }
  else {
    await sb.from('offer_equipment').insert(pendingEq.map((e) => ({
      offer_id: pendingOffer.id,
      title: e.title,
      quantity: 1,
      monthly_payment: e.monthly,
      purchase_price: e.price,
      margin: 15,
    })));
    console.log(`✅ Demande en cours: 5× MacBook Air (${sumMonthly(pendingEq)} €/mois)`);
  }
  }

  // 5bis. Matériel hors contrat (parc externe déclaré par le client — table
  // client_owned_equipment, voir scripts/apply-client-owned-equipment.mjs)
  const OWNED_EQUIPMENT = [
    { title: 'MacBook Pro 13" 2020',       brand: 'Apple', category: 'laptop',  serial_number: 'C02DM0AHML85', purchase_date: '2021-02-15', purchase_price: 1449, supplier: 'MediaMarkt', amortization_years: 3, condition: 'average' },
    { title: 'iPhone 13 128Go',            brand: 'Apple', category: 'phone',   serial_number: null,            purchase_date: '2022-01-10', purchase_price: 909,  supplier: 'Proximus',   amortization_years: 3, condition: 'good' },
    { title: 'Dell XPS 15 9520',           brand: 'Dell',  category: 'laptop',  serial_number: 'JX8JJH3',       purchase_date: '2022-09-05', purchase_price: 1650, supplier: 'Dell.be',    amortization_years: 3, condition: 'good' },
    { title: 'Imprimante LaserJet Pro',    brand: 'HP',    category: 'printer', serial_number: null,            purchase_date: '2019-11-20', purchase_price: 320,  supplier: 'Vanden Borre', amortization_years: 5, condition: 'defective' },
    { title: 'Écran LG UltraFine 27"',     brand: 'LG',    category: 'screen',  serial_number: null,            purchase_date: '2025-01-08', purchase_price: 449,  supplier: 'Coolblue',   amortization_years: 4, condition: 'good' },
  ];
  const { count: ownedCount, error: ownedCheckErr } = await sb.from('client_owned_equipment')
    .select('id', { count: 'exact', head: true }).eq('client_id', client.id);
  if (ownedCheckErr) {
    console.log(`⚠️ Parc externe non seedé (table absente ? lance d'abord scripts/apply-client-owned-equipment.mjs) : ${ownedCheckErr.message}`);
  } else if (ownedCount && ownedCount > 0) {
    console.log(`ℹ️  ${ownedCount} équipement(s) hors contrat déjà présent(s) — création sautée`);
  } else {
    const { error: ownedErr } = await sb.from('client_owned_equipment')
      .insert(OWNED_EQUIPMENT.map((e) => ({ ...e, client_id: client.id, company_id: COMPANY_ID })));
    if (ownedErr) console.log(`⚠️ Parc externe : ${ownedErr.message}`);
    else console.log(`✅ Parc externe : ${OWNED_EQUIPMENT.length} équipements hors contrat (dont 3 amortis → démo renouvellement)`);
  }

  // 6. Catalogue sur mesure
  let nbPrices = 0, nbVariants = 0;
  for (const productId of CUSTOM_CATALOG_PRODUCT_IDS) {
    const { data: product } = await sb.from('products')
      .select('id, name, monthly_price, price')
      .eq('id', productId).maybeSingle();
    if (!product) { console.log(`   ⚠️ Produit introuvable: ${productId}`); continue; }

    const { data: variants } = await sb.from('product_variant_prices')
      .select('id, price, monthly_price')
      .eq('product_id', productId);

    const baseMonthly = variants?.length
      ? Math.min(...variants.map(v => Number(v.monthly_price) || Infinity))
      : Number(product.monthly_price) || 0;
    const basePrice = variants?.length
      ? Math.min(...variants.map(v => Number(v.price) || Infinity))
      : Number(product.price) || 0;

    const { error: cpErr } = await sb.from('client_custom_prices').upsert({
      client_id: client.id,
      product_id: productId,
      company_id: COMPANY_ID,
      custom_monthly_price: isFinite(baseMonthly) ? r2(baseMonthly * PRICE_FACTOR) : null,
      custom_purchase_price: isFinite(basePrice) ? r2(basePrice * PRICE_FACTOR) : null,
      is_active: true,
      notes: 'Tarif démo (base × PRICE_FACTOR)',
    }, { onConflict: 'client_id,product_id' });
    if (cpErr) { console.log(`   ⚠️ client_custom_prices ${product.name}: ${cpErr.message}`); continue; }
    nbPrices++;

    for (const v of variants || []) {
      const { error: vErr } = await sb.from('client_custom_variant_prices').upsert({
        client_id: client.id,
        variant_price_id: v.id,
        company_id: COMPANY_ID,
        custom_monthly_price: v.monthly_price ? r2(Number(v.monthly_price) * PRICE_FACTOR) : null,
        custom_purchase_price: v.price ? r2(Number(v.price) * PRICE_FACTOR) : null,
        is_active: true,
      }, { onConflict: 'client_id,variant_price_id' });
      if (!vErr) nbVariants++;
    }
  }
  console.log(`✅ Catalogue sur mesure: ${nbPrices} produits, ${nbVariants} variantes à prix négociés`);

  console.log(`
══════════════════════════════════════════════════
🎉 Environnement démo prêt !

   URL      : https://app.leazr.co/login
   Email    : ${DEMO.client.email}
   Password : ${DEMO.password}
   Dashboard: https://app.leazr.co/itakecare/client/dashboard

   Nettoyage après la démo :
   node scripts/create-demo-client-env.mjs --cleanup
══════════════════════════════════════════════════
`);
}

(CLEANUP ? cleanup() : main()).catch((e) => { console.error('\n❌', e.message); process.exit(1); });
