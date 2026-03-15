import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email_id } = await req.json();
    if (!email_id) throw new Error("email_id is required");

    // Get email
    const { data: email, error: emailError } = await supabase
      .from("synced_emails")
      .select("*")
      .eq("id", email_id)
      .single();

    if (emailError || !email) throw new Error("Email not found");

    // Get company clients for matching
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, email, company, contact_name")
      .eq("company_id", email.company_id)
      .limit(500);

    const clientsList = (clients || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company,
      contact_name: c.contact_name,
    }));

    const emailContent = `
De: ${email.from_name || ""} <${email.from_address}>
À: ${email.to_address || ""}
Sujet: ${email.subject || "(sans sujet)"}

${email.body_text?.substring(0, 4000) || "(aucun contenu)"}
`.trim();

    const systemPrompt = `Tu es un assistant qui analyse des emails professionnels pour un CRM de leasing IT.
Analyse l'email et utilise la fonction analyze_email pour retourner ton analyse structurée.
Tu as accès à la liste des clients existants pour identifier un match potentiel.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Voici l'email à analyser:\n\n${emailContent}\n\nVoici les clients existants:\n${JSON.stringify(clientsList)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_email",
              description: "Retourne l'analyse structurée de l'email",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Résumé concis de l'email en 1-2 phrases" },
                  sentiment: { type: "string", enum: ["positif", "neutre", "négatif"] },
                  request_type: { type: "string", enum: ["support", "commercial", "facturation", "information", "autre"] },
                  matched_client_id: { type: "string", description: "ID du client matchant ou null si aucun" },
                  matched_client_name: { type: "string", description: "Nom du client matchant ou null" },
                  match_reason: { type: "string", description: "Raison du match client (email, nom, etc.)" },
                  suggested_actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string", enum: ["create_ticket", "create_task", "link_client", "reply"] },
                        label: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["action", "label", "priority"],
                    },
                  },
                  key_topics: {
                    type: "array",
                    items: { type: "string" },
                    description: "Mots-clés ou thèmes principaux",
                  },
                },
                required: ["summary", "sentiment", "request_type", "suggested_actions", "key_topics"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_email" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("[analyze-email] AI error:", response.status, errText);
      throw new Error("Erreur lors de l'analyse IA");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("L'IA n'a pas retourné d'analyse structurée");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Store results
    const { error: updateError } = await supabase
      .from("synced_emails")
      .update({
        ai_analysis: analysis.summary,
        ai_suggestions: analysis,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq("id", email_id);

    if (updateError) {
      console.error("[analyze-email] Update error:", updateError);
      throw updateError;
    }

    console.log("[analyze-email] Analysis complete for email:", email_id);
    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[analyze-email] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
