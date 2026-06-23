// Dispatcher des campagnes d'appels groupés Alex. Invoqué par pg_cron (1/min),
// authentifié par X-Cron-Secret (pas de JWT). Règle d'or : UN SEUL appel Alex à
// la fois sur le numéro ElevenLabs partagé (campagnes + appels manuels confondus).
//
// À chaque tick :
//   1. Nettoyage des appels "ringing" périmés (webhook jamais arrivé) -> failed.
//   2. Finalisation des campagnes terminées -> rapport email + statut completed.
//   3. Si aucun appel en vol : lance le plus ancien appel 'queued' d'une campagne.
//
// verify_jwt = false (voir config.toml).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { ElevenLabsError, startElevenLabsCall } from "../_shared/elevenlabs.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STALE_RINGING_MS = 6 * 60 * 1000; // un appel "ringing" plus vieux que ça est considéré perdu

const firstMessageByLang: Record<string, (n: string) => string> = {
  fr: (n) => `Bonjour ${n}, je suis Alex, l'assistante virtuelle d'iTakecare. Cet appel est enregistré pour assurer la qualité du service. Vous pouvez à tout moment demander à parler à un collaborateur humain. Avez-vous quelques minutes ?`,
  nl: (n) => `Goedendag ${n}, ik ben Alex, de virtuele assistente van iTakecare. Dit gesprek wordt opgenomen voor kwaliteitsdoeleinden. U kunt op elk moment vragen om met een menselijke medewerker te spreken. Heeft u enkele minuten?`,
  en: (n) => `Hello ${n}, I'm Alex, iTakecare's virtual assistant. This call is being recorded for quality purposes. You can ask to speak with a human colleague at any time. Do you have a few minutes?`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("VOICE_CRON_SECRET");
  const provided = req.headers.get("X-Cron-Secret");
  if (!cronSecret || provided !== cronSecret) {
    return json(401, { error: "unauthorized_cron" });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1) Nettoyage des appels "ringing/in_progress" périmés.
    const staleCutoff = new Date(Date.now() - STALE_RINGING_MS).toISOString();
    await supabase.from("voice_calls")
      .update({ status: "failed" })
      .eq("provider", "elevenlabs")
      .in("status", ["ringing", "in_progress"])
      .lt("updated_at", staleCutoff);

    // 2) Finalisation des campagnes 'running' sans appel restant (ni queued ni en vol).
    const finalized = await finalizeCompletedCampaigns(supabase);

    // 3) Gate de concurrence : un appel Alex en vol -> on ne lance rien.
    const { count: inFlight } = await supabase
      .from("voice_calls")
      .select("id", { count: "exact", head: true })
      .eq("provider", "elevenlabs")
      .in("status", ["ringing", "in_progress"]);

    if ((inFlight ?? 0) > 0) {
      return json(200, { ok: true, action: "wait_in_flight", finalized });
    }

    // Plus ancien appel 'queued' rattaché à une campagne 'running'.
    const { data: running } = await supabase
      .from("voice_campaigns").select("id").eq("status", "running");
    const runningIds = (running ?? []).map((c: any) => c.id);
    if (runningIds.length === 0) return json(200, { ok: true, action: "idle", finalized });

    const { data: next } = await supabase
      .from("voice_calls")
      .select("id, client_id, company_id, to_phone, language, campaign_id, consent_snapshot_at, metadata")
      .eq("status", "queued")
      .eq("provider", "elevenlabs")
      .in("campaign_id", runningIds)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!next) return json(200, { ok: true, action: "nothing_queued", finalized });

    const launched = await launchCall(supabase, next);
    return json(200, { ok: true, action: "launched", call_id: next.id, launched, finalized });
  } catch (e) {
    console.error("[voice-campaign-dispatch] error", e);
    return json(500, { error: "dispatch_failed" });
  }
});

async function launchCall(supabase: any, call: any): Promise<boolean> {
  const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");
  const agentPhoneNumberId = Deno.env.get("ELEVENLABS_AGENT_PHONE_NUMBER_ID");
  if (!agentId || !agentPhoneNumberId) {
    await supabase.from("voice_calls").update({
      status: "failed",
      metadata: { ...(call.metadata ?? {}), error: "elevenlabs_not_configured" },
    }).eq("id", call.id);
    return false;
  }

  const lang = call.language ?? "fr";
  const firstName = call.metadata?.first_name ?? "";
  const missingDocs = call.metadata?.missing_docs || "vos documents administratifs";
  const mk = firstMessageByLang[lang] ?? firstMessageByLang.fr;
  const firstMessage = mk(firstName);

  try {
    const eleven = await startElevenLabsCall({
      agent_id: agentId,
      agent_phone_number_id: agentPhoneNumberId,
      to_number: call.to_phone,
      call_recording_enabled: true,
      conversation_initiation_client_data: {
        user_id: call.id,
        dynamic_variables: {
          client_first_name: firstName,
          missing_docs: missingDocs,
          language: lang,
          voice_call_id: call.id,
          client_id: call.client_id ?? "",
          company_id: call.company_id ?? "",
        },
        conversation_config_override: {
          agent: { language: lang, first_message: firstMessage },
        },
      },
    });

    if (!eleven.success || !eleven.conversation_id) {
      throw new ElevenLabsError(`success=false: ${eleven.message ?? "unknown"}`, undefined, eleven);
    }

    await supabase.from("voice_calls").update({
      provider_conversation_id: eleven.conversation_id,
      provider_call_sid: eleven.callSid,
      provider_agent_id: agentId,
      status: "ringing",
    }).eq("id", call.id);
    return true;
  } catch (e) {
    console.error("[voice-campaign-dispatch] launch failed", e);
    const errBody = e instanceof ElevenLabsError ? e.body : String(e);
    await supabase.from("voice_calls").update({
      status: "failed",
      metadata: { ...(call.metadata ?? {}), error: "provider_request_failed", provider_error: errBody },
    }).eq("id", call.id);
    return false;
  }
}

const TERMINAL = ["completed", "failed", "no_answer", "busy", "canceled", "transferred_to_human", "voicemail"];

async function finalizeCompletedCampaigns(supabase: any): Promise<number> {
  const { data: running } = await supabase
    .from("voice_campaigns").select("id, report_email, name").eq("status", "running");
  if (!running || running.length === 0) return 0;

  let count = 0;
  for (const camp of running) {
    const { count: pending } = await supabase
      .from("voice_calls")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", camp.id)
      .in("status", ["queued", "ringing", "in_progress"]);

    if ((pending ?? 0) > 0) continue; // campagne pas finie

    const { count: done } = await supabase
      .from("voice_calls")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", camp.id)
      .in("status", TERMINAL);

    await sendReport(supabase, camp);
    await supabase.from("voice_campaigns").update({
      status: "completed",
      completed_calls: done ?? 0,
      report_sent_at: new Date().toISOString(),
    }).eq("id", camp.id);
    count++;
  }
  return count;
}

const STATUS_LABEL: Record<string, string> = {
  completed: "✅ Client joint",
  voicemail: "📩 Message laissé (répondeur)",
  no_answer: "📵 Pas de réponse",
  busy: "⛔ Occupé",
  failed: "⚠️ Échec",
  canceled: "🚫 Annulé",
  transferred_to_human: "👤 Transféré à un humain",
};

async function sendReport(supabase: any, camp: any): Promise<void> {
  const resendKey = Deno.env.get("ITAKECARE_RESEND_API");
  if (!camp.report_email || !resendKey) {
    console.log(`[voice-campaign-dispatch] report skipped (email=${!!camp.report_email}, key=${!!resendKey})`);
    return;
  }

  const { data: calls } = await supabase
    .from("voice_calls")
    .select("client_id, status, duration_seconds, summary, to_phone")
    .eq("campaign_id", camp.id);
  const rows = calls ?? [];

  // Noms clients.
  const ids = [...new Set(rows.map((r: any) => r.client_id).filter(Boolean))];
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: cl } = await supabase.from("clients").select("id, name, first_name, last_name").in("id", ids);
    (cl ?? []).forEach((c: any) => {
      names[c.id] = c.name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.id;
    });
  }

  const tally: Record<string, number> = {};
  rows.forEach((r: any) => { tally[r.status] = (tally[r.status] ?? 0) + 1; });
  const summaryLine = Object.entries(tally)
    .map(([s, n]) => `${STATUS_LABEL[s] ?? s} : ${n}`).join(" · ");

  const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trs = rows.map((r: any) => {
    const dur = r.duration_seconds ? `${Math.floor(r.duration_seconds / 60)}m${String(r.duration_seconds % 60).padStart(2, "0")}` : "—";
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${esc(names[r.client_id] ?? r.to_phone ?? "?")}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${esc(STATUS_LABEL[r.status] ?? r.status)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${dur}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;color:#555">${esc(r.summary ?? "")}</td>
    </tr>`;
  }).join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:auto;color:#1e293b">
      <h2 style="color:#0f172a">Rapport de campagne d'appels — ${esc(camp.name)}</h2>
      <p style="color:#475569">Alex a terminé d'appeler les ${rows.length} client(s) de cette campagne.</p>
      <p style="font-size:14px;background:#f1f5f9;padding:10px 12px;border-radius:8px">${esc(summaryLine)}</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:12px">
        <thead><tr style="text-align:left;background:#0f172a;color:#fff">
          <th style="padding:8px">Client</th><th style="padding:8px">Résultat</th>
          <th style="padding:8px">Durée</th><th style="padding:8px">Résumé</th>
        </tr></thead>
        <tbody>${trs}</tbody>
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:16px">Détail complet et enregistrements disponibles dans Leazr → Campagnes d'appels.</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "iTakecare <noreply@itakecare.be>",
        to: [camp.report_email],
        subject: `Rapport campagne d'appels Alex — ${camp.name}`,
        html,
      }),
    });
    if (!res.ok) console.error("[voice-campaign-dispatch] resend error", await res.text());
  } catch (e) {
    console.error("[voice-campaign-dispatch] report send failed", e);
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
