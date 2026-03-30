/**
 * patch-invoice-dates-2024.js
 *
 * Corrige 5 factures leasing 2024 manquantes ou avec mauvaise date :
 *
 * PARTIE 1 — Patch date nulle (factures déjà en DB) :
 *   ITC-2024-0073  → 2024-08-01  (Choukri Skhiri / Prepalux, FA 4387.67)
 *   ITC-2024-0074  → 2024-08-01  (Julien Bombeke / Ropal Sécurité, FA 731.87)
 *   ITC-2024-0081  → 2024-08-01  (Antoine Sottiaux / LeGrow #2, FA 1756.87)
 *
 * PARTIE 2 — Créer nouvelles offres/contrats/factures 2024 :
 *   ITC-2024-0104  → 2024-10-29  (Davy Loomans / JNS Lightning, FA 2498.63, PA 1110.00)
 *   ITC-2024-0109  → 2024-11-22  (Gregory Ilnicki / Infra Route SRL, FA 1185.99, PA 824.79)
 *
 * NOTE : Les dossiers 180-19681 et 180-19866 ont des factures 2023 existantes
 * (ITC-2023-0036 et ITC-2023-0057). On ne touche PAS à ces entrées 2023.
 * On crée de nouveaux offers avec suffixe "-2024" pour éviter le conflit de clé.
 *
 * Usage :
 *   node scripts/patch-invoice-dates-2024.js --dry-run
 *   node scripts/patch-invoice-dates-2024.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const ADMIN_EMAIL          = 'hello@itakecare.be';

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ── PARTIE 1 : Factures déjà en DB, date nulle → patch ──────────────────────
const FIXES_BY_NUMBER = [
  { invoice_number: 'ITC-2024-0073', correct_date: '2024-08-01', client: 'Choukri Skhiri / Prepalux',       fa: 4387.67 },
  { invoice_number: 'ITC-2024-0074', correct_date: '2024-08-01', client: 'Julien Bombeke / Ropal Sécurité',  fa: 731.87  },
  { invoice_number: 'ITC-2024-0081', correct_date: '2024-08-01', client: 'Antoine Sottiaux / LeGrow #2',     fa: 1756.87 },
];

// ── PARTIE 2 : Nouvelles factures 2024 (dossiers déjà utilisés pour 2023) ───
// On crée de nouveaux offers/contrats/factures — on ne touche pas aux 2023.
const NEW_LEASING_2024 = [
  {
    // PDF: ITC-2024-0104, Date: 29/10/2024, Dossier Grenke: 180-24903
    // CSV: dossier interne 180-19681 (déjà en DB pour 2023 → ITC-2023-0036)
    offer_dossier:  '180-19681-2024',   // suffixe pour éviter collision unique
    real_dossier:   '180-19681',        // dossier réel dans billing_data
    invoice_number: 'ITC-2024-0104',
    invoice_date:   '2024-10-29',
    amount:         2498.63,
    purchase_price: 1110.00,
    client:         'Davy Loomans - JNS Lightning',
    leaser_name:    'Grenke',
    duration:       48,
  },
  {
    // PDF: ITC-2024-0109, Date: 22/11/2024, Dossier Grenke: 180-025291
    // CSV: dossier interne 180-19866 (déjà en DB pour 2023 → ITC-2023-0057)
    offer_dossier:  '180-19866-2024',
    real_dossier:   '180-19866',
    invoice_number: 'ITC-2024-0109',
    invoice_date:   '2024-11-22',
    amount:         1185.99,
    purchase_price: 824.79,
    client:         'Gregory Ilnicki - Infra Route SRL',
    leaser_name:    'Grenke',
    duration:       48,
  },
];

async function main() {
  console.log(`\n🔧 PATCH INVOICE DATES 2024 ${DRY_RUN ? '[DRY-RUN]' : '[RÉEL]'}\n`);

  let nFixed = 0;
  let totalFA = 0;

  // ── Récupérer user_id et leasers ──────────────────────────────────────────
  const { data: userData } = await sb.from('profiles').select('id').eq('email', ADMIN_EMAIL).single();
  const USER_ID = userData?.id;

  const { data: leasers } = await sb.from('leasers').select('id, name').eq('company_id', COMPANY_ID);
  const leaserByName = {};
  for (const l of leasers || []) leaserByName[l.name.toLowerCase()] = l.id;

  // ── PARTIE 1 : Patch dates nulles ─────────────────────────────────────────
  console.log('📅 PARTIE 1 — Correction dates nulles (factures déjà en DB)\n');
  for (const fix of FIXES_BY_NUMBER) {
    const { data: invs, error } = await sb
      .from('invoices')
      .select('id, invoice_number, invoice_date, amount, contract_id')
      .eq('company_id', COMPANY_ID)
      .eq('invoice_number', fix.invoice_number);

    if (error) { console.error(`  ❌ ${fix.invoice_number}: ${error.message}`); continue; }
    if (!invs?.length) { console.log(`  ⚠️  ${fix.invoice_number} INTROUVABLE en DB`); continue; }

    const inv = invs[0];
    const currentDate = inv.invoice_date || '(null)';
    console.log(`  📄 ${fix.invoice_number} | date: ${currentDate} | montant: ${inv.amount}€ | ${fix.client}`);

    if (inv.invoice_date === fix.correct_date) {
      console.log(`     ✅ Déjà correct — skip`);
      totalFA += fix.fa;
      continue;
    }

    if (DRY_RUN) {
      console.log(`     → (dry-run) invoice_date: ${currentDate} → ${fix.correct_date}`);
      totalFA += fix.fa;
      continue;
    }

    const { error: updErr } = await sb.from('invoices').update({
      invoice_date: fix.correct_date,
      paid_at:      fix.correct_date,
      updated_at:   new Date().toISOString(),
    }).eq('id', inv.id);

    if (updErr) { console.error(`     ❌ ${updErr.message}`); continue; }
    console.log(`     ✅ Corrigé: date ${currentDate} → ${fix.correct_date}`);
    nFixed++;
    totalFA += fix.fa;
  }

  // ── PARTIE 2 : Créer nouvelles factures 2024 ──────────────────────────────
  console.log('\n🆕 PARTIE 2 — Création nouvelles offres/contrats/factures 2024\n');

  for (const rec of NEW_LEASING_2024) {
    console.log(`  📋 ${rec.invoice_number} | ${rec.client} | FA=${rec.amount}€ | date=${rec.invoice_date}`);

    // Vérifier si la facture existe déjà
    const { data: existingInv } = await sb
      .from('invoices')
      .select('id, invoice_number, invoice_date')
      .eq('company_id', COMPANY_ID)
      .eq('invoice_number', rec.invoice_number);

    if (existingInv?.length) {
      const ei = existingInv[0];
      if (ei.invoice_date === rec.invoice_date) {
        console.log(`     ✅ Facture déjà en DB avec bonne date — skip`);
        totalFA += rec.amount;
        continue;
      } else {
        // Facture existe mais mauvaise date → patch uniquement
        console.log(`     ⚠️  Facture déjà en DB (date=${ei.invoice_date}) → patch date vers ${rec.invoice_date}`);
        if (!DRY_RUN) {
          const { error: pErr } = await sb.from('invoices').update({
            invoice_date: rec.invoice_date,
            paid_at:      rec.invoice_date,
            updated_at:   new Date().toISOString(),
          }).eq('id', ei.id);
          if (pErr) { console.error(`     ❌ Patch date: ${pErr.message}`); continue; }
          console.log(`     ✅ Date corrigée → ${rec.invoice_date}`);
          nFixed++;
        } else {
          console.log(`     → (dry-run) Serait patché: ${ei.invoice_date} → ${rec.invoice_date}`);
        }
        totalFA += rec.amount;
        continue;
      }
    }

    if (DRY_RUN) {
      console.log(`     → (dry-run) Créerait: offer(${rec.offer_dossier}) + contrat + contract_equipment(PA=${rec.purchase_price}€) + facture`);
      totalFA += rec.amount;
      continue;
    }

    try {
      const leaserId = leaserByName[rec.leaser_name.toLowerCase()] || null;

      // 1. Créer le nouvel offer (dossier_number avec suffixe -2024)
      const { data: offer, error: offerErr } = await sb.from('offers').insert({
        company_id:            COMPANY_ID,
        user_id:               USER_ID,
        client_name:           rec.client,
        status:                'accepted',
        workflow_status:       'financed',
        converted_to_contract: true,
        dossier_number:        rec.offer_dossier,
        request_date:          rec.invoice_date,
        created_at:            rec.invoice_date,
        updated_at:            rec.invoice_date,
        monthly_payment:       0,
        amount:                rec.amount,
        financed_amount:       rec.amount,
        contract_duration:     rec.duration,
        leaser_id:             leaserId,
        remarks:               `[patch-2024] ${rec.invoice_number} — dossier réel: ${rec.real_dossier}`,
      }).select('id').single();

      if (offerErr) throw new Error(`Offer: ${offerErr.message}`);
      const offerId = offer.id;
      console.log(`     ✅ Offer créé: ${offerId} (dossier=${rec.offer_dossier})`);

      // 2. Créer le contrat
      const { data: contract, error: cErr } = await sb.from('contracts').insert({
        company_id:          COMPANY_ID,
        user_id:             USER_ID,
        offer_id:            offerId,
        client_name:         rec.client,
        status:              'active',
        created_at:          rec.invoice_date,
        updated_at:          rec.invoice_date,
        monthly_payment:     0,
        leaser_name:         rec.leaser_name,
        leaser_id:           leaserId,
        contract_start_date: rec.invoice_date,
        contract_duration:   rec.duration,
        dossier_date:        rec.invoice_date,
        invoice_generated:   true,
        invoice_date:        rec.invoice_date,
        payment_date:        rec.invoice_date,
      }).select('id').single();

      if (cErr) throw new Error(`Contract: ${cErr.message}`);
      const contractId = contract.id;
      console.log(`     ✅ Contrat créé: ${contractId}`);

      // 3. Créer contract_equipment (pour le PA dans le dashboard)
      const margin = rec.amount - rec.purchase_price;
      const { error: ceErr } = await sb.from('contract_equipment').insert({
        contract_id:    contractId,
        title:          'Voir facture',
        quantity:       1,
        purchase_price: rec.purchase_price,
        margin:         margin,
        monthly_payment: 0,
      });
      if (ceErr) console.warn(`     ⚠️  contract_equipment: ${ceErr.message}`);
      else console.log(`     ✅ contract_equipment: PA=${rec.purchase_price}€, marge=${margin.toFixed(2)}€`);

      // 4. Créer la facture
      const { error: invErr } = await sb.from('invoices').insert({
        company_id:       COMPANY_ID,
        offer_id:         offerId,
        contract_id:      contractId,
        invoice_number:   rec.invoice_number,
        invoice_date:     rec.invoice_date,
        created_at:       rec.invoice_date,
        updated_at:       rec.invoice_date,
        invoice_type:     'leasing',
        integration_type: 'manual',
        leaser_name:      rec.leaser_name,
        amount:           rec.amount,
        status:           'paid',
        paid_at:          rec.invoice_date,
        billing_data: {
          contract_data: {
            client_name:    rec.client,
            client_company: rec.client,
            dossier_number: rec.real_dossier,
            leaser_name:    rec.leaser_name,
          },
          client_name:    rec.client,
          dossier_number: rec.real_dossier,
        },
      });

      if (invErr) throw new Error(`Invoice: ${invErr.message}`);
      console.log(`     ✅ Facture ${rec.invoice_number} créée: ${rec.amount}€ | ${rec.invoice_date}`);
      nFixed++;
      totalFA += rec.amount;

    } catch (err) {
      console.error(`     ❌ ERREUR: ${err.message}`);
    }
  }

  // ── Résumé ────────────────────────────────────────────────────────────────
  const totalExpected = 4387.67 + 731.87 + 1756.87 + 2498.63 + 1185.99;
  console.log('\n' + '═'.repeat(60));
  if (!DRY_RUN) {
    console.log(`  Corrections appliquées : ${nFixed} / ${FIXES_BY_NUMBER.length + NEW_LEASING_2024.length}`);
    console.log(`  Total FA récupéré      : ${totalFA.toFixed(2)}€  (attendu: ${totalExpected.toFixed(2)}€)`);
  } else {
    console.log(`  ${FIXES_BY_NUMBER.length + NEW_LEASING_2024.length} corrections à appliquer (dry-run)`);
    console.log(`  Total FA attendu       : ${totalExpected.toFixed(2)}€`);
  }
  if (DRY_RUN) console.log('  (dry-run — aucune modification)');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
