import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { action, user_id, company_id, settings } = body;

    // Action: save IMAP settings
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
        updated_at: new Date().toISOString(),
      };

      // Only update password if provided
      if (settings.imap_password && settings.imap_password.trim() !== "") {
        // Encode password in base64 for basic obfuscation
        // In production, use pgcrypto or a proper encryption mechanism
        settingsToSave.imap_password_encrypted = btoa(settings.imap_password);
      }

      // Upsert based on user_id + company_id
      const { error } = await supabase
        .from("user_imap_settings")
        .upsert(settingsToSave, { onConflict: "user_id,company_id" });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: sync emails (default)
    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Get IMAP settings
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

    // Decode password
    const password = atob(imapSettings.imap_password_encrypted);

    // Connect to IMAP using Deno's TCP
    const conn = imapSettings.imap_use_ssl
      ? await Deno.connectTls({
          hostname: imapSettings.imap_host,
          port: imapSettings.imap_port,
        })
      : await Deno.connect({
          hostname: imapSettings.imap_host,
          port: imapSettings.imap_port,
        });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readResponse = async (): Promise<string> => {
      const buf = new Uint8Array(8192);
      const n = await conn.read(buf);
      if (n === null) return "";
      return decoder.decode(buf.subarray(0, n));
    };

    const sendCommand = async (tag: string, command: string): Promise<string> => {
      await conn.write(encoder.encode(`${tag} ${command}\r\n`));
      let response = "";
      let attempts = 0;
      while (attempts < 20) {
        const chunk = await readResponse();
        response += chunk;
        if (response.includes(`${tag} OK`) || response.includes(`${tag} NO`) || response.includes(`${tag} BAD`)) {
          break;
        }
        attempts++;
      }
      return response;
    };

    // Read greeting
    await readResponse();

    // Login
    const loginResp = await sendCommand("A001", `LOGIN "${imapSettings.imap_username}" "${password}"`);
    if (!loginResp.includes("A001 OK")) {
      conn.close();
      throw new Error("Échec de l'authentification IMAP");
    }

    // Select folder
    const selectResp = await sendCommand("A002", `SELECT "${imapSettings.folder}"`);
    if (!selectResp.includes("A002 OK")) {
      await sendCommand("A999", "LOGOUT");
      conn.close();
      throw new Error(`Impossible d'ouvrir le dossier ${imapSettings.folder}`);
    }

    // Search for recent unseen emails (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateStr = sevenDaysAgo.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
    
    const searchResp = await sendCommand("A003", `SEARCH SINCE ${dateStr}`);
    const searchMatch = searchResp.match(/\* SEARCH (.+)/);
    const messageIds = searchMatch ? searchMatch[1].trim().split(" ").filter(Boolean) : [];

    let syncedCount = 0;

    // Fetch last 50 messages max
    const idsToFetch = messageIds.slice(-50);

    for (const seqNum of idsToFetch) {
      try {
        const fetchResp = await sendCommand(
          `F${seqNum}`,
          `FETCH ${seqNum} (BODY[HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)] BODY[TEXT])`
        );

        // Parse headers
        const fromMatch = fetchResp.match(/From:\s*(.+)/i);
        const toMatch = fetchResp.match(/To:\s*(.+)/i);
        const subjectMatch = fetchResp.match(/Subject:\s*(.+)/i);
        const dateMatch = fetchResp.match(/Date:\s*(.+)/i);
        const messageIdMatch = fetchResp.match(/Message-ID:\s*(.+)/i);

        const rawFrom = fromMatch?.[1]?.trim() || "";
        const fromNameMatch = rawFrom.match(/^"?([^"<]+)"?\s*<(.+)>/);
        const fromName = fromNameMatch?.[1]?.trim() || null;
        const fromAddress = fromNameMatch?.[2]?.trim() || rawFrom;

        const msgId = messageIdMatch?.[1]?.trim() || `${seqNum}-${Date.now()}`;

        // Extract body text (simplified)
        const bodyParts = fetchResp.split(/\r\n\r\n/);
        const bodyText = bodyParts.length > 2 ? bodyParts.slice(2).join("\n\n").substring(0, 10000) : null;

        let receivedAt: string | null = null;
        if (dateMatch?.[1]) {
          try {
            receivedAt = new Date(dateMatch[1].trim()).toISOString();
          } catch {
            receivedAt = null;
          }
        }

        // Upsert email
        const { error: insertError } = await supabase.from("synced_emails").upsert(
          {
            user_id,
            company_id: imapSettings.company_id,
            message_id: msgId,
            from_address: fromAddress,
            from_name: fromName,
            to_address: toMatch?.[1]?.trim() || null,
            subject: subjectMatch?.[1]?.trim() || null,
            body_text: bodyText,
            received_at: receivedAt,
          },
          { onConflict: "user_id,message_id" }
        );

        if (!insertError) syncedCount++;
      } catch (fetchErr) {
        console.error(`Error fetching message ${seqNum}:`, fetchErr);
      }
    }

    // Update last_sync_at
    await supabase
      .from("user_imap_settings")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", imapSettings.id);

    // Logout
    await sendCommand("A999", "LOGOUT");
    conn.close();

    return new Response(
      JSON.stringify({ success: true, count: syncedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("sync-imap-emails error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
