import { supabase, getFileUploadClient } from "@/integrations/supabase/client";

export type KycSource = "graydon" | "companyweb" | "pdf_other" | "auto_lookup";
export type KycStatus = "pending" | "analyzing" | "analyzed" | "failed" | "validated";

export interface KycExtractionConfidence {
  entity_type: number;
  legal_form: number;
  company_name: number;
  vat_number: number;
  registration_date: number;
  address: number;
  postal_code: number;
  city: number;
  country: number;
  business_sector: number;
  directors: number;
  financial_indicators: number;
}

export interface KycExtraction {
  entity_type: "societe" | "independant" | "asbl" | "autre" | null;
  legal_form: string | null;
  company_name: string | null;
  vat_number: string | null;
  registration_date: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  business_sector: string | null;
  directors: Array<{ name: string; role: string; since?: string | null }>;
  financial_indicators: {
    revenue: number | null;
    net_result: number | null;
    equity: number | null;
    employees: number | null;
    fiscal_year: number | null;
  };
  confidence: KycExtractionConfidence;
  warnings: string[];
}

export interface ClientKycReport {
  id: string;
  client_id: string;
  company_id: string;
  uploaded_by: string | null;
  source: KycSource;
  file_path: string | null;
  file_size: number | null;
  file_mime_type: string | null;
  status: KycStatus;
  ai_extraction: KycExtraction | null;
  applied_fields: Record<string, any> | null;
  error_message: string | null;
  analyzed_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
}

const KYC_BUCKET = "client-kyc-reports";

export async function listKycReports(clientId: string): Promise<ClientKycReport[]> {
  const { data, error } = await supabase
    .from("client_kyc_reports")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[clientKycService] listKycReports", error);
    throw error;
  }
  return (data || []) as ClientKycReport[];
}

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function uploadKycPdfAndAnalyze(params: {
  clientId: string;
  companyId: string;
  file: File;
  source: Exclude<KycSource, "auto_lookup">;
}): Promise<ClientKycReport> {
  const { clientId, companyId, file, source } = params;
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const fileId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const filePath = `${companyId}/${clientId}/${fileId}.${ext}`;

  // Force contentType from extension. file.type peut être vide ou faux selon les
  // navigateurs/OS (Safari + macOS mal configuré renvoie parfois "" pour les PDF),
  // ce qui fait tomber le SDK Supabase sur "application/json" par défaut → rejet
  // par allowed_mime_types du bucket.
  const contentType = EXT_TO_MIME[ext] || file.type || "application/octet-stream";

  // On uploade l'ArrayBuffer (PAS un Blob/File). Le SDK Supabase encapsule un
  // Blob/File dans du multipart/form-data ; le storage stockait ce corps multipart
  // VERBATIM (préambule "------WebKitFormBoundary…/cacheControl" avant le %PDF +
  // boundary de fin après %%EOF) → l'aperçu « Voir » affichait du texte brut. Avec
  // un ArrayBuffer, le SDK envoie les octets bruts + l'en-tête content-type, sans
  // wrapper.
  //
  // IMPORTANT : on passe par getFileUploadClient() et NON par le client `supabase`
  // par défaut. Ce dernier injecte un header global `Content-Type: application/json`
  // (cf. client.ts) qui, pour un upload binaire, entre en collision avec le
  // content-type posé par storage-js → header invalide → « Invalid Content-Type
  // header ». Le client dédié n'a pas ce header global. Même parade que
  // cleanFileUploadService.ts.
  const arrayBuffer = await file.arrayBuffer();
  const uploadClient = getFileUploadClient();

  const { error: uploadError } = await uploadClient.storage
    .from(KYC_BUCKET)
    .upload(filePath, arrayBuffer, { contentType, upsert: false });

  if (uploadError) {
    throw new Error(
      `Upload échoué: ${uploadError.message} (fichier: ${file.name}, type détecté: "${file.type || "vide"}", forcé: ${contentType})`,
    );
  }

  const { data, error } = await supabase.functions.invoke("analyze-client-kyc", {
    body: { mode: "pdf", clientId, filePath, source },
  });

  if (error) {
    // Cleanup orphan file
    await supabase.storage.from(KYC_BUCKET).remove([filePath]);
    throw new Error(error.message || "Analyse KYC échouée");
  }
  if (!data?.success) {
    throw new Error(data?.message || "Analyse KYC échouée");
  }
  return data.report as ClientKycReport;
}

export async function runAutoLookup(clientId: string): Promise<ClientKycReport> {
  const { data, error } = await supabase.functions.invoke("analyze-client-kyc", {
    body: { mode: "auto_lookup", clientId },
  });
  if (error) {
    throw new Error(error.message || "Lookup automatique échoué");
  }
  if (!data?.success) {
    throw new Error(data?.message || "Lookup automatique échoué");
  }
  return data.report as ClientKycReport;
}

export async function getKycReportFileUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(KYC_BUCKET)
    .createSignedUrl(filePath, 60 * 10);
  if (error) {
    console.warn("[clientKycService] signed URL error", error);
    return null;
  }
  return data?.signedUrl || null;
}

/**
 * Champs du client modifiables depuis une extraction KYC.
 * Les valeurs `extraction[*]` peuvent être null (= rien à proposer pour ce champ).
 */
export const KYC_FIELD_MAPPING: Array<{
  clientField: keyof Pick<
    Record<string, any>,
    | "entity_type"
    | "legal_form"
    | "company_creation_date"
    | "company"
    | "vat_number"
    | "address"
    | "postal_code"
    | "city"
    | "country"
    | "business_sector"
  >;
  label: string;
  extractionKey: keyof KycExtraction;
}> = [
  { clientField: "entity_type", label: "Type d'entité", extractionKey: "entity_type" },
  { clientField: "legal_form", label: "Forme juridique", extractionKey: "legal_form" },
  { clientField: "company_creation_date", label: "Date de création", extractionKey: "registration_date" },
  { clientField: "company", label: "Nom société", extractionKey: "company_name" },
  { clientField: "vat_number", label: "TVA", extractionKey: "vat_number" },
  { clientField: "address", label: "Adresse", extractionKey: "address" },
  { clientField: "postal_code", label: "Code postal", extractionKey: "postal_code" },
  { clientField: "city", label: "Ville", extractionKey: "city" },
  { clientField: "country", label: "Pays", extractionKey: "country" },
  { clientField: "business_sector", label: "Secteur d'activité", extractionKey: "business_sector" },
];

export interface KycValidationPayload {
  reportId: string;
  clientId: string;
  fieldsToApply: Record<string, any>;
}

export async function validateKycReport(payload: KycValidationPayload): Promise<void> {
  const { reportId, clientId, fieldsToApply } = payload;

  // Recharger le client après application des champs pour avoir l'état final
  // (entity_type, company_creation_date) sur lequel calculer le score.
  const updatePayload: Record<string, any> = { ...fieldsToApply, kyc_validated_at: new Date().toISOString() };

  if (Object.keys(fieldsToApply).length > 0) {
    const { error: clientError } = await supabase
      .from("clients")
      .update(updatePayload)
      .eq("id", clientId);
    if (clientError) {
      throw new Error(`MAJ client: ${clientError.message}`);
    }
  }

  // Recalcul du score KYC à partir des champs validés + dernière extraction du rapport.
  try {
    const { data: client } = await supabase
      .from("clients")
      .select("entity_type, company_creation_date")
      .eq("id", clientId)
      .maybeSingle();

    const { data: report } = await supabase
      .from("client_kyc_reports")
      .select("ai_extraction")
      .eq("id", reportId)
      .maybeSingle();

    const { computeClientKycScore } = await import("./clientKycScore");
    const score = computeClientKycScore({
      companyCreationDate: client?.company_creation_date ?? null,
      entityType: client?.entity_type ?? null,
      lastExtraction: (report?.ai_extraction as KycExtraction | null) ?? null,
    });

    if (score) {
      await supabase
        .from("clients")
        .update({
          kyc_score: score.letter,
          kyc_score_reasons: score.reasons,
          kyc_score_computed_at: new Date().toISOString(),
        })
        .eq("id", clientId);
    }
  } catch (err) {
    // Non bloquant : on ne fait pas planter la validation si le score plante.
    console.warn("[clientKycService] score recompute failed", err);
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { error: reportError } = await supabase
    .from("client_kyc_reports")
    .update({
      status: "validated",
      validated_at: new Date().toISOString(),
      validated_by: user?.id || null,
      applied_fields: fieldsToApply,
    })
    .eq("id", reportId);

  if (reportError) {
    throw new Error(`MAJ rapport: ${reportError.message}`);
  }
}
