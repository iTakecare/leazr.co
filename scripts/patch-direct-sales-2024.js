/**
 * patch-direct-sales-2024.js
 *
 * Corrige deux problèmes sur les ventes directes 2024 :
 *
 * 1. ITC-2024-0113 (Mig DP SRL, 1050€) a invoice_date=2025-02-17
 *    → elle est comptée dans le tableau 2024 → on la passe à 2024-12-31
 *
 * 2. ITC-2024-0046 (407.88€), ITC-2024-0088 (661.16€), ITC-2024-0119 (670€)
 *    → client "Alain Vaudon", billing_data.client_data.name = "N/A"
 *    → on met à jour billing_data avec le bon nom
 *
 * Usage :
 *   node scripts/patch-direct-sales-2024.js --dry-run
 *   node scripts/patch-direct-sales-2024.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`\n🔧 PATCH VENTES DIRECTES 2024 ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}\n`);

  let nFixed = 0;

  // ── 1. ITC-2024-0113 : corriger la date 2025 → 2024 ─────────────────────────
  console.log('📅 ITC-2024-0113 — correction date 2025→2024');
  const { data: inv0113, error: e1 } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_date, amount, billing_data')
    .eq('company_id', COMPANY_ID)
    .eq('invoice_number', 'ITC-2024-0113')
    .single();

  if (e1 || !inv0113) {
    console.log('  ⚠️  ITC-2024-0113 introuvable en DB — vérifier si déjà importée');
  } else {
    console.log(`  Trouvée: id=${inv0113.id} | date=${inv0113.invoice_date} | montant=${inv0113.amount}€`);
    if (inv0113.invoice_date <= '2024-12-31') {
      console.log('  ✅ Date déjà en 2024 — rien à faire');
    } else {
      if (!DRY_RUN) {
        const { error: updErr } = await sb
          .from('invoices')
          .update({ invoice_date: '2024-12-31', updated_at: new Date().toISOString() })
          .eq('id', inv0113.id);
        if (updErr) console.error(`  ❌ Erreur: ${updErr.message}`);
        else { console.log('  ✅ Date corrigée → 2024-12-31'); nFixed++; }
      } else {
        console.log('  → (dry-run) Serait mis à jour: invoice_date 2025-02-17 → 2024-12-31');
      }
    }
  }

  // ── 2. N/A billing_data : ITC-2024-0046, 0088, 0119 ─────────────────────────
  const naInvoices = [
    { number: 'ITC-2024-0046', client_name: 'Alain Vaudon', amount: 407.88  },
    { number: 'ITC-2024-0088', client_name: 'Alain Vaudon', amount: 661.16  },
    { number: 'ITC-2024-0119', client_name: 'Alain Vaudon', amount: 670.00  },
  ];

  console.log('\n👤 Correction billing_data N/A (client Alain Vaudon) :');

  for (const target of naInvoices) {
    const { data: inv, error: e2 } = await sb
      .from('invoices')
      .select('id, invoice_number, billing_data')
      .eq('company_id', COMPANY_ID)
      .eq('invoice_number', target.number)
      .single();

    if (e2 || !inv) {
      console.log(`  ⚠️  ${target.number} introuvable`);
      continue;
    }

    const oldBD = inv.billing_data || {};
    const currentName = oldBD?.client_data?.name || oldBD?.client_name || 'N/A';
    console.log(`  ${target.number} | client actuel: "${currentName}"`);

    if (currentName && currentName !== 'N/A' && currentName !== '') {
      console.log(`  ✅ Nom déjà correct — skip`);
      continue;
    }

    const newBillingData = {
      ...oldBD,
      client_data: {
        ...(oldBD.client_data || {}),
        name:    target.client_name,
        company: target.client_name,
      },
      client_name: target.client_name,
    };

    if (!DRY_RUN) {
      const { error: updErr } = await sb
        .from('invoices')
        .update({ billing_data: newBillingData, updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      if (updErr) console.error(`  ❌ Erreur: ${updErr.message}`);
      else { console.log(`  ✅ billing_data.client_data.name → "${target.client_name}"`); nFixed++; }
    } else {
      console.log(`  → (dry-run) Serait mis à jour: client_data.name → "${target.client_name}"`);
    }
  }

  // ── Résumé ────────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(`  Corrections appliquées : ${DRY_RUN ? '(dry-run)' : nFixed}`);
  if (DRY_RUN) console.log('  (dry-run — aucune modification)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
