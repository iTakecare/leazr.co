
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';

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
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ 
          error: "Missing Supabase configuration" 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request
    const { action, userId, configData } = await req.json();
    
    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let result;
    
    switch (action) {
      case "getConfig":
        // Get config from database
        const { data, error } = await supabase
          .from('woocommerce_config')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          // PGRST116 means no rows returned, which is not an error for us
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        result = { config: data || null };
        break;
        
      case "saveConfig":
        if (!configData) {
          return new Response(
            JSON.stringify({ error: "Missing configData" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if config exists
        const { data: existingConfig, error: checkError } = await supabase
          .from('woocommerce_config')
          .select('id')
          .eq('user_id', userId)
          .single();
          
        if (checkError && checkError.code !== 'PGRST116') {
          return new Response(
            JSON.stringify({ error: checkError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (existingConfig) {
          // Update existing config
          const { error: updateError } = await supabase
            .from('woocommerce_config')
            .update({ 
              site_url: configData.siteUrl,
              consumer_key: configData.consumerKey,
              consumer_secret: configData.consumerSecret,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
            
          if (updateError) {
            return new Response(
              JSON.stringify({ error: updateError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // Insert new config
          const { error: insertError } = await supabase
            .from('woocommerce_config')
            .insert([{
              user_id: userId,
              site_url: configData.siteUrl,
              consumer_key: configData.consumerKey,
              consumer_secret: configData.consumerSecret
            }]);
            
          if (insertError) {
            return new Response(
              JSON.stringify({ error: insertError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        result = { success: true };
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in woocommerce-config function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
