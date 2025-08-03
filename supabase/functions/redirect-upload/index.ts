import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shortToken = url.pathname.split('/').pop();

    if (!shortToken) {
      return new Response("Token manquant", { status: 400 });
    }

    // Récupérer le lien d'upload complet depuis la base
    const { data: uploadLink, error } = await supabase
      .from('offer_upload_links')
      .select('*')
      .eq('token', shortToken)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .maybeSingle();

    if (error || !uploadLink) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Lien expiré</title>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>⚠️ Lien expiré ou invalide</h2>
          <p>Ce lien d'upload n'est plus valide ou a déjà été utilisé.</p>
          <p>Veuillez contacter votre conseiller pour obtenir un nouveau lien.</p>
        </body>
        </html>`,
        {
          status: 404,
          headers: { "Content-Type": "text/html" }
        }
      );
    }

    // Récupérer l'offre pour le company slug
    const { data: offer } = await supabase
      .from('offers')
      .select('company_id')
      .eq('id', uploadLink.offer_id)
      .maybeSingle();

    if (!offer) {
      return new Response("Offre non trouvée", { status: 404 });
    }

    // Récupérer le company slug
    const { data: company } = await supabase
      .from('companies')
      .select('slug')
      .eq('id', offer.company_id)
      .maybeSingle();

    // Construire l'URL de redirection
    let appUrl = Deno.env.get("APP_URL") || "https://preview--leazr.lovable.app";
    const companySlug = company?.slug;
    
    const redirectUrl = companySlug 
      ? `${appUrl}/${companySlug}/offer/documents/upload/${shortToken}`
      : `${appUrl}/offer/documents/upload/${shortToken}`;

    // Redirection 301 permanente
    return new Response(null, {
      status: 301,
      headers: {
        "Location": redirectUrl,
        "Cache-Control": "no-cache"
      }
    });

  } catch (error) {
    console.error("Erreur dans redirect-upload:", error);
    return new Response("Erreur interne", { status: 500 });
  }
});