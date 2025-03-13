
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the request URL
    const url = new URL(req.url);
    
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Parse request body
    const requestData = await req.json();
    const { action, userId, configData } = requestData;
    
    console.log(`Processing ${action} request`);
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let result;
    
    // Handle different actions
    switch (action) {
      case "getConfig":
        console.log(`Getting WooCommerce config for user: ${userId}`);
        try {
          const { data, error } = await supabaseClient
            .from('woocommerce_config')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (error) {
            throw error;
          }
          
          result = { 
            config: data || null
          };
        } catch (error) {
          console.error("Error getting WooCommerce config:", error);
          result = { 
            config: null,
            error: error.message || "Unknown error"
          };
        }
        break;
        
      case "saveConfig":
        if (!configData) {
          return new Response(
            JSON.stringify({ error: "Config data is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log(`Saving WooCommerce config for user: ${userId}`);
        try {
          // Check if config already exists
          const { data: existingConfig, error: checkError } = await supabaseClient
            .from('woocommerce_config')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (checkError) {
            throw checkError;
          }
          
          let saveResult;
          
          if (existingConfig) {
            // Update existing config
            saveResult = await supabaseClient
              .from('woocommerce_config')
              .update({
                site_url: configData.siteUrl,
                consumer_key: configData.consumerKey,
                consumer_secret: configData.consumerSecret,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingConfig.id);
          } else {
            // Insert new config
            saveResult = await supabaseClient
              .from('woocommerce_config')
              .insert({
                user_id: userId,
                site_url: configData.siteUrl,
                consumer_key: configData.consumerKey,
                consumer_secret: configData.consumerSecret
              });
          }
          
          if (saveResult.error) {
            throw saveResult.error;
          }
          
          result = { 
            success: true
          };
        } catch (error) {
          console.error("Error saving WooCommerce config:", error);
          result = { 
            success: false,
            error: error.message || "Unknown error"
          };
        }
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    
    // Return the result
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in WooCommerce config function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
