/**
 * hide-demo-from-admin.mjs
 *
 * Masque l'environnement démo NovaTech des vues admin iTakecare en déplaçant
 * ses contrats et offres vers la société "Broker Demo" (société fantôme).
 *
 * Pourquoi ça marche :
 *   - Les listes admin (offres, dashboards, KPI) filtrent par company_id
 *     → les données démo n'apparaissent plus.
 *   - Le dashboard CLIENT lit tout via client_id (RLS auth_client_ids)
 *     → la démo reste 100% fonctionnelle.
 *
 * Usage :
 *   node scripts/hide-demo-from-admin.mjs             → dry-run
 *   node scripts/hide-demo-from-admin.mjs --apply     → déplace vers Broker Demo
 *   node scripts/hide-demo-from-admin.mjs --restore   → ramène vers iTakecare
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const ITAKECARE_COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const SHADOW_COMPANY_ID    = '0d405693-6880-4f88-b857-f659c8912ffe'; // Broker Demo
const DEMO_CLIENT_EMAIL    = 'demo.novatech@leazr.co';

const APPLY   = process.argv.includes('--apply');
const RESTORE = process.argv.includes('--restore');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const target = RESTORE ? ITAKECARE_COMPANY_ID : SHADOW_COMPANY_ID;
const targetName = RESTORE ? 'iTakecare' : 'Broker Demo (fantôme)';

const { data: client } = await sb.from('clients')
  .select('id, name')
  .eq('email', DEMO_CLIENT_EMAIL)
  .maybeSingle();

if (!client) { console.log('❌ Client démo introuvable.'); process.exit(1); }

const { data: contracts } = await sb.from('contracts').select('id, company_id, monthly_payment').eq('client_id', client.id);
const { data: offers } = await sb.from('offers').select('id, company_id, monthly_payment, converted_to_contract').eq('client_id', client.id);

console.log(`\n🎭 Client démo : ${client.name} (${client.id})`);
console.log(`   Contrats : ${contracts?.length ?? 0} | Offres : ${offers?.length ?? 0}`);
console.log(`   Destination : ${targetName} (${target})\n`);

if (!APPLY && !RESTORE) { console.log('   → Relance avec --apply (masquer) ou --restore (ré-afficher).\n'); process.exit(0); }

const { data: mc, error: e1 } = await sb.from('contracts')
  .update({ company_id: target }).eq('client_id', client.id).select('id');
if (e1) { console.error('❌ contracts:', e1.message); process.exit(1); }
console.log(`✅ ${mc.length} contrat(s) déplacé(s) vers ${targetName}`);

const { data: mo, error: e2 } = await sb.from('offers')
  .update({ company_id: target }).eq('client_id', client.id).select('id');
if (e2) { console.error('❌ offers:', e2.message); process.exit(1); }
console.log(`✅ ${mo.length} offre(s) déplacée(s) vers ${targetName}\n`);
