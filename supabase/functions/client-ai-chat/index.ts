import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const formatDate = (d: string | null) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("fr-FR");
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

    // Fetch client context with rich details
    let clientContext = "";
    if (clientId) {
      // Contracts with full details
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, status, monthly_payment, contract_start_date, contract_end_date, equipment_description, tracking_number, delivery_status, leaser_name, created_at")
        .eq("client_id", clientId)
        .limit(20);

      // Offers with equipment details
      const { data: offers } = await supabase
        .from("offers")
        .select("id, status, workflow_status, monthly_payment, equipment_description, amount, type, created_at, remarks, offer_equipment(title, quantity, monthly_payment, purchase_price)")
        .eq("client_id", clientId)
        .limit(20);

      // Invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date, invoice_date, paid_at, leaser_name, invoice_type")
        .eq("company_id", companyId)
        .limit(20);

      // Filter invoices linked to client's contracts
      const contractIds = contracts?.map((c: any) => c.id) || [];
      const clientInvoices = invoices?.filter((inv: any) => contractIds.includes(inv.contract_id)) || [];

      // Also fetch invoices directly by contract_id for accuracy
      let allClientInvoices = clientInvoices;
      if (contractIds.length > 0) {
        const { data: directInvoices } = await supabase
          .from("invoices")
          .select("id, invoice_number, amount, status, due_date, invoice_date, paid_at, leaser_name, invoice_type")
          .in("contract_id", contractIds)
          .limit(20);
        if (directInvoices) allClientInvoices = directInvoices;
      }

      if (contracts && contracts.length > 0) {
        clientContext += "\n\nContrats du client:";
        for (const c of contracts) {
          clientContext += `\n- Contrat #${c.id.slice(0, 8)} (${c.status || "inconnu"})`;
          if (c.equipment_description) clientContext += ` : ${c.equipment_description}`;
          clientContext += ` - ${c.monthly_payment}€/mois`;
          if (c.contract_start_date || c.contract_end_date) {
            clientContext += ` - du ${formatDate(c.contract_start_date)} au ${formatDate(c.contract_end_date)}`;
          }
          if (c.leaser_name) clientContext += ` (bailleur: ${c.leaser_name})`;
          if (c.tracking_number) clientContext += ` - Suivi: ${c.tracking_number}`;
          if (c.delivery_status) clientContext += ` - Livraison: ${c.delivery_status}`;
        }
      } else {
        clientContext += "\n\nContrats du client: Aucun contrat actif.";
      }

      if (offers && offers.length > 0) {
        clientContext += "\n\nDemandes/Offres du client:";
        for (const o of offers) {
          const statusLabel = o.workflow_status || o.status || "inconnu";
          clientContext += `\n- Demande #${o.id.slice(0, 8)} (${statusLabel}) créée le ${formatDate(o.created_at)}`;
          if (o.amount) clientContext += ` - Montant total: ${o.amount}€`;
          if (o.monthly_payment) clientContext += ` - Mensualité: ${o.monthly_payment}€/mois`;
          
          // Equipment details from offer_equipment join
          const equipment = (o as any).offer_equipment;
          if (equipment && equipment.length > 0) {
            for (const eq of equipment) {
              clientContext += `\n  · ${eq.quantity}x ${eq.title}`;
              if (eq.monthly_payment) clientContext += ` - ${eq.monthly_payment}€/mois`;
              if (eq.purchase_price) clientContext += ` (prix: ${eq.purchase_price}€)`;
            }
          } else if (o.equipment_description) {
            clientContext += `\n  Équipement: ${o.equipment_description}`;
          }
          if (o.remarks) clientContext += `\n  Remarques: ${o.remarks}`;
        }
      } else {
        clientContext += "\n\nDemandes/Offres du client: Aucune demande en cours.";
      }

      if (allClientInvoices && allClientInvoices.length > 0) {
        clientContext += "\n\nFactures du client:";
        for (const inv of allClientInvoices) {
          const num = inv.invoice_number || inv.id.slice(0, 8);
          clientContext += `\n- Facture #${num} - ${inv.amount}€ - ${inv.status}`;
          if (inv.due_date) clientContext += ` - Échéance: ${formatDate(inv.due_date)}`;
          if (inv.paid_at) clientContext += ` - Payée le ${formatDate(inv.paid_at)}`;
        }
      }
    }

    const systemPrompt = `Tu es l'assistant IA du portail client. Tu as accès aux données réelles du client ci-dessous. 

RÈGLES IMPORTANTES:
- Quand le client pose une question sur ses contrats, demandes, équipements ou factures, réponds avec les données EXACTES fournies ci-dessous (montants, dates, noms d'équipements, statuts).
- Ne donne JAMAIS de réponse générique ou inventée si tu as les données réelles.
- Si tu n'as pas l'information demandée dans les données ci-dessous, dis-le clairement et propose au client d'ouvrir un ticket de support pour obtenir de l'aide humaine.
- Réponds de manière concise, professionnelle et en français.
- Cite les montants exacts, les dates exactes et les noms d'équipements tels qu'ils apparaissent dans les données.${knowledgeContext}${clientContext}`;

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
