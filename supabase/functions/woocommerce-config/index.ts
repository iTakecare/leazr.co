
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Create a Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { action, userId, configData } = await req.json();
    
    switch (action) {
      case "getConfig":
        // Get WooCommerce configuration for a user
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const { data: configData, error: getError } = await supabase
          .from("woocommerce_configs")
          .select("*")
          .eq("user_id", userId)
          .single();
        
        if (getError && getError.code !== "PGRST116") { // PGRST116 is "no rows returned" which is fine
          console.error("Error fetching WooCommerce config:", getError);
          return new Response(
            JSON.stringify({ error: getError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ config: configData || null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        
      case "saveConfig":
        // Save WooCommerce configuration for a user
        if (!userId || !configData) {
          return new Response(
            JSON.stringify({ error: "User ID and configuration data are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Check if a configuration already exists for this user
        const { data: existingConfig, error: checkError } = await supabase
          .from("woocommerce_configs")
          .select("id")
          .eq("user_id", userId)
          .single();
        
        let result;
        
        if (existingConfig) {
          // Update existing configuration
          const { data, error: updateError } = await supabase
            .from("woocommerce_configs")
            .update({
              site_url: configData.siteUrl,
              consumer_key: configData.consumerKey,
              consumer_secret: configData.consumerSecret,
              updated_at: new Date()
            })
            .eq("user_id", userId)
            .select()
            .single();
            
          if (updateError) {
            console.error("Error updating WooCommerce config:", updateError);
            return new Response(
              JSON.stringify({ error: updateError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          result = data;
        } else {
          // Insert new configuration
          const { data, error: insertError } = await supabase
            .from("woocommerce_configs")
            .insert({
              user_id: userId,
              site_url: configData.siteUrl,
              consumer_key: configData.consumerKey,
              consumer_secret: configData.consumerSecret
            })
            .select()
            .single();
            
          if (insertError) {
            console.error("Error inserting WooCommerce config:", insertError);
            return new Response(
              JSON.stringify({ error: insertError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          result = data;
        }
        
        return new Response(
          JSON.stringify({ success: true, config: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    
  } catch (error) {
    console.error("Error in WooCommerce config function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
