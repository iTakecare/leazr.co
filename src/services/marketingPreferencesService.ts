import { supabase } from "@/integrations/supabase/client";
import { fetchPartners } from "@/services/partnerService";

/**
 * Consentement pub par canal marketing.
 *
 * Structure : { [channelKey]: boolean }
 *   - channelKey = "own" (nos communications) ou l'UUID d'un partner
 *   - valeur `false` = refus explicite
 *   - clé absente OU `true` = consentement (opt-in par défaut → tout coché)
 *
 * On ne stocke donc que les refus : un objet vide = « tout coché ».
 */
export type MarketingPreferences = Record<string, boolean>;

/** Canal built-in représentant nos propres communications (iTakecare / la société). */
export const MARKETING_OWN_KEY = "own";

export interface MarketingChannel {
  key: string;
  label: string;
  /** true pour le canal « nos communications », false pour un partenaire. */
  isOwn: boolean;
}

/**
 * Un canal est considéré comme consenti sauf si une valeur `false` explicite existe.
 * (opt-in par défaut : tout est coché tant qu'on n'a rien décoché)
 */
export const isChannelConsented = (
  prefs: MarketingPreferences | null | undefined,
  key: string
): boolean => prefs?.[key] !== false;

/**
 * Liste les canaux marketing d'une société : « nos communications » + un canal
 * par partenaire actif. Sert à la fois aux fiches clients et aux pré-réglages
 * ambassadeur.
 */
export const fetchMarketingChannels = async (
  companyId: string
): Promise<MarketingChannel[]> => {
  const channels: MarketingChannel[] = [];

  // Libellé du canal « nos communications » = nom de la société (fallback générique)
  let ownLabel = "Nos communications";
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();
  if (company?.name) ownLabel = company.name;

  channels.push({ key: MARKETING_OWN_KEY, label: ownLabel, isOwn: true });

  const partners = await fetchPartners(companyId);
  for (const partner of partners) {
    if (partner.is_active === false) continue;
    channels.push({ key: partner.id, label: partner.name, isOwn: false });
  }

  return channels;
};
