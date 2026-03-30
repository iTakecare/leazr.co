/**
 * Inspecte la structure réelle des contrats en DB
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://cifbetjefyfocafanlhv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU',
  { auth: { persistSession: false } }
);
const COMPANY_ID = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';

// Récupère un contrat complet pour voir tous ses champs
const { data, error } = await sb
  .from('contracts')
  .select('*')
  .eq('company_id', COMPANY_ID)
  .limit(3);

if (error) { console.error(error.message); process.exit(1); }

console.log('Colonnes disponibles:', Object.keys(data[0]).join(', '));
console.log('\nExemple contrat 1:');
console.log(JSON.stringify(data[0], null, 2));
console.log('\nExemple contrat 2:');
console.log(JSON.stringify(data[1], null, 2));
