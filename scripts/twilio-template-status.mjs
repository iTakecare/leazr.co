// =====================================================================
// twilio-template-status.mjs — vérifie le statut d'APPROBATION WhatsApp de
// chaque template (ContentSid) référencé dans messaging_settings.
//
// Pourquoi : un envoi WhatsApp par ContentSid qui repart en 63016
// ("freeform hors fenêtre 24 h") = Twilio n'a PAS pu utiliser le template
// comme template approuvé → il l'a renvoyé en message libre → refusé.
// Cause quasi-certaine : le template n'est pas en statut "approved" côté Meta.
//
// Usage :
//   TWILIO_ACCOUNT_SID=ACxxx TWILIO_AUTH_TOKEN=xxx node scripts/twilio-template-status.mjs
//
// Les credentials sont dans les secrets des edge functions Supabase
// (Dashboard → Project Settings → Edge Functions → Secrets), pas dans le repo.
// =====================================================================

import { createClient } from "@supabase/supabase-js";

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
if (!SID || !TOKEN) {
  console.error("❌ Définis TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN dans l'environnement.");
  process.exit(1);
}

const sb = createClient(
  "https://cifbetjefyfocafanlhv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU",
  { auth: { persistSession: false } },
);

const auth = "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");

const { data: settings } = await sb
  .from("messaging_settings")
  .select("company_id, templates");

for (const s of settings ?? []) {
  console.log(`\n=== company ${s.company_id} ===`);
  for (const [key, tpl] of Object.entries(s.templates ?? {})) {
    const csid = tpl.content_sid;
    if (!csid) {
      console.log(`  ${key.padEnd(20)} : ❌ pas de content_sid`);
      continue;
    }
    // Statut d'approbation WhatsApp d'un Content template
    const r = await fetch(
      `https://content.twilio.com/v1/Content/${csid}/ApprovalRequests`,
      { headers: { Authorization: auth } },
    );
    const j = await r.json().catch(() => null);
    const wa = j?.whatsapp ?? j?.approval_requests?.whatsapp;
    const status = wa?.status ?? (r.ok ? "(aucune demande WhatsApp)" : `HTTP ${r.status}`);
    const cat = wa?.category ? ` [${wa.category}]` : "";
    const flag = status === "approved" ? "✅" : "⚠️ ";
    console.log(`  ${key.padEnd(20)} : ${flag} ${status}${cat}  (${csid})`);
  }
}
