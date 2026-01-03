import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ReminderEmailRequest {
  offerId: string;
  reminderType: 'document_reminder' | 'offer_reminder';
  reminderLevel: number; // 1, 3, 5, 9 for offer reminders, 2 for document reminder
  customSubject?: string;
  customMessage?: string;
}

console.log("=== Edge Function send-reminder-email initialized ===");

serve(async (req) => {
  console.log("===== NEW REQUEST RECEIVED =====");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User authenticated:", user.email);

    // Parse request body
    const requestData: ReminderEmailRequest = await req.json();
    const { offerId, reminderType, reminderLevel, customSubject, customMessage } = requestData;

    console.log("Request data:", { offerId, reminderType, reminderLevel });

    // Get offer with client and company info
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        id, 
        client_name, 
        client_email, 
        client_id,
        amount,
        financed_amount,
        monthly_payment,
        company_id,
        workflow_status,
        created_at,
        updated_at
      `)
      .eq('id', offerId)
      .single();

    // Get client first name if client_id exists
    let clientFirstName = '';
    if (offer?.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('first_name, name')
        .eq('id', offer.client_id)
        .single();
      
      if (client?.first_name) {
        clientFirstName = client.first_name;
      } else if (client?.name) {
        clientFirstName = client.name.split(' ')[0];
      }
    }
    
    // Fallback: extract first name from client_name
    if (!clientFirstName && offer?.client_name) {
      clientFirstName = offer.client_name.split(' ')[0];
    }

    if (offerError || !offer) {
      console.error("Offer not found:", offerError);
      return new Response(
        JSON.stringify({ success: false, error: "Offre non trouvée" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!offer.client_email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email client manquant" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get company info
    const { data: company } = await supabase
      .from('companies')
      .select('name, slug')
      .eq('id', offer.company_id)
      .single();

    // Get company customizations for contact info
    const { data: customization } = await supabase
      .from('company_customizations')
      .select('company_email, company_phone')
      .eq('company_id', offer.company_id)
      .single();

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('company_id', offer.company_id)
      .eq('enabled', true)
      .single();

    if (smtpError || !smtpSettings) {
      console.error("SMTP settings not found:", smtpError);
      return new Response(
        JSON.stringify({ success: false, error: "Configuration email non trouvée" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get Resend API key
    let resendApiKey: string | undefined;
    if (smtpSettings.resend_api_key) {
      resendApiKey = smtpSettings.resend_api_key;
    } else if (offer.company_id === 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0') {
      resendApiKey = Deno.env.get("ITAKECARE_RESEND_API");
    }

    if (!resendApiKey || !resendApiKey.startsWith('re_')) {
      return new Response(
        JSON.stringify({ success: false, error: "Clé API Resend non configurée" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Determine template name based on reminder type and level
    let templateName: string;
    if (reminderType === 'document_reminder') {
      templateName = `document_reminder_l${reminderLevel}`;
    } else {
      templateName = `offer_reminder_j${reminderLevel}`;
    }

    console.log("Looking for template:", templateName);

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('company_id', offer.company_id)
      .eq('name', templateName)
      .eq('active', true)
      .single();

    if (templateError || !template) {
      console.error("Template not found:", templateError);
      return new Response(
        JSON.stringify({ success: false, error: `Template '${templateName}' non trouvé` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For document reminders, get the upload link
    let uploadLink = '';
    let requestedDocuments = '';
    
    if (reminderType === 'document_reminder') {
      const { data: uploadLinks } = await supabase
        .from('offer_upload_links')
        .select('token, requested_documents')
        .eq('offer_id', offerId)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (uploadLinks && uploadLinks.length > 0) {
        const appUrl = Deno.env.get("APP_URL") || 'https://www.leazr.co';
        uploadLink = `${appUrl}/r/${uploadLinks[0].token}`;
        
        // Format requested documents
        const docs = uploadLinks[0].requested_documents || [];
        const docNameMap: Record<string, string> = {
          balance_sheet: "Bilan financier",
          tax_notice: "Avertissement extrait de rôle",
          id_card_front: "Carte d'identité - Recto",
          id_card_back: "Carte d'identité - Verso",
          id_card: "Copie de la carte d'identité (recto et verso)",
          company_register: "Extrait de registre d'entreprise",
          vat_certificate: "Attestation TVA",
          bank_statement: "Relevé bancaire des 3 derniers mois"
        };
        
        requestedDocuments = docs.map((doc: string) => {
          if (doc.startsWith('custom:')) {
            return `<li>${doc.substring(7)}</li>`;
          }
          return `<li>${docNameMap[doc] || doc}</li>`;
        }).join('\n');
        
        if (requestedDocuments) {
          requestedDocuments = `<ul>${requestedDocuments}</ul>`;
        }
      }
    }

    // Prepare template variables - use first name only for personalization
    const templateVariables: Record<string, string> = {
      client_name: clientFirstName || 'Client',
      company_name: company?.name || smtpSettings.from_name || 'Notre équipe',
      offer_amount: (offer.financed_amount || offer.amount || 0).toLocaleString('fr-FR'),
      monthly_payment: (offer.monthly_payment || 0).toLocaleString('fr-FR'),
      contact_email: customization?.company_email || smtpSettings.from_email || '',
      contact_phone: customization?.company_phone || '',
      upload_link: uploadLink,
      requested_documents: requestedDocuments,
      custom_message: customMessage ? `<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2563eb;">${customMessage}</div>` : '',
    };

    // Render template
    const renderTemplate = (templateStr: string, variables: Record<string, string>) => {
      let rendered = templateStr;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        rendered = rendered.replace(regex, value || '');
      });
      return rendered;
    };

    const emailSubject = customSubject || renderTemplate(template.subject, templateVariables);
    const emailHtml = renderTemplate(template.html_content, templateVariables);

    console.log("Sending email to:", offer.client_email);
    console.log("Subject:", emailSubject);

    // Send email with Resend
    const resend = new Resend(resendApiKey);
    const fromField = `${smtpSettings.from_name || 'Service Commercial'} <${smtpSettings.from_email}>`;

    const emailResult = await resend.emails.send({
      from: fromField,
      to: offer.client_email,
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailResult.error) {
      console.error("Resend error:", emailResult.error);
      return new Response(
        JSON.stringify({ success: false, error: emailResult.error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailResult.data?.id);

    // Log the reminder in database
    const { error: reminderError } = await supabase
      .from('offer_reminders')
      .insert({
        offer_id: offerId,
        reminder_type: reminderType,
        reminder_level: reminderLevel,
        sent_at: new Date().toISOString(),
        sent_by: user.id,
        custom_message: customMessage || null,
        email_subject: emailSubject,
        email_content: emailHtml,
        recipient_email: offer.client_email,
      });

    if (reminderError) {
      console.error("Error logging reminder:", reminderError);
      // Don't fail the request, email was sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de rappel envoyé avec succès",
        emailId: emailResult.data?.id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in send-reminder-email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur interne" 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
