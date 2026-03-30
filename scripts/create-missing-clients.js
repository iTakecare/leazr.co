/**
 * create-missing-clients.js
 *
 * Crée les clients manquants pour l'import des ventes directes 2023,
 * puis affiche les noms exacts à utiliser dans les overrides.
 *
 * Usage :
 *   node scripts/create-missing-clients.js --dry-run
 *   node scripts/create-missing-clients.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const COMPANY_ID           = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
const DRY_RUN              = process.argv.includes('--dry-run');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Clients à créer ou retrouver
// Format : { name, company, email, vat_number, ref_in_json[] }
const CLIENTS_TO_CREATE = [
  {
    name:       'Jérôme Dereume',
    company:    null,
    vat_number: 'BE0886921577',
    refs: ['Dereume, Jérôme'],
  },
  {
    name:       'Repairo',
    company:    'Repairo',
    vat_number: 'BE0741344472',
    refs: ['Repairo'],
  },
  {
    name:       'Alta Taurus SL',
    company:    'Alta Taurus SL',
    vat_number: 'ESB66877424',
    refs: ['ALTA TAURUS SL'],
  },
  {
    name:       'Appetito PDA Box - Taverne Lecoq',
    company:    'SPRL CA CONSTRUCT-STARTER BVBA',
    vat_number: 'BE0665855213',
    refs: ['Appetito Box PDA - Taverne Lecoq SPRL CA CONSTRUCT- STARTER BVBA'],
  },
  {
    name:       'Appetito PDA Box - Little Italy',
    company:    'Little Italy',
    vat_number: 'BE0799491915',
    refs: ['Appetito Box PDA - Little Italy Pizzeria Mons Little Italy'],
  },
  {
    name:       'Appetito PDA Box - Cap Spartel',
    company:    'Cap Spartel',
    vat_number: 'BE0789561093',
    refs: ['Appetito Box PDA - Cap Spartel Cap Spartel'],
  },
  {
    name:       'Francesco Brancato',
    company:    null,
    vat_number: 'BE0805090892',
    refs: ['Appetito PDA Box (Francesco Brancato)'],
  },
  {
    name:       'Le Chiffre SRL',
    company:    'Le Chiffre SRL',
    vat_number: 'BE0864243670',
    refs: ['LE-CHIFFRE'],
  },
  {
    name:       'Sales Konsul SRL',
    company:    'Sales Konsul SRL',
    vat_number: 'BE0782616091',
    refs: ['SALES KONSUL'],
  },
  {
    name:       'MA.DE Management',
    company:    'MA.DE Management',
    vat_number: 'BE0765437292',
    refs: ['MA.DE Management'],
  },
  {
    name:       'A2Com SRL',
    company:    'A2Com SRL',
    vat_number: null,
    refs: ['A2Com SRL'],
  },
  {
    name:       'Marie Laure Nizet',
    company:    null,
    vat_number: 'BE0696865519',
    refs: ['Nizet, Marie-Laure'],
  },
  {
    name:       'Yohann Bouvier-Gaz',
    company:    null,
    vat_number: 'BE0695514348',
    refs: ['Bouvier-Gaz, Yohann'],
  },
];

async function searchExisting(name, company) {
  // Search by exact name first
  const terms = [name, company].filter(Boolean);
  for (const term of terms) {
    const { data } = await sb.from('clients')
      .select('id, name, company')
      .eq('company_id', COMPANY_ID)
      .or(`name.ilike.%${term}%,company.ilike.%${term}%`)
      .limit(3);
    if (data?.length) return data;
  }
  return [];
}

async function main() {
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN\n');
  else console.log('\n🔧 CRÉATION DES CLIENTS MANQUANTS\n');

  const overrideMap = {}; // ref_in_json → client name in DB

  for (const c of CLIENTS_TO_CREATE) {
    // 1. Check if already exists
    const existing = await searchExisting(c.name, c.company);

    if (existing.length) {
      const found = existing[0];
      console.log(`  ✅ Existe déjà : "${found.name}" ${found.company ? '/ '+found.company : ''}`);
      for (const ref of c.refs) overrideMap[ref] = found.name;
      continue;
    }

    // 2. Create
    const clientData = {
      company_id: COMPANY_ID,
      name:       c.name,
      company:    c.company || null,
      vat_number: c.vat_number || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (DRY_RUN) {
      console.log(`  [DRY] Créerait client : "${c.name}" ${c.company ? '('+c.company+')' : ''}`);
      for (const ref of c.refs) overrideMap[ref] = c.name;
      continue;
    }

    const { data: created, error } = await sb.from('clients')
      .insert(clientData)
      .select('id, name')
      .single();

    if (error) {
      console.log(`  ❌ Erreur création "${c.name}": ${error.message}`);
    } else {
      console.log(`  ✅ Créé : "${created.name}" (${created.id.slice(0,8)}...)`);
      for (const ref of c.refs) overrideMap[ref] = created.name;
    }
  }

  // Check Mig DP SRL specifically — search by company name "Mig DP"
  console.log('\n── Vérification Mig DP SRL ──');
  const { data: migdp } = await sb.from('clients')
    .select('id, name, company')
    .eq('company_id', COMPANY_ID)
    .or('name.ilike.%mig dp%,company.ilike.%mig dp%')
    .limit(5);
  if (migdp?.length) {
    console.log('  Trouvé en DB :');
    for (const m of migdp) console.log(`    → "${m.name}" / "${m.company}"`);
    overrideMap['MIG DP S.P.R.L.'] = migdp[0].name;
  } else {
    console.log('  Mig DP introuvable → sera créé avec le nom "Mig DP SRL"');
  }

  // Print the CLIENT_OVERRIDES block to update import-direct-sales.js
  console.log('\n══════════════════════════════════════════════════════');
  console.log('📋 CLIENT_OVERRIDES mis à jour pour import-direct-sales.js :');
  console.log('══════════════════════════════════════════════════════\n');
  for (const [ref, name] of Object.entries(overrideMap)) {
    console.log(`  '${ref}': '${name}',`);
  }
}

main().catch(e => console.error('💥', e.message));
