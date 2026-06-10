// =====================================================================
// mail-sync — synchronisation IMAP v2, multi-comptes, incrémentale.
//
// La v1 re-scannait tout le serveur depuis N jours à chaque clic. Ici :
//   - imap_folders mémorise (uidvalidity, last_uid) par dossier
//   - chaque passage ne lit QUE les UID > last_uid (quelques ms à vide)
//   - un cron pg_cron appelle sync_all toutes les 2 minutes
//   - le realtime Supabase pousse les nouveaux mails dans l'UI
//
// Actions (auth = X-Cron-Secret pour sync_all, JWT utilisateur sinon) :
//   sync_all / sync_account / list_server_folders / set_folder_sync /
//   save_account / test_account / delete_account / get_attachment
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ImapFlow } from "npm:imapflow@1.0.161";
import { simpleParser } from "npm:mailparser@3.6.5";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_NEW_PER_FOLDER = 50;      // par passage — le cron rattrape vite
const MAX_SOURCE_BYTES = 4_000_000; // gros mails : envelope seule
const GLOBAL_BUDGET_MS = 50_000;
const INITIAL_BACKFILL_DAYS = 30;   // premier sync d'un dossier

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Account {
  id: string;
  company_id: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  imap_username: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_use_tls: boolean | null;
  smtp_username: string | null;
  is_active: boolean;
}

type Admin = ReturnType<typeof createClient>;

async function getPassword(adminSupabase: Admin, accountId: string): Promise<string | null> {
  const { data, error } = await adminSupabase.rpc("get_imap_account_password", { p_account_id: accountId });
  if (error) {
    console.error(`[mail-sync] get password failed for ${accountId}:`, error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

function imapClient(account: Account, password: string): ImapFlow {
  return new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: account.imap_use_ssl,
    auth: { user: account.imap_username, pass: password },
    logger: false,
  });
}

// ---------------------------------------------------------------------
// Sync d'un compte : pour chaque dossier suivi, ne lit que les UID
// au-delà de last_uid. uidvalidity change → resync du dossier.
// ---------------------------------------------------------------------
async function syncAccount(
  adminSupabase: Admin,
  account: Account,
  deadline: number,
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  const password = await getPassword(adminSupabase, account.id);
  if (!password) {
    await adminSupabase.from("imap_accounts")
      .update({ last_sync_error: "Mot de passe introuvable dans le Vault" })
      .eq("id", account.id);
    return { synced, errors: ["no_password"] };
  }

  let { data: folders } = await adminSupabase
    .from("imap_folders")
    .select("id, path, uidvalidity, last_uid")
    .eq("account_id", account.id)
    .eq("is_synced", true);
  if (!folders || folders.length === 0) {
    // Premier contact : on suit au minimum INBOX.
    const { data: created } = await adminSupabase
      .from("imap_folders")
      .upsert({ account_id: account.id, path: "INBOX", name: "Boîte de réception", is_synced: true }, { onConflict: "account_id,path" })
      .select("id, path, uidvalidity, last_uid");
    folders = created ?? [];
  }

  const client = imapClient(account, password);
  try {
    await client.connect();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await adminSupabase.from("imap_accounts").update({ last_sync_error: `Connexion IMAP: ${msg}` }).eq("id", account.id);
    return { synced, errors: [msg] };
  }

  try {
    for (const folder of folders) {
      if (Date.now() > deadline) break;
      let lock;
      try {
        lock = await client.getMailboxLock(folder.path);
      } catch (e) {
        errors.push(`${folder.path}: ${e instanceof Error ? e.message : e}`);
        continue;
      }
      try {
        const mailbox = client.mailbox;
        const uidValidity = mailbox && typeof mailbox === "object" ? Number(mailbox.uidValidity ?? 0) : 0;
        let lastUid = Number(folder.last_uid) || 0;

        // uidvalidity a changé → les UID stockés ne veulent plus rien dire.
        if (folder.uidvalidity && uidValidity && Number(folder.uidvalidity) !== uidValidity) {
          lastUid = 0;
        }

        // Premier passage : on borne le backfill aux N derniers jours pour
        // ne pas aspirer des années d'historique.
        let searchRange: string | { since: Date };
        if (lastUid === 0) {
          searchRange = { since: new Date(Date.now() - INITIAL_BACKFILL_DAYS * 24 * 3600 * 1000) };
        } else {
          searchRange = `${lastUid + 1}:*`;
        }

        const newUids: number[] = [];
        if (typeof searchRange === "string") {
          for await (const msg of client.fetch(searchRange, { uid: true }, { uid: true })) {
            // IMAP renvoie le dernier message existant même si son UID est
            // < borne basse — filtre explicite.
            if (msg.uid > lastUid) newUids.push(msg.uid);
          }
        } else {
          const found = await client.search({ since: searchRange.since }, { uid: true });
          for (const uid of found ?? []) newUids.push(uid);
        }
        newUids.sort((a, b) => a - b);

        const batch = newUids.slice(0, MAX_NEW_PER_FOLDER);
        let maxSeen = lastUid;

        for (const uid of batch) {
          if (Date.now() > deadline) break;
          try {
            const one = await client.fetchOne(String(uid), { uid: true, size: true, envelope: true, flags: true }, { uid: true });
            if (!one) { maxSeen = Math.max(maxSeen, uid); continue; }

            let parsed: Awaited<ReturnType<typeof simpleParser>> | null = null;
            if ((one.size ?? 0) <= MAX_SOURCE_BYTES) {
              const full = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true });
              if (full?.source) parsed = await simpleParser(full.source);
            }

            const env = one.envelope;

            // Adoption des lignes v1 : si ce Message-ID existe déjà pour ce
            // compte (historique synchronisé par l'ancien système, sans UID),
            // on complète la ligne au lieu d'en créer un doublon.
            if (env?.messageId) {
              const { data: existing } = await adminSupabase
                .from("synced_emails")
                .select("id, imap_uid")
                .eq("account_id", account.id)
                .eq("message_id", env.messageId)
                .maybeSingle();
              if (existing) {
                if (existing.imap_uid == null) {
                  await adminSupabase.from("synced_emails").update({
                    folder_path: folder.path,
                    imap_uid: uid,
                    header_message_id: env.messageId,
                  }).eq("id", existing.id);
                }
                maxSeen = Math.max(maxSeen, uid);
                continue;
              }
            }

            const attachmentsMeta = (parsed?.attachments ?? [])
              .filter((a) => !(a.contentDisposition === "inline" && a.contentId))
              .map((a, i) => ({
                filename: a.filename ?? `piece-jointe-${i + 1}`,
                content_type: a.contentType ?? "application/octet-stream",
                size: a.size ?? 0,
                index: i,
              }));
            const flags: string[] = one.flags ? Array.from(one.flags as Set<string>) : [];

            const { error: insErr } = await adminSupabase.from("synced_emails").upsert({
              account_id: account.id,
              folder_path: folder.path,
              imap_uid: uid,
              company_id: account.company_id,
              message_id: env?.messageId ?? `${account.id}:${folder.path}:${uid}`,
              header_message_id: env?.messageId ?? null,
              in_reply_to: env?.inReplyTo ?? null,
              from_address: env?.from?.[0]?.address ?? "",
              from_name: env?.from?.[0]?.name ?? null,
              to_address: (env?.to ?? []).map((a) => a.address).filter(Boolean).join(", "),
              cc_address: (env?.cc ?? []).map((a) => a.address).filter(Boolean).join(", ") || null,
              subject: env?.subject ?? null,
              body_text: parsed?.text ? parsed.text.slice(0, 10000) : null,
              body_html: typeof parsed?.html === "string" ? parsed.html : null,
              received_at: (env?.date ?? new Date()).toISOString(),
              is_read: flags.includes("\\Seen"),
              has_attachments: attachmentsMeta.length > 0,
              attachments: attachmentsMeta.length > 0 ? attachmentsMeta : null,
            }, { onConflict: "account_id,folder_path,imap_uid", ignoreDuplicates: true });

            if (insErr && !insErr.message.includes("duplicate")) {
              // Erreur DB (souvent transitoire) : on s'arrête SANS avancer le
              // curseur — ce message et les suivants seront retentés au
              // prochain passage du cron.
              errors.push(`${folder.path}#${uid}: ${insErr.message}`);
              break;
            }
            synced++;
            maxSeen = Math.max(maxSeen, uid);
          } catch (e) {
            errors.push(`${folder.path}#${uid}: ${e instanceof Error ? e.message : e}`);
            maxSeen = Math.max(maxSeen, uid); // ne pas rester bloqué sur un message pourri
          }
        }

        await adminSupabase.from("imap_folders").update({
          uidvalidity: uidValidity || folder.uidvalidity,
          last_uid: maxSeen,
        }).eq("id", folder.id);
      } finally {
        lock.release();
      }
    }
  } finally {
    try { await client.logout(); } catch { /* */ }
  }

  await adminSupabase.from("imap_accounts").update({
    last_sync_at: new Date().toISOString(),
    last_sync_error: errors.length > 0 ? errors.slice(0, 3).join(" | ") : null,
  }).eq("id", account.id);

  return { synced, errors };
}

// ---------------------------------------------------------------------
// Dossiers du serveur (pour cocher ceux à suivre dans les réglages)
// ---------------------------------------------------------------------
async function listServerFolders(adminSupabase: Admin, account: Account): Promise<Response> {
  const password = await getPassword(adminSupabase, account.id);
  if (!password) return jsonResponse({ success: false, error: "no_password" }, 412);
  const client = imapClient(account, password);
  await client.connect();
  try {
    const list = await client.list();
    const { data: tracked } = await adminSupabase
      .from("imap_folders").select("path, is_synced").eq("account_id", account.id);
    const trackedMap = new Map((tracked ?? []).map((f) => [f.path, f.is_synced]));
    const folders = list
      .filter((f) => !f.flags?.has?.("\\Noselect"))
      .map((f) => ({
        path: f.path,
        name: f.name,
        special_use: f.specialUse ?? (f.path.toUpperCase() === "INBOX" ? "\\Inbox" : null),
        is_synced: trackedMap.get(f.path) ?? false,
      }));
    return jsonResponse({ success: true, folders });
  } finally {
    try { await client.logout(); } catch { /* */ }
  }
}

// ---------------------------------------------------------------------
// Pièce jointe à la demande (on ne stocke que les métadonnées)
// ---------------------------------------------------------------------
async function getAttachment(adminSupabase: Admin, companyId: string, emailId: string, index: number): Promise<Response> {
  const { data: email } = await adminSupabase
    .from("synced_emails")
    .select("id, company_id, account_id, folder_path, imap_uid, attachments")
    .eq("id", emailId)
    .maybeSingle();
  if (!email || email.company_id !== companyId) return jsonResponse({ success: false, error: "not_found" }, 404);
  if (!email.account_id || email.imap_uid == null) return jsonResponse({ success: false, error: "no_imap_ref" }, 422);

  const { data: account } = await adminSupabase
    .from("imap_accounts").select("*").eq("id", email.account_id).maybeSingle();
  if (!account) return jsonResponse({ success: false, error: "account_not_found" }, 404);

  const password = await getPassword(adminSupabase, account.id);
  if (!password) return jsonResponse({ success: false, error: "no_password" }, 412);

  const client = imapClient(account as Account, password);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(email.folder_path);
    try {
      const full = await client.fetchOne(String(email.imap_uid), { uid: true, source: true }, { uid: true });
      if (!full?.source) return jsonResponse({ success: false, error: "message_gone" }, 404);
      const parsed = await simpleParser(full.source);
      const atts = (parsed.attachments ?? []).filter((a) => !(a.contentDisposition === "inline" && a.contentId));
      const att = atts[index];
      if (!att) return jsonResponse({ success: false, error: "attachment_not_found" }, 404);
      // base64 par blocs (String.fromCharCode(...gros tableau) explose la pile)
      const bytes = new Uint8Array(att.content);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return jsonResponse({
        success: true,
        filename: att.filename ?? `piece-jointe-${index + 1}`,
        content_type: att.contentType ?? "application/octet-stream",
        base64: btoa(binary),
      });
    } finally {
      lock.release();
    }
  } finally {
    try { await client.logout(); } catch { /* */ }
  }
}

// ---------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  const deadline = Date.now() + GLOBAL_BUDGET_MS;

  try {
    const body = await req.json().catch(() => null) as {
      action?: string;
      account_id?: string;
      path?: string;
      is_synced?: boolean;
      email_id?: string;
      index?: number;
      account?: Record<string, unknown>;
      password?: string;
    } | null;
    if (!body?.action) return jsonResponse({ success: false, error: "invalid_action" }, 400);

    // ---------- cron : sync de tous les comptes actifs ----------
    if (body.action === "sync_all") {
      const cronSecret = Deno.env.get("MAIL_CRON_SECRET");
      if (!cronSecret || req.headers.get("X-Cron-Secret") !== cronSecret) {
        return jsonResponse({ success: false, error: "unauthorized_cron" }, 401);
      }
      const { data: accounts } = await adminSupabase
        .from("imap_accounts").select("*").eq("is_active", true);
      const results: Record<string, unknown> = {};
      for (const account of (accounts ?? []) as Account[]) {
        if (Date.now() > deadline) { results[account.email_address] = "skipped_budget"; continue; }
        try {
          results[account.email_address] = await syncAccount(adminSupabase, account, deadline);
        } catch (e) {
          results[account.email_address] = { error: e instanceof Error ? e.message : String(e) };
        }
      }
      return jsonResponse({ success: true, results });
    }

    // ---------- auth utilisateur ----------
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

    const loadAccount = async (id: string): Promise<Account | null> => {
      const { data } = await adminSupabase.from("imap_accounts").select("*").eq("id", id).maybeSingle();
      return data && (data as Account & { company_id: string }).company_id === companyId ? data as Account : null;
    };

    switch (body.action) {
      case "sync_account": {
        const account = await loadAccount(body.account_id ?? "");
        if (!account) return jsonResponse({ success: false, error: "account_not_found" }, 404);
        const r = await syncAccount(adminSupabase, account, deadline);
        return jsonResponse({ success: true, ...r });
      }

      case "list_server_folders": {
        const account = await loadAccount(body.account_id ?? "");
        if (!account) return jsonResponse({ success: false, error: "account_not_found" }, 404);
        return await listServerFolders(adminSupabase, account);
      }

      case "set_folder_sync": {
        const account = await loadAccount(body.account_id ?? "");
        if (!account || !body.path) return jsonResponse({ success: false, error: "account_not_found" }, 404);
        if (body.is_synced) {
          // Récupère le nom + special_use réels du serveur si on le connaît.
          await adminSupabase.from("imap_folders").upsert({
            account_id: account.id,
            path: body.path,
            name: body.path.split("/").pop() ?? body.path,
            is_synced: true,
          }, { onConflict: "account_id,path" });
        } else {
          await adminSupabase.from("imap_folders")
            .update({ is_synced: false })
            .eq("account_id", account.id)
            .eq("path", body.path);
        }
        return jsonResponse({ success: true });
      }

      case "save_account": {
        const a = body.account ?? {};
        const fields = {
          company_id: companyId,
          display_name: String(a.display_name ?? a.email_address ?? ""),
          email_address: String(a.email_address ?? ""),
          imap_host: String(a.imap_host ?? ""),
          imap_port: Number(a.imap_port) || 993,
          imap_use_ssl: a.imap_use_ssl !== false,
          imap_username: String(a.imap_username ?? a.email_address ?? ""),
          smtp_host: a.smtp_host ? String(a.smtp_host) : null,
          smtp_port: Number(a.smtp_port) || 465,
          smtp_use_tls: a.smtp_use_tls !== false,
          smtp_username: a.smtp_username ? String(a.smtp_username) : null,
          color: a.color ? String(a.color) : undefined,
          signature_html: a.signature_html != null ? String(a.signature_html) : undefined,
          is_active: a.is_active !== false,
          updated_at: new Date().toISOString(),
        };
        if (!fields.email_address || !fields.imap_host) {
          return jsonResponse({ success: false, error: "missing_fields", message: "email_address et imap_host sont requis" }, 400);
        }
        let accountId = a.id ? String(a.id) : null;
        if (accountId) {
          const existing = await loadAccount(accountId);
          if (!existing) return jsonResponse({ success: false, error: "account_not_found" }, 404);
          const { error } = await adminSupabase.from("imap_accounts").update(fields).eq("id", accountId);
          if (error) return jsonResponse({ success: false, error: "save_failed", message: error.message }, 500);
        } else {
          const { data, error } = await adminSupabase.from("imap_accounts").insert(fields).select("id").single();
          if (error || !data) return jsonResponse({ success: false, error: "save_failed", message: error?.message }, 500);
          accountId = data.id;
        }
        if (body.password && body.password.trim()) {
          const { error } = await adminSupabase.rpc("set_imap_account_password", {
            p_account_id: accountId,
            p_password: body.password,
          });
          if (error) return jsonResponse({ success: false, error: "password_save_failed", message: error.message }, 500);
        }
        return jsonResponse({ success: true, account_id: accountId });
      }

      case "test_account": {
        const account = await loadAccount(body.account_id ?? "");
        if (!account) return jsonResponse({ success: false, error: "account_not_found" }, 404);
        const password = await getPassword(adminSupabase, account.id);
        if (!password) return jsonResponse({ success: false, message: "Aucun mot de passe enregistré" }, 412);
        try {
          const client = imapClient(account, password);
          await client.connect();
          await client.logout();
          return jsonResponse({ success: true, message: `Connexion IMAP réussie à ${account.imap_host}` });
        } catch (e) {
          return jsonResponse({ success: false, message: e instanceof Error ? e.message : String(e) }, 502);
        }
      }

      case "delete_account": {
        const account = await loadAccount(body.account_id ?? "");
        if (!account) return jsonResponse({ success: false, error: "account_not_found" }, 404);
        const { error } = await adminSupabase.from("imap_accounts").delete().eq("id", account.id);
        if (error) return jsonResponse({ success: false, error: "delete_failed", message: error.message }, 500);
        return jsonResponse({ success: true });
      }

      case "get_attachment": {
        if (!body.email_id || body.index == null) {
          return jsonResponse({ success: false, error: "missing_params" }, 400);
        }
        return await getAttachment(adminSupabase, companyId, body.email_id, Number(body.index));
      }

      default:
        return jsonResponse({ success: false, error: "unknown_action" }, 400);
    }
  } catch (e) {
    console.error("[mail-sync] error:", e);
    return jsonResponse({ success: false, error: "internal_error", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
