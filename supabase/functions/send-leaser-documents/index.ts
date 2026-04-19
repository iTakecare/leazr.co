/**
 * send-leaser-documents
 *
 * Envoie au bailleur (liseur) un email avec :
 *  • les documents contractuels sélectionnés (téléchargés depuis offer-documents)
 *  • des pièces jointes supplémentaires passées en base64
 *  • toutes les références du dossier (facture, contrat, demande, client)
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── helpers ───────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
function fail(msg: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/** ArrayBuffer → base64 (Deno-safe, no stack overflow for large files) */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Format euro amount */
function fmtAmount(n: number) {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n);
}

// ── main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("Non authentifié", 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return fail("Non authentifié", 401);

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // ── Parse body ──
    const {
      invoice_id,
      leaser_email,
      leaser_name,
      cc_emails = [],           // adresses en copie (CC)
      document_ids = [],        // IDs from offer_documents table
      additional_files = [],    // [{ name, content (base64), type }]
      invoice_info = {},        // { invoice_number, contract_number, dossier_number, leaser_request_number, client_name, amount }
      custom_message = "",
      peppol_sent = false,      // facture envoyée via Peppol
      contract_signed = false,  // contrat signé chez le bailleur
      company_logo_url = null,  // logo de la société (iTakecare)
      leaser_logo_url = null,   // logo du bailleur
    } = await req.json();

    if (!leaser_email) return fail("Email du bailleur requis");
    if (document_ids.length === 0 && additional_files.length === 0)
      return fail("Aucun document sélectionné");

    // Filtrer les CC vides
    const validCc: string[] = (cc_emails as string[]).map((e) => e.trim()).filter(Boolean);

    // ── Download offer documents from storage ──
    const attachments: Array<{ filename: string; content: string }> = [];

    if (document_ids.length > 0) {
      const { data: docs, error: docsErr } = await admin
        .from("offer_documents")
        .select("id, file_name, file_path, document_type")
        .in("id", document_ids);

      if (docsErr) console.error("Erreur récupération documents:", docsErr);

      for (const doc of docs ?? []) {
        try {
          const { data: blob, error: dlErr } = await admin.storage
            .from("offer-documents")
            .download(doc.file_path);

          if (dlErr || !blob) {
            console.error(`Impossible de télécharger ${doc.file_path}:`, dlErr);
            continue;
          }

          const buffer = await blob.arrayBuffer();
          attachments.push({ filename: doc.file_name, content: bufferToBase64(buffer) });
          console.log(`✅ Document joint: ${doc.file_name} (${buffer.byteLength} bytes)`);
        } catch (e) {
          console.error(`Erreur pour document ${doc.id}:`, e);
        }
      }
    }

    // ── Add additional files (already base64 from browser) ──
    for (const f of additional_files) {
      if (f.content && f.name) {
        attachments.push({ filename: f.name, content: f.content });
      }
    }

    // ── Build HTML email ──
    // Affichage client : "Société (Prénom Nom)" ou juste "Nom" si pas de société
    const clientDisplay = invoice_info.client_company
      ? `${invoice_info.client_company} — ${invoice_info.client_name}`
      : invoice_info.client_name;

    const rows = [
      ["N° de facture", invoice_info.invoice_number],
      ["N° de contrat", invoice_info.contract_number],
      ["N° de demande interne", invoice_info.dossier_number],
      ["Réf. bailleur", invoice_info.leaser_request_number],
      ["Client", clientDisplay],
      ["Montant facturé", invoice_info.amount ? fmtAmount(invoice_info.amount) : null],
    ]
      .filter(([, v]) => v)
      .map(([k, v]) => `<tr><td class="lbl">${k}</td><td class="val">${v}</td></tr>`)
      .join("");

    const docsListHtml =
      attachments.length > 0
        ? `<div class="docs-box">
           <div class="docs-title">📎 Pièces jointes (${attachments.length})</div>
           <ul>${attachments.map((a) => `<li>${a.filename}</li>`).join("")}</ul>
         </div>`
        : "";

    const msgHtml = custom_message
      ? `<div class="note">${custom_message.replace(/\n/g, "<br>")}</div>`
      : "";

    // Confirmations statut
    const confirmHtml = `
<div class="confirm-box">
  <div class="confirm-title">Statut du dossier</div>
  <div class="confirm-row">
    <span class="confirm-icon ${contract_signed ? "ok" : "pending"}">${contract_signed ? "✅" : "⏳"}</span>
    <span class="confirm-label">Contrat signé chez le bailleur</span>
    <span class="confirm-status ${contract_signed ? "ok" : "pending"}">${contract_signed ? "Confirmé" : "En attente"}</span>
  </div>
  <div class="confirm-row">
    <span class="confirm-icon ${peppol_sent ? "ok" : "pending"}">${peppol_sent ? "✅" : "⏳"}</span>
    <span class="confirm-label">Facture envoyée via Peppol</span>
    <span class="confirm-status ${peppol_sent ? "ok" : "pending"}">${peppol_sent ? "Envoyée" : "En attente"}</span>
  </div>
</div>`;

    // Construire le bloc logos (affiché au-dessus du header foncé)
    const hasLogos = company_logo_url || leaser_logo_url;
    const logosHtml = hasLogos ? `
<div class="logos-bar">
  ${company_logo_url
    ? `<img src="${company_logo_url}" alt="Logo société" class="logo-img" />`
    : `<div class="logo-placeholder">📦</div>`}
  <div class="logo-sep"></div>
  ${leaser_logo_url
    ? `<img src="${leaser_logo_url}" alt="Logo bailleur" class="logo-img" />`
    : `<div class="logo-placeholder">🏦</div>`}
</div>` : "";

    const html = `<!DOCTYPE html><html lang="fr">
<head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;background:#f1f5f9}
.wrap{max-width:620px;margin:32px auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.logos-bar{background:#ffffff;padding:16px 28px;display:flex;align-items:center;justify-content:center;gap:20px;border-bottom:1px solid #e2e8f0}
.logo-img{max-height:48px;max-width:140px;object-fit:contain}
.logo-sep{width:1px;height:36px;background:#cbd5e1}
.logo-placeholder{font-size:24px;opacity:.5}
.hd{background:#1e293b;color:white;padding:20px 28px}
.hd h2{font-size:17px;font-weight:600;letter-spacing:.3px}
.hd p{font-size:12px;color:#94a3b8;margin-top:4px}
.bd{padding:24px 28px}
p{margin:10px 0;line-height:1.6}
table.info{width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
table.info tr:not(:last-child) td{border-bottom:1px solid #e2e8f0}
table.info td{padding:9px 14px;font-size:13px}
.lbl{color:#64748b;width:44%}
.val{font-weight:600;color:#1e293b}
.docs-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:14px 18px;margin:16px 0}
.docs-title{font-size:12px;font-weight:600;color:#475569;margin-bottom:8px}
.docs-box ul{padding-left:18px;font-size:13px;color:#334155;line-height:1.7}
.note{background:#eff6ff;border-left:3px solid #3b82f6;border-radius:4px;padding:12px 16px;font-size:13px;color:#1e40af;margin:16px 0}
.confirm-box{border:1px solid #e2e8f0;border-radius:7px;padding:14px 18px;margin:16px 0;background:#f8fafc}
.confirm-title{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}
.confirm-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
.confirm-row:last-child{border-bottom:none}
.confirm-label{flex:1;color:#334155}
.confirm-status.ok{color:#059669;font-weight:600;font-size:12px}
.confirm-status.pending{color:#b45309;font-weight:600;font-size:12px}
.ft{text-align:center;font-size:11px;color:#94a3b8;padding:16px;border-top:1px solid #f1f5f9}
</style></head>
<body>
<div class="wrap">
  ${logosHtml}
  <div class="hd">
    <h2>📁 Documents contractuels</h2>
    <p>Facture ${invoice_info.invoice_number ?? ""} — ${clientDisplay ?? ""}</p>
  </div>
  <div class="bd">
    <p>Bonjour,</p>
    <p>Veuillez trouver ci-joints les documents relatifs au dossier suivant :</p>
    <table class="info"><tbody>${rows}</tbody></table>
    ${confirmHtml}
    ${docsListHtml}
    ${msgHtml}
    <p style="margin-top:20px">Pour toute question, répondez directement à cet email.</p>
    <p>Cordialement,<br><strong>iTakecare</strong></p>
  </div>
  <div class="ft">Envoyé via Leazr · ${new Date().toLocaleDateString("fr-BE")}</div>
</div>
</body></html>`;

    // ── Send via Resend ──
    const resendKey = Deno.env.get("LEAZR_RESEND_API") || Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return fail("Clé Resend non configurée");

    const resend = new Resend(resendKey);
    const subject = [
      "Documents contractuels",
      invoice_info.invoice_number,
      invoice_info.client_name,
    ]
      .filter(Boolean)
      .join(" — ");

    // reply_to = hello@itakecare.be + les adresses CC (pour que le bailleur réponde à tous)
    const replyToAddresses = ["hello@itakecare.be", ...validCc.filter((e) => e !== "hello@itakecare.be")];

    const { data: emailData, error: emailErr } = await resend.emails.send({
      from: "iTakecare <notifications@leazr.co>",
      to: [leaser_email],
      ...(validCc.length > 0 ? { cc: validCc } : {}),
      reply_to: replyToAddresses,
      subject,
      html,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })),
    });

    if (emailErr) {
      console.error("Erreur Resend:", emailErr);
      return fail(`Erreur envoi email: ${emailErr.message}`);
    }

    console.log(`✅ Email envoyé à ${leaser_email} (${attachments.length} pièces jointes)`);

    // ── Persist sent_at in billing_data ──
    if (invoice_id) {
      const { data: inv } = await admin
        .from("invoices")
        .select("billing_data")
        .eq("id", invoice_id)
        .single();

      if (inv) {
        const existing = inv.billing_data ?? {};
        await admin
          .from("invoices")
          .update({
            billing_data: {
              ...existing,
              leaser_send: {
                ...(existing.leaser_send ?? {}),
                sent_at: new Date().toISOString(),
                sent_to: leaser_email,
                cc_emails: validCc,
                documents_count: attachments.length,
                resend_id: emailData?.id ?? null,
              },
            },
          })
          .eq("id", invoice_id);
      }
    }

    return ok({ success: true, sent: attachments.length, resend_id: emailData?.id });
  } catch (e: any) {
    console.error("Erreur send-leaser-documents:", e);
    return fail(e.message ?? "Erreur interne", 500);
  }
});
