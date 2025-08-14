
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          },
        }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    
    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid authentication",
        }),
        {
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          },
        }
      );
    }

    // Check if user is SaaS admin
    const { data: isSaaSAdmin, error: adminError } = await supabase
      .rpc('is_saas_admin', {}, {
        headers: { Authorization: `Bearer ${jwt}` }
      });

    if (adminError || !isSaaSAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Insufficient privileges",
        }),
        {
          status: 403,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          },
        }
      );
    }

    const { key } = await req.json();
    
    if (!key) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé non spécifiée",
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          },
        }
      );
    }

    // Récupérer la valeur du secret (de façon sécurisée)
    const value = Deno.env.get(key);
    
    // Pour des raisons de sécurité, ne pas retourner le message d'erreur précis
    // si le secret n'existe pas
    return new Response(
      JSON.stringify({
        success: true,
        value: value || '',
      }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erreur lors de la récupération du secret: ${error.message}`,
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );
  }
});
