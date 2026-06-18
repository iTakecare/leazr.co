import { supabase } from "@/integrations/supabase/client";

interface RawExternalService {
  provider_name: string;
  product_name: string;
  product_id?: string | null;
  description?: string | null;
  tagline?: string | null;
  spec?: string | null;
  footnote?: string | null;
  price_htva: number | string;
  billing_period: string;
  quantity: number;
}

export interface EnrichedExternalService {
  providerName: string;
  providerLogoUrl?: string | null;
  productName: string;
  description?: string;
  tagline?: string;
  spec?: string;
  footnote?: string;
  priceHtva: number;
  billingPeriod: string;
  quantity: number;
}

/**
 * Fetch logo_url for each unique provider_name (scoped to companyId) and
 * convert it to base64 so it survives html2canvas rendering (avoids CORS).
 * Returns the external services in the shape CommercialOffer expects.
 */
export async function enrichExternalServicesWithLogos(
  rawServices: RawExternalService[] | null | undefined,
  companyId: string
): Promise<EnrichedExternalService[]> {
  if (!rawServices || rawServices.length === 0) return [];

  const uniqueProviderNames = Array.from(
    new Set(rawServices.map((s) => s.provider_name).filter(Boolean))
  );

  // Build a name → base64 logo map. Skip providers without a configured logo.
  const logoByName: Record<string, string | null> = {};
  if (uniqueProviderNames.length > 0) {
    const { data: providers } = await supabase
      .from("external_providers")
      .select("name, logo_url")
      .eq("company_id", companyId)
      .in("name", uniqueProviderNames);

    await Promise.all(
      (providers || []).map(async (p: any) => {
        if (!p.logo_url) {
          logoByName[p.name] = null;
          return;
        }
        try {
          const res = await fetch(p.logo_url);
          if (!res.ok) {
            logoByName[p.name] = null;
            return;
          }
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          logoByName[p.name] = base64;
        } catch (e) {
          console.warn(`[external-provider-logo] Failed to base64-encode logo for ${p.name}:`, e);
          logoByName[p.name] = null;
        }
      })
    );
  }

  // Backfill des champs marketing (tagline/spec/footnote) depuis le catalogue
  // courant : éditer un produit prestataire se reflète immédiatement sur le PDF
  // sans devoir retirer/ré-ajouter l'option sur l'offre. Le snapshot reste
  // prioritaire s'il porte déjà une valeur. Match par product_id puis par nom.
  const norm = (x?: string | null) => (x || "").trim().toLowerCase();
  const catById: Record<string, any> = {};
  const catByName: Record<string, any> = {};
  try {
    const { data: provs } = await supabase
      .from("external_providers")
      .select("id")
      .eq("company_id", companyId);
    const providerIds = (provs || []).map((p: any) => p.id);
    if (providerIds.length > 0) {
      const { data: prods } = await supabase
        .from("external_provider_products")
        .select("*")
        .in("provider_id", providerIds);
      (prods || []).forEach((p: any) => {
        catById[String(p.id)] = p;
        catByName[norm(p.name)] = p;
      });
    }
  } catch (e) {
    console.warn("[external-provider-backfill] catalogue indisponible:", e);
  }

  return rawServices.map((s) => {
    const cat =
      (s.product_id && catById[String(s.product_id)]) || catByName[norm(s.product_name)];
    return {
      providerName: s.provider_name,
      providerLogoUrl: logoByName[s.provider_name] || null,
      productName: s.product_name,
      description: s.description || cat?.description || undefined,
      tagline: s.tagline || cat?.tagline || undefined,
      spec: s.spec || cat?.spec || undefined,
      footnote: s.footnote || cat?.footnote || undefined,
      priceHtva: Number(s.price_htva || 0),
      billingPeriod: s.billing_period || "monthly",
      quantity: s.quantity || 1,
    };
  });
}
