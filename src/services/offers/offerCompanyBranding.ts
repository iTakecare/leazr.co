import { supabase } from "@/integrations/supabase/client";

/** Coordonnées de l'entreprise émettrice pour l'offre commerciale (white-label). */
export interface OfferCompanyBranding {
  companyName: string;
  companyLogo: string | null;
  companyAddress: string;
  companyCity: string;
  companyPostalCode: string;
  companyEmail: string;
  companyPhone: string;
  companyVatNumber: string;
}

const EMPTY: OfferCompanyBranding = {
  companyName: "",
  companyLogo: null,
  companyAddress: "",
  companyCity: "",
  companyPostalCode: "",
  companyEmail: "",
  companyPhone: "",
  companyVatNumber: "",
};

/**
 * Récupère le branding d'une entreprise depuis `company_customizations`
 * (avec repli sur la table `companies` pour le nom/logo). Aucune valeur
 * codée en dur — chaque tenant affiche SES propres coordonnées.
 */
export const fetchOfferCompanyBranding = async (
  companyId: string | null | undefined,
): Promise<OfferCompanyBranding> => {
  if (!companyId) return EMPTY;

  const { data: c } = await supabase
    .from("company_customizations")
    .select(
      "company_name, logo_url, company_address, company_city, company_postal_code, company_email, company_phone, company_vat_number",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  // Repli nom/logo depuis companies si les customizations sont incomplètes.
  let fallbackName = "";
  let fallbackLogo: string | null = null;
  if (!c?.company_name || !c?.logo_url) {
    const { data: comp } = await supabase
      .from("companies")
      .select("name, logo_url")
      .eq("id", companyId)
      .maybeSingle();
    fallbackName = comp?.name ?? "";
    fallbackLogo = comp?.logo_url ?? null;
  }

  return {
    companyName: c?.company_name || fallbackName,
    companyLogo: c?.logo_url || fallbackLogo,
    companyAddress: c?.company_address || "",
    companyCity: c?.company_city || "",
    companyPostalCode: c?.company_postal_code || "",
    companyEmail: c?.company_email || "",
    companyPhone: c?.company_phone || "",
    companyVatNumber: c?.company_vat_number || "",
  };
};
