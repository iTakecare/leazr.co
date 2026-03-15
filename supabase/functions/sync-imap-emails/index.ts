import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.171";
import { simpleParser } from "npm:mailparser@3.7.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("[sync-imap-emails] Action:", body.action);
    const { action, user_id, company_id, settings } = body;

    // ── Save IMAP settings ──
    if (action === "save_settings") {
      if (!user_id || !company_id || !settings) {
        throw new Error("Missing required fields for save_settings");
      }

      const settingsToSave: Record<string, any> = {
        user_id,
        company_id,
        imap_host: settings.imap_host,
        imap_port: settings.imap_port,
        imap_username: settings.imap_username,
        imap_use_ssl: settings.imap_use_ssl,
        folder: settings.folder,
        is_active: settings.is_active,
        sync_days: settings.sync_days || 7,
        updated_at: new Date().toISOString(),
      };

      if (settings.imap_password && settings.imap_password.trim() !== "") {
        settingsToSave.imap_password_encrypted = btoa(settings.imap_password);
      }

      const { error } = await supabase
        .from("user_imap_settings")
        .upsert(settingsToSave, { onConflict: "user_id,company_id" });

      if (error) {
        console.error("[sync-imap-emails] Upsert error:", error);
        throw error;
      }

      console.log("[sync-imap-emails] Settings saved for user:", user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Sync emails ──
    if (!user_id) throw new Error("user_id is required");

    const { data: imapSettings, error: settingsError } = await supabase
      .from("user_imap_settings")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!imapSettings) {
      throw new Error("Aucune configuration IMAP active trouvée. Veuillez configurer vos paramètres IMAP.");
    }
    if (!imapSettings.imap_password_encrypted) {
      throw new Error("Mot de passe IMAP manquant. Veuillez reconfigurer vos paramètres.");
    }

    const password = atob(imapSettings.imap_password_encrypted);
    const syncDays = imapSettings.sync_days || 7;

    console.log("[sync-imap-emails] Connecting to", imapSettings.imap_host, "port", imapSettings.imap_port, "sync_days:", syncDays);

    // Connect with ImapFlow
    const client = new ImapFlow({
      host: imapSettings.imap_host,
      port: imapSettings.imap_port,
      secure: imapSettings.imap_use_ssl,
      auth: {
        user: imapSettings.imap_username,
        pass: password,
      },
      logger: false,
    });

    try {
      await client.connect();
      console.log("[sync-imap-emails] Connected successfully");
    } catch (connErr: any) {
      console.error("[sync-imap-emails] Connection failed:", connErr.message);
      throw new Error(`Connexion IMAP échouée: ${connErr.message}`);
    }

    let syncedCount = 0;

    try {
      const lock = await client.getMailboxLock(imapSettings.folder || "INBOX");

      try {
        const sinceDate = new Date(Date.now() - syncDays * 24 * 60 * 60 * 1000);

        // Search messages since the configured period
        const messages = client.fetch(
          { since: sinceDate },
          { envelope: true, source: true, uid: true }
        );

        let count = 0;
        for await (const msg of messages) {
          if (count >= 100) break; // Limit to 100 messages
          count++;

          try {
            const parsed = await simpleParser(msg.source);

            const fromAddress = parsed.from?.value?.[0]?.address || "";
            const fromName = parsed.from?.value?.[0]?.name || null;
            const toAddress = parsed.to?.value?.[0]?.address || null;
            const messageId = parsed.messageId || `uid-${msg.uid}-${Date.now()}`;
            const receivedAt = parsed.date ? parsed.date.toISOString() : null;

            const { error: insertError } = await supabase.from("synced_emails").upsert(
              {
                user_id,
                company_id: imapSettings.company_id,
                message_id: messageId,
                from_address: fromAddress,
                from_name: fromName,
                to_address: toAddress,
                subject: parsed.subject || null,
                body_text: parsed.text?.substring(0, 10000) || null,
                body_html: parsed.html || null,
                received_at: receivedAt,
              },
              { onConflict: "user_id,message_id" }
            );

            if (!insertError) syncedCount++;
            else console.error("[sync-imap-emails] Insert error:", insertError.message);
          } catch (parseErr: any) {
            console.error("[sync-imap-emails] Parse error for UID", msg.uid, ":", parseErr.message);
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }

    // Update last_sync_at
    await supabase
      .from("user_imap_settings")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", imapSettings.id);

    console.log("[sync-imap-emails] Synced", syncedCount, "emails");
    return new Response(
      JSON.stringify({ success: true, count: syncedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[sync-imap-emails] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
