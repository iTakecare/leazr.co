
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// Configuration CORS pour permettre les requêtes depuis n'importe quelle origine
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
    // Vérifier que c'est bien une requête POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Méthode non supportée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      );
    }

    // Récupérer les données de la requête
    const data = await req.json();
    console.log("Données reçues par la fonction Edge:", data);

    // Créer un client Supabase avec la clé de service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Générer des identifiants uniques pour le client et la demande
    const clientId = crypto.randomUUID();
    const requestId = crypto.randomUUID();

    // Préparer les données du client
    const clientData = {
      id: clientId,
      name: data.client_company,
      email: data.client_email,
      company: data.client_company,
      phone: data.phone || '',
      vat_number: data.client_vat_number || '',
      address: data.address || '',
      city: data.city || '',
      postal_code: data.postal_code || '',
      country: data.country || 'BE',
      status: 'active',
      contact_name: data.client_name
    };

    console.log("Création du client avec les données:", clientData);

    // Insérer le client
    const { data: clientResult, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (clientError) {
      console.error("Erreur lors de la création du client:", clientError);
      // On continue même si la création du client échoue
    }

    // Préparer les données de l'offre
    const offerData = {
      id: requestId,
      client_id: clientId,
      client_name: data.client_name,
      client_email: data.client_email,
      equipment_description: data.equipment_description,
      amount: data.amount,
      monthly_payment: data.monthly_payment,
      coefficient: 1.0,
      commission: 0,
      type: "client_request",
      workflow_status: "requested",
      status: "pending",
      remarks: data.message || '',
      user_id: null
    };

    console.log("Création de l'offre avec les données:", offerData);

    // Insérer l'offre
    const { data: offerResult, error: offerError } = await supabaseAdmin
      .from('offers')
      .insert(offerData)
      .select()
      .single();

    if (offerError) {
      console.error("Erreur lors de la création de l'offre:", offerError);
      return new Response(
        JSON.stringify({ error: `Échec de création de l'offre: ${offerError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Préparer les données de réponse
    const responseData = {
      id: requestId,
      client_id: clientId,
      client_name: data.client_name,
      client_email: data.client_email,
      client_company: data.client_company,
      equipment_description: data.equipment_description,
      amount: data.amount,
      monthly_payment: data.monthly_payment,
      created_at: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Erreur dans la fonction Edge:", error);
    return new Response(
      JSON.stringify({ error: `Une erreur est survenue: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
