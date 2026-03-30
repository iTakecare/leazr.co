/**
 * fix-leaser-name.js
 *
 * 1. Crée le leaser "Olinn" s'il n'existe pas dans la table leasers
 * 2. Corrige leaser_id + leaser_name sur tous les contrats mal attribués :
 *    - 'Grenke' / variantes → 1. Grenke Lease
 *    - 'Olinn' / variantes  → Olinn (créé si absent)
 *
 * Usage :
 *   node scripts/fix-leaser-name.js          → dry-run
 *   node scripts/fix-leaser-name.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔧 FIX LEASER NAMES — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // ── 1. Inspecte la table leasers ──────────────────────────────────────────
  console.log('═══ LEASERS EXISTANTS ═══');
  const { data: leasers, error: le } = await sb
    .from('leasers')
    .select('*')
    .or(`company_id.eq.${COMPANY_ID},company_id.is.null`);

  if (le) { console.error('❌', le.message); return; }
  leasers?.forEach(l => console.log(`  ${l.id} | "${l.name}" | company=${l.company_id || 'global'}`));

  // ── 2. Identifie Grenke et Olinn ──────────────────────────────────────────
  let grenkeLeaser = leasers?.find(l => l.name?.toLowerCase().includes('grenke'));
  let olinnLeaser  = leasers?.find(l => l.name?.toLowerCase().includes('olinn'));

  console.log(`\n  Grenke : ${grenkeLeaser ? `"${grenkeLeaser.name}" (${grenkeLeaser.id})` : '❌ introuvable'}`);
  console.log(`  Olinn  : ${olinnLeaser  ? `"${olinnLeaser.name}"  (${olinnLeaser.id})`  : '❌ absent → à créer'}`);

  // ── 3. Crée Olinn si absent ────────────────────────────────────────────────
  if (!olinnLeaser) {
    // Vérifie les colonnes disponibles sur leasers
    const sampleLeaser = leasers?.[0];
    const cols = sampleLeaser ? Object.keys(sampleLeaser) : [];
    console.log(`\n  Colonnes leasers : ${cols.join(', ')}`);

    const olinnRecord = {
      name:       'Olinn',
      company_id: COMPANY_ID,
    };
    // Ajoute les colonnes optionnelles si elles existent
    if (cols.includes('logo_url'))     olinnRecord.logo_url     = null;
    if (cols.includes('website'))      olinnRecord.website      = null;
    if (cols.includes('email'))        olinnRecord.email        = null;
    if (cols.includes('phone'))        olinnRecord.phone        = null;
    if (cols.includes('address'))      olinnRecord.address      = null;
    if (cols.includes('vat_number'))   olinnRecord.vat_number   = 'BE 0400.041.943';
    if (cols.includes('country'))      olinnRecord.country      = 'Belgique';

    console.log(`\n  📄 Création Olinn :`, JSON.stringify(olinnRecord));

    if (APPLY) {
      const { data: created, error: insErr } = await sb
        .from('leasers')
        .insert(olinnRecord)
        .select('*')
        .single();

      if (insErr) {
        console.log(`  ❌ Erreur création Olinn : ${insErr.message}`);
        return;
      }
      olinnLeaser = created;
      console.log(`  ✅ Olinn créé : ${olinnLeaser.id}`);
    }
  }

  // ── 4. Analyse les contrats par leaser ────────────────────────────────────
  console.log('\n═══ VALEURS leaser_name DISTINCTES SUR CONTRACTS ═══');
  const { data: allContracts } = await sb
    .from('contracts')
    .select('id, leaser_id, leaser_name')
    .eq('company_id', COMPANY_ID);

  const counts = {};
  allContracts?.forEach(c => {
    const key = `"${c.leaser_name || 'null'}" (leaser_id=${c.leaser_id?.slice(0,8) || 'null'})`;
    counts[key] = (counts[key] || 0) + 1;
  });
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log(`  ${String(n).padStart(3)}x  ${k}`));

  // ── 5. Identifie les contrats à corriger ──────────────────────────────────
  const toFix = (allContracts || []).map(c => {
    const name = (c.leaser_name || '').toLowerCase();
    // Grenke : leaser_name ne pointe pas vers le bon leaser
    if (grenkeLeaser && (
      name === 'grenke' ||
      name === 'grenke lease' ||
      (name.includes('grenke') && c.leaser_id !== grenkeLeaser.id)
    )) {
      return { id: c.id, newId: grenkeLeaser.id, newName: grenkeLeaser.name, reason: 'Grenke → correct' };
    }
    // Olinn
    if (name.includes('olinn') && olinnLeaser && c.leaser_id !== olinnLeaser.id) {
      return { id: c.id, newId: olinnLeaser.id, newName: olinnLeaser.name, reason: 'Olinn → correct' };
    }
    return null;
  }).filter(Boolean);

  console.log(`\n  ${toFix.length} contrats à corriger`);
  const grenkeCount = toFix.filter(x => x.reason.includes('Grenke')).length;
  const olinnCount  = toFix.filter(x => x.reason.includes('Olinn')).length;
  console.log(`  → Grenke : ${grenkeCount} | Olinn : ${olinnCount}`);

  if (!APPLY) {
    console.log('\n  → Relance avec --apply pour appliquer\n');
    return;
  }

  // ── 6. Applique les corrections ───────────────────────────────────────────
  let nDone = 0, nErr = 0;
  for (const fix of toFix) {
    const { error: upErr } = await sb
      .from('contracts')
      .update({
        leaser_id:   fix.newId,
        leaser_name: fix.newName,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', fix.id);

    if (upErr) { console.log(`  ❌ ${fix.id}: ${upErr.message}`); nErr++; }
    else nDone++;
  }
  console.log(`\n  ✅ ${nDone} contrats mis à jour (${nErr} erreurs)\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
