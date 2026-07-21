/**
 * verify-demo-client.mjs
 *
 * Vérifie l'environnement démo NovaTech en se connectant COMME LE CLIENT
 * (clé anon + RLS, mêmes requêtes que l'app). À lancer après tout changement
 * (création, masquage admin, etc.) pour confirmer que la démo est intacte.
 *
 * Usage : node scripts/verify-demo-client.mjs
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://cifbetjefyfocafanlhv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw',
  { auth: { persistSession: false } }
);

let ok = true;
const check = (label, cond, detail = '') => {
  console.log(`${cond ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
  if (!cond) ok = false;
};

const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
  email: 'demo.novatech@leazr.co',
  password: 'DemoLeazr2026!',
});
check('Login client démo', !authErr, authErr?.message);
if (authErr) process.exit(1);

const { data: client } = await sb.from('clients')
  .select('id, name, has_custom_catalog').eq('user_id', auth.user.id).single();
check('Client résolu', !!client, client?.name);
check('Catalogue sur mesure activé', client?.has_custom_catalog === true);

const { data: eq } = await sb.from('contract_equipment')
  .select('id, collaborator_id, contracts!inner(client_id, status)')
  .eq('contracts.client_id', client.id)
  .in('contracts.status', ['active', 'signed', 'delivered']);
const assigned = eq?.filter(e => e.collaborator_id).length ?? 0;
check('24 équipements visibles', eq?.length === 24, `${eq?.length} (${assigned} assignés, ${(eq?.length ?? 0) - assigned} non assignés)`);

const { data: collabs } = await sb.from('collaborators').select('id').eq('client_id', client.id);
check('8 collaborateurs', collabs?.length === 8, String(collabs?.length));

const { data: contracts } = await sb.from('contracts')
  .select('id, status, monthly_payment').eq('client_id', client.id);
check('2 contrats actifs visibles', contracts?.length === 2,
  contracts?.map(c => `${c.status} ${c.monthly_payment}€`).join(' | '));

const { data: offers } = await sb.from('offers')
  .select('id').eq('client_id', client.id).eq('converted_to_contract', false);
check('1 demande en cours visible', offers?.length === 1, String(offers?.length));

const { data: prices } = await sb.from('client_custom_prices')
  .select('product_id').eq('client_id', client.id).eq('is_active', true);
check('15 produits au catalogue sur mesure', prices?.length === 15, String(prices?.length));

const { data: vprices } = await sb.from('client_custom_variant_prices')
  .select('id').eq('client_id', client.id).eq('is_active', true);
check('38 variantes à prix négociés', vprices?.length === 38, String(vprices?.length));

await sb.auth.signOut();
console.log(ok ? '\n🎉 Démo intacte — tout est visible côté client.' : '\n⚠️ Des vérifications ont échoué.');
process.exit(ok ? 0 : 1);
