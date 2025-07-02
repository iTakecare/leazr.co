import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PasswordResetRequest {
  email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();
    console.log("Demande de réinitialisation pour:", email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables d'environnement Supabase manquantes");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Vérifier si l'utilisateur existe
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Erreur lors de la vérification de l'utilisateur:", userError);
      throw new Error("Erreur lors de la vérification de l'utilisateur");
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.log("Utilisateur non trouvé pour l'email:", email);
      // On retourne succès même si l'utilisateur n'existe pas pour des raisons de sécurité
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Générer un lien de réinitialisation
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${new URL(req.url).origin}/update-password`
      }
    });

    if (resetError) {
      console.error("Erreur lors de la génération du lien:", resetError);
      throw new Error("Erreur lors de la génération du lien de réinitialisation");
    }

    console.log("Lien de réinitialisation généré avec succès");

    // Envoyer l'email via la fonction send-resend-email
    const emailResponse = await supabase.functions.invoke('send-resend-email', {
      body: {
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #2563eb; text-align: center; margin-bottom: 30px;">Réinitialisation de mot de passe</h1>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Bonjour,
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetData.properties?.action_link}" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 10px; color: #666;">
              Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :
            </p>
            
            <p style="font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
              ${resetData.properties?.action_link}
            </p>
            
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Cet email a été envoyé automatiquement, merci de ne pas y répondre.
            </p>
          </div>
        `,
        text: `
Réinitialisation de mot de passe

Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe. 

Cliquez sur ce lien pour créer un nouveau mot de passe :
${resetData.properties?.action_link}

Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
        `
      }
    });

    if (emailResponse.error) {
      console.error("Erreur lors de l'envoi de l'email:", emailResponse.error);
      throw new Error("Erreur lors de l'envoi de l'email");
    }

    console.log("Email de réinitialisation envoyé avec succès");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("Erreur dans send-password-reset:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error),
      message: "Erreur lors de l'envoi de l'email de réinitialisation"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});