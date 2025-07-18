import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NetlifyDeployRequest {
  companyId: string;
  repositoryUrl: string;
  siteName?: string;
  customDomain?: string;
  autoDeploy?: boolean;
  buildCommand?: string;
  publishDirectory?: string;
  environmentVariables?: Record<string, string>;
}

interface NetlifyDeployResponse {
  success: boolean;
  siteId?: string;
  deployId?: string;
  siteUrl?: string;
  adminUrl?: string;
  deployUrl?: string;
  error?: string;
}

serve(async (req) => {
  console.log('[DEPLOY-TO-NETLIFY] Function started');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier la méthode HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialiser Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer le token d'autorisation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.log('[DEPLOY-TO-NETLIFY] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur est l'admin SaaS
    if (user.email !== 'ecommerce@itakecare.be') {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DEPLOY-TO-NETLIFY] User authenticated:', user.email);

    // Parser la requête
    const deployRequest: NetlifyDeployRequest = await req.json();
    console.log('[DEPLOY-TO-NETLIFY] Deploy request:', deployRequest);

    // Récupérer le token Netlify depuis les secrets
    const netlifyToken = Deno.env.get('NETLIFY_ACCESS_TOKEN');
    if (!netlifyToken) {
      return new Response(
        JSON.stringify({ error: 'Netlify access token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer l'enregistrement de déploiement
    const { data: deployment, error: deploymentError } = await supabase
      .from('netlify_deployments')
      .insert({
        company_id: deployRequest.companyId,
        status: 'pending',
        created_by: user.id
      })
      .select()
      .single();

    if (deploymentError) {
      console.error('[DEPLOY-TO-NETLIFY] Error creating deployment record:', deploymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create deployment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DEPLOY-TO-NETLIFY] Deployment record created:', deployment.id);

    try {
      // Vérifier si un site existe déjà pour cette entreprise
      const { data: existingConfig } = await supabase
        .from('netlify_configurations')
        .select('*')
        .eq('company_id', deployRequest.companyId)
        .single();

      let siteId = existingConfig?.site_id;
      let response: NetlifyDeployResponse;

      if (!siteId) {
        // Créer un nouveau site Netlify
        console.log('[DEPLOY-TO-NETLIFY] Creating new Netlify site');
        
        const siteName = deployRequest.siteName || `leazr-${deployRequest.companyId.substring(0, 8)}`;
        
        const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${netlifyToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: siteName,
            custom_domain: deployRequest.customDomain,
            repo: {
              repo: deployRequest.repositoryUrl,
              branch: 'main',
              cmd: deployRequest.buildCommand || 'npm run build',
              dir: deployRequest.publishDirectory || 'dist',
            },
            build_settings: {
              cmd: deployRequest.buildCommand || 'npm run build',
              publish_dir: deployRequest.publishDirectory || 'dist',
              env: deployRequest.environmentVariables || {}
            }
          }),
        });

        if (!createSiteResponse.ok) {
          const errorText = await createSiteResponse.text();
          console.error('[DEPLOY-TO-NETLIFY] Failed to create site:', errorText);
          throw new Error(`Failed to create Netlify site: ${errorText}`);
        }

        const siteData = await createSiteResponse.json();
        siteId = siteData.id;

        console.log('[DEPLOY-TO-NETLIFY] Site created:', siteId);

        // Sauvegarder la configuration
        await supabase
          .from('netlify_configurations')
          .upsert({
            company_id: deployRequest.companyId,
            site_id: siteId,
            site_name: siteName,
            custom_domain: deployRequest.customDomain,
            auto_deploy: deployRequest.autoDeploy || false,
            build_command: deployRequest.buildCommand || 'npm run build',
            publish_directory: deployRequest.publishDirectory || 'dist',
            environment_variables: deployRequest.environmentVariables || {}
          });

        response = {
          success: true,
          siteId: siteData.id,
          siteUrl: siteData.url,
          adminUrl: siteData.admin_url,
        };
      } else {
        console.log('[DEPLOY-TO-NETLIFY] Using existing site:', siteId);
      }

      // Déclencher un déploiement
      console.log('[DEPLOY-TO-NETLIFY] Triggering deployment');
      
      const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: 'main',
        }),
      });

      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        console.error('[DEPLOY-TO-NETLIFY] Failed to trigger deployment:', errorText);
        throw new Error(`Failed to trigger deployment: ${errorText}`);
      }

      const deployData = await deployResponse.json();
      
      console.log('[DEPLOY-TO-NETLIFY] Deployment triggered:', deployData.id);

      // Mettre à jour l'enregistrement de déploiement
      await supabase
        .from('netlify_deployments')
        .update({
          site_id: siteId,
          deploy_id: deployData.id,
          status: 'building',
          deploy_url: deployData.deploy_url,
          admin_url: deployData.admin_url,
          site_url: deployData.url,
          commit_ref: deployData.commit_ref,
        })
        .eq('id', deployment.id);

      response = {
        success: true,
        siteId: siteId,
        deployId: deployData.id,
        siteUrl: deployData.url,
        adminUrl: deployData.admin_url,
        deployUrl: deployData.deploy_url,
      };

      console.log('[DEPLOY-TO-NETLIFY] Deployment successful:', response);

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('[DEPLOY-TO-NETLIFY] Deployment error:', error);
      
      // Mettre à jour le statut d'erreur
      await supabase
        .from('netlify_deployments')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', deployment.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[DEPLOY-TO-NETLIFY] General error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});