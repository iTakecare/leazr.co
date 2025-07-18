import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeploymentRequest {
  site_name: string;
  repository_url: string;
  build_command: string;
  publish_directory: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header manquant");
    }

    // Initialiser Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Utilisateur non authentifié");
    }

    // Vérifier que c'est l'admin SaaS
    if (user.email !== "ecommerce@itakecare.be") {
      throw new Error("Accès non autorisé");
    }

    const { site_name, repository_url, build_command, publish_directory }: DeploymentRequest = await req.json();

    console.log(`[DEPLOY] Début du déploiement pour ${site_name}`);

    // Récupérer le token Netlify depuis les secrets
    const netlifyToken = Deno.env.get("NETLIFY_ACCESS_TOKEN");
    if (!netlifyToken) {
      throw new Error("Token Netlify non configuré");
    }

    // Créer l'enregistrement de déploiement
    const { data: deploymentRecord, error: insertError } = await supabase
      .from("netlify_deployments")
      .insert({
        site_name,
        status: "pending",
        initiated_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur lors de la création de l'enregistrement: ${insertError.message}`);
    }

    console.log(`[DEPLOY] Enregistrement créé avec l'ID: ${deploymentRecord.id}`);

    try {
      // Mettre à jour le statut à "building"
      await supabase
        .from("netlify_deployments")
        .update({ status: "building" })
        .eq("id", deploymentRecord.id);

      // Vérifier si le site existe déjà
      const sitesResponse = await fetch("https://api.netlify.com/api/v1/sites", {
        headers: {
          "Authorization": `Bearer ${netlifyToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!sitesResponse.ok) {
        throw new Error(`Erreur API Netlify: ${sitesResponse.statusText}`);
      }

      const sites = await sitesResponse.json();
      let existingSite = sites.find((site: any) => site.name === site_name);

      let siteData;
      
      if (existingSite) {
        console.log(`[DEPLOY] Site existant trouvé: ${existingSite.id}`);
        siteData = existingSite;
      } else {
        // Créer un nouveau site
        console.log(`[DEPLOY] Création d'un nouveau site: ${site_name}`);
        
        const createSiteResponse = await fetch("https://api.netlify.com/api/v1/sites", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${netlifyToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: site_name,
            repo: {
              provider: "github",
              repo: repository_url.replace("https://github.com/", "")
            },
            build_settings: {
              cmd: build_command,
              dir: publish_directory
            }
          })
        });

        if (!createSiteResponse.ok) {
          const errorText = await createSiteResponse.text();
          throw new Error(`Erreur lors de la création du site: ${errorText}`);
        }

        siteData = await createSiteResponse.json();
        console.log(`[DEPLOY] Nouveau site créé: ${siteData.id}`);
      }

      // Déclencher un nouveau déploiement
      const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteData.id}/builds`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${netlifyToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        throw new Error(`Erreur lors du déclenchement du déploiement: ${errorText}`);
      }

      const deployData = await deployResponse.json();
      console.log(`[DEPLOY] Déploiement déclenché: ${deployData.id}`);

      // Mettre à jour l'enregistrement avec les informations de déploiement
      await supabase
        .from("netlify_deployments")
        .update({
          status: "building",
          netlify_deploy_id: deployData.id,
          deploy_url: siteData.url,
          site_id: siteData.id
        })
        .eq("id", deploymentRecord.id);

      // Sauvegarder/mettre à jour la configuration Netlify
      await supabase
        .from("netlify_configurations")
        .upsert({
          site_name,
          site_id: siteData.id,
          repository_url,
          build_command,
          publish_directory,
          is_active: true
        });

      console.log(`[DEPLOY] Déploiement en cours pour ${site_name}`);

      return new Response(
        JSON.stringify({
          success: true,
          deployment_id: deploymentRecord.id,
          netlify_deploy_id: deployData.id,
          site_url: siteData.url,
          message: "Déploiement lancé avec succès"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );

    } catch (deployError) {
      console.error(`[DEPLOY] Erreur lors du déploiement:`, deployError);
      
      // Mettre à jour le statut à "failed"
      await supabase
        .from("netlify_deployments")
        .update({
          status: "failed",
          error_message: deployError.message,
          completed_at: new Date().toISOString()
        })
        .eq("id", deploymentRecord.id);

      throw deployError;
    }

  } catch (error) {
    console.error("Erreur dans deploy-to-netlify:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});