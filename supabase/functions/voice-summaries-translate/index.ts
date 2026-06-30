// Rétro-traduction en FRANÇAIS des résumés d'appel Alex restés en anglais
// (l'analyse ElevenLabs transcript_summary est en anglais). One-shot, guardé
// par X-Cron-Secret. Traduit par lots via Claude Haiku.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const looksFrench = (s: string) =>
  /[àâäéèêëîïôöùûüçœ]/i.test(s) ||
  /\b(le|la|les|un|une|des|appel|client|dossier|leasing|documents?|manquants?|rappel|relance)\b/i.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const secret = req.headers.get("x-cron-secret");
  if (secret !== Deno.env.get("VOICE_CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: "no_anthropic_key" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows } = await supabase
    .from("voice_calls")
    .select("id, summary, transcription")
    .not("summary", "is", null)
    .limit(500);

  let translated = 0;
  let skipped = 0;
  for (const row of rows ?? []) {
    const summary: string = (row.summary ?? "").trim();
    if (!summary || looksFrench(summary)) { skipped++; continue; }

    // Préférer une re-synthèse depuis la transcription si dispo (meilleure
    // qualité), sinon traduire le résumé anglais.
    const transcript: string = (row.transcription ?? "").trim();
    const userMsg = transcript.length > 40
      ? `Résume cet appel téléphonique en français (2-3 phrases factuelles) :\n\n"""${transcript.slice(0, 8000)}"""`
      : `Traduis ce résumé d'appel en français naturel (garde le sens, 2-3 phrases) :\n\n"""${summary.slice(0, 2000)}"""`;

    try {
      const aResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: "Tu es l'assistant CRM de Leazr (leasing IT B2B). Tu écris en FRANÇAIS, factuel, sans préambule ni guillemets.",
          messages: [{ role: "user", content: userMsg }],
        }),
      });
      if (!aResp.ok) continue;
      const aData = await aResp.json();
      const text = (aData.content ?? []).map((b: { text?: string }) => b.text ?? "").join("").trim();
      if (text.length > 10) {
        await supabase.from("voice_calls").update({ summary: text }).eq("id", row.id);
        translated++;
      }
    } catch (_e) { /* on continue */ }
  }

  return new Response(JSON.stringify({ ok: true, translated, skipped, total: rows?.length ?? 0 }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
