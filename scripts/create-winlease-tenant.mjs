/**
 * create-winlease-tenant.mjs
 * Crée le tenant Winlease (company_type 'financeur', slug 'winlease') et son
 * admin financeur hello@winlease.be avec un mot de passe fort généré.
 * Idempotent : réutilise la company/l'utilisateur s'ils existent déjà
 * (le mot de passe est alors réinitialisé et affiché).
 * Usage : node scripts/create-winlease-tenant.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const EMAIL = 'hello@winlease.be';
const SLUG = 'winlease';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Mot de passe fort : 24 caractères aléatoires + classes garanties
const password =
  randomBytes(16).toString('base64url').slice(0, 20) + 'aA9!';

// 1) Company Winlease (financeur)
let { data: company, error: cErr } = await sb
  .from('companies')
  .select('id, name, company_type, slug')
  .eq('slug', SLUG)
  .maybeSingle();
if (cErr) { console.error('❌ lecture companies :', cErr.message); process.exit(1); }

if (!company) {
  const { data, error } = await sb
    .from('companies')
    .insert({
      name: 'Winlease',
      slug: SLUG,
      company_type: 'financeur',
      is_active: true,
      account_status: 'active',
      contract_prefix: 'WL',
      primary_color: '#1e3a5f',
    })
    .select('id, name, company_type, slug')
    .single();
  if (error) { console.error('❌ création company :', error.message); process.exit(1); }
  company = data;
  console.log('✅ Company Winlease créée :', company.id);
} else {
  console.log('ℹ️ Company existante réutilisée :', company.id, `(type=${company.company_type})`);
  if (company.company_type !== 'financeur') {
    const { error } = await sb.from('companies').update({ company_type: 'financeur' }).eq('id', company.id);
    if (error) { console.error('❌ passage en financeur :', error.message); process.exit(1); }
    console.log('✅ company_type mis à financeur');
  }
}

// 2) Utilisateur auth hello@winlease.be
let userId = null;
const { data: created, error: uErr } = await sb.auth.admin.createUser({
  email: EMAIL,
  password,
  email_confirm: true,
  user_metadata: { first_name: 'Winlease', last_name: 'Admin' },
});
if (uErr) {
  // Existe déjà → retrouver et réinitialiser le mot de passe
  const { data: list, error: lErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (lErr) { console.error('❌', lErr.message); process.exit(1); }
  const existing = list.users.find((u) => u.email?.toLowerCase() === EMAIL);
  if (!existing) { console.error('❌ createUser a échoué et utilisateur introuvable :', uErr.message); process.exit(1); }
  userId = existing.id;
  const { error: pErr } = await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (pErr) { console.error('❌ reset mot de passe :', pErr.message); process.exit(1); }
  console.log('ℹ️ Utilisateur existant, mot de passe réinitialisé :', userId);
} else {
  userId = created.user.id;
  console.log('✅ Utilisateur créé :', userId);
}

// 3) Profil admin rattaché à Winlease
const { error: prErr } = await sb.from('profiles').upsert(
  {
    id: userId,
    first_name: 'Winlease',
    last_name: 'Admin',
    role: 'admin',
    company_id: company.id,
  },
  { onConflict: 'id' }
);
if (prErr) { console.error('❌ profil :', prErr.message); process.exit(1); }
console.log('✅ Profil admin rattaché à Winlease');

console.log('\n──────── IDENTIFIANTS ────────');
console.log('URL      : https://app.leazr.co/login');
console.log('Portail  : /winlease/financeur/dashboard');
console.log('Email    :', EMAIL);
console.log('Password :', password);
console.log('──────────────────────────────');
