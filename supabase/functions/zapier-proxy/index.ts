import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ZapierProxyRequest {
  action: "test" | "trigger";
  webhook_url?: string; // For test action
  company_id?: string; // For trigger action
  event_type?: string; // For trigger action
  payload: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claims?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.user.id;

    // Parse request body
    const body: ZapierProxyRequest = await req.json();
    const { action, webhook_url, company_id, event_type, payload } = body;

    if (!action || !["test", "trigger"].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Action invalide (test ou trigger)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetUrl: string;
    let targetCompanyId: string;

    if (action === "test") {
      // For test action, webhook_url is provided directly
      if (!webhook_url) {
        return new Response(
          JSON.stringify({ success: false, error: "URL du webhook manquante" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate URL format
      try {
        const url = new URL(webhook_url);
        if (url.protocol !== "https:") {
          return new Response(
            JSON.stringify({ success: false, error: "L'URL doit être HTTPS" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!url.hostname.includes("zapier.com")) {
          console.warn("[Zapier Proxy] URL doesn't look like a Zapier webhook:", webhook_url);
        }
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: "URL invalide" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetUrl = webhook_url;

      // Get user's company for logging
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .single();

      targetCompanyId = profile?.company_id || "unknown";
    } else {
      // For trigger action, fetch webhook from database
      if (!company_id) {
        return new Response(
          JSON.stringify({ success: false, error: "company_id manquant" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!event_type) {
        return new Response(
          JSON.stringify({ success: false, error: "event_type manquant" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetCompanyId = company_id;

      // Use service role to fetch config (bypass RLS for server-side operations)
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

      const { data: zapierConfig, error: configError } = await adminSupabase
        .from("zapier_integrations")
        .select("webhook_url, enabled_events, is_active")
        .eq("company_id", company_id)
        .maybeSingle();

      if (configError) {
        console.error("[Zapier Proxy] Error fetching config:", configError);
        return new Response(
          JSON.stringify({ success: false, error: "Erreur de configuration" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!zapierConfig || !zapierConfig.is_active || !zapierConfig.webhook_url) {
        return new Response(
          JSON.stringify({ success: false, error: "Zapier non configuré ou inactif" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if event is enabled
      const enabledEvents = zapierConfig.enabled_events as string[];
      if (!enabledEvents.includes(event_type)) {
        return new Response(
          JSON.stringify({ success: false, error: `Événement '${event_type}' non activé` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetUrl = zapierConfig.webhook_url;
    }

    // Prepare the final payload
    const finalPayload = action === "test" 
      ? payload 
      : {
          event_type,
          timestamp: new Date().toISOString(),
          company_id: targetCompanyId,
          data: payload,
        };

    console.log(`[Zapier Proxy] Sending ${action} request to Zapier for company:`, targetCompanyId);

    // Make the actual request to Zapier
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let zapierResponse: Response;
    try {
      zapierResponse = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("[Zapier Proxy] Fetch error:", fetchError);
      
      const errorMessage = fetchError instanceof Error 
        ? (fetchError.name === "AbortError" 
            ? "Timeout: Zapier n'a pas répondu dans les 15 secondes" 
            : `Erreur réseau: ${fetchError.message}`)
        : "Impossible de contacter Zapier";

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = zapierResponse.status;
    let responseText = "";
    
    try {
      responseText = await zapierResponse.text();
    } catch {
      responseText = "";
    }

    console.log(`[Zapier Proxy] Zapier responded with status ${status}`);

    // Update last_triggered_at if we have a company_id
    if (targetCompanyId && targetCompanyId !== "unknown") {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      
      await adminSupabase
        .from("zapier_integrations")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("company_id", targetCompanyId);
    }

    if (status >= 200 && status < 300) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status,
          message: "Zapier a bien reçu la requête",
          response: responseText.substring(0, 200), // Limit response size
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status,
          error: `Zapier a répondu avec le code ${status}`,
          details: responseText.substring(0, 200),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[Zapier Proxy] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Erreur interne du serveur",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
