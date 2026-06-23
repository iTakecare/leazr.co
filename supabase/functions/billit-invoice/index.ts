// billit-invoice — Crée les factures CLIENT/BAILLEUR dans Billit puis les envoie
// via le bon transport (Peppol pour les pros enregistrés / Grenke, Email sinon).
// Bâti sur le module validé _shared/billit.ts (auth PartyID correcte).
//
// Actions :
//   preview : résout destinataire + canal + lignes + total, AUCUNE écriture (récap UI)
//   create  : pousse la facture dans Billit en BROUILLON (rien n'est envoyé au client)
//   send    : envoie le brouillon via Transporttype = canal du destinataire (repli mail)
//
// Destinataire selon la nature de la facture :
//   - leasing (hors self-leasing) -> le BAILLEUR (Grenke) ; canal = Peppol
//   - purchase / self_leasing / manual -> le CLIENT ; canal = clients.invoice_delivery_method
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import {
  BillitCredentials,
  normalizeBillitBaseUrl,
  getBillitAccount,
  getBillitOrderDetail,
  billitPdfUrl,
} from "../_shared/billit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
// Échéance = date de facture (ISO) + N jours.
const addDaysToISO = (isoDate: string, days: number) => {
  const base = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).getTime();
  return new Date(base + days * 86400000).toISOString().slice(0, 10);
};

// Catégories dont le n° de série est OBLIGATOIRE sur la facture Grenke
// (ordinateur, ordinateur portable, smartphone, tablette).
function isSerialCategory(name: string): boolean {
  const x = (name || "").toLowerCase().trim();
  return ["laptop", "desktop", "smartphone", "tablette", "tablet"].includes(x) || /ordinateur|portable/.test(x);
}
// category_id étant quasi jamais rempli en base, on déduit aussi la catégorie
// "à n° de série" depuis le TITRE de l'équipement (mots-clés modèles).
function titleNeedsSerial(title: string): boolean {
  const x = (title || "").toLowerCase();
  if (/(macbook|probook|elitebook|thinkpad|ideapad|latitude|inspiron|zenbook|vivobook|notebook|laptop|portable|\bgram\b|spectre|\benvy\b|pavilion|aspire|swift|nitro|\byoga\b|legion|surface laptop|surface book)/.test(x)) return true;
  if (/(imac|mac mini|mac studio|mac pro|optiplex|thinkcentre|desktop|pc fixe|\btour\b|elitedesk|prodesk)/.test(x)) return true;
  if (/(iphone|galaxy s\d|galaxy a\d|galaxy z|galaxy note|\bpixel\b|smartphone|xperia|oneplus|redmi|\bnord\b)/.test(x)) return true;
  if (/(ipad|galaxy tab|tablette|\btablet\b|surface pro|surface go)/.test(x)) return true;
  return false;
}
function isPlaceholderSN(s: string): boolean {
  const x = (s || "").trim().toLowerCase();
  return !x || x === "tbd" || x === "na" || x === "n/a" || x === "-" || /^0+$/.test(x);
}
// serial_number = tableau JSON (un par unité). Renvoie q entrées, null si manquant/placeholder.
function parseSerials(raw: string | null, q: number): (string | null)[] {
  let arr: string[] = [];
  if (raw) {
    try {
      const p = JSON.parse(raw);
      arr = Array.isArray(p) ? p.map((x) => String(x)) : [String(raw)];
    } catch {
      arr = String(raw).split(/[,;]+/).map((s) => s.trim());
    }
  }
  const clean = arr.map((s) => (isPlaceholderSN(s) ? null : s.trim()));
  while (clean.length < q) clean.push(null);
  return clean.slice(0, q);
}

// Apparie nos lignes de contrat aux FinancingObjects RÉELS rapatriés de Grenke,
// par titre (= champ Details côté Grenke, qui porte le nom du bien). Renvoie le
// montant par ligne (NetPricePerObject × Quantity, arrondi) DANS L'ORDRE des
// équipements `eqs`, ou null si le rapatriement est absent / si une seule ligne
// ne trouve pas son bien (on ne mélange jamais Grenke + repli sur une même facture).
const normTitle = (s: string) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
function matchGrenkeAmounts(eqs: any[], objs: any): number[] | null {
  if (!Array.isArray(objs) || objs.length === 0) return null;
  const used = new Array(objs.length).fill(false);
  const amounts: number[] = [];
  for (const e of eqs) {
    const et = normTitle(e.title);
    if (!et) return null;
    let found = -1;
    for (let j = 0; j < objs.length; j++) {
      if (used[j]) continue;
      const dt = normTitle(String(objs[j]?.Details ?? objs[j]?.Name ?? ""));
      if (dt && (dt === et || dt.startsWith(et) || et.startsWith(dt))) { found = j; break; }
    }
    if (found === -1) return null; // ligne non appariée -> repli intégral
    used[found] = true;
    const o = objs[found];
    const net = Number(o?.NetPricePerObject) || 0;
    const q = Number(o?.Quantity) || Number(e.quantity) || 1;
    amounts.push(round2(net * q));
  }
  return amounts;
}

// En-tête Billit (PartyID, PAS ContextPartyID).
function headers(apiKey: string, partyId?: string | null): Record<string, string> {
  const h: Record<string, string> = { ApiKey: apiKey, "Content-Type": "application/json", Accept: "application/json" };
  if (partyId) h["PartyID"] = String(partyId).trim();
  return h;
}

async function loadCredentials(supabase: any, companyId: string): Promise<BillitCredentials> {
  const { data: integration, error } = await supabase
    .from("company_integrations")
    .select("api_credentials, is_enabled")
    .eq("company_id", companyId)
    .eq("integration_type", "billit")
    .single();
  if (error || !integration?.is_enabled) throw new Error("Intégration Billit non trouvée ou désactivée");
  const c = integration.api_credentials as BillitCredentials;
  return { apiKey: c.apiKey, baseUrl: normalizeBillitBaseUrl(c.baseUrl), companyId: c.companyId };
}

interface Recipient {
  kind: "leaser" | "client";
  name: string;
  vat: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  channel: "peppol" | "email";
  peppolId: string | null;
}

interface BuiltOrder {
  recipient: Recipient;
  lines: Array<{ Description: string; Quantity: number; UnitPriceExcl: number; VATPercentage: number }>;
  totalExcl: number;
  vatRate: number;
  warnings: string[];
  dossierRef: string | null; // « DOSSIER 180-xxxxx » -> Objet (OrderTitle) + Votre réf. (Reference) Billit
  grenkeAligned: boolean; // true = montants par bien = valeurs réelles rapatriées de Grenke
  paymentMethod: string | null; // mode de paiement Billit (paramétré sur le bailleur)
  dueDays: number | null; // délai de paiement en jours (paramétré sur le bailleur)
}

// Résout destinataire + canal + lignes pour une facture Leazr.
async function buildOrder(supabase: any, companyId: string, invoice: any): Promise<BuiltOrder> {
  const warnings: string[] = [];
  let grenkeAligned = false; // true = montants par bien alignés sur les valeurs réelles Grenke
  let paymentMethod: string | null = null; // mode de paiement Billit (paramétré sur le bailleur)
  let dueDays: number | null = null; // délai de paiement en jours (paramétré sur le bailleur)
  const bd = invoice.billing_data || {};
  const isSelf = bd.type === "self_leasing_monthly";
  const vatRate = typeof bd.tva_rate === "number" ? bd.tva_rate : 21;
  const amount = round2(invoice.amount || 0);

  // Contrat + offre liés (avec serial_number + category_id pour les n° de série Grenke)
  let contract: any = null;
  if (invoice.contract_id) {
    const { data } = await supabase
      .from("contracts")
      .select("id, client_id, leaser_id, leaser_name, contract_number, offer_id, contract_equipment(title, quantity, purchase_price, margin, monthly_payment, serial_number, category_id, not_serializable)")
      .eq("id", invoice.contract_id).maybeSingle();
    contract = data;
  }
  let offer: any = null;
  const offerId = invoice.offer_id || contract?.offer_id;
  if (offerId) {
    const { data } = await supabase.from("offers").select("id, client_id, client_name, is_purchase, leaser_request_number, grenke_financing_objects, grenke_financing_amount").eq("id", offerId).maybeSingle();
    offer = data;
  }

  const isLeaser = invoice.invoice_type === "leasing" && !isSelf;
  let recipient: Recipient;

  if (isLeaser) {
    // Bailleur (Grenke...) via leaser_id puis leaser_name
    let leaser: any = null;
    if (contract?.leaser_id) {
      const { data } = await supabase.from("leasers").select("*").eq("id", contract.leaser_id).maybeSingle();
      leaser = data;
    }
    if (!leaser && (contract?.leaser_name || invoice.leaser_name)) {
      const name = contract?.leaser_name || invoice.leaser_name;
      const { data } = await supabase.from("leasers").select("*").eq("company_id", companyId).ilike("name", `%${name}%`).limit(1);
      leaser = data?.[0] || null;
    }
    if (!leaser) throw new Error(`Bailleur introuvable pour la facture ${invoice.invoice_number || invoice.id}`);
    // Paramètres de facturation du bailleur (mode de paiement + délai d'échéance).
    paymentMethod = (leaser.invoice_payment_method || "").toString().trim() || null;
    dueDays = (typeof leaser.invoice_due_days === "number" && leaser.invoice_due_days >= 0) ? leaser.invoice_due_days : null;
    if (!paymentMethod || dueDays == null) {
      const manque = [!paymentMethod ? "mode de paiement" : null, dueDays == null ? "délai d'échéance" : null].filter(Boolean).join(" et ");
      warnings.push(`Bailleur « ${leaser.name} » : ${manque} non paramétré(s) — à compléter dans Paramètres → Leasers → ${leaser.name} (Paramètres de facturation).`);
    }
    recipient = {
      kind: "leaser",
      name: leaser.company_name || leaser.name,
      vat: leaser.vat_number || null,
      email: leaser.email || null,
      street: leaser.address || null,
      city: leaser.city || null,
      postalCode: leaser.postal_code || null,
      country: (leaser.country || "BE").slice(0, 2).toUpperCase(),
      channel: "peppol", // les bailleurs sont des pros sur Peppol
      peppolId: null,
    };
  } else {
    // Client final
    const clientId = contract?.client_id || offer?.client_id || bd.client_id;
    let client: any = null;
    if (clientId) {
      const { data } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
      client = data;
    }
    if (!client) throw new Error(`Client introuvable pour la facture ${invoice.invoice_number || invoice.id}`);
    const channel: "peppol" | "email" =
      client.invoice_delivery_method === "peppol" || client.invoice_delivery_method === "email"
        ? client.invoice_delivery_method
        : (client.vat_number ? "peppol" : "email");
    recipient = {
      kind: "client",
      name: client.company || client.name,
      vat: client.vat_number || null,
      email: client.email || null,
      street: client.billing_address || client.address || null,
      city: client.billing_city || client.city || null,
      postalCode: client.billing_postal_code || client.postal_code || null,
      country: (client.billing_country || client.country || "BE").slice(0, 2).toUpperCase(),
      channel,
      peppolId: client.peppol_identifier || null,
    };
  }

  // Pré-validation du canal
  if (recipient.channel === "peppol" && !recipient.vat && !recipient.peppolId) {
    warnings.push("Canal Peppol mais aucun n° TVA / identifiant Peppol — l'envoi Peppol échouera (repli mail prévu).");
  }
  if (recipient.channel === "email" && !recipient.email) {
    warnings.push("Canal mail mais aucune adresse email sur la fiche — à compléter avant l'envoi.");
  }
  if (!recipient.street || !recipient.city || !recipient.postalCode) {
    warnings.push("Adresse de facturation incomplète (rue/ville/CP) — Billit peut refuser.");
  }

  // Lignes selon la nature
  let lines: BuiltOrder["lines"] = [];
  if (isLeaser) {
    // Facture au bailleur (Grenke) = montant FINANCÉ par bien.
    // SOURCE DE VÉRITÉ #1 : les valeurs RÉELLES rapatriées de Grenke
    // (offer.grenke_financing_objects, montants éventuellement ajustés à la main par
    // le représentant Grenke) → concordance EXACTE demande↔Grenke↔facture.
    // REPLI (dossier pas encore rapatrié) : on répartit le montant financé au prorata
    // du LOYER de chaque bien (mensualité par ligne) — c'est la méthode de Grenke ;
    // repli ultime sur (prix+marge)×qté. Le total reste exact (dernier poste absorbe).
    // Le n° de série est ajouté pour ordi/portable/smartphone/tablette (obligatoire Grenke).
    const eqs: any[] = contract?.contract_equipment || [];
    if (eqs.length) {
      // catégories (id -> nom) pour savoir lesquelles exigent le n° de série
      const catIds = [...new Set(eqs.map((e) => e.category_id).filter(Boolean))];
      const catById = new Map<string, string>();
      if (catIds.length) {
        const { data: cats } = await supabase.from("categories").select("id, name").in("id", catIds);
        for (const c of cats || []) catById.set(c.id, c.name);
      }

      // Montants réels Grenke appariés à nos lignes (par titre = Details Grenke).
      // null si le rapatriement est absent OU si une ligne n'a pas pu être appariée
      // (dans ce cas on ne mélange pas les sources : repli intégral sur le prorata).
      const grenkeAmounts = matchGrenkeAmounts(eqs, (offer as any)?.grenke_financing_objects);
      grenkeAligned = !!grenkeAmounts;

      // Base de répartition du repli = loyer par bien (mensualité de la ligne).
      // Si aucune mensualité par ligne, on retombe sur (prix+marge)×qté.
      const monthlyBases = eqs.map((e) => Math.max(0, e.monthly_payment || 0));
      const bases = monthlyBases.some((x) => x > 0)
        ? monthlyBases
        : eqs.map((e) => Math.max(0, (e.purchase_price || 0) + (e.margin || 0)) * (e.quantity || 1));
      const sumBase = bases.reduce((s, x) => s + x, 0);
      let allocated = 0;
      lines = eqs.map((e, i) => {
        const q = e.quantity || 1;
        let lineTotal: number;
        if (grenkeAmounts) {
          lineTotal = grenkeAmounts[i];
        } else {
          const isLast = i === eqs.length - 1;
          lineTotal = sumBase > 0 ? round2(amount * (bases[i] / sumBase)) : round2(amount / eqs.length);
          if (isLast) lineTotal = round2(amount - allocated);
          else allocated = round2(allocated + lineTotal);
        }
        let desc = `${q > 1 ? q + "× " : ""}${e.title || "Équipement"}`;
        // Un équipement explicitement marqué « non sérialisé » (câble, écran, accessoire...)
        // n'exige jamais de n° de série, quelle que soit sa catégorie/titre.
        const needsSN = !e.not_serializable && (isSerialCategory(catById.get(e.category_id) || "") || titleNeedsSerial(e.title || ""));
        const serials = parseSerials(e.serial_number, q);
        const hasRealSerial = serials.some((s) => s);
        if (needsSN || hasRealSerial) {
          const shown = serials.map((s) => s || "(n° manquant)");
          desc += ` — N° série : ${shown.join(", ")}`;
          if (needsSN) {
            const missing = serials.filter((s) => !s).length;
            if (missing) warnings.push(`${e.title} : ${missing}/${q} n° de série manquant(s) — obligatoire pour Grenke.`);
          }
        }
        return { Description: desc, Quantity: 1, UnitPriceExcl: lineTotal, VATPercentage: vatRate };
      });
    }
  } else if (isSelf) {
    lines = [{ Description: `Loyer mensuel — contrat ${contract?.contract_number || ""}`.trim(), Quantity: 1, UnitPriceExcl: amount, VATPercentage: vatRate }];
  } else if (Array.isArray(bd.equipment) && bd.equipment.length) {
    lines = bd.equipment.map((e: any) => ({
      Description: e.title || e.description || "Équipement",
      Quantity: e.quantity || 1,
      UnitPriceExcl: round2(e.selling_price ?? e.unit_price ?? e.price ?? 0),
      VATPercentage: vatRate,
    }));
  } else if (Array.isArray(bd.lines) && bd.lines.length) {
    lines = bd.lines.map((l: any) => ({
      Description: l.description || "Prestation",
      Quantity: l.quantity || 1,
      UnitPriceExcl: round2(l.unit_price_excl ?? l.unit_price ?? 0),
      VATPercentage: typeof l.vat === "number" ? l.vat : vatRate,
    }));
  }

  // Réconciliation : le total des lignes DOIT correspondre au montant Leazr (HTVA).
  // Sinon -> ligne unique au montant de référence + avertissement (jamais silencieux).
  // EXCEPTION : si les lignes = valeurs RÉELLES Grenke, elles font foi (Grenke a pu
  // ajuster le montant financé) — on ne collapse jamais ; on signale seulement un
  // écart notable (>1 €) vs le montant financé Leazr (cache potentiellement périmé).
  const linesSum = round2(lines.reduce((s, l) => s + l.UnitPriceExcl * l.Quantity, 0));
  if (grenkeAligned) {
    if (amount > 0 && Math.abs(linesSum - amount) > 1) {
      warnings.push(`Total Grenke réel ${linesSum} € ≠ montant financé Leazr ${amount} € — la facture suit les valeurs Grenke.`);
    }
  } else if (!lines.length || (amount > 0 && Math.abs(linesSum - amount) > 1)) {
    if (lines.length) warnings.push(`Détail des lignes (${linesSum} €) ≠ montant facture (${amount} €) — remplacé par une ligne unique. À vérifier.`);
    lines = [{ Description: `Facture ${invoice.invoice_number || ""}`.trim() || "Facture", Quantity: 1, UnitPriceExcl: amount, VATPercentage: vatRate }];
  }

  // Numéro de dossier leaseur (ex. « DOSSIER 180-33054 ») pour les champs Objet / Votre réf. Billit.
  const leaserRequestNumber = (offer?.leaser_request_number || "").toString().trim();
  const dossierRef = leaserRequestNumber ? `DOSSIER ${leaserRequestNumber}` : null;

  return { recipient, lines, totalExcl: round2(lines.reduce((s, l) => s + l.UnitPriceExcl * l.Quantity, 0)), vatRate, warnings, dossierRef, grenkeAligned, paymentMethod, dueDays };
}

function toBillitPayload(invoice: any, built: BuiltOrder) {
  const r = built.recipient;
  const customer: any = {
    Name: r.name,
    VATNumber: r.vat || "",
    PartyType: "Customer",
    Addresses: [{
      AddressType: "InvoiceAddress",
      Name: r.name,
      Street: r.street || "",
      City: r.city || "",
      PostalCode: r.postalCode || "",
      CountryCode: r.country || "BE",
    }],
  };
  if (r.email) customer.Email = r.email;
  const orderDate = (invoice.invoice_date || todayISO()).slice(0, 10);
  // Échéance : date explicite de la facture sinon date de facture + délai du bailleur
  // (invoice_due_days) ; repli ultime = +30 jours.
  const expiryDate = invoice.due_date
    ? String(invoice.due_date).slice(0, 10)
    : (built.dueDays != null ? addDaysToISO(orderDate, built.dueDays) : addDaysISO(30));
  const payload: any = {
    OrderType: "Invoice",
    OrderDirection: "Income",
    OrderDate: orderDate,
    ExpiryDate: expiryDate,
    Customer: customer,
    OrderLines: built.lines,
  };
  if (invoice.invoice_number) payload.OrderNumber = invoice.invoice_number;
  // Mode de paiement Billit (paramétré sur le bailleur) : Wired, Domiciliation, etc.
  if (built.paymentMethod) payload.PaymentMethod = built.paymentMethod;
  // Objet (OrderTitle) + Votre référence / PO (Reference) = n° de dossier leaseur « DOSSIER 180-xxxxx ».
  if (built.dossierRef) {
    payload.OrderTitle = built.dossierRef;
    payload.Reference = built.dossierRef;
  }
  return payload;
}

const recap = (built: BuiltOrder, invoice: any) => ({
  invoice_id: invoice.id,
  invoice_number: invoice.invoice_number,
  recipient: {
    kind: built.recipient.kind,
    name: built.recipient.name,
    vat: built.recipient.vat,
    email: built.recipient.email,
    address: [built.recipient.street, built.recipient.postalCode, built.recipient.city, built.recipient.country].filter(Boolean).join(", "),
  },
  channel: built.recipient.channel,
  dossier_ref: built.dossierRef,
  grenke_aligned: built.grenkeAligned,
  payment_method: built.paymentMethod,
  due_days: built.dueDays,
  lines: built.lines.map((l) => ({ description: l.Description, quantity: l.Quantity, unit_excl: l.UnitPriceExcl, vat: l.VATPercentage })),
  total_excl: built.totalExcl,
  warnings: built.warnings,
});

// ---------- actions ----------
async function loadInvoice(supabase: any, companyId: string, invoiceId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, company_id, invoice_number, external_invoice_id, integration_type, invoice_type, status, amount, invoice_date, due_date, leaser_name, contract_id, offer_id, billing_data, pdf_url")
    .eq("id", invoiceId).eq("company_id", companyId).single();
  if (error || !data) throw new Error("Facture introuvable");
  return data;
}

async function actionPreview(supabase: any, companyId: string, invoiceId: string) {
  const invoice = await loadInvoice(supabase, companyId, invoiceId);
  const built = await buildOrder(supabase, companyId, invoice);
  return { preview: recap(built, invoice) };
}

async function actionCreate(supabase: any, companyId: string, invoiceId: string) {
  const cred = await loadCredentials(supabase, companyId);
  await getBillitAccount(cred.baseUrl, cred.apiKey); // valide l'auth
  const invoice = await loadInvoice(supabase, companyId, invoiceId);

  if (invoice.external_invoice_id && invoice.integration_type === "billit") {
    return { already: true, external_invoice_id: invoice.external_invoice_id, message: "Déjà présente dans Billit (brouillon)." };
  }

  const built = await buildOrder(supabase, companyId, invoice);
  const payload = toBillitPayload(invoice, built);

  const res = await fetch(`${cred.baseUrl}/v1/orders`, { method: "POST", headers: headers(cred.apiKey, cred.companyId), body: JSON.stringify(payload) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Création Billit échouée (${res.status}): ${text.slice(0, 300)}`);
  let created: any = {};
  try { created = JSON.parse(text); } catch { created = {}; }
  const orderId = typeof created === "number" ? created : (created.OrderID ?? created.id ?? created.Id ?? null);
  if (!orderId) throw new Error(`Billit n'a pas renvoyé d'identifiant de commande: ${text.slice(0, 200)}`);

  // Détail pour PDF + numéro définitif
  const detail = await getBillitOrderDetail(cred.baseUrl, cred.apiKey, cred.companyId, orderId);
  const pdf = detail ? billitPdfUrl(cred.baseUrl, detail) : null;

  const billing_data = {
    ...(invoice.billing_data || {}),
    billit_draft: { order_id: String(orderId), channel: built.recipient.channel, recipient_kind: built.recipient.kind, created_at: new Date().toISOString() },
    billit_sent_channel: null,
  };
  const { error: upErr } = await supabase.from("invoices").update({
    external_invoice_id: String(orderId),
    integration_type: "billit",
    invoice_number: detail?.OrderNumber || invoice.invoice_number,
    pdf_url: pdf || invoice.pdf_url,
    billing_data,
    updated_at: new Date().toISOString(),
  }).eq("id", invoice.id);
  if (upErr) throw upErr;

  return { created: true, external_invoice_id: String(orderId), pdf_url: pdf, recap: recap(built, invoice) };
}

async function sendVia(cred: BillitCredentials, orderId: string, transport: "Peppol" | "Email") {
  const res = await fetch(`${cred.baseUrl}/v1/orders/commands/send`, {
    method: "POST",
    headers: headers(cred.apiKey, cred.companyId),
    body: JSON.stringify({ Transporttype: transport, OrderIDs: [isNaN(Number(orderId)) ? orderId : Number(orderId)] }),
  });
  return { ok: res.ok, status: res.status, text: res.ok ? "" : (await res.text()).slice(0, 300) };
}

async function actionSend(supabase: any, companyId: string, invoiceId: string) {
  const cred = await loadCredentials(supabase, companyId);
  const invoice = await loadInvoice(supabase, companyId, invoiceId);
  if (!invoice.external_invoice_id) throw new Error("Facture pas encore créée dans Billit — fais d'abord « Pousser vers Billit ».");
  const built = await buildOrder(supabase, companyId, invoice);
  const orderId = invoice.external_invoice_id;

  let used: "peppol" | "email" = built.recipient.channel;
  let result = await sendVia(cred, orderId, used === "peppol" ? "Peppol" : "Email");

  // Repli mail automatique si Peppol échoue (destinataire pas sur le réseau)
  if (!result.ok && used === "peppol") {
    if (!built.recipient.email) throw new Error(`Envoi Peppol échoué (${result.status}: ${result.text}) et aucune adresse email pour le repli.`);
    used = "email";
    result = await sendVia(cred, orderId, "Email");
  }
  if (!result.ok) throw new Error(`Envoi Billit échoué (${result.status}): ${result.text}`);

  const billing_data = { ...(invoice.billing_data || {}), billit_sent_channel: used, billit_sent_at: new Date().toISOString() };
  await supabase.from("invoices").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    billing_data,
    updated_at: new Date().toISOString(),
  }).eq("id", invoice.id);

  return { sent: true, channel: used, fallback: built.recipient.channel === "peppol" && used === "email" };
}

// ---------- main ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Méthode non supportée" }, 405);

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: { endpoint: "billit-invoice", maxRequests: 30, windowSeconds: 60, identifierPrefix: "billit-invoice" },
    });
    if (!access.ok) return access.response;

    let payload: { companyId: string; action: string; invoiceId: string };
    try { payload = await req.json(); } catch { return jsonResponse({ success: false, error: "Invalid JSON body" }, 400); }

    const { companyId, action, invoiceId } = payload;
    if (!companyId || !action || !invoiceId) return jsonResponse({ success: false, error: "companyId, action et invoiceId requis" }, 400);
    if (!access.context.isServiceRole && access.context.role !== "super_admin" && access.context.companyId !== companyId) {
      return jsonResponse({ success: false, error: "Cross-company access forbidden" }, 403);
    }

    const supabase = access.context.supabaseAdmin;
    let result: unknown;
    if (action === "preview") result = await actionPreview(supabase, companyId, invoiceId);
    else if (action === "create") result = await actionCreate(supabase, companyId, invoiceId);
    else if (action === "send") result = await actionSend(supabase, companyId, invoiceId);
    else return jsonResponse({ success: false, error: `Action inconnue: ${action}` }, 400);

    return jsonResponse({ success: true, action, ...(result as Record<string, unknown>) });
  } catch (error) {
    console.error("❌ billit-invoice:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
