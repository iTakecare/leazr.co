// =====================================================================
// mail-send — envoi/réponse/transfert SMTP depuis un compte imap_accounts.
//
// - SMTP via denomailer (mot de passe partagé IMAP/SMTP lu dans Vault)
// - réponse/transfert : In-Reply-To + References repris de l'original
//   pour que le fil reste groupé chez le destinataire
// - copie best-effort dans le dossier Envoyés via IMAP APPEND + ligne
//   synced_emails (la copie apparaît immédiatement dans l'UI)
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { ImapFlow } from "npm:imapflow@1.0.161";
import { corsHeaders } from "../_shared/cors.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface SendBody {
  action?: "send";
  account_id?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  html?: string;
  attachments?: Array<{ filename: string; content_type: string; base64: string }>;
  reply_to_email_id?: string;
  mode?: "new" | "reply" | "reply_all" | "forward";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ---------- auth ----------
    const authHeader = req.headers.get("Authorization") ?? "";
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authErr } = await userSupabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.user) return jsonResponse({ success: false, error: "unauthorized" }, 401);
    const { data: profile } = await userSupabase
      .from("profiles").select("company_id").eq("id", claims.user.id).single();
    const companyId: string | null = profile?.company_id ?? null;
    if (!companyId) return jsonResponse({ success: false, error: "no_company" }, 403);

    const body = (await req.json().catch(() => null)) as SendBody | null;
    if (!body || body.action !== "send") return jsonResponse({ success: false, error: "invalid_action" }, 400);

    const to = (body.to ?? []).map((s) => s.trim()).filter(Boolean);
    if (!body.account_id || to.length === 0 || !body.html?.trim()) {
      return jsonResponse({ success: false, error: "missing_fields", message: "account_id, to et html sont requis" }, 400);
    }

    const { data: account } = await adminSupabase
      .from("imap_accounts").select("*").eq("id", body.account_id).maybeSingle();
    if (!account || account.company_id !== companyId) {
      return jsonResponse({ success: false, error: "account_not_found" }, 404);
    }
    if (!account.smtp_host) {
      return jsonResponse({ success: false, error: "no_smtp", message: "Aucun serveur SMTP configuré pour ce compte (Réglages → Comptes mail)." }, 412);
    }

    const { data: password, error: pwdErr } = await adminSupabase
      .rpc("get_imap_account_password", { p_account_id: account.id });
    if (pwdErr || !password) {
      return jsonResponse({ success: false, error: "no_password", message: "Mot de passe introuvable dans le Vault." }, 412);
    }

    // ---------- threading (réponse / transfert) ----------
    let inReplyTo: string | null = null;
    let references: string | null = null;
    if (body.reply_to_email_id) {
      const { data: original } = await adminSupabase
        .from("synced_emails")
        .select("company_id, header_message_id, in_reply_to")
        .eq("id", body.reply_to_email_id)
        .maybeSingle();
      if (original && original.company_id === companyId && original.header_message_id) {
        inReplyTo = original.header_message_id;
        references = [original.in_reply_to, original.header_message_id].filter(Boolean).join(" ");
      }
    }

    // ---------- envoi SMTP ----------
    const smtpPort = account.smtp_port ?? 465;
    const client = new SMTPClient({
      connection: {
        hostname: account.smtp_host,
        port: smtpPort,
        // 465 = TLS implicite ; 587 = STARTTLS
        tls: smtpPort === 465 && account.smtp_use_tls !== false,
        auth: {
          username: account.smtp_username || account.imap_username,
          password: password as string,
        },
      },
    });

    const headers: Record<string, string> = {};
    if (inReplyTo) {
      headers["In-Reply-To"] = inReplyTo;
      headers["References"] = references ?? inReplyTo;
    }

    const attachments = (body.attachments ?? []).map((a) => ({
      filename: a.filename,
      contentType: a.content_type,
      encoding: "base64" as const,
      content: a.base64,
    }));

    try {
      await client.send({
        from: `${account.display_name} <${account.email_address}>`,
        to,
        cc: (body.cc ?? []).map((s) => s.trim()).filter(Boolean),
        bcc: (body.bcc ?? []).map((s) => s.trim()).filter(Boolean),
        subject: body.subject ?? "(sans objet)",
        html: body.html,
        headers,
        attachments,
      });
      await client.close();
    } catch (e) {
      try { await client.close(); } catch { /* */ }
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[mail-send] SMTP failed:", msg);
      return jsonResponse({ success: false, error: "smtp_failed", message: msg }, 502);
    }

    // ---------- copie dans Envoyés (best effort, jamais bloquant) ----------
    const sentAt = new Date();
    let sentFolder = "INBOX.Sent";
    try {
      const imap = new ImapFlow({
        host: account.imap_host,
        port: account.imap_port,
        secure: account.imap_use_ssl,
        auth: { user: account.imap_username, pass: password as string },
        logger: false,
      });
      await imap.connect();
      try {
        const list = await imap.list();
        const sent = list.find((f) => f.specialUse === "\\Sent")
          ?? list.find((f) => /sent|envoy/i.test(f.path));
        if (sent) sentFolder = sent.path;
        const rawTo = to.join(", ");
        const mime = [
          `From: ${account.display_name} <${account.email_address}>`,
          `To: ${rawTo}`,
          body.cc?.length ? `Cc: ${body.cc.join(", ")}` : null,
          `Subject: ${body.subject ?? ""}`,
          `Date: ${sentAt.toUTCString()}`,
          inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
          `Content-Type: text/html; charset=utf-8`,
          "",
          body.html,
        ].filter((l) => l !== null).join("\r\n");
        await imap.append(sentFolder, mime, ["\\Seen"]);
      } finally {
        try { await imap.logout(); } catch { /* */ }
      }
    } catch (e) {
      console.error("[mail-send] Sent-folder append failed (non bloquant):", e instanceof Error ? e.message : e);
    }

    // Ligne locale pour affichage immédiat dans l'UI (le sync IMAP du
    // dossier Envoyés la dédupliquera grâce à l'index unique par UID).
    await adminSupabase.from("synced_emails").insert({
      account_id: account.id,
      folder_path: sentFolder,
      company_id: companyId,
      message_id: `sent-${crypto.randomUUID()}`,
      from_address: account.email_address,
      from_name: account.display_name,
      to_address: to.join(", "),
      cc_address: (body.cc ?? []).join(", ") || null,
      subject: body.subject ?? null,
      body_html: body.html,
      body_text: null,
      received_at: sentAt.toISOString(),
      is_read: true,
      has_attachments: (body.attachments ?? []).length > 0,
      in_reply_to: inReplyTo,
    });

    return jsonResponse({ success: true, sent_folder: sentFolder });
  } catch (e) {
    console.error("[mail-send] error:", e);
    return jsonResponse({ success: false, error: "internal_error", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
