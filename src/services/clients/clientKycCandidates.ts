import { supabase } from "@/integrations/supabase/client";
import { validateKycReport, KycExtraction } from "./clientKycService";

export interface BceCandidate {
  enterprise_number: string;
  vat_format: string;
  type: "ENT_PM" | "ENT_NP" | "OTHER";
  status: string | null;
  name: string;
  address: string | null;
  start_date_raw: string | null;
  source_query: string;
}

export interface SearchCandidatesResponse {
  success: boolean;
  message?: string;
  client?: { id: string; name: string; first_name: string | null; last_name: string | null; company: string | null };
  queries?: string[];
  candidates?: BceCandidate[];
}

export async function searchBceCandidates(
  clientId: string,
  searchWord?: string,
): Promise<SearchCandidatesResponse> {
  const { data, error } = await supabase.functions.invoke("search-bce-candidates", {
    body: { clientId, ...(searchWord ? { searchWord } : {}) },
  });
  if (error) throw new Error(error.message || "Recherche BCE échouée");
  return data as SearchCandidatesResponse;
}

/**
 * Quand l'admin a confirmé un candidat BCE pour un client : on pose le VAT,
 * on déclenche l'auto-lookup (qui fait le scrape complet kbopub), puis on
 * auto-valide en n'appliquant QUE les champs vides du client.
 */
export async function applyBceCandidate(
  clientId: string,
  candidate: BceCandidate,
): Promise<{ score?: string | null; appliedFields: Record<string, any> }> {
  // 1) Set VAT — si déjà rempli on n'écrase pas (sécurité)
  const { data: existing, error: existingErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();
  if (existingErr || !existing) {
    throw new Error("Client introuvable");
  }

  if (!existing.vat_number) {
    const { error: updErr } = await supabase
      .from("clients")
      .update({ vat_number: candidate.vat_format })
      .eq("id", clientId);
    if (updErr) throw new Error(`Set VAT: ${updErr.message}`);
  } else if (existing.vat_number !== candidate.vat_format) {
    throw new Error(
      `Le client a déjà un VAT (${existing.vat_number}) — supprime-le d'abord si tu veux le remplacer par ${candidate.vat_format}.`,
    );
  }

  // 2) Lance l'auto_lookup (scrape kbopub, crée un report, retourne extraction)
  const { data, error } = await supabase.functions.invoke("analyze-client-kyc", {
    body: { mode: "auto_lookup", clientId },
  });
  if (error) throw new Error(error.message || "Auto-lookup échoué");
  if (!data?.success) throw new Error(data?.message || "Auto-lookup échoué");

  const report = data.report;
  const extraction = report?.ai_extraction as KycExtraction | null;
  if (!extraction) {
    throw new Error("Extraction vide retournée par auto_lookup");
  }

  // 3) Build fieldsToApply : seulement les champs encore vides (no-overwrite)
  const fieldsToApply: Record<string, any> = {};
  const setIfEmpty = (clientKey: string, value: any) => {
    if (value !== null && value !== undefined && value !== "" && !existing[clientKey]) {
      fieldsToApply[clientKey] = value;
    }
  };
  setIfEmpty("entity_type", extraction.entity_type);
  setIfEmpty("legal_form", extraction.legal_form);
  setIfEmpty("company_creation_date", extraction.registration_date);
  setIfEmpty("business_sector", extraction.business_sector);
  setIfEmpty("address", extraction.address);
  setIfEmpty("postal_code", extraction.postal_code);
  setIfEmpty("city", extraction.city);
  setIfEmpty("company", extraction.company_name);

  // 4) Auto-validate (= passe le report en status="validated", recalcule le score)
  await validateKycReport({
    reportId: report.id,
    clientId,
    fieldsToApply,
  });

  // 5) Lire le score qui vient d'être calculé
  const { data: refreshed } = await supabase
    .from("clients")
    .select("kyc_score")
    .eq("id", clientId)
    .single();

  return {
    score: refreshed?.kyc_score ?? null,
    appliedFields: fieldsToApply,
  };
}

/**
 * Liste les clients de la company qui n'ont pas encore de KYC validé,
 * triés pour traitement Phase 2 :
 *  1. Sans VAT et sans KYC (cible principale)
 *  2. Avec VAT mais sans KYC (peuvent passer par bulk auto)
 */
export interface QueueClient {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  vat_number: string | null;
  country: string | null;
  status: string | null;
  created_at: string;
  has_vat: boolean;
}

export async function listKycQueue(filter: "no_vat" | "all" = "no_vat"): Promise<QueueClient[]> {
  let query = supabase
    .from("clients")
    .select(
      "id, name, first_name, last_name, company, email, vat_number, country, status, created_at",
    )
    .is("kyc_validated_at", null);

  if (filter === "no_vat") {
    query = query.or("vat_number.is.null,vat_number.eq.");
  }

  const { data, error } = await query
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data || []).map((c: any) => ({
    ...c,
    has_vat: !!(c.vat_number && c.vat_number.trim()),
  }));
}
