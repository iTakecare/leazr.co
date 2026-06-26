// Résolution de la langue de communication d'un client, partagée par toutes les
// fonctions d'envoi (emails commerciaux, relances, demande de documents…).
//
// Priorité : surcharge explicite (modale d'envoi) > clients.communication_language
// > 'fr' par défaut. Le client peut être identifié directement (clientId) ou via
// une offre (offerId).
//
// deno-lint-ignore-file no-explicit-any

export type Lang = "fr" | "nl" | "en" | "de";
export const LANGS: Lang[] = ["fr", "nl", "en", "de"];

export function normalizeLang(value: unknown): Lang | null {
  return LANGS.includes(value as Lang) ? (value as Lang) : null;
}

interface ResolveOpts {
  override?: unknown;        // langue choisie au moment de l'envoi (prioritaire)
  clientId?: string | null;
  offerId?: string | null;
}

export async function resolveClientLanguage(admin: any, opts: ResolveOpts): Promise<Lang> {
  const override = normalizeLang(opts.override);
  if (override) return override;

  let clientId = opts.clientId ?? null;
  if (!clientId && opts.offerId) {
    const { data } = await admin.from("offers").select("client_id").eq("id", opts.offerId).maybeSingle();
    clientId = data?.client_id ?? null;
  }

  if (clientId) {
    const { data } = await admin.from("clients").select("communication_language").eq("id", clientId).maybeSingle();
    const lang = normalizeLang(data?.communication_language);
    if (lang) return lang;
  }

  return "fr";
}
