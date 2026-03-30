/**
 * update-serial-numbers.js
 *
 * 1. Charge les numéros de série extraits des PDFs Grenke (grenke-serial-numbers.json)
 * 2. Pour chaque dossier, trouve l'offre dans Supabase via dossier_number
 * 3. Pour chaque équipement de l'offre, tente de matcher avec un équipement du PDF
 * 4. Met à jour le champ serial_number dans offer_equipment
 *
 * ⚠️ À exécuter depuis le Mac (pas la VM) :
 *   node scripts/update-serial-numbers.js --dry-run   ← vérification
 *   node scripts/update-serial-numbers.js             ← mise à jour réelle
 *
 * Stratégie de matching titre :
 *   - Exact match d'abord
 *   - Sinon : token overlap (mots communs / total mots)
 *   - Si qty=1 et 1 seul SN disponible pour le dossier : assignment direct
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const GRENKE_DATA = JSON.parse(
  readFileSync(join(__dirname, 'grenke-serial-numbers.json'), 'utf-8')
);

// ── Titre matching ─────────────────────────────────────────────────────────────
function normalizeTitle(t) {
  return (t || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a, b) {
  const ta = new Set(normalizeTitle(a).split(' ').filter(w => w.length > 2));
  const tb = new Set(normalizeTitle(b).split(' ').filter(w => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  const common = [...ta].filter(x => tb.has(x));
  return common.length / Math.max(ta.size, tb.size);
}

function bestMatch(pdfItem, dbItems) {
  let best = null, bestScore = 0;
  for (const dbItem of dbItems) {
    // Skip if already has SN
    if (dbItem.serial_number) continue;
    const score = tokenOverlap(pdfItem.title, dbItem.title);
    if (score > bestScore) { bestScore = score; best = dbItem; }
  }
  return bestScore >= 0.3 ? best : null;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔧 UPDATE SERIAL NUMBERS ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}`);
  console.log(`📋 ${GRENKE_DATA.length} factures Grenke à traiter\n`);

  let totalUpdated = 0, totalSkipped = 0, totalNotFound = 0;
  const report = [];

  for (const invoice of GRENKE_DATA) {
    const { invoice_number, dossier_number, invoice_date, equipment: pdfEquipment } = invoice;

    // Filter only items with SN
    const itemsWithSN = pdfEquipment.filter(e => e.serial_number);
    if (itemsWithSN.length === 0) {
      console.log(`  ⏭️  ${invoice_number} (${dossier_number}) : aucun S/N dans le PDF`);
      continue;
    }

    if (!dossier_number) {
      console.log(`  ⚠️  ${invoice_number} : numéro de dossier inconnu — skip`);
      totalNotFound++;
      continue;
    }

    // Find the offer in DB by dossier_number
    const { data: offers, error: offerErr } = await sb
      .from('offers')
      .select('id, client_name, dossier_number')
      .eq('dossier_number', dossier_number);

    if (offerErr || !offers || offers.length === 0) {
      console.log(`  ❓ ${invoice_number} (${dossier_number}) : offre introuvable en DB`);
      totalNotFound++;
      report.push({ invoice_number, dossier_number, status: 'not_found_in_db' });
      continue;
    }

    const offer = offers[0];
    console.log(`\n  📦 ${invoice_number} → ${dossier_number} (${offer.client_name || '?'})`);

    // Get all equipment for this offer
    const { data: dbEquipment, error: eqErr } = await sb
      .from('offer_equipment')
      .select('id, title, serial_number, quantity')
      .eq('offer_id', offer.id);

    if (eqErr || !dbEquipment) {
      console.log(`    ❌ Erreur lecture équipements: ${eqErr?.message}`);
      continue;
    }

    console.log(`    DB: ${dbEquipment.length} équipements | PDF: ${pdfEquipment.length} lignes, ${itemsWithSN.length} avec S/N`);

    // Special case: if all PDF items with SN map to a single DB item (bundled)
    const dbWithoutSN = dbEquipment.filter(e => !e.serial_number);

    for (const pdfItem of itemsWithSN) {
      // Try to find best matching DB item
      let matched = bestMatch(pdfItem, dbWithoutSN);

      // Fallback: if only 1 DB item has no SN and 1 PDF item has SN → assign
      if (!matched && dbWithoutSN.length === 1 && itemsWithSN.length === 1) {
        matched = dbWithoutSN[0];
        console.log(`    🎯 Fallback: seul équipement sans SN → assignment direct`);
      }

      if (!matched) {
        console.log(`    ⚠️  "${pdfItem.title.substring(0,50)}" SN:${pdfItem.serial_number} → aucun match DB`);
        report.push({ invoice_number, dossier_number, pdfTitle: pdfItem.title, serial: pdfItem.serial_number, status: 'no_match' });
        totalNotFound++;
        continue;
      }

      const overlap = tokenOverlap(pdfItem.title, matched.title);
      console.log(`    ✅ "${pdfItem.title.substring(0,40)}" → "${matched.title.substring(0,40)}" (score: ${overlap.toFixed(2)}) SN: ${pdfItem.serial_number}`);

      if (!DRY_RUN) {
        const { error: updateErr } = await sb
          .from('offer_equipment')
          .update({ serial_number: pdfItem.serial_number, updated_at: new Date().toISOString() })
          .eq('id', matched.id);

        if (updateErr) {
          console.log(`    ❌ Erreur update: ${updateErr.message}`);
        } else {
          // Remove from the pool to avoid double-assignment
          const idx = dbWithoutSN.indexOf(matched);
          if (idx >= 0) dbWithoutSN.splice(idx, 1);
          totalUpdated++;
        }
      } else {
        totalUpdated++;
        const idx = dbWithoutSN.indexOf(matched);
        if (idx >= 0) dbWithoutSN.splice(idx, 1);
      }

      report.push({ invoice_number, dossier_number, pdfTitle: pdfItem.title, dbTitle: matched.title, serial: pdfItem.serial_number, status: 'updated' });
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`  ✅ S/N mis à jour      : ${totalUpdated}`);
  console.log(`  ❓ Dossier/match introuvable : ${totalNotFound}`);
  console.log(`  ⏭️  Sans S/N (ignorés)  : ${totalSkipped}`);
  if (DRY_RUN) console.log('\n  (mode dry-run : aucune modification effectuée)');

  // Show unmatched
  const unmatched = report.filter(r => r.status !== 'updated');
  if (unmatched.length > 0) {
    console.log('\n⚠️  Non traités:');
    for (const u of unmatched) {
      console.log(`  ${u.invoice_number} (${u.dossier_number}) → ${u.status}${u.serial ? ` SN:${u.serial}` : ''}`);
    }
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
