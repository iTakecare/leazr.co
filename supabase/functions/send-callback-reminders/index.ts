import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("LEAZR_RESEND_API") || Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Fetch all callbacks due today or overdue, grouped by assignee
    const { data: callLogs, error } = await supabase
      .from("offer_call_logs")
      .select(`
        id,
        offer_id,
        callback_date,
        notes,
        created_by,
        offers (
          dossier_number,
          client_name,
          workflow_status,
          company_id
        )
      `)
      .in("status", ["voicemail", "no_answer"])
      .not("callback_date", "is", null)
      .lte("callback_date", today)
      .order("callback_date", { ascending: true });

    if (error) {
      console.error("Error fetching call logs:", error);
      throw error;
    }

    if (!callLogs || callLogs.length === 0) {
      console.log("✅ No callbacks due today");
      return new Response(
        JSON.stringify({ message: "No callbacks due today", count: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Group callbacks by user (created_by)
    const byUser: Record<string, typeof callLogs> = {};
    for (const log of callLogs) {
      const userId = log.created_by || "unknown";
      if (!byUser[userId]) byUser[userId] = [];
      byUser[userId].push(log);
    }

    // Deduplicate per offer per user
    const deduplicated: Record<string, typeof callLogs> = {};
    for (const [userId, logs] of Object.entries(byUser)) {
      const seen = new Set<string>();
      deduplicated[userId] = logs.filter((l) => {
        if (seen.has(l.offer_id)) return false;
        seen.add(l.offer_id);
        return true;
      });
    }

    let emailsSent = 0;

    for (const [userId, userLogs] of Object.entries(deduplicated)) {
      if (userId === "unknown" || !resendApiKey) continue;

      // Get user profile (name) from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single();

      // Get email from auth admin API
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (!email) continue;

      const overdueCount = userLogs.filter(
        (l) => l.callback_date < today
      ).length;
      const todayCount = userLogs.filter(
        (l) => l.callback_date === today
      ).length;

      const userName =
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        "Vous";

      const itemsHtml = userLogs
        .map((log) => {
          const isOverdue = log.callback_date < today;
          const offer = log.offers as any;
          return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
              ${isOverdue ? "🔴" : "🔵"}
              <strong>${offer?.client_name || "Client inconnu"}</strong>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-family:monospace;font-size:13px;">
              ${offer?.dossier_number || log.offer_id.slice(0, 8)}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;${
              isOverdue ? "color:#dc2626;font-weight:600;" : "color:#0284c7;"
            }">
              ${
                isOverdue
                  ? `En retard (${log.callback_date})`
                  : `Aujourd'hui`
              }
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:12px;">
              ${log.notes ? `"${log.notes}"` : "—"}
            </td>
          </tr>`;
        })
        .join("");

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:#0284c7;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">📞 Rappels client du jour</h1>
    <p style="color:#e0f2fe;margin:8px 0 0;font-size:14px;">
      Bonjour ${userName}, voici vos rappels à effectuer aujourd'hui.
    </p>
  </div>

  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
    ${
      overdueCount > 0
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;margin-bottom:16px;">
        ⚠️ <strong style="color:#dc2626;">${overdueCount} rappel(s) en retard</strong> — À traiter en priorité !
      </div>`
        : ""
    }
    ${
      todayCount > 0
        ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:12px;margin-bottom:16px;">
        📅 <strong style="color:#0284c7;">${todayCount} rappel(s) prévus aujourd'hui</strong>
      </div>`
        : ""
    }

    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">CLIENT</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">DOSSIER</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">ÉCHÉANCE</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">NOTE</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="margin-top:24px;text-align:center;">
      <a href="https://leazr.co/admin/offers"
         style="background:#0284c7;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
        Voir les demandes →
      </a>
    </div>
  </div>

  <div style="padding:16px;text-align:center;color:#9ca3af;font-size:12px;">
    Cet email vous est envoyé automatiquement par Leazr chaque matin.<br>
    Pour ne plus recevoir ces notifications, désactivez les rappels dans vos paramètres.
  </div>
</body>
</html>`;

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Leazr <notifications@leazr.co>",
          to: [email],
          subject: `📞 ${userLogs.length} rappel(s) client${overdueCount > 0 ? ` (${overdueCount} en retard)` : ""} — ${new Date().toLocaleDateString("fr-FR")}`,
          html: emailHtml,
        }),
      });

      if (emailResponse.ok) {
        emailsSent++;
        console.log(`✅ Email sent to ${email} (${userLogs.length} callbacks)`);
      } else {
        const err = await emailResponse.text();
        console.error(`❌ Failed to send email to ${email}:`, err);
      }

      // Also send a push notification if the user has subscribed
      try {
        const urgentSuffix = overdueCount > 0 ? ` (${overdueCount} en retard !)` : "";
        const pushPayload = {
          user_id: userId,
          title: `📞 ${userLogs.length} rappel(s) client${urgentSuffix}`,
          body: userLogs.slice(0, 3).map(l => (l.offers as any)?.client_name || "Client").join(", ") +
            (userLogs.length > 3 ? ` +${userLogs.length - 3} autres` : ""),
          url: "/admin/offers",
          tag: "callback-reminders",
        };

        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pushPayload),
        });
        console.log(`📱 Push notification sent to user ${userId}`);
      } catch (pushErr) {
        // Non-fatal: just log the push error
        console.warn(`⚠️ Push notification failed for user ${userId}:`, pushErr);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Callback reminders processed",
        totalCallbacks: callLogs.length,
        emailsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-callback-reminders:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
