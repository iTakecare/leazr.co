// Helpers partagés Billit (factures de vente / notes de crédit).
//
// 3 pièges API Billit (validés en réel 11/06/2026), tous gérés ici :
//  1. La clé API est au niveau utilisateur, rattachée à la société par défaut du
//     compte. Pour cibler une AUTRE société, il faut l'en-tête **PartyID** (PAS
//     ContextPartyID, qui renvoie 401 ApiKeyNotValid).
//  2. Billit IGNORE les query params OrderDirection/OrderType : /v1/orders renvoie
//     TOUTES les commandes (ventes + achats + devis...). -> on filtre côté serveur ici.
//  3. La pagination OData $top est plafonnée à 120. -> on pagine par 100.

export interface BillitCredentials {
  apiKey: string;
  baseUrl: string;
  companyId: string; // = PartyID de la société Billit
}

export interface BillitOrder {
  OrderID: number;
  OrderNumber: string;
  OrderDate: string;
  TotalExcl: number;
  TotalIncl: number;
  VATAmount: number;
  Paid: boolean;
  IsSent: boolean;
  OrderDirection: string; // "Income" | "Cost"
  OrderType: string; // "Invoice" | "CreditNote" | "Offer" | "DeliveryNote"
  AboutInvoiceNumber?: string;
  CounterParty?: {
    DisplayName?: string;
    VATNumber?: string;
    Email?: string;
  };
  OrderPDF?: { FileID: string };
}

// Normalise l'URL de base : corrige my.billit.be -> api.billit.be, retire le
// trailing slash ET un éventuel /v1 final (les appelants ajoutent /v1 eux-mêmes).
export function normalizeBillitBaseUrl(baseUrl: string): string {
  let u = (baseUrl || "https://api.billit.be").trim();
  u = u.replace("my.billit.be", "api.billit.be");
  u = u.replace("my.sandbox.billit.be", "api.sandbox.billit.be");
  u = u.replace(/\/+$/, "");
  u = u.replace(/\/v1$/i, "");
  return u;
}

function billitHeaders(apiKey: string, partyId?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    ApiKey: apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  // L'en-tête correct est PartyID (et NON ContextPartyID).
  if (partyId) h["PartyID"] = String(partyId).trim();
  return h;
}

// Authentifie et renvoie les infos compte (liste des sociétés + PartyIDs).
export async function getBillitAccount(apiBaseUrl: string, apiKey: string): Promise<any> {
  const res = await fetch(`${apiBaseUrl}/v1/account/accountInformation`, {
    method: "GET",
    headers: billitHeaders(apiKey),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Authentification Billit échouée (${res.status}): ${t.slice(0, 200)}`);
  }
  return await res.json();
}

// Récupère TOUTES les commandes (toutes pages, tous types) pour la bonne société.
// Essaie le PartyID configuré puis, en cas d'échec, ceux découverts via le compte.
export async function fetchAllBillitOrders(
  apiBaseUrl: string,
  apiKey: string,
  configuredPartyId: string | null | undefined,
  account: any,
): Promise<{ orders: BillitOrder[]; usedPartyId: string | null }> {
  const candidates: (string | null)[] = [];
  const configured = configuredPartyId ? String(configuredPartyId).trim() : "";
  if (configured) candidates.push(configured);
  for (const c of account?.Companies || []) {
    const id = c?.PartyID || c?.ID;
    if (id && !candidates.includes(String(id))) candidates.push(String(id));
  }
  candidates.push(null); // dernier recours : société par défaut de la clé

  const top = 100; // Billit plafonne $top à 120
  let lastErr = "";

  for (const party of candidates) {
    const all: BillitOrder[] = [];
    let skip = 0;
    let ok = true;
    for (let page = 0; page < 1000; page++) {
      const url = `${apiBaseUrl}/v1/orders?$top=${top}&$skip=${skip}`;
      const res = await fetch(url, { method: "GET", headers: billitHeaders(apiKey, party) });
      if (!res.ok) {
        lastErr = `${res.status} ${(await res.text()).slice(0, 200)}`;
        ok = false;
        break;
      }
      const body = await res.json();
      const items: BillitOrder[] = Array.isArray(body) ? body : body?.Items || [];
      all.push(...items);
      const total = body?.TotalRecordCount ?? body?.Count ?? null;
      if (items.length < top) break;
      skip += top;
      if (total != null && skip >= total) break;
    }
    if (ok) return { orders: all, usedPartyId: party };
  }

  throw new Error(`Impossible de récupérer les commandes Billit: ${lastErr || "raison inconnue"}`);
}

// Filtres métier (Billit ignore les filtres serveur -> on filtre sur les objets).
export const isSaleInvoice = (o: BillitOrder): boolean =>
  o?.OrderDirection === "Income" && o?.OrderType === "Invoice";

export const isSaleCreditNote = (o: BillitOrder): boolean =>
  o?.OrderDirection === "Income" && o?.OrderType === "CreditNote";

// Achats (fournisseurs, arrivés via Peppol) : OrderDirection === "Cost" (PAS "Expense")
export const isCostInvoice = (o: BillitOrder): boolean =>
  o?.OrderDirection === "Cost" && o?.OrderType === "Invoice";

export const isCostCreditNote = (o: BillitOrder): boolean =>
  o?.OrderDirection === "Cost" && o?.OrderType === "CreditNote";

export function billitOrderDateInRange(
  orderDate: string | undefined,
  fromDate?: string | null,
  toDate?: string | null,
): boolean {
  if (!orderDate) return false;
  const d = String(orderDate).slice(0, 10); // YYYY-MM-DD
  if (fromDate && d < fromDate) return false;
  if (toDate && d > toDate) return false;
  return true;
}

export function billitPdfUrl(apiBaseUrl: string, order: BillitOrder): string | null {
  return order?.OrderPDF?.FileID ? `${apiBaseUrl}/v1/files/${order.OrderPDF.FileID}` : null;
}

// Détail complet d'une commande (inclut Reference + OrderLines, absents de la liste).
export async function getBillitOrderDetail(
  apiBaseUrl: string,
  apiKey: string,
  partyId: string | null,
  orderId: number | string,
): Promise<any | null> {
  try {
    const res = await fetch(`${apiBaseUrl}/v1/orders/${orderId}`, {
      method: "GET",
      headers: billitHeaders(apiKey, partyId),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
