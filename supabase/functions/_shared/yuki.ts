// Helpers Yuki (comptabilité BE) — LECTURE SEULE.
// L'API Yuki (.asmx) accepte des appels HTTP GET simples avec query params,
// réponse XML. Pas besoin d'enveloppe SOAP.
//   Authenticate?accessKey=            -> sessionID (GUID)
//   Administrations?sessionID=         -> liste des administrations (ID, nom)
//   GLAccountBalance?sessionID=&administrationID=&transactionDate= -> soldes par compte
//   NetRevenue?sessionID=&administrationID=&StartDate=&EndDate=    -> CA net
// Plan comptable belge (PCMN) : classe 6 = charges, 7 = produits, 55 = banque,
// 40 = clients, 44 = fournisseurs.

const YUKI_BASE = "https://api.yukiworks.be/ws/Accounting.asmx";

export interface YukiCredentials {
  accessKey: string;
  administrationId: string;
}

export interface YukiGLBalanceRow {
  code: string;
  description: string;
  amount: number;
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();

async function yukiGet(path: string, params: Record<string, string>): Promise<string> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${YUKI_BASE}/${path}?${qs}`, { method: "GET" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Yuki ${path} ${res.status}: ${stripTags(text).slice(0, 200)}`);
  // Les erreurs Yuki arrivent parfois en 200 avec un message d'exception
  if (/exception|invalid|not authenticated/i.test(text) && !/Administration|GLAccount|string/i.test(text.slice(0, 200))) {
    throw new Error(`Yuki ${path}: ${stripTags(text).slice(0, 200)}`);
  }
  return text;
}

export async function yukiAuthenticate(accessKey: string): Promise<string> {
  const xml = await yukiGet("Authenticate", { accessKey });
  // <string xmlns="...">GUID</string>
  const m = xml.match(/<string[^>]*>([^<]+)<\/string>/i);
  const sessionId = m?.[1]?.trim();
  if (!sessionId || sessionId.length < 10) {
    throw new Error(`Authentification Yuki échouée: ${stripTags(xml).slice(0, 200)}`);
  }
  return sessionId;
}

export async function yukiAdministrations(sessionId: string): Promise<Array<{ id: string; name: string }>> {
  const xml = await yukiGet("Administrations", { sessionID: sessionId });
  const admins: Array<{ id: string; name: string }> = [];
  // <Administration ID="guid"><Name>..</Name>...</Administration>
  const re = /<Administration[^>]*\bID="([^"]+)"[^>]*>([\s\S]*?)<\/Administration>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const nameM = m[2].match(/<Name>([\s\S]*?)<\/Name>/i);
    admins.push({ id: m[1], name: nameM ? stripTags(nameM[1]) : m[1] });
  }
  return admins;
}

// Soldes par compte GL à une date (cumul à date / année fiscale en cours)
export async function yukiGLAccountBalance(
  sessionId: string,
  administrationId: string,
  dateISO: string, // YYYY-MM-DD
): Promise<YukiGLBalanceRow[]> {
  const xml = await yukiGet("GLAccountBalance", {
    sessionID: sessionId,
    administrationID: administrationId,
    transactionDate: dateISO,
  });
  const rows: YukiGLBalanceRow[] = [];
  // Tolérant aux variantes: <GLAccount Code=".." Description="..">-123.45</GLAccount>
  // ou éléments enfants <Code>/<Description>/<Amount|Balance>
  const re = /<GLAccount\b([^>]*)>([\s\S]*?)<\/GLAccount>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const inner = m[2];
    const attr = (name: string) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1];
    const child = (name: string) => inner.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"))?.[1];
    const code = attr("Code") || (child("Code") ? stripTags(child("Code")!) : "");
    const description = attr("Description") || (child("Description") ? stripTags(child("Description")!) : "");
    const amountStr =
      attr("Amount") || attr("Balance") ||
      (child("Amount") ? stripTags(child("Amount")!) : "") ||
      (child("Balance") ? stripTags(child("Balance")!) : "") ||
      stripTags(inner);
    const amount = parseFloat((amountStr || "0").replace(",", "."));
    if (code) rows.push({ code, description, amount: isNaN(amount) ? 0 : amount });
  }
  return rows;
}

export async function yukiNetRevenue(
  sessionId: string,
  administrationId: string,
  startISO: string,
  endISO: string,
): Promise<number> {
  const xml = await yukiGet("NetRevenue", {
    sessionID: sessionId,
    administrationID: administrationId,
    StartDate: startISO,
    EndDate: endISO,
  });
  const m = xml.match(/<(?:decimal|double|string)[^>]*>([^<]+)</i);
  const v = parseFloat((m?.[1] || "0").replace(",", "."));
  return isNaN(v) ? 0 : v;
}

// Synthèse PCMN à partir des soldes GL
export function summarizeBalance(rows: YukiGLBalanceRow[]) {
  const byClass = (prefix: string) =>
    rows.filter((r) => r.code.startsWith(prefix)).reduce((s, r) => s + r.amount, 0);
  const charges = byClass("6");
  const produits = byClass("7");
  return {
    charges_classe6: charges,
    produits_classe7: produits,
    // produits au crédit (négatif comptable) -> résultat = -(7) - (6)
    resultat: -(produits) - charges,
    tresorerie_55: byClass("55"),
    clients_40: byClass("40"),
    fournisseurs_44: byClass("44"),
    salaires_62: byClass("62"),
    amortissements_63: byClass("63"),
    services_biens_61: byClass("61"),
    achats_60: byClass("60"),
  };
}

// Lecture de la config Yuki stockée (company_integrations, type 'yuki')
export async function getYukiSession(supabase: any, companyId: string): Promise<
  { sessionId: string; administrationId: string } | null
> {
  const { data } = await supabase
    .from("company_integrations")
    .select("api_credentials, is_enabled")
    .eq("company_id", companyId)
    .eq("integration_type", "yuki")
    .maybeSingle();
  if (!data?.is_enabled) return null;
  const creds = data.api_credentials as YukiCredentials;
  if (!creds?.accessKey) return null;
  const sessionId = await yukiAuthenticate(creds.accessKey);
  return { sessionId, administrationId: creds.administrationId || "" };
}
