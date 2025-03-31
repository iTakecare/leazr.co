
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
    
    const { secret_name } = await req.json();
    
    if (!secret_name) {
      return new Response(
        JSON.stringify({ error: 'Nom du secret non spécifié' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Récupération du secret ${secret_name}...`);
    
    // Récupérer la valeur du secret depuis les variables d'environnement
    const value = Deno.env.get(secret_name);
    
    if (!value) {
      console.log(`Secret ${secret_name} non trouvé dans les variables d'environnement`);
      return new Response(
        JSON.stringify({ error: `Secret ${secret_name} non trouvé` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    console.log(`Secret ${secret_name} récupéré avec succès`);
    return new Response(
      JSON.stringify(value),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error("Erreur lors de la récupération du secret:", error);
    
    return new Response(
      JSON.stringify({ error: `Une erreur est survenue: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
