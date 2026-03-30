/**
 * inspect-credit-note-fk.js — version simplifiée
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  // 1. Cherche une table credit_notes
  const tablesToCheck = ['credit_notes', 'creditnotes'];
  for (const t of tablesToCheck) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (!error) {
      console.log(`✅ Table '${t}' trouvée !`);
      if (data?.length) console.log('  Colonnes:', Object.keys(data[0]).join(', '));
      else console.log('  (table vide)');
    } else {
      console.log(`❌ Table '${t}' : ${error.message}`);
    }
  }

  // 2. Cherche des factures avec credit_note_id non-null (exemples existants)
  const { data: withNC, error: e2 } = await sb
    .from('invoices')
    .select('invoice_number, invoice_type, amount, credit_note_id, credited_amount')
    .eq('company_id', COMPANY_ID)
    .not('credit_note_id', 'is', null)
    .limit(5);

  if (e2) {
    console.log('\ncredit_note_id query error:', e2.message);
  } else if (withNC?.length) {
    console.log('\nFactures avec credit_note_id non-null :');
    withNC.forEach(r => console.log(`  ${r.invoice_number} (${r.invoice_type}) → credit_note_id=${r.credit_note_id} | credited=${r.credited_amount}`));
  } else {
    console.log('\nAucune facture avec credit_note_id non-null.');
  }

  // 3. Essaie de lire la table avec credit_note_id comme self-reference
  //    (teste si c'est invoice.id → invoice.id où la cible doit être credit_note)
  //    En mettant credit_note_id = id de la NC sur la NC elle-même
  console.log('\nTest : credit_note pointe vers quoi ?');
  const { data: nc001 } = await sb
    .from('invoices')
    .select('id, invoice_number, invoice_type')
    .eq('invoice_number', 'ITC-2024-NC-001')
    .single();
  if (nc001) {
    console.log(`  NC-001 id=${nc001.id} type=${nc001.invoice_type}`);
    // Essai : set credit_note_id sur NC-001 elle-même (auto-ref ?)
    // Non, testons plutôt : set credit_note_id=nc001.id sur ITC-2024-0038
    // Si ça marche → c'est bien self-ref invoices.id
    // Si ça échoue → la FK pointe ailleurs
    const { error: testErr } = await sb
      .from('invoices')
      .update({ credit_note_id: nc001.id })
      .eq('invoice_number', 'ITC-2024-0038');
    if (testErr) {
      console.log(`  ❌ Self-ref test échoue : ${testErr.message}`);
    } else {
      console.log(`  ✅ Self-ref fonctionne ! credit_note_id peut pointer vers un id d'invoice`);
      // Rollback
      await sb.from('invoices').update({ credit_note_id: null }).eq('invoice_number', 'ITC-2024-0038');
      console.log(`  ↩️  Rollback effectué`);
    }
  }
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
