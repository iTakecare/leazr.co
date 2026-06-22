/**
 * backfill-sku-itc.mjs
 *
 * Calcule et renseigne le SKU client (products.sku_itc) pour les produits qui
 * n'en ont pas encore. Idempotent : ne touche jamais un produit déjà rempli.
 *
 * La logique de génération est une COPIE de src/utils/skuItc.ts (un .mjs ne peut
 * pas importer du TS). Garder les deux synchronisés si les règles changent.
 *
 * Usage : node scripts/backfill-sku-itc.mjs                 (dry-run)
 *         node scripts/backfill-sku-itc.mjs --apply         (applique)
 *         node scripts/backfill-sku-itc.mjs --prefix ITC    (force le préfixe)
 *         node scripts/backfill-sku-itc.mjs --force         (régénère TOUT, même les SKU déjà remplis)
 *
 * Par défaut on (re)génère les produits sans SKU OU dont le SKU dépasse MAX_LEN.
 */

const MAX_LEN = 10; // = MAX_SKU_ITC_LENGTH dans src/utils/skuItc.ts

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'; // iTakecare

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const prefixArgIdx = process.argv.indexOf('--prefix');
const PREFIX_OVERRIDE = prefixArgIdx !== -1 ? process.argv[prefixArgIdx + 1] : null;

// ── Copie de src/utils/skuItc.ts ──────────────────────────────────────────
const normalizeSkuPart = (value) =>
  !value ? '' : value.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const hasDigit = (t) => /[0-9]/.test(t);
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);
const abbreviateAlphaToken = (norm) => {
  if (norm.length <= 3) return norm;
  const consonants = norm.slice(1).split('').filter((c) => !VOWELS.has(c));
  const abbr = (norm[0] + consonants.join('')).slice(0, 3);
  return abbr.length >= 3 ? abbr : norm.slice(0, 3);
};
const abbreviateModel = (model) =>
  !model ? '' : model.split(/\s+/).filter(Boolean).map((token) => {
    const norm = normalizeSkuPart(token);
    if (!norm) return '';
    return hasDigit(norm) ? norm : abbreviateAlphaToken(norm);
  }).join('');
const stripBrandFromName = (name, brand) => {
  const nameTokens = name.split(/\s+/).filter(Boolean);
  const brandTokens = brand.split(/\s+/).map(normalizeSkuPart).filter(Boolean);
  let i = 0;
  while (i < nameTokens.length && i < brandTokens.length && normalizeSkuPart(nameTokens[i]) === brandTokens[i]) i++;
  return nameTokens.slice(i).join(' ');
};
const BRAND_CAP = 3;
const generateSkuItc = ({ prefix, brand, model, name }) => {
  const prefixPart = normalizeSkuPart(prefix);
  const brandFull = normalizeSkuPart(brand);
  let modelSource = (model ?? '').trim();
  if (!modelSource) modelSource = stripBrandFromName(name ?? '', brand ?? '');
  const modelPart = abbreviateModel(modelSource);
  const budget = Math.max(0, MAX_LEN - prefixPart.length);
  const brandPart = brandFull.slice(0, Math.min(BRAND_CAP, budget));
  const modelBudget = Math.max(0, budget - brandPart.length);
  return `${prefixPart}${brandPart}${modelPart.slice(0, modelBudget)}`.slice(0, MAX_LEN);
};
const ensureUniqueSkuItc = (candidate, taken) => {
  if (!candidate) return candidate;
  const base = candidate.slice(0, MAX_LEN);
  if (!taken.has(base)) return base;
  let i = 2;
  for (;;) {
    const suffix = `-${i}`;
    const next = candidate.slice(0, Math.max(0, MAX_LEN - suffix.length)) + suffix;
    if (!taken.has(next)) return next;
    i++;
  }
};
// ──────────────────────────────────────────────────────────────────────────

// 1. Préfixe : override CLI, sinon companies.sku_prefix
const { data: company } = await sb.from('companies').select('sku_prefix').eq('id', COMPANY_ID).single();
const prefix = PREFIX_OVERRIDE || company?.sku_prefix || '';
if (!prefix) {
  console.error('❌ Aucun préfixe SKU défini (companies.sku_prefix vide). Utilisez --prefix ITC ou définissez-le dans les réglages.');
  process.exit(1);
}
console.log(`Préfixe utilisé : "${prefix}"${PREFIX_OVERRIDE ? ' (override CLI)' : ''}`);

// 2. Tous les produits du tenant
const { data: products, error } = await sb
  .from('products')
  .select('id, name, model, sku_itc, brands(name)')
  .eq('company_id', COMPANY_ID);
if (error) { console.error('❌ Erreur lecture produits:', error); process.exit(1); }

// 3. Déterminer les produits à (re)générer : vides, trop longs, ou tout si --force
const needsUpdate = (p) => FORCE || !p.sku_itc || p.sku_itc.length > MAX_LEN;

// Les SKU conservés (non régénérés) alimentent le set d'unicité
const taken = new Set();
for (const p of products) if (p.sku_itc && !needsUpdate(p)) taken.add(p.sku_itc);

// 4. Génération
let updated = 0;
const skipped = products.filter((p) => !needsUpdate(p)).length;
const updates = [];
for (const p of products) {
  if (!needsUpdate(p)) continue;
  const brand = p.brands?.name || '';
  const candidate = generateSkuItc({ prefix, brand, model: p.model, name: p.name });
  if (!candidate || candidate === normalizeSkuPart(prefix).slice(0, MAX_LEN)) {
    console.log(`⚠️  Ignoré (données insuffisantes) : ${p.name}`);
    continue;
  }
  const unique = ensureUniqueSkuItc(candidate, taken);
  if (unique === p.sku_itc) continue; // déjà correct, rien à écrire
  taken.add(unique);
  updates.push({ id: p.id, name: p.name, sku_itc: unique });
}

console.log(`\n${products.length} produits — ${skipped} conservés, ${updates.length} à (re)générer (max ${MAX_LEN} car.).`);
for (const u of updates.slice(0, 50)) console.log(`  ${u.sku_itc.padEnd(22)} ← ${u.name}`);
if (updates.length > 50) console.log(`  … (+${updates.length - 50})`);

if (!APPLY) {
  console.log('\n(dry-run — relancez avec --apply pour écrire)');
  process.exit(0);
}

for (const u of updates) {
  const { error: upErr } = await sb.from('products').update({ sku_itc: u.sku_itc }).eq('id', u.id);
  if (upErr) console.error(`❌ ${u.name}:`, upErr.message);
  else updated++;
}
console.log(`\n✅ ${updated} produit(s) mis à jour.`);
