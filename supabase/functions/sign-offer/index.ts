// Signature publique d'une offre.
//
// Pourquoi une edge function plutôt qu'un appel direct à la RPC : l'adresse IP
// et le navigateur du signataire ne doivent pas venir du navigateur lui-même,
// sinon n'importe qui peut les inventer et le certificat ne prouve plus rien.
// Ils sont lus ici dans les en-têtes de la requête, côté serveur.
//
// L'empreinte de ce qui a été signé est calculée à partir de la base, pas de ce
// que le client envoie : elle atteste du contenu réel de l'offre à l'instant de
// la signature. Si l'offre est modifiée ensuite, l'empreinte ne correspond plus.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Empreinte SHA-256 des éléments contractuels de l'offre. */
const computePayloadHash = async (
  offer: Record<string, unknown>,
  equipment: Record<string, unknown>[]
): Promise<string> => {
  // Ordre stable et champs explicites : ajouter un champ ici change toutes les
  // empreintes futures, ce qui est voulu — mais ne doit jamais être accidentel.
  const canonical = JSON.stringify({
    dossier: offer.dossier_number ?? null,
    client: offer.client_name ?? null,
    monthly_payment: Number(offer.monthly_payment ?? 0).toFixed(2),
    financed_amount: Number(offer.financed_amount ?? 0).toFixed(2),
    duration: offer.duration ?? null,
    file_fee: Number(offer.file_fee ?? 0).toFixed(2),
    annual_insurance: Number(offer.annual_insurance ?? 0).toFixed(2),
    equipment: equipment
      .map((e) => ({
        title: e.title,
        quantity: e.quantity,
        monthly_payment: Number(e.monthly_payment ?? 0).toFixed(2),
        selling_price: Number(e.selling_price ?? 0).toFixed(2),
      }))
      .sort((a, b) => String(a.title).localeCompare(String(b.title))),
  });

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const offerId = body?.offer_id as string | undefined;
    const signatureData = body?.signature_data as string | undefined;
    const signerName = body?.signer_name as string | undefined;

    if (!offerId || !signatureData || !signerName?.trim()) {
      return json({ error: "missing_fields" }, 400);
    }
    if (!signatureData.startsWith("data:image/")) {
      return json({ error: "invalid_signature" }, 400);
    }

    // Vue serveur du client : le premier maillon de x-forwarded-for est l'IP
    // d'origine, les suivants sont les proxies traversés.
    const forwarded = req.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: offer, error: offerError } = await sb
      .from("offers")
      .select(
        "id, dossier_number, client_name, monthly_payment, financed_amount, duration, file_fee, annual_insurance, workflow_status"
      )
      .eq("id", offerId)
      .maybeSingle();

    if (offerError || !offer) return json({ error: "offer_not_found" }, 404);
    if (offer.workflow_status === "approved") return json({ error: "already_signed" }, 409);

    const { data: equipment } = await sb
      .from("offer_equipment")
      .select("title, quantity, monthly_payment, selling_price")
      .eq("offer_id", offerId);

    const payloadHash = await computePayloadHash(offer, equipment ?? []);

    const { data, error } = await sb.rpc("sign_offer_public", {
      p_offer_id: offerId,
      p_signature_data: signatureData,
      p_signer_name: signerName.trim(),
      p_signer_ip: ip,
      p_signer_user_agent: userAgent,
      p_payload_hash: payloadHash,
    });

    if (error) {
      console.error("sign-offer RPC error:", error);
      return json({ error: error.message }, 400);
    }

    console.log(`sign-offer: offre ${offerId} signée par ${signerName} depuis ${ip ?? "IP inconnue"}`);
    return json({ success: data === true, ip, payload_hash: payloadHash });
  } catch (err) {
    console.error("sign-offer error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
