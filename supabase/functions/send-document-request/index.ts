import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendDocumentRequestSchema, createValidationErrorResponse } from "../_shared/validationSchemas.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Lang = "fr" | "nl" | "en" | "de";

interface RequestDocumentsData {
  offerId: string;
  clientEmail: string;
  clientName: string;
  requestedDocs: string[];
  customMessage?: string;
  uploadToken?: string;
  templateType?: string;
  language?: Lang;
}

// Libellés des documents par langue (fallback FR puis code brut).
const DOC_NAMES: Record<Lang, Record<string, string>> = {
  fr: {
    balance_sheet: "Bilan financier",
    provisional_balance: "Bilan financier provisoire récent",
    tax_notice: "Avertissement extrait de rôle (BE)",
    tax_return: "Liasse fiscale (FR)",
    id_card_front: "Carte d'identité - Recto",
    id_card_back: "Carte d'identité - Verso",
    id_card: "Copie de la carte d'identité (recto et verso)",
    additional_id: "Pièce d'identité complémentaire",
    company_register: "Extrait de registre d'entreprise",
    company_statutes: "Statuts de la société",
    vat_certificate: "Attestation TVA",
    bank_statement: "Relevés bancaires des 3 derniers mois",
    bank_statement_additional: "Relevés bancaires complémentaires",
    proof_of_address: "Preuve d'adresse",
    other_financial: "Document financier complémentaire",
    quote: "Devis",
    contract: "Contrat",
    insurance: "Attestation d'assurance",
  },
  nl: {
    balance_sheet: "Financiële balans",
    provisional_balance: "Recente voorlopige balans",
    tax_notice: "Aanslagbiljet (BE)",
    tax_return: "Belastingaangifte (FR)",
    id_card_front: "Identiteitskaart - voorzijde",
    id_card_back: "Identiteitskaart - achterzijde",
    id_card: "Kopie van de identiteitskaart (voor- en achterzijde)",
    additional_id: "Bijkomend identiteitsbewijs",
    company_register: "Uittreksel uit het ondernemingsregister",
    company_statutes: "Statuten van de onderneming",
    vat_certificate: "Btw-attest",
    bank_statement: "Bankuittreksels van de laatste 3 maanden",
    bank_statement_additional: "Bijkomende bankuittreksels",
    proof_of_address: "Bewijs van adres",
    other_financial: "Bijkomend financieel document",
    quote: "Offerte",
    contract: "Contract",
    insurance: "Verzekeringsattest",
  },
  en: {
    balance_sheet: "Financial balance sheet",
    provisional_balance: "Recent provisional balance sheet",
    tax_notice: "Tax assessment notice (BE)",
    tax_return: "Tax return (FR)",
    id_card_front: "ID card - front",
    id_card_back: "ID card - back",
    id_card: "Copy of the ID card (front and back)",
    additional_id: "Additional proof of identity",
    company_register: "Company register extract",
    company_statutes: "Company statutes",
    vat_certificate: "VAT certificate",
    bank_statement: "Bank statements for the last 3 months",
    bank_statement_additional: "Additional bank statements",
    proof_of_address: "Proof of address",
    other_financial: "Additional financial document",
    quote: "Quote",
    contract: "Contract",
    insurance: "Insurance certificate",
  },
  de: {
    balance_sheet: "Finanzbilanz",
    provisional_balance: "Aktuelle vorläufige Bilanz",
    tax_notice: "Steuerbescheid (BE)",
    tax_return: "Steuererklärung (FR)",
    id_card_front: "Personalausweis - Vorderseite",
    id_card_back: "Personalausweis - Rückseite",
    id_card: "Kopie des Personalausweises (Vorder- und Rückseite)",
    additional_id: "Zusätzlicher Identitätsnachweis",
    company_register: "Handelsregisterauszug",
    company_statutes: "Gesellschaftssatzung",
    vat_certificate: "USt-Bescheinigung",
    bank_statement: "Kontoauszüge der letzten 3 Monate",
    bank_statement_additional: "Zusätzliche Kontoauszüge",
    proof_of_address: "Adressnachweis",
    other_financial: "Zusätzliches Finanzdokument",
    quote: "Angebot",
    contract: "Vertrag",
    insurance: "Versicherungsbescheinigung",
  },
};

// Chrome de l'email intégré (utilisé pour NL/EN/DE, et repli si pas de
// template DB). Variables: client_name, company_name, requested_documents
// (HTML), upload_link, custom_message.
const EMAIL_I18N: Record<Lang, {
  subject: string; greeting: string; intro: string; docsTitle: string;
  cta: string; fallback: string; signature: string;
}> = {
  fr: {
    subject: "Documents requis - {{company_name}}",
    greeting: "Bonjour {{client_name}},",
    intro: "Afin de poursuivre le traitement de votre dossier, nous avons besoin des documents suivants :",
    docsTitle: "Documents demandés",
    cta: "Téléverser mes documents",
    fallback: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
    signature: "Merci, l'équipe {{company_name}}",
  },
  nl: {
    subject: "Vereiste documenten - {{company_name}}",
    greeting: "Beste {{client_name}},",
    intro: "Om uw dossier verder te kunnen behandelen, hebben wij de volgende documenten nodig:",
    docsTitle: "Gevraagde documenten",
    cta: "Mijn documenten opladen",
    fallback: "Werkt de knop niet? Kopieer dan deze link in uw browser:",
    signature: "Met vriendelijke groeten, het team van {{company_name}}",
  },
  en: {
    subject: "Required documents - {{company_name}}",
    greeting: "Hello {{client_name}},",
    intro: "To continue processing your file, we need the following documents:",
    docsTitle: "Requested documents",
    cta: "Upload my documents",
    fallback: "If the button doesn't work, copy this link into your browser:",
    signature: "Thank you, the {{company_name}} team",
  },
  de: {
    subject: "Erforderliche Dokumente - {{company_name}}",
    greeting: "Guten Tag {{client_name}},",
    intro: "Um Ihren Vorgang weiter zu bearbeiten, benötigen wir die folgenden Dokumente:",
    docsTitle: "Angeforderte Dokumente",
    cta: "Meine Dokumente hochladen",
    fallback: "Falls die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:",
    signature: "Vielen Dank, Ihr Team von {{company_name}}",
  },
};

function buildLocalizedEmail(lang: Lang, vars: {
  client_name: string; company_name: string; upload_link: string;
  requested_documents: string[]; custom_message?: string;
}): { subject: string; html: string } {
  const t = EMAIL_I18N[lang];
  const fill = (s: string) => s
    .replace(/{{\s*company_name\s*}}/g, vars.company_name)
    .replace(/{{\s*client_name\s*}}/g, vars.client_name);
  const items = vars.requested_documents.map((d) => `<li style="margin:4px 0;">${d}</li>`).join("");
  const customBlock = vars.custom_message && vars.custom_message.trim()
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-radius:8px;color:#334155;">${vars.custom_message}</p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <p style="font-size:16px;">${fill(t.greeting)}</p>
      <p style="font-size:15px;line-height:1.5;">${fill(t.intro)}</p>
      <h3 style="font-size:14px;margin:20px 0 8px;color:#0f172a;">${t.docsTitle}</h3>
      <ul style="font-size:14px;padding-left:20px;margin:0;">${items}</ul>
      ${customBlock}
      <div style="text-align:center;margin:28px 0;">
        <a href="${vars.upload_link}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:bold;">${t.cta}</a>
      </div>
      <p style="font-size:12px;color:#64748b;">${t.fallback}<br><a href="${vars.upload_link}" style="color:#059669;">${vars.upload_link}</a></p>
      <p style="font-size:13px;color:#475569;margin-top:24px;">${fill(t.signature)}</p>
    </div>
  </body></html>`;
  return { subject: fill(t.subject), html };
}

console.log("=== Function Edge send-document-request initialisée ===");

serve(async (req) => {
  console.log("===== NOUVELLE REQUÊTE REÇUE =====");
  console.log("Méthode:", req.method);
  console.log("URL:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Requête OPTIONS (CORS preflight) reçue, réponse avec headers CORS");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Automation bypass: the Grenke automation cron calls this function
    // server-side with the shared cron secret instead of a user token. We
    // skip the role check and use the service-role client directly.
    const cronSecret = Deno.env.get("GRENKE_CRON_SECRET");
    const cronHeader = req.headers.get("X-Cron-Secret");
    const isCron = !!cronSecret && cronHeader === cronSecret;

    let supabase;
    // Hoisted so the cross-company check below can read it. Stays null on the
    // cron path (no user context — cron is a trusted service-role caller).
    let access: Awaited<ReturnType<typeof requireElevatedAccess>> | null = null;
    if (isCron) {
      supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
    } else {
      access = await requireElevatedAccess(req, corsHeaders, {
        allowedRoles: ["admin", "super_admin", "broker"],
        rateLimit: {
          endpoint: "send-document-request",
          maxRequests: 25,
          windowSeconds: 60,
          identifierPrefix: "send-document-request",
        },
      });
      if (!access.ok) {
        return access.response;
      }
      supabase = access.context.supabaseAdmin;
    }

    // Récupérer et valider le corps de la requête
    let requestData: RequestDocumentsData;
    
    if (req.headers.get("content-type")?.includes("application/json")) {
      const bodyText = await req.text();
      console.log("Corps de la requête reçu (taille:", bodyText.length, "bytes)");
      
      let rawData;
      try {
        rawData = JSON.parse(bodyText);
      } catch (parseError) {
        console.error("❌ Erreur lors du parsing JSON:", parseError);
        return new Response(
          JSON.stringify({
            success: false,
            message: "Format JSON invalide"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      // Validation with zod to prevent injection attacks
      try {
        requestData = sendDocumentRequestSchema.parse(rawData);
        console.log("✅ Données validées avec succès");
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("❌ Validation échouée:", error.errors);
          return createValidationErrorResponse(error, corsHeaders);
        }
        throw error;
      }
    } else {
      console.error("Type de contenu non supporté:", req.headers.get("content-type"));
      return new Response(
        JSON.stringify({
          success: false,
          message: "Type de contenu non supporté. Utilisez application/json"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Données de la requête validées pour offerId:", requestData.offerId);
    
    const {
      offerId,
      clientEmail,
      clientName,
      requestedDocs,
      customMessage,
      uploadToken,
      templateType,
      language
    } = requestData;
    const lang: Lang = (["fr", "nl", "en", "de"] as const).includes(language as Lang) ? (language as Lang) : "fr";
    // FR: template DB existant. Autres langues: template DB 'document_request_<lang>'
    // s'il existe, sinon template intégré localisé.
    const effectiveTemplateType = templateType || (lang === "fr" ? "document_request" : `document_request_${lang}`);
    
    // Validation des données
    if (!offerId) {
      console.error("Offre ID manquant");
      return new Response(
        JSON.stringify({ success: false, message: "Offre ID manquant" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    if (!clientEmail) {
      console.error("Email client manquant");
      return new Response(
        JSON.stringify({ success: false, message: "Email client manquant" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    if (!clientName) {
      console.error("Nom client manquant");
      return new Response(
        JSON.stringify({ success: false, message: "Nom client manquant" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    if (!requestedDocs || !Array.isArray(requestedDocs) || requestedDocs.length === 0) {
      console.error("Documents demandés manquants ou invalides");
      return new Response(
        JSON.stringify({ success: false, message: "Documents demandés manquants ou invalides" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!uploadToken) {
      console.error("Token d'upload manquant");
      return new Response(
        JSON.stringify({ success: false, message: "Token d'upload manquant" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Requête validée pour envoyer un email à:", clientEmail);
    console.log("Documents demandés:", requestedDocs);
    console.log("Token d'upload reçu pour l'offre:", offerId);
    
    // Fonction pour s'assurer que l'URL a le protocole https://
    const ensureHttpsUrl = (url: string): string => {
      if (!url) return 'https://preview--leazr.lovable.app';
      
      // Si l'URL commence déjà par http:// ou https://, la retourner telle quelle
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      // Sinon, ajouter https://
      return `https://${url}`;
    };

    // Construire l'URL d'upload avec l'URL de base de l'application
    let appUrl = Deno.env.get("APP_URL");
    
    // Fallback : construire l'URL depuis les headers de la requête si APP_URL n'est pas définie
    if (!appUrl) {
      const origin = req.headers.get('origin') || req.headers.get('referer');
      if (origin) {
        try {
          const url = new URL(origin);
          appUrl = `${url.protocol}//${url.host}`;
          console.log("APP_URL non définie, utilisation de l'origin:", appUrl);
        } catch (e) {
          console.warn("Impossible de parser l'origin, utilisation URL par défaut");
          appUrl = 'https://preview--leazr.lovable.app';
        }
      } else {
        console.warn("APP_URL et origin non disponibles, utilisation URL par défaut");
        appUrl = 'https://www.leazr.co';
      }
    }
    
    // S'assurer que l'URL a le protocole https://
    appUrl = ensureHttpsUrl(appUrl);
    console.log("URL de base avec protocole:", appUrl);
    
    // Construire l'URL d'upload avec le company slug (sera déplacé après récupération de l'offre)
    // Cette variable sera définie plus tard une fois qu'on aura le slug de l'entreprise
    
    // Récupérer l'offre pour obtenir le company_id
    console.log("Récupération de l'offre pour obtenir le company_id...");
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('company_id')
      .eq('id', offerId)
      .maybeSingle();
      
    if (offerError || !offer) {
      console.error("Erreur lors de la récupération de l'offre:", offerError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Offre non trouvée",
          debug: {
            offerId,
            error: offerError?.message || 'Offer not found'
          }
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Company ID de l'offre:", offer.company_id);

    // Cron path (access === null) is a trusted service-role caller and skips
    // this check. For UI calls, block cross-company document requests.
    if (
      access?.ok &&
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== offer.company_id
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Cross-company document request is forbidden",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Récupérer le slug de l'entreprise séparément
    console.log("Récupération du company slug...");
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('slug')
      .eq('id', offer.company_id)
      .maybeSingle();
      
    if (companyError) {
      console.error("Erreur lors de la récupération du company:", companyError);
      // Continuer sans le slug si erreur - fallback sur URL sans slug
      console.log("Continuant sans company slug - utilisation URL par défaut");
    }
    
    const companySlug = company?.slug;
    console.log("Company slug de l'offre:", companySlug);
    
     // Créer une URL de redirection courte pour éviter les problèmes Mac
     const shortUrl = `${appUrl.replace(/\/$/, '')}/r/${uploadToken}`;
     console.log("URL courte générée pour l'offre:", offerId);
    
    // Récupérer les paramètres email spécifiques à l'entreprise de l'offre
    console.log("Récupération de la configuration email pour company_id:", offer.company_id);
    const { data: emailConfig, error: emailError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('company_id', offer.company_id)
      .eq('enabled', true)
      .maybeSingle();
      
    if (emailError || !emailConfig) {
      console.error("Erreur lors de la récupération des paramètres email:", emailError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Configuration email non trouvée ou désactivée",
          details: emailError,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Configuration email récupérée:", {
      from_email: emailConfig.from_email,
      from_name: emailConfig.from_name,
      use_resend: emailConfig.use_resend,
      has_resend_api_key_in_db: !!emailConfig.resend_api_key
    });
    
    // Vérifier que Resend est activé
    if (!emailConfig.use_resend) {
      console.error("Resend n'est pas activé dans la configuration");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Service d'email Resend non activé",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Récupérer la clé API Resend spécifique à l'entreprise
    console.log("=== RÉCUPÉRATION CLÉ API RESEND ===");
    let resendApiKey: string | undefined;
    const companyId = offer.company_id;
    
    // 1. Priorité à la clé API de l'entreprise stockée en BDD
    if (emailConfig.resend_api_key) {
      console.log("Utilisation de la clé API depuis les paramètres SMTP de l'entreprise");
      resendApiKey = emailConfig.resend_api_key;
    }
    // 2. Fallback pour iTakecare uniquement
    else if (companyId === 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0') {
      resendApiKey = Deno.env.get("ITAKECARE_RESEND_API");
      console.log("Utilisation de la clé API iTakecare depuis les secrets:", !!resendApiKey);
    }
    
    // Validation de la clé API
    if (!resendApiKey) {
      console.error("Clé API Resend non configurée pour cette entreprise");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé API Resend non configurée. Veuillez configurer vos paramètres SMTP dans les paramètres de l'application.",
          error: "MISSING_RESEND_API_KEY",
          guidance: "Allez dans Paramètres > Email > Configuration d'envoi pour configurer votre clé API Resend"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Vérifier le format de la clé API Resend
    if (!resendApiKey.startsWith('re_')) {
      console.log("Clé API Resend invalide: ne commence pas par 're_'");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé API Resend invalide. Veuillez vérifier votre configuration dans les paramètres SMTP.",
          error: "INVALID_RESEND_API_KEY_FORMAT"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Clé API Resend récupérée avec succès");
    
    // Formater les documents demandés pour l'email (libellés localisés)
    const docNameMap = DOC_NAMES[lang];
    const docLabelsList = requestedDocs.map(doc =>
      doc.startsWith('custom:') ? doc.substring(7) : (docNameMap[doc] || DOC_NAMES.fr[doc] || doc)
    );
    const formattedDocs = docLabelsList.map(l => `- ${l}`).join('\n');

    // Récupérer le nom de l'entreprise pour les variables du template
    const { data: companyInfo } = await supabase
      .from('companies')
      .select('name')
      .eq('id', offer.company_id)
      .maybeSingle();

    const companyName = companyInfo?.name || emailConfig.from_name || 'iTakecare';

    // Récupérer le template d'email selon le type demandé (default: document_request)
    console.log(`Récupération du template email '${effectiveTemplateType}'...`);
    const { data: emailTemplate, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('company_id', offer.company_id)
      .eq('type', effectiveTemplateType)
      .eq('active', true)
      .maybeSingle();

    let emailSubject: string;
    let htmlBody: string;

    if (emailTemplate) {
      console.log("Template email trouvé avec succès");

      // Préparer les variables pour le template
      const templateVariables = {
        client_name: clientName,
        company_name: companyName,
        upload_link: shortUrl,
        requested_documents: formattedDocs,
        custom_message: customMessage || ''
      };

      // Fonction pour remplacer les variables dans le template
      const renderTemplate = (template: string, variables: Record<string, string>) => {
        let rendered = template;

        // Remplacer les variables simples {{variable}}
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          rendered = rendered.replace(regex, value || '');
        });

        // Gérer les conditions {{#if custom_message}}...{{/if}}
        if (variables.custom_message && variables.custom_message.trim()) {
          rendered = rendered.replace(/{{#if custom_message}}([\s\S]*?){{\/if}}/g, '$1');
        } else {
          rendered = rendered.replace(/{{#if custom_message}}([\s\S]*?){{\/if}}/g, '');
        }

        return rendered;
      };

      // Rendre le template avec les variables
      emailSubject = renderTemplate(emailTemplate.subject, templateVariables);
      htmlBody = renderTemplate(emailTemplate.html_content, templateVariables);
    } else if (lang === 'fr') {
      // FR : le template DB doit exister — on conserve l'erreur historique.
      console.error(`Template email '${effectiveTemplateType}' non trouvé:`, templateError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Template d'email '${effectiveTemplateType}' non configuré pour cette entreprise`,
          details: templateError,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      // NL/EN/DE sans template DB : on rend le template intégré localisé.
      console.log(`Aucun template DB '${effectiveTemplateType}', utilisation du template intégré (${lang})`);
      const built = buildLocalizedEmail(lang, {
        client_name: clientName,
        company_name: companyName,
        upload_link: shortUrl,
        requested_documents: docLabelsList,
        custom_message: customMessage || '',
      });
      emailSubject = built.subject;
      htmlBody = built.html;
    }
    
    // Créer une version texte simplifiée (localisée)
    const textI18n: Record<Lang, { hi: string; docs: string; cta: string }> = {
      fr: { hi: "Bonjour", docs: "Documents requis", cta: "Veuillez utiliser ce lien pour téléverser vos documents" },
      nl: { hi: "Beste", docs: "Vereiste documenten", cta: "Gebruik deze link om uw documenten op te laden" },
      en: { hi: "Hello", docs: "Required documents", cta: "Please use this link to upload your documents" },
      de: { hi: "Guten Tag", docs: "Erforderliche Dokumente", cta: "Bitte verwenden Sie diesen Link, um Ihre Dokumente hochzuladen" },
    };
    const ti = textI18n[lang];
    const emailBody = `${ti.hi} ${clientName},\n\n${ti.docs}:\n${formattedDocs}\n\n${customMessage || ''}\n\n${ti.cta}: ${shortUrl}`;

    // Initialiser Resend
    const resend = new Resend(resendApiKey);
    
    try {
      
      console.log("Préparation de l'email pour:", clientEmail);
      console.log("Sujet:", emailSubject);
      
      // Format RFC-compliant pour le champ From
      const fromField = `${emailConfig.from_name || 'iTakecare'} <${emailConfig.from_email}>`;
      console.log("From field format:", fromField);
      
      console.log("Tentative d'envoi d'email via Resend...");
      
      // Envoi de l'email avec Resend
      const emailResult = await resend.emails.send({
        from: fromField,
        to: clientEmail,
        subject: emailSubject,
        text: emailBody,
        html: htmlBody,
      });
      
      if (emailResult.error) {
        console.error("Erreur lors de l'envoi via Resend:", emailResult.error);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Erreur lors de l'envoi de l'email: ${emailResult.error.message}`,
            details: emailResult.error,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      console.log("Email envoyé avec succès via Resend:", emailResult.data);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email envoyé avec succès",
          details: emailResult.data
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email via Resend:", emailError);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erreur lors de l'envoi de l'email: ${emailError.message}`,
          details: JSON.stringify(emailError),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error) {
    console.error("Erreur lors du traitement de la requête:", error);
    console.error("Détails de l'erreur:", JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erreur: ${error.message}`,
        details: JSON.stringify(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
