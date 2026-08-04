// Dispatcher des séquences CRM — appelé par le cron `sequence-dispatch` toutes
// les 5 minutes, authentifié par X-Cron-Secret (pas de JWT).
//
// Pour chaque inscription échue : exécute l'étape courante sur son canal, trace
// l'envoi dans la timeline, puis programme la suivante. Réutilise l'infra
// d'envoi existante plutôt que de reparler à Twilio/Resend en direct.
//
// Garde-fous, dans l'ordre où ils s'appliquent :
//   1. désinscription du contact sur le canal visé (opt_out_*)
//   2. heures ouvrées : on reporte au prochain créneau au lieu d'envoyer à 3 h
//   3. réponse entrante ou changement d'étape : traités par triggers SQL, mais
//      revérifiés ici pour couvrir la fenêtre entre deux passages du cron
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Nombre d'inscriptions traitées par passage — borne la durée d'exécution. */
const BATCH = 50;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Step {
  id: string;
  position: number;
  delay_minutes: number;
  channel: "email" | "whatsapp" | "sms" | "call_task" | "voice_ai";
  subject: string | null;
  body: string | null;
  template_key: string | null;
  assigned_to: string | null;
}

/**
 * Heures ouvrées Europe/Brussels : 08:00-18:00, lundi-vendredi. Renvoie null si
 * on peut envoyer maintenant, sinon la date du prochain créneau.
 */
const nextBusinessSlot = (now: Date): Date | null => {
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
  const day = local.getDay(); // 0 = dimanche
  const hour = local.getHours();

  const isWeekday = day >= 1 && day <= 5;
  if (isWeekday && hour >= 8 && hour < 18) return null;

  // Prochain jour ouvré à 08:00
  const next = new Date(now);
  if (isWeekday && hour < 8) {
    next.setUTCHours(next.getUTCHours() + (8 - hour));
    return next;
  }
  let addDays = 1;
  if (day === 5 && hour >= 18) addDays = 3; // vendredi soir -> lundi
  else if (day === 6) addDays = 2;
  else if (day === 0) addDays = 1;
  next.setUTCDate(next.getUTCDate() + addDays);
  next.setUTCHours(7, 0, 0, 0); // ~08:00 heure locale
  return next;
};

/** Remplace {{prenom}}, {{nom}}, {{societe}}, {{commercial}} dans un gabarit. */
const render = (
  template: string | null,
  vars: Record<string, string | null | undefined>
): string =>
  (template ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Authentifié par le service_role, comme `financing-signature` : pas de
  // nouveau secret à provisionner à la main dans les variables d'environnement.
  // verify_jwt est à false, donc la vérification se fait ici — un JWT
  // utilisateur ordinaire ne doit pas pouvoir déclencher des envois.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return json({ error: "unauthorized" }, 401);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const stats = { processed: 0, sent: 0, skipped: 0, failed: 0, completed: 0, deferred: 0 };

  try {
    const { data: enrollments, error } = await sb
      .from("sequence_enrollments")
      .select(
        `id, company_id, sequence_id, opportunity_id, contact_id, client_id, current_step,
         sequence:sequences!sequence_enrollments_sequence_id_fkey (
           id, name, status, business_hours_only, stop_on_reply
         ),
         contact:contacts!sequence_enrollments_contact_id_fkey (
           id, first_name, last_name, email, phone, mobile,
           opt_out_email, opt_out_whatsapp, opt_out_sms, company_name
         ),
         opportunity:opportunities!sequence_enrollments_opportunity_id_fkey (
           id, name, status, owner_id
         )`
      )
      .eq("status", "active")
      .lte("next_run_at", now.toISOString())
      .order("next_run_at", { ascending: true })
      .limit(BATCH);

    if (error) throw error;

    for (const enrollment of enrollments ?? []) {
      stats.processed += 1;
      const sequence = enrollment.sequence as any;
      const contact = enrollment.contact as any;
      const opportunity = enrollment.opportunity as any;

      const stop = async (reason: string) => {
        await sb
          .from("sequence_enrollments")
          .update({ status: "stopped", stopped_reason: reason, next_run_at: null })
          .eq("id", enrollment.id);
      };

      // La séquence a pu être mise en pause depuis l'inscription
      if (!sequence || sequence.status !== "active") {
        await stop("sequence_inactive");
        stats.skipped += 1;
        continue;
      }
      // L'affaire a pu être close entre deux passages du cron
      if (opportunity && opportunity.status !== "open") {
        await stop("opportunity_closed");
        stats.skipped += 1;
        continue;
      }

      // Étape suivante à exécuter
      const { data: steps } = await sb
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", sequence.id)
        .eq("active", true)
        .gt("position", enrollment.current_step)
        .order("position", { ascending: true })
        .limit(1);

      const step = (steps ?? [])[0] as Step | undefined;
      if (!step) {
        await sb
          .from("sequence_enrollments")
          .update({ status: "completed", next_run_at: null })
          .eq("id", enrollment.id);
        stats.completed += 1;
        continue;
      }

      // Heures ouvrées — on reporte, on n'annule pas
      if (sequence.business_hours_only && step.channel !== "call_task") {
        const slot = nextBusinessSlot(now);
        if (slot) {
          await sb
            .from("sequence_enrollments")
            .update({ next_run_at: slot.toISOString() })
            .eq("id", enrollment.id);
          stats.deferred += 1;
          continue;
        }
      }

      const vars = {
        prenom: contact?.first_name ?? "",
        nom: contact?.last_name ?? "",
        societe: contact?.company_name ?? "",
        affaire: opportunity?.name ?? "",
      };
      const bodyText = render(step.body, vars);
      const subject = render(step.subject, vars);

      let runStatus: "sent" | "failed" | "skipped" = "sent";
      let runError: string | null = null;

      try {
        switch (step.channel) {
          case "email": {
            if (!contact?.email) throw new Error("contact sans email");
            if (contact.opt_out_email) {
              runStatus = "skipped";
              runError = "contact désinscrit (email)";
              break;
            }
            const res = await fetch(`${SUPABASE_URL}/functions/v1/send-resend-email`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: contact.email,
                subject: subject || "Votre projet de leasing",
                html: bodyText.replace(/\n/g, "<br>"),
              }),
            });
            if (!res.ok) throw new Error(`send-resend-email ${res.status}: ${await res.text()}`);
            break;
          }

          case "whatsapp":
          case "sms": {
            const optedOut =
              step.channel === "whatsapp" ? contact?.opt_out_whatsapp : contact?.opt_out_sms;
            if (optedOut) {
              runStatus = "skipped";
              runError = `contact désinscrit (${step.channel})`;
              break;
            }
            if (!enrollment.client_id) throw new Error("pas de client rattaché");

            // Mode système de messaging-send : même mécanisme que l'agent Alex
            const res = await fetch(`${SUPABASE_URL}/functions/v1/messaging-send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-system-secret": Deno.env.get("ELEVENLABS_TOOL_SECRET") ?? "",
                "x-system-company-id": enrollment.company_id,
              },
              body: JSON.stringify({
                action: "send_message",
                client_id: enrollment.client_id,
                channel: step.channel,
                text: bodyText,
                template_key: step.template_key ?? undefined,
              }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok || payload?.success === false) {
              // Fenêtre WhatsApp de 24 h fermée : ce n'est pas une erreur, le
              // canal n'est simplement pas ouvert pour cette étape.
              if (payload?.error === "window_closed") {
                runStatus = "skipped";
                runError = "fenêtre WhatsApp fermée";
                break;
              }
              throw new Error(payload?.error ?? `messaging-send ${res.status}`);
            }
            break;
          }

          case "call_task": {
            const { error: taskError } = await sb.from("tasks").insert({
              company_id: enrollment.company_id,
              title: subject || `Appeler ${vars.prenom} ${vars.nom}`.trim(),
              description: bodyText,
              status: "todo",
              priority: "medium",
              assigned_to: step.assigned_to ?? opportunity?.owner_id ?? null,
              due_date: now.toISOString(),
              related_client_id: enrollment.client_id,
            });
            if (taskError) throw new Error(taskError.message);
            break;
          }

          case "voice_ai": {
            if (!enrollment.client_id) throw new Error("pas de client rattaché");
            const res = await fetch(`${SUPABASE_URL}/functions/v1/voice-call-start`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                client_id: enrollment.client_id,
                objective: bodyText,
                language: "fr",
              }),
            });
            if (!res.ok) throw new Error(`voice-call-start ${res.status}: ${await res.text()}`);
            break;
          }
        }
      } catch (err) {
        runStatus = "failed";
        runError = err instanceof Error ? err.message : String(err);
      }

      // Trace dans la timeline de l'affaire — un envoi automatique doit se voir
      let activityId: string | null = null;
      if (runStatus === "sent" && enrollment.opportunity_id) {
        const { data: activity } = await sb
          .from("crm_activities")
          .insert({
            company_id: enrollment.company_id,
            opportunity_id: enrollment.opportunity_id,
            client_id: enrollment.client_id,
            contact_id: enrollment.contact_id,
            type: "sequence",
            direction: "out",
            channel: step.channel,
            occurred_at: now.toISOString(),
            actor_label: `Séquence « ${sequence.name} »`,
            subject: subject || `Étape ${step.position} — ${step.channel}`,
            body: bodyText,
            payload: { sequence_id: sequence.id, step_id: step.id, position: step.position },
          })
          .select("id")
          .single();
        activityId = activity?.id ?? null;
      }

      await sb.from("sequence_step_runs").insert({
        company_id: enrollment.company_id,
        enrollment_id: enrollment.id,
        step_id: step.id,
        status: runStatus,
        scheduled_at: now.toISOString(),
        sent_at: runStatus === "sent" ? now.toISOString() : null,
        error: runError,
        activity_id: activityId,
      });

      if (runStatus === "sent") stats.sent += 1;
      else if (runStatus === "failed") stats.failed += 1;
      else stats.skipped += 1;

      // Programmer l'étape suivante. Une étape en échec ou sautée ne bloque pas
      // la cadence : on continue, l'échec reste tracé dans sequence_step_runs.
      const { data: following } = await sb
        .from("sequence_steps")
        .select("delay_minutes")
        .eq("sequence_id", sequence.id)
        .eq("active", true)
        .gt("position", step.position)
        .order("position", { ascending: true })
        .limit(1);

      const nextStep = (following ?? [])[0] as { delay_minutes: number } | undefined;
      await sb
        .from("sequence_enrollments")
        .update({
          current_step: step.position,
          status: nextStep ? "active" : "completed",
          next_run_at: nextStep
            ? new Date(now.getTime() + nextStep.delay_minutes * 60_000).toISOString()
            : null,
        })
        .eq("id", enrollment.id);

      if (!nextStep) stats.completed += 1;
    }

    console.log("sequence-dispatch", JSON.stringify(stats));
    return json({ success: true, ...stats });
  } catch (err) {
    console.error("sequence-dispatch error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
