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
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'; // iTakecare

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const APPLY = process.argv.includes('--apply');
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
const generateSkuItc = ({ prefix, brand, model, name }) => {
  const prefixPart = normalizeSkuPart(prefix);
  const brandPart = normalizeSkuPart(brand);
  let modelSource = (model ?? '').trim();
  if (!modelSource) modelSource = stripBrandFromName(name ?? '', brand ?? '');
  return `${prefixPart}${brandPart}${abbreviateModel(modelSource)}`;
};
const ensureUniqueSkuItc = (candidate, taken) => {
  if (!candidate || !taken.has(candidate)) return candidate;
  let i = 2;
  let next = `${candidate}-${i}`;
  while (taken.has(next)) { i++; next = `${candidate}-${i}`; }
  return next;
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

// 3. Set des SKU déjà pris (pour l'unicité)
const taken = new Set();
for (const p of products) if (p.sku_itc) taken.add(p.sku_itc);

// 4. Génération pour les produits sans sku_itc
let updated = 0, skipped = 0;
const updates = [];
for (const p of products) {
  if (p.sku_itc) { skipped++; continue; }
  const brand = p.brands?.name || '';
  const candidate = generateSkuItc({ prefix, brand, model: p.model, name: p.name });
  if (!candidate || candidate === normalizeSkuPart(prefix)) { // rien d'exploitable
    console.log(`⚠️  Ignoré (données insuffisantes) : ${p.name}`);
    continue;
  }
  const unique = ensureUniqueSkuItc(candidate, taken);
  taken.add(unique);
  updates.push({ id: p.id, name: p.name, sku_itc: unique });
}

console.log(`\n${products.length} produits — ${skipped} déjà remplis, ${updates.length} à générer.`);
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
