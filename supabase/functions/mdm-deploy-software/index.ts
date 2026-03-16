import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const { action, company_id, equipment_id, equipment_name, software_ids } = body;

    // Test connection action
    if (action === "test_connection") {
      const mdmApiUrl = Deno.env.get("MDM_API_URL");
      const mdmApiToken = Deno.env.get("MDM_API_TOKEN");

      if (!mdmApiUrl || !mdmApiToken) {
        return new Response(
          JSON.stringify({ connected: false, error: "MDM_API_URL ou MDM_API_TOKEN non configuré" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const testResponse = await fetch(`${mdmApiUrl}/api/v1/fleet/config`, {
          headers: { Authorization: `Bearer ${mdmApiToken}` },
        });
        const connected = testResponse.ok;
        return new Response(
          JSON.stringify({ connected, status: testResponse.status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ connected: false, error: String(err) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Deploy software action
    if (!equipment_id || !software_ids?.length || !company_id) {
      return new Response(
        JSON.stringify({ error: "equipment_id, software_ids et company_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch software details
    const { data: softwareList, error: swError } = await supabase
      .from("software_catalog")
      .select("*")
      .in("id", software_ids)
      .eq("company_id", company_id);

    if (swError) throw swError;

    // Create deployment records
    const deployments = softwareList.map((sw: any) => ({
      company_id,
      equipment_id,
      software_id: sw.id,
      status: "pending",
      initiated_by: userId,
      initiated_at: new Date().toISOString(),
    }));

    const { data: deploymentRecords, error: depError } = await supabase
      .from("software_deployments")
      .insert(deployments)
      .select();

    if (depError) throw depError;

    // Try MDM deployment
    const mdmApiUrl = Deno.env.get("MDM_API_URL");
    const mdmApiToken = Deno.env.get("MDM_API_TOKEN");

    if (!mdmApiUrl || !mdmApiToken) {
      // Simulation mode - no MDM configured
      console.log("No MDM configured, running in simulation mode");
      return new Response(
        JSON.stringify({
          success: true,
          mode: "simulation",
          message: "Demandes enregistrées (aucun MDM configuré)",
          deployments: deploymentRecords,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Real MDM deployment (Fleet example)
    const results = [];
    for (const sw of softwareList) {
      const deployRecord = deploymentRecords.find((d: any) => d.software_id === sw.id);
      try {
        // Update status to installing
        await supabase
          .from("software_deployments")
          .update({ status: "installing" })
          .eq("id", deployRecord.id);

        // Call Fleet API to deploy
        const fleetResponse = await fetch(`${mdmApiUrl}/api/v1/fleet/scripts/run`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mdmApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            host_identifier: equipment_name,
            script_contents: sw.silent_install_command || `echo "Install ${sw.name}"`,
          }),
        });

        if (fleetResponse.ok) {
          await supabase
            .from("software_deployments")
            .update({ status: "success", completed_at: new Date().toISOString() })
            .eq("id", deployRecord.id);
          results.push({ software: sw.name, status: "success" });
        } else {
          const errText = await fleetResponse.text();
          await supabase
            .from("software_deployments")
            .update({ status: "failed", error_message: errText, completed_at: new Date().toISOString() })
            .eq("id", deployRecord.id);
          results.push({ software: sw.name, status: "failed", error: errText });
        }
      } catch (err) {
        await supabase
          .from("software_deployments")
          .update({ status: "failed", error_message: String(err), completed_at: new Date().toISOString() })
          .eq("id", deployRecord.id);
        results.push({ software: sw.name, status: "failed", error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, mode: "mdm", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in mdm-deploy-software:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
