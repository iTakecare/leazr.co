// =====================================================================
// mail-idle — démon de synchronisation PUSH des emails (IMAP IDLE).
//
// Tourne en continu sur le VPS (conteneur Deno, restart=always). Pour
// chaque compte IMAP actif, il maintient une connexion IDLE sur la boîte
// de réception : dès qu'un mail arrive, OVH/le serveur pousse l'événement
// et on déclenche immédiatement `mail-sync` (sync_account) — qui fait le
// fetch incrémental par UID. Le cron 2 min de Supabase reste en filet.
//
// Pourquoi sur le VPS et pas en edge function : IMAP IDLE exige une
// connexion TCP persistante, impossible dans une edge function
// request-scoped. Le VPS héberge déjà grenke-proxy, même principe.
//
// Env requis :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (lecture comptes + RPC mdp)
//   MAIL_CRON_SECRET                         (déclenche mail-sync)
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ImapFlow } from "npm:imapflow@1.0.161";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAIL_CRON_SECRET = Deno.env.get("MAIL_CRON_SECRET")!;
const ACCOUNT_REFRESH_MS = 10 * 60 * 1000; // re-scanne les comptes toutes les 10 min
const SYNC_DEBOUNCE_MS = 4000;             // regroupe les rafales d'arrivées

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface Account {
  id: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  imap_username: string;
}

// Une connexion IDLE vivante par compte.
const watchers = new Map<string, { client: ImapFlow; stop: boolean }>();

async function triggerSync(accountId: string, email: string): Promise<void> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/mail-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Cron-Secret": MAIL_CRON_SECRET },
      // sync_all est protégé par le secret ; on resynchronise tout (rapide
      // car incrémental) — le secret ne donne pas accès au sync ciblé.
      body: JSON.stringify({ action: "sync_all" }),
    });
    console.log(`[idle] ${email}: nouveau mail → sync (${r.status})`);
  } catch (e) {
    console.error(`[idle] ${email}: trigger sync failed:`, e instanceof Error ? e.message : e);
  }
}

function debounce(fn: () => void, ms: number): () => void {
  let t: number | undefined;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

async function watchAccount(account: Account): Promise<void> {
  if (watchers.has(account.id)) return;

  const { data: password, error } = await admin.rpc("get_imap_account_password", { p_account_id: account.id });
  if (error || !password) {
    console.error(`[idle] ${account.email_address}: mot de passe introuvable`);
    return;
  }

  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: account.imap_use_ssl,
    auth: { user: account.imap_username, pass: password as string },
    logger: false,
    emitLogs: false,
  });
  const state = { client, stop: false };
  watchers.set(account.id, state);

  const onNew = debounce(() => triggerSync(account.id, account.email_address), SYNC_DEBOUNCE_MS);
  client.on("exists", onNew);
  client.on("error", (e: unknown) => console.error(`[idle] ${account.email_address}: ${e instanceof Error ? e.message : e}`));
  client.on("close", () => {
    watchers.delete(account.id);
    if (!state.stop) {
      console.log(`[idle] ${account.email_address}: connexion fermée, reconnexion dans 10s`);
      setTimeout(() => watchAccount(account).catch(() => {}), 10_000);
    }
  });

  try {
    await client.connect();
    await client.mailboxOpen("INBOX");
    console.log(`[idle] ${account.email_address}: IDLE actif sur INBOX`);
    // imapflow gère l'IDLE automatiquement tant que la connexion est ouverte
    // et qu'aucune commande n'est en cours. On NE bloque PAS ici (sinon les
    // comptes suivants ne seraient jamais surveillés) ; la connexion reste
    // vivante via la référence conservée dans `watchers`, et l'événement
    // 'exists' se déclenche à chaque nouvelle arrivée.
  } catch (e) {
    console.error(`[idle] ${account.email_address}: connexion échouée:`, e instanceof Error ? e.message : e);
    watchers.delete(account.id);
    if (!state.stop) setTimeout(() => watchAccount(account).catch(() => {}), 15_000);
  }
}

async function refreshAccounts(): Promise<void> {
  const { data: accounts, error } = await admin
    .from("imap_accounts")
    .select("id, email_address, imap_host, imap_port, imap_use_ssl, imap_username")
    .eq("is_active", true);
  if (error) {
    console.error("[idle] lecture comptes:", error.message);
    return;
  }
  const active = new Set((accounts ?? []).map((a) => a.id));
  // Nouveaux comptes → on démarre une surveillance.
  for (const account of (accounts ?? []) as Account[]) {
    if (!watchers.has(account.id)) await watchAccount(account);
  }
  // Comptes désactivés/supprimés → on coupe.
  for (const [id, w] of watchers) {
    if (!active.has(id)) {
      w.stop = true;
      try { await w.client.logout(); } catch { /* */ }
      watchers.delete(id);
    }
  }
}

console.log("[idle] démarrage du démon mail-idle");
await refreshAccounts();
setInterval(() => refreshAccounts().catch((e) => console.error("[idle] refresh:", e)), ACCOUNT_REFRESH_MS);
// Maintient le process vivant.
await new Promise(() => {});
