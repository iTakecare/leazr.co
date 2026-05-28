// Tulip insurance — maps a Leazr contract to a Tulip contract and subscribes.
//
// Manual opt-in: triggered from the contract detail page once equipment is
// delivered and serial-numbered. Talks to the `tulip-api` edge function, which
// proxies POST /contracts (subscribe) and DELETE /contracts/{id} (cancel).
//
// Tulip API v2 — https://docs.mytulip.io/docs/api-reference

import { supabase } from "@/integrations/supabase/client";
import { getContractEquipment, ContractEquipment } from "./contractService";

export type TulipEnvironment = "sandbox" | "production";

// Coverage chosen for Leazr (theft + break + assistance + no deductible).
const DEFAULT_COVERAGE = ["theft", "break", "assistance", "no_deductible"];

export interface TulipSubscriptionResult {
  success: boolean;
  tulipContractId?: string;
  error?: string;
  raw?: unknown;
}

// Tulip contract type from the lease duration (months).
// company/individual block is mandatory for LLD and for LMD > 5 months, which
// covers virtually all leasing — we always send one (see buildBody).
function contractTypeFromDuration(months?: number | null): "LCD" | "LMD" | "LLD" {
  if (!months || months > 5) return "LLD";
  if (months <= 1) return "LCD";
  return "LMD";
}

// Leazr is IT-focused → everything is product_type "high-tech". Pick the
// Tulip product_subtype from the equipment title; fall back to a generic one.
function highTechSubtype(title: string): string {
  const t = (title || "").toLowerCase();
  if (/(laptop|portable|ordinateur|macbook|desktop|imac|\bpc\b)/.test(t)) return "computer";
  if (/(iphone|smartphone|t[eé]l[eé]phone|\bphone\b|pixel|galaxy)/.test(t)) return "phone";
  if (/(ipad|tablette|\btablet\b|surface)/.test(t)) return "tablet";
  return "other-electronic-equipment";
}

function attrValue(eq: ContractEquipment, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const found = eq.attributes?.find((a) => a.key?.toLowerCase() === key.toLowerCase());
    if (found?.value) return found.value;
  }
  return undefined;
}

// ISO 8601 with time, as Tulip expects.
function toIso(date?: string | null, fallback?: Date): string {
  const d = date ? new Date(date) : (fallback ?? new Date());
  return d.toISOString();
}

// Tulip is a French insurer; default to FR but honour a country-prefixed VAT.
function countryFromVat(vat?: string | null): string {
  const prefix = vat?.trim().slice(0, 2).toUpperCase();
  return prefix && /^[A-Z]{2}$/.test(prefix) ? prefix : "FR";
}

// Tulip 400 responses carry { status:'error', message:'bad request', error:{ code, message } }.
function tulipErrorMessage(result: { data?: any }): string {
  const d = result?.data;
  if (d?.error?.message) return String(d.error.message);
  if (typeof d?.error === "string") return d.error;
  if (d?.message && d.message !== "bad request") return String(d.message);
  return "Souscription refusée par Tulip";
}

interface ContractRow {
  id: string;
  client_id?: string | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  contract_duration?: number | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  created_at: string;
  clients?: {
    name?: string | null;
    email?: string | null;
    company?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    vat_number?: string | null;
  } | null;
}

function buildTulipBody(
  contract: ContractRow,
  equipment: ContractEquipment[],
  environment: TulipEnvironment,
): Record<string, unknown> {
  const client = contract.clients;
  const country = countryFromVat(client?.vat_number);

  const contractType = contractTypeFromDuration(contract.contract_duration);

  const startDate = toIso(contract.contract_start_date ?? contract.created_at);
  let endIso = contract.contract_end_date ? toIso(contract.contract_end_date) : undefined;
  if (!endIso) {
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + (contract.contract_duration ?? 36));
    endIso = start.toISOString();
  }

  // Leazr est exclusivement B2B → toujours un contrat société.
  const options = [...DEFAULT_COVERAGE, "company"];

  const holder = {
    company: {
      company_name: client?.company ?? contract.client_name,
      address: client?.address ?? "",
      zipcode: client?.postal_code ?? "",
      city: client?.city ?? "",
      country,
      siren: client?.vat_number ?? undefined,
    },
  };

  const userName = client?.name ?? contract.client_name;

  // One Tulip product per unit (a line with quantity N → N insured items).
  const products = equipment.flatMap((eq) => {
    const qty = Math.max(1, eq.quantity ?? 1);
    const brand = attrValue(eq, "brand", "marque") ?? "N/A";
    const model = attrValue(eq, "model", "modèle", "modele") ?? eq.title;
    const subtype = highTechSubtype(eq.title);
    return Array.from({ length: qty }, (_, i) => ({
      product_type: "high-tech",
      product_subtype: subtype,
      value_excl: eq.purchase_price,
      brand,
      model,
      data: {
        user_name: userName,
        internal_id: qty > 1 ? `${eq.id}-${i + 1}` : eq.id,
        ...(eq.serial_number ? { product_marked: eq.serial_number } : {}),
      },
    }));
  });

  return {
    uid: contract.client_id ?? contract.id,
    start_date: startDate,
    end_date: endIso,
    contract_type: contractType,
    options,
    test: environment === "sandbox",
    ...holder,
    products,
  };
}

// Subscribe a Leazr contract's equipment to Tulip insurance.
export async function subscribeContractInsurance(
  contractId: string,
  environment: TulipEnvironment,
): Promise<TulipSubscriptionResult> {
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(
      "id, client_id, client_name, client_email, client_phone, contract_duration, contract_start_date, contract_end_date, created_at, clients(name, email, company, phone, address, city, postal_code, vat_number)",
    )
    .eq("id", contractId)
    .single();

  if (contractError || !contract) {
    return { success: false, error: "Contrat introuvable" };
  }

  const equipment = await getContractEquipment(contractId);
  if (equipment.length === 0) {
    return { success: false, error: "Aucun équipement à assurer sur ce contrat" };
  }

  const body = buildTulipBody(contract as ContractRow, equipment, environment);

  // LLD requires a serial number (product_marked) on every product.
  if (body.contract_type === "LLD") {
    const missingSerial = equipment.some((eq) => !eq.serial_number?.trim());
    if (missingSerial) {
      return {
        success: false,
        error:
          "Numéro de série manquant sur au moins un équipement. Tulip l'exige pour un contrat longue durée (LLD).",
      };
    }
  }

  const { data, error } = await supabase.functions.invoke("tulip-api", {
    body: { action: "subscribe", environment, payload: body },
  });

  if (error) {
    return { success: false, error: error.message, raw: error };
  }

  const result = data as { success: boolean; status?: number; data?: any };
  if (!result?.success) {
    return { success: false, error: tulipErrorMessage(result), raw: result };
  }

  const tulipContractId: string | undefined = result.data?.contract?.cid;

  await supabase
    .from("contracts")
    .update({
      tulip_contract_id: tulipContractId ?? null,
      tulip_status: result.data?.contract?.status ?? "open",
      tulip_environment: environment,
      tulip_subscribed_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  return { success: true, tulipContractId, raw: result };
}

// Cancel (résilier) a contract's Tulip insurance.
export async function cancelContractInsurance(
  contractId: string,
  reason: string,
): Promise<TulipSubscriptionResult> {
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("tulip_contract_id, tulip_environment")
    .eq("id", contractId)
    .single();

  if (error || !contract?.tulip_contract_id) {
    return { success: false, error: "Ce contrat n'a pas d'assurance Tulip active" };
  }

  const environment = (contract.tulip_environment as TulipEnvironment) ?? "production";

  const { data, error: invokeError } = await supabase.functions.invoke("tulip-api", {
    body: {
      action: "cancel_contract",
      environment,
      contract_id: contract.tulip_contract_id,
      payload: { reason },
    },
  });

  if (invokeError) {
    return { success: false, error: invokeError.message, raw: invokeError };
  }

  const result = data as { success: boolean; data?: any };
  if (!result?.success) {
    return { success: false, error: "Résiliation refusée par Tulip", raw: result };
  }

  await supabase
    .from("contracts")
    .update({ tulip_status: "terminated" })
    .eq("id", contractId);

  return { success: true, raw: result };
}
