import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AVAILABLE_FIELDS = {
  title: "Titre / Description du produit",
  serial_number: "Numéro de série",
  category: "Catégorie de produit",
  brand: "Marque / Fabricant",
  model: "Modèle / Référence",
  supplier_name: "Nom du fournisseur",
  quantity: "Quantité",
  unit_price: "Prix unitaire",
  purchase_price: "Prix total d'achat",
  status: "Statut (en stock, commandé, etc.)",
  condition: "État physique (neuf, bon, etc.)",
  location: "Emplacement / Lieu de stockage",
  purchase_date: "Date d'achat",
  reception_date: "Date de réception",
  warranty_end_date: "Date de fin de garantie",
  order_reference: "Référence de commande",
  notes: "Notes / Remarques",
  cpu: "Processeur / CPU",
  memory: "Mémoire RAM",
  storage: "Stockage (SSD/HDD)",
  color: "Couleur",
  grade: "Grade / Classement qualité",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { headers, sampleRows } = await req.json();

    if (!headers || !Array.isArray(headers)) {
      return new Response(
        JSON.stringify({ error: "headers array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context with sample data
    const columnsContext = headers.map((h: string, i: number) => {
      const samples = (sampleRows || [])
        .map((row: any[]) => row[i])
        .filter((v: any) => v !== null && v !== undefined && String(v).trim() !== "")
        .slice(0, 5)
        .map((v: any) => String(v).substring(0, 100));
      return `Column ${i}: header="${h}", samples=[${samples.map((s: string) => `"${s}"`).join(", ")}]`;
    }).join("\n");

    const fieldsDescription = Object.entries(AVAILABLE_FIELDS)
      .map(([key, desc]) => `"${key}": ${desc}`)
      .join("\n");

    const systemPrompt = `You are a data mapping assistant. You analyze Excel column headers and sample data to determine the best mapping to predefined fields for a stock/inventory management system.

Available target fields:
${fieldsDescription}

Rules:
- Return a JSON object with a "mappings" array, one entry per column IN ORDER
- Each entry must be: { "field": "<field_key>" } or { "field": null } if no match
- Each field can only be used ONCE
- Prioritize "title" mapping - the description/name of the product is the most important
- Use sample data to disambiguate when headers are unclear (e.g. "Tableau 1" or generic names)
- If a column contains product names/descriptions like "Lenovo V14", "Apple Watch", "HP ProBook", map it to "title"
- If a column contains dates, determine which date field it maps to based on context
- If a column contains numbers that look like prices, map to the appropriate price field
- If a column contains short codes like "S/N", "N/S", alphanumeric serial numbers, map to serial_number
- ONLY return valid JSON, nothing else`;

    const userPrompt = `Analyze these Excel columns and map them to the correct stock management fields:

${columnsContext}

Return ONLY a JSON object like: {"mappings": [{"field": "title"}, {"field": null}, {"field": "serial_number"}, ...]}
One entry per column, in the same order.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const mappings = parsed.mappings || [];

    // Validate: ensure each field is only used once and is valid
    const validFields = new Set(Object.keys(AVAILABLE_FIELDS));
    const usedFields = new Set<string>();
    const validatedMappings = headers.map((_: string, i: number) => {
      const mapping = mappings[i];
      const field = mapping?.field;
      if (field && validFields.has(field) && !usedFields.has(field)) {
        usedFields.add(field);
        return { field };
      }
      return { field: null };
    });

    console.log("AI mapping result:", JSON.stringify(validatedMappings));

    return new Response(
      JSON.stringify({ mappings: validatedMappings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-column-mapping error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
