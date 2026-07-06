#!/usr/bin/env node
// Répare les fichiers du bucket client-kyc-reports qui contiennent le corps
// multipart de la requête d'upload Supabase (préambule "------WebKitFormBoundary…
// / cacheControl" avant le %PDF, boundary de fermeture après le dernier %%EOF)
// au lieu du seul PDF — l'aperçu direct affiche alors du texte brut.
//
//   node scripts/heal-kyc-pdfs.mjs           # dry-run (liste seulement)
//   node scripts/heal-kyc-pdfs.mjs --apply   # ré-uploade les octets propres
//
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';
const BUCKET = 'client-kyc-reports';
const APPLY = process.argv.includes('--apply');

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function findMarker(bytes, marker, fromEnd = false) {
  const m = new Uint8Array(marker.length);
  for (let i = 0; i < marker.length; i++) m[i] = marker.charCodeAt(i);
  const last = bytes.length - m.length;
  const test = (i) => { for (let j = 0; j < m.length; j++) if (bytes[i + j] !== m[j]) return false; return true; };
  if (fromEnd) { for (let i = last; i >= 0; i--) if (test(i)) return i; }
  else { for (let i = 0; i <= last; i++) if (test(i)) return i; }
  return -1;
}

function extractCleanPdf(bytes) {
  const start = findMarker(bytes.subarray(0, Math.min(bytes.length, 4096)), '%PDF');
  if (start === -1) return null; // pas un PDF
  const eof = findMarker(bytes, '%%EOF', true);
  const end = eof === -1 ? bytes.length : eof + 5;
  if (start === 0 && end >= bytes.length) return null; // déjà propre
  return bytes.subarray(start, end);
}

// Liste récursive du bucket (prefixes = company/client)
async function listAll(prefix = '') {
  const out = [];
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const entry of data || []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) out.push(...(await listAll(path))); // dossier
    else out.push(path);
  }
  return out;
}

const files = (await listAll()).filter((p) => p.toLowerCase().endsWith('.pdf'));
console.log(`${files.length} PDF(s) dans le bucket ${BUCKET}\n`);

let healed = 0, clean = 0, errors = 0;
for (const path of files) {
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) { console.log(`  ⚠️  ${path} — download: ${error?.message}`); errors++; continue; }
  const bytes = new Uint8Array(await data.arrayBuffer());
  const cleaned = extractCleanPdf(bytes);
  if (!cleaned) { clean++; continue; }
  console.log(`  🩹 ${path} — ${bytes.length} → ${cleaned.length} octets (wrapper retiré)`);
  if (APPLY) {
    const copy = new Uint8Array(cleaned);
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, copy, {
      contentType: 'application/pdf', upsert: true,
    });
    if (upErr) { console.log(`      ❌ ré-upload: ${upErr.message}`); errors++; continue; }
  }
  healed++;
}

console.log(`\nRésumé: ${healed} à réparer${APPLY ? ' (ré-uploadés)' : ' (dry-run)'}, ${clean} déjà propre(s), ${errors} erreur(s).`);
if (!APPLY && healed) console.log('Relance avec --apply pour écrire les corrections.');
