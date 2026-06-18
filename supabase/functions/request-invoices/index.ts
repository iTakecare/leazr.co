import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface PeriodSel { year: number; all?: boolean; quarters?: number[] }

const formatPeriods = (periods: PeriodSel[]): string =>
  periods
    .filter((p) => p.all || (p.quarters && p.quarters.length))
    .map((p) => (p.all ? `${p.year} — toute l'année` : `${p.year} — ${p.quarters!.sort().map((q) => "T" + q).join(", ")}`))
    .join("\n");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getUser(token);
    const caller = claims?.user;
    if (!caller) return json({ error: "invalid_token" }, 401);

    const payload = (await req.json()) as { contract_id: string; periods: PeriodSel[]; subject?: string; body?: string; body_html?: string };
    const { contract_id, periods } = payload;
    if (!contract_id || !Array.isArray(periods)) return json({ error: "contract_id et periods requis" }, 400);
    const periodsText = formatPeriods(periods);
    if (!periodsText) return json({ error: "Aucune période sélectionnée." }, 400);
    // Le client peut fournir l'objet + le corps édité (HTML de l'éditeur enrichi, ou texte).
    const customHtml = (payload.body_html || "").trim();
    const customBody = (payload.body || "").trim();
    const customSubject = (payload.subject || "").trim();

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Contrat + bailleur + client.
    const { data: contract } = await admin
      .from("contracts")
      .select("id, contract_number, leaser_id, leaser_name, client_id, company_id, monthly_payment, contract_start_date, client_email")
      .eq("id", contract_id)
      .maybeSingle();
    if (!contract) return json({ error: "contract_introuvable" }, 404);

    // Autorisation : le caller doit être lié au client du contrat (ou staff société).
    const myClientIds = new Set<string>();
    const prim = (await admin.from("clients").select("id").eq("user_id", caller.id)).data || [];
    prim.forEach((c: any) => myClientIds.add(c.id));
    const links = (await admin.from("client_user_accounts").select("client_id").eq("user_id", caller.id)).data || [];
    links.forEach((l: any) => myClientIds.add(l.client_id));
    const callerProfile = (await admin.from("profiles").select("company_id, role").eq("id", caller.id).maybeSingle()).data;
    const isStaff = callerProfile?.company_id === contract.company_id && ["admin", "super_admin"].includes(callerProfile?.role || "");
    if (!myClientIds.has(contract.client_id) && !isStaff) return json({ error: "forbidden" }, 403);

    const { data: leaser } = await admin.from("leasers").select("name, email, accounting_email").eq("id", contract.leaser_id).maybeSingle();
    const toEmail = (leaser?.accounting_email || leaser?.email || "").trim();
    if (!toEmail) return json({ error: "no_leaser_email", message: "Aucune adresse comptabilité configurée pour ce bailleur." }, 400);

    const { data: client } = await admin
      .from("clients")
      .select("name, company, contact_name, first_name, last_name, vat_number, phone, email")
      .eq("id", contract.client_id)
      .maybeSingle();

    // Config email (Resend) de la société.
    const { data: cfg } = await admin.from("smtp_settings").select("from_email, from_name, resend_api_key, use_resend").eq("company_id", contract.company_id).maybeSingle();
    const resendKey = cfg?.resend_api_key || Deno.env.get("ITAKECARE_RESEND_API");
    if (!resendKey) return json({ error: "email_not_configured" }, 500);
    const fromName = cfg?.from_name || "iTakecare";
    const fromEmail = cfg?.from_email || "noreply@itakecare.be";

    const clientCompany = client?.company || client?.name || "";
    const clientContact = client?.contact_name || [client?.first_name, client?.last_name].filter(Boolean).join(" ") || "";
    const clientEmail = client?.email || contract.client_email || "";
    const peppolYear = 2026;

    const subject = customSubject || `Demande de factures — Contrat ${contract.contract_number || ""} (${clientCompany})`;
    const defaultText = [
      "Madame, Monsieur,",
      "",
      `Au nom de ${clientCompany}${clientContact ? ` (${clientContact})` : ""}, nous souhaitons recevoir les factures relatives au contrat de leasing suivant :`,
      "",
      `• Numéro de contrat : ${contract.contract_number || "—"}`,
      `• Bailleur : ${leaser?.name || contract.leaser_name || "—"}`,
      `• Société : ${clientCompany}`,
      client?.vat_number ? `• N° TVA : ${client.vat_number}` : "",
      client?.phone ? `• Téléphone : ${client.phone}` : "",
      clientEmail ? `• Email : ${clientEmail}` : "",
      "",
      "Périodes demandées :",
      periodsText,
      "",
      `Pour les factures émises à partir du 1er janvier ${peppolYear}, merci de bien vouloir les transmettre via le réseau Peppol (facturation électronique).`,
      "",
      "Vous en remerciant par avance,",
      `${clientContact || clientCompany}`,
    ].filter((l) => l !== "").join("\n");

    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const htmlToText = (h: string) =>
      h
        .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const wrap = (inner: string) => `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1A2233;line-height:1.6">${inner}</div>`;

    let text: string;
    let html: string;
    if (customHtml) {
      html = wrap(customHtml);
      text = htmlToText(customHtml);
    } else if (customBody) {
      text = customBody;
      html = wrap(customBody.split("\n").map((l) => `<div>${l ? esc(l) : "&nbsp;"}</div>`).join(""));
    } else {
      text = defaultText;
      html = wrap(defaultText.split("\n").map((l) => `<div>${l ? esc(l) : "&nbsp;"}</div>`).join(""));
    }

    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      cc: clientEmail ? [clientEmail] : undefined,
      reply_to: clientEmail || undefined,
      subject,
      text,
      html,
    });
    if ((result as any)?.error) return json({ error: "send_failed", message: (result as any).error?.message }, 502);

    return json({ success: true, to: toEmail, cc: clientEmail || null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
