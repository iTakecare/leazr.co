import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, clientId, companyId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch knowledge base articles
    let knowledgeContext = "";
    if (companyId) {
      const { data: articles } = await supabase
        .from("support_knowledge_base")
        .select("title, content, category")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .limit(20);

      if (articles && articles.length > 0) {
        knowledgeContext = "\n\nBase de connaissances disponible:\n" +
          articles.map((a: any) => `## ${a.title}\n${a.content}`).join("\n\n");
      }
    }

    // Fetch client context
    let clientContext = "";
    if (clientId) {
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, status, monthly_payment, contract_start_date, contract_end_date, equipment_description")
        .eq("client_id", clientId)
        .limit(10);

      const { data: offers } = await supabase
        .from("offers")
        .select("id, status, workflow_status, monthly_payment, equipment_description")
        .eq("client_id", clientId)
        .eq("converted_to_contract", false)
        .limit(10);

      if (contracts && contracts.length > 0) {
        clientContext += "\n\nContrats du client:\n" +
          contracts.map((c: any) => `- Contrat ${c.status}: ${c.monthly_payment}€/mois`).join("\n");
      }
      if (offers && offers.length > 0) {
        clientContext += "\n\nDemandes en cours:\n" +
          offers.map((o: any) => `- Demande ${o.status}: ${o.monthly_payment}€/mois`).join("\n");
      }
    }

    const systemPrompt = `Tu es un assistant IA pour une entreprise de leasing informatique. Tu aides les clients à comprendre leurs contrats, équipements et processus de financement. Réponds de manière concise, professionnelle et en français. Si tu ne peux pas répondre à une question car elle dépasse tes connaissances, indique au client qu'il peut ouvrir un ticket de support pour obtenir de l'aide humaine.${knowledgeContext}${clientContext}`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("client-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
