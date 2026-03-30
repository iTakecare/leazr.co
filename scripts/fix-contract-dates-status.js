/**
 * fix-contract-dates-status.js
 *
 * Pour tous les contrats Grenke (non self-leasing) :
 *   1. Détermine la date de référence (livraison / facturation) par priorité :
 *        a. billing_data.contract_data.invoice_date ou delivery_date
 *        b. contract.invoice_date
 *        c. contract.delivery_date
 *        d. invoice_date de la facture liée au contrat (contract_id)
 *        e. created_at du contrat UNIQUEMENT si < 2025-01-01
 *           (sinon c'est une date d'import, pas la vraie date)
 *   2. contract_start_date = 1er jour du trimestre SUIVANT la livraison
 *   3. contract_end_date   = start + 36 mois
 *   4. status              = completed si end < 2026-03-28, sinon active
 *
 * Trimestre SUIVANT :
 *   Jan/Fév/Mar → 01/04   |  Avr/Mai/Jun → 01/07
 *   Jul/Aoû/Sep → 01/10   |  Oct/Nov/Déc → 01/01 (année+1)
 *
 * Usage :
 *   node scripts/fix-contract-dates-status.js          → dry-run
 *   node scripts/fix-contract-dates-status.js --apply  → applique
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const APPLY = process.argv.includes('--apply');
const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const TODAY = new Date('2026-03-28');
const IMPORT_CUTOFF = new Date('2025-01-01'); // created_at avant cette date = date fiable

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNextQuarterStart(date) {
  const d = new Date(date);
  const m = d.getUTCMonth();
  const currentQuarter = Math.floor(m / 3);
  const nextQuarter = (currentQuarter + 1) % 4;
  const nextQuarterMonth = nextQuarter * 3;
  const nextQuarterYear = nextQuarter === 0 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
  return new Date(Date.UTC(nextQuarterYear, nextQuarterMonth, 1));
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

function fmt(date) {
  return date.toISOString().slice(0, 10);
}

function validDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Détermine la meilleure date de référence parmi toutes les sources */
function getRefDate(contract, invoiceDateByContractId) {
  // a. colonnes directes du contrat
  const contractDelivery = validDate(contract.delivery_date);
  const contractInvoice  = validDate(contract.invoice_date);

  // b. facture liée (la plus ancienne)
  const linkedInvoice = invoiceDateByContractId[contract.id]
    ? validDate(invoiceDateByContractId[contract.id])
    : null;

  // c. created_at uniquement si fiable (avant 2025-01-01, pas une date d'import)
  const createdAt = validDate(contract.created_at);
  const createdAtSafe = createdAt && createdAt < IMPORT_CUTOFF ? createdAt : null;

  const candidates = [
    contractDelivery,
    contractInvoice,
    linkedInvoice,
    createdAtSafe,
  ].filter(Boolean);

  if (!candidates.length) return { date: null, source: 'aucune' };

  // Prendre la plus ancienne (= la vraie date de livraison/facturation)
  candidates.sort((a, b) => a - b);
  const chosen = candidates[0];

  const source =
    chosen === contractDelivery ? 'contract.delivery_date' :
    chosen === contractInvoice  ? 'contract.invoice_date'  :
    chosen === linkedInvoice    ? 'linked_invoice'         :
    'created_at';

  return { date: chosen, source };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔧 FIX CONTRACT DATES & STATUS — ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // Charge tous les contrats Grenke (non self-leasing)
  const { data: contracts, error } = await sb
    .from('contracts')
    .select('id, contract_number, client_name, status, contract_start_date, contract_end_date, contract_duration, created_at, invoice_date, delivery_date, is_self_leasing')
    .eq('company_id', COMPANY_ID)
    .eq('is_self_leasing', false)
    .order('created_at', { ascending: true });

  if (error) { console.error('❌', error.message); return; }
  console.log(`  ${contracts.length} contrats Grenke trouvés\n`);

  // Charge toutes les factures liées (une seule requête)
  const { data: invoices } = await sb
    .from('invoices')
    .select('contract_id, invoice_date')
    .eq('company_id', COMPANY_ID)
    .not('contract_id', 'is', null)
    .order('invoice_date', { ascending: true });

  // Map contract_id → earliest invoice_date
  const invoiceDateByContractId = {};
  for (const inv of (invoices || [])) {
    if (!invoiceDateByContractId[inv.contract_id]) {
      invoiceDateByContractId[inv.contract_id] = inv.invoice_date;
    }
  }

  let nOk = 0, nUpdated = 0, nNoDate = 0;
  const updates = [];

  for (const c of contracts) {
    const { date: refDate, source } = getRefDate(c, invoiceDateByContractId);

    if (!refDate) {
      console.log(`  ⚠️  ${(c.contract_number || c.id.slice(0,8)).padEnd(15)} ${(c.client_name||'').padEnd(28)} — aucune date fiable`);
      nNoDate++;
      continue;
    }

    // Ne jamais modifier le statut d'un contrat annulé
    if (c.status === 'cancelled') {
      nOk++;
      continue;
    }

    const newStart  = toNextQuarterStart(refDate);
    const newEnd    = addMonths(newStart, c.contract_duration || 36);
    const newStatus = newEnd < TODAY ? 'completed' : 'active';

    const currentStart  = c.contract_start_date ? fmt(new Date(c.contract_start_date)) : null;
    const currentEnd    = c.contract_end_date   ? fmt(new Date(c.contract_end_date))   : null;
    const currentStatus = c.status;

    const startChanged  = currentStart  !== fmt(newStart);
    const endChanged    = currentEnd    !== fmt(newEnd);
    const statusChanged = currentStatus !== newStatus;

    if (!startChanged && !endChanged && !statusChanged) {
      nOk++;
      continue;
    }

    const changes = [];
    if (startChanged)  changes.push(`start: ${currentStart || 'null'} → ${fmt(newStart)} (ref: ${fmt(refDate)}, src: ${source})`);
    if (endChanged)    changes.push(`end: ${currentEnd || 'null'} → ${fmt(newEnd)}`);
    if (statusChanged) changes.push(`status: ${currentStatus} → ${newStatus}`);

    console.log(`  🔄 ${(c.contract_number || c.id.slice(0,8)).padEnd(15)} ${(c.client_name||'').padEnd(28)} ${changes.join(' | ')}`);
    nUpdated++;

    if (APPLY) {
      updates.push({
        id:                  c.id,
        contract_start_date: fmt(newStart),
        contract_end_date:   fmt(newEnd),
        contract_duration:   36,
        status:              newStatus,
        updated_at:          new Date().toISOString(),
      });
    }
  }

  if (APPLY && updates.length) {
    let nDone = 0, nErr = 0;
    for (const u of updates) {
      const { id, ...fields } = u;
      const { error: upErr } = await sb.from('contracts').update(fields).eq('id', id);
      if (upErr) { console.log(`  ❌ ${id}: ${upErr.message}`); nErr++; }
      else nDone++;
    }
    console.log(`\n  ✅ ${nDone} contrats mis à jour, ${nErr} erreurs`);
  }

  console.log(`\n══ RÉSUMÉ ══`);
  console.log(`  Déjà corrects  : ${nOk}`);
  console.log(`  À corriger     : ${nUpdated}`);
  console.log(`  Sans date      : ${nNoDate}`);
  if (!APPLY && nUpdated > 0) console.log(`\n  → Relance avec --apply pour appliquer\n`);
  else if (APPLY) console.log(`  ✅ Terminé.\n`);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
