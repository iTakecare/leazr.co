import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { requireElevatedAccess } from "../_shared/security.ts";

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

    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: {
        endpoint: "generate-auth-link",
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: "generate-auth-link",
      },
    });

    if (!access.ok) {
      return access.response;
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
    const supabase = access.context.supabaseAdmin || createClient(supabaseUrl, supabaseServiceKey);

    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId
    ) {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .ilike("email", email)
        .maybeSingle();

      if (type === "recovery" && !targetProfile) {
        return new Response(
          JSON.stringify({ error: "User not found for password recovery" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      if (targetProfile && targetProfile.company_id !== access.context.companyId) {
        return new Response(
          JSON.stringify({ error: "Cross-company auth link generation is forbidden" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
    }
    
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
