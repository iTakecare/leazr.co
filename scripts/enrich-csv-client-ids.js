/**
 * enrich-csv-client-ids.js
 *
 * Lit les CSVs d'import Leazr (2023 + 2024), cherche chaque client dans la DB
 * par nom/société, et ajoute la colonne client_id pour éviter les doublons à l'import.
 *
 * Usage: node --input-type=module scripts/enrich-csv-client-ids.js
 *    ou: bun scripts/enrich-csv-client-ids.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL         = 'https://cifbetjefyfocafanlhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU';

const CSV_2023 = '/Users/itakecare/Desktop/iTakecare/Clients/import-leazr-2023.csv';
const CSV_2024 = '/Users/itakecare/Desktop/iTakecare/Clients/import-leazr-2024.csv';

// ── Supabase ──────────────────────────────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Normalize helper (accent + casse + ponctuation) ───────────────────────────
function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove accents
    .replace(/[^a-z0-9]/g, ' ')                         // keep alphanum only
    .replace(/\s+/g, ' ')
    .trim();
}

// Distance de Levenshtein pour la correspondance floue de tokens
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// Deux tokens sont similaires si égaux ou edit distance ≤ 2 sur tokens de 6+ chars
function tokenSimilar(a, b) {
  if (a === b) return true;
  if (a.length >= 6 && b.length >= 6 && levenshtein(a, b) <= 2) return true;
  return false;
}

// Normalise spécifiquement les noms de société : retire les formes juridiques
function normCompany(s) {
  return norm(s)
    .replace(/\b(srl|sprl|scs|asbl|sa|nv|bv|inc|ltd|llc)\b/g, '')
    .replace(/\s+/g, ' ').trim();
}

// Score de similarité : ratio de tokens communs (avec correspondance floue)
function similarity(a, b) {
  const ta = norm(a).split(' ').filter(Boolean);
  const tb = norm(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const common = ta.filter(t => tb.some(u => tokenSimilar(t, u))).length;
  return common / Math.max(ta.length, tb.length);
}

// Similarité société : utilise normCompany pour ignorer SRL/SPRL/etc.
function similarityCompany(a, b) {
  const ta = normCompany(a).split(' ').filter(Boolean);
  const tb = normCompany(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const common = ta.filter(t => tb.some(u => tokenSimilar(t, u))).length;
  return common / Math.max(ta.length, tb.length);
}

// Génère toutes les variantes utiles d'un nom de société pour le matching
function companyVariants(raw) {
  const variants = new Set();
  const add = v => { if (v && v.trim()) variants.add(v.trim()); };

  add(raw);

  // Supprime "#N" et tout ce qui suit  → "Apik #3" → "Apik"
  const noHash = (raw || '').replace(/\s*#\d+.*$/i, '').trim();
  add(noHash);

  // Si format "A | B" → essaie les deux côtés  → "Eurofood Bank | About IT" → "Eurofood Bank" ET "About IT"
  if (raw && raw.includes('|')) {
    raw.split('|').forEach(p => {
      add(p.trim());
      add(p.replace(/\s*#\d+.*$/i, '').trim());
    });
  }

  // Si format "Prénom Nom - Société" → extrait la partie après " - "  → "Bastien Heynderickx - Apik" → "Apik"
  const dashParts = noHash.split(/\s+-\s+/);
  if (dashParts.length > 1) {
    add(dashParts[dashParts.length - 1]);   // dernière partie = société
    add(dashParts[0]);                       // première partie = personne
  }

  return [...variants].filter(Boolean);
}

// Meilleur match parmi les clients DB pour un nom + société donnés
// Retourne toujours le meilleur candidat (même sous le seuil) pour debug
function findBestMatch(clientName, clientCompany, dbClients) {
  let best = null, bestScore = 0;

  // Variantes société + nom du contact comme variante supplémentaire
  const variants = companyVariants(clientCompany);
  if (clientName) variants.push(clientName);

  for (const c of dbClients) {
    const dbName    = c.name    || '';
    const dbCompany = c.company || '';
    const dbFull    = `${c.first_name || ''} ${c.last_name || ''}`.trim();

    // Score société : utilise similarityCompany pour ignorer SRL/SPRL/etc.
    const companyScore = Math.max(
      ...variants.flatMap(v => [
        similarityCompany(v, dbCompany),
        similarityCompany(v, dbName)
      ])
    );
    // Score nom de contact
    const nameScore = clientName ? Math.max(
      similarity(clientName, dbName),
      similarity(clientName, dbFull)
    ) : 0;

    // Score combiné : si pas de nom de contact, société seule suffit
    const score = clientName
      ? companyScore * 0.7 + nameScore * 0.3
      : companyScore;

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return {
    client:  best,
    score:   bestScore,
    matched: bestScore >= 0.6
  };
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const headers = lines[0].replace(/^\uFEFF/, '').split(';');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = splitCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, j) => obj[h] = (vals[j] ?? '').trim());
    rows.push(obj);
  }
  return { headers, rows };
}

function splitCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (line[i] === ';' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

function escapeField(v) {
  const s = String(v ?? '');
  return (s.includes(';') || s.includes('"') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

function serializeCSV(headers, rows) {
  return '\uFEFF' + [
    headers.join(';'),
    ...rows.map(r => headers.map(h => escapeField(r[h] ?? '')).join(';'))
  ].join('\n') + '\n';
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔌 Connexion Supabase...');

  // 1. Charger tous les clients de la DB
  const { data: dbClients, error } = await sb
    .from('clients')
    .select('id, name, company, first_name, last_name, email, city, country');

  if (error) {
    console.error('❌ Erreur Supabase:', error.message);
    process.exit(1);
  }
  console.log(`  → ${dbClients.length} clients trouvés dans la DB`);

  // 2. Traiter chaque CSV
  for (const [csvPath, year] of [[CSV_2023, 2023], [CSV_2024, 2024]]) {
    console.log(`\n📄 Traitement ${year}...`);

    let content;
    try { content = readFileSync(csvPath, 'utf-8'); }
    catch (e) { console.error(`  ❌ Fichier non trouvé: ${csvPath}`); continue; }

    const { headers, rows } = parseCSV(content);

    // Ajouter les nouvelles colonnes
    if (!headers.includes('client_id')) headers.splice(headers.indexOf('client_company') + 1, 0, 'client_id');
    if (!headers.includes('match_score')) headers.push('match_score');

    let matched = 0, created = 0, notFound = 0;
    const notFoundList = [];

    // Tracker le client actif (les lignes "suite" n'ont pas de dossier_number)
    let currentClientName = '', currentClientCompany = '';
    let currentClientId = '', currentScore = '';

    for (const row of rows) {
      if (row.dossier_number) {
        // Nouvelle entrée : faire le matching
        currentClientName    = row.client_name    || '';
        currentClientCompany = row.client_company || '';

        const result = findBestMatch(currentClientName, currentClientCompany, dbClients);

        if (result.matched) {
          currentClientId = result.client.id;
          currentScore    = result.score.toFixed(2);
          matched++;
        } else if (result.score < 0.55) {
          // Score sous le seuil de match = vrai nouveau client → créer dans la DB
          const nameParts  = currentClientName.trim().split(/\s+/);
          const firstName  = nameParts[0] || null;
          const lastName   = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
          const newRecord  = {
            company_id: 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',  // iTakecare
            name:       currentClientCompany || currentClientName || null,
            company:    currentClientCompany || null,
            first_name: firstName,
            last_name:  lastName,
            email:      row.client_email || null,
            city:       row.client_city  || null,
            country:    row.client_country || 'BE',
          };
          // Retire les clés null pour éviter les erreurs Supabase
          Object.keys(newRecord).forEach(k => newRecord[k] === null && delete newRecord[k]);

          const { data: newClient, error: createErr } = await sb
            .from('clients')
            .insert(newRecord)
            .select('id')
            .single();

          if (createErr) {
            console.error(`  ❌ Erreur création "${currentClientCompany}":`, createErr.message);
            currentClientId = '';
            currentScore    = 'ERR';
            notFound++;
            notFoundList.push(`${currentClientCompany} (${currentClientName}) [erreur création]`);
          } else {
            // Ajouter le nouveau client à dbClients pour éviter les doublons si même client dans l'autre CSV
            dbClients.push({ ...newRecord, id: newClient.id });
            currentClientId = newClient.id;
            currentScore    = 'NEW';
            created++;
            console.log(`  ✨ Nouveau client créé : "${currentClientCompany || currentClientName}" → ${newClient.id}`);
          }
        } else {
          // Score intermédiaire : candidat trouvé mais sous le seuil
          currentClientId = '';
          currentScore    = result.score > 0 ? `~${result.score.toFixed(2)}` : '0';
          notFound++;
          const candidate = result.client
            ? ` → meilleur candidat: "${result.client.name}"${result.client.company ? ` / ${result.client.company}` : ''} (score: ${result.score.toFixed(2)})`
            : '';
          notFoundList.push(`${currentClientCompany} (${currentClientName})${candidate}`);
        }
      }
      // Appliquer le client_id à cette ligne (y compris les lignes "suite")
      row.client_id    = currentClientId;
      row.match_score  = currentScore;
    }

    writeFileSync(csvPath, serializeCSV(headers, rows), 'utf-8');
    console.log(`  ✅ ${matched} matchés | ✨ ${created} créés | ❌ ${notFound} non résolus`);
    if (notFoundList.length) {
      console.log('  Non résolus (score intermédiaire, vérifier manuellement):');
      [...new Set(notFoundList)].forEach(n => console.log(`    - ${n}`));
    }
  }

  console.log('\n✅ Terminé ! Les CSVs ont été enrichis avec client_id.');
  console.log('ℹ️  match_score = "NEW" → client créé | score vide → à vérifier manuellement.');
}

main().catch(e => { console.error(e); process.exit(1); });
