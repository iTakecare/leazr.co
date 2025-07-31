import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// Set up Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    
    // Parse request
    const { type, email, redirectTo } = await req.json();
    
    if (!type || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: type and email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    if (type !== "signup" && type !== "recovery") {
      return new Response(
        JSON.stringify({ error: "Type must be either 'signup' or 'recovery'" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Create Supabase client with admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate the auth link without sending an email
    const { data, error } = await supabase.auth.admin.generateLink({
      type,
      email,
      options: {
        redirectTo: redirectTo || `${new URL(req.url).origin}/auth/callback`,
      }
    });
    
    if (error) {
      console.error("Error generating auth link:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const link = data?.properties?.action_link;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Auth link generated successfully",
        link,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error handling request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});