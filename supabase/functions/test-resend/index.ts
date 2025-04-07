
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Créer un client Supabase avec la clé de service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false } }
    );

    // Récupérer les paramètres SMTP depuis la base de données
    const { data: smtpSettings, error: smtpError } = await supabaseAdmin
      .from('smtp_settings')
      .select('resend_api_key, from_email, from_name')
      .eq('id', 1)
      .single();
    
    if (smtpError) {
      console.error("Erreur lors de la récupération des paramètres SMTP:", smtpError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erreur de configuration: ${smtpError.message}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    if (!smtpSettings || !smtpSettings.resend_api_key) {
      console.error("Clé API Resend non configurée");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé API Resend non configurée. Veuillez configurer les paramètres d'envoi d'emails."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Initialiser Resend avec la clé API
    const resend = new Resend(smtpSettings.resend_api_key);
    
    // Format d'expéditeur
    const fromName = smtpSettings.from_name || "iTakecare";
    const fromEmail = smtpSettings.from_email || "noreply@itakecare.app";
    const from = `${fromName} <${fromEmail}>`;
    
    // Email de test
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser();
    
    if (userError) {
      console.error("Erreur lors de la récupération de l'utilisateur:", userError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erreur d'authentification: ${userError.message}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    const testEmail = userData.user.email;
    
    console.log(`Tentative d'envoi d'email de test à ${testEmail}`);
    
    // Envoyer l'email de test
    const { data, error } = await resend.emails.send({
      from,
      to: testEmail,
      subject: "Test d'envoi d'email depuis iTakecare",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Test d'envoi d'email</h2>
          <p>Cet email est un test pour vérifier la configuration de Resend.</p>
          <p>Si vous recevez cet email, c'est que la configuration est correcte !</p>
          <p style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            Envoyé depuis : ${from}<br>
            Date : ${new Date().toLocaleString()}
          </p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
      `,
    });
    
    if (error) {
      console.error("Erreur lors de l'envoi de l'email de test:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erreur d'envoi: ${error.message}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Email de test envoyé avec succès à ${testEmail}`,
        data: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Erreur dans la fonction Edge:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Une erreur est survenue: ${error.message}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
