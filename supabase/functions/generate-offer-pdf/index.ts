import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { PDFDocument, StandardFonts, PageSizes, rgb } from "https://esm.sh/pdf-lib@1.17.1";

/**
 * Génération serveur du PDF d'offre commerciale.
 *
 * Le moteur historique (`commercialOfferPdfService.tsx`) rend un composant React
 * puis le photographie avec html2canvas : il ne peut tourner que dans un
 * navigateur. Impossible donc de produire un PDF depuis l'application native,
 * depuis un cron ou depuis une autre edge function.
 *
 * Celle-ci compose le document directement avec pdf-lib, à partir des mêmes
 * données et des mêmes blocs de contenu configurables (`pdf_content_blocks`).
 * Le rendu est vectoriel — donc plus léger et cherchable — au prix d'une mise en
 * page reconstruite plutôt que photographiée.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Formatage ────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) => {
  const num = new Intl.NumberFormat("fr-BE", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  // Les espaces insécables des séparateurs de milliers ne sont pas encodables
  // en WinAnsi : on les remplace par un point, comme le PDF de contrat.
  return `${num.replace(/[\s\u00A0\u202F]/g, ".")} EUR`;
};

const formatDate = (value?: string | null) => {
  if (!value) return new Date().toLocaleDateString("fr-FR");
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/** pdf-lib n'encode que le WinAnsi avec les polices standard. */
const sanitize = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[\u2010\u2011\u2012\u2013]/g, "-")
    .replace(/[\u2014\u2015]/g, "--")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033\u00AB\u00BB]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u202F\u2009]/g, " ")
    .replace(/[\u200B\uFEFF]/g, "")
    .replace(/\u2022/g, "-")
    .replace(/\u0152/g, "OE")
    .replace(/\u0153/g, "oe")
    .replace(/\u20AC/g, "EUR");
};

const stripHtml = (html: string): string => {
  if (!html) return "";
  return sanitize(
    html
      .replace(/<h[1-6][^>]*>/gi, "")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<\/p>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim(),
  );
};

const wrapText = (text: string, font: any, size: number, maxWidth: number): string[] => {
  const lines: string[] = [];
  for (const paragraph of sanitize(text).split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
};

// ─── Données ──────────────────────────────────────────────────────────────────

interface EquipmentLine {
  title: string;
  quantity: number;
  monthlyPayment: number;
  sellingPrice: number;
  attributes: Record<string, string>;
  specifications: Record<string, string>;
}

const toRecord = (rows: Array<{ key: string; value: string }> | null | undefined) => {
  const out: Record<string, string> = {};
  (rows || []).forEach((r) => {
    if (r?.key) out[r.key] = r.value;
  });
  return out;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { offerId } = await req.json();
    if (!offerId) {
      return new Response(JSON.stringify({ error: "offerId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Le service role est nécessaire : la fonction sert aussi les envois
    // automatiques, qui n'ont pas de session utilisateur.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(`
        *,
        clients (
          contact_name, email, phone, company, vat_number,
          address, city, postal_code, country,
          billing_address, billing_city, billing_postal_code, billing_country
        ),
        companies ( id, name, logo_url )
      `)
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return new Response(JSON.stringify({ error: "Offre introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = offer.company_id;

    const [
      { data: equipmentRows },
      { data: branding },
      { data: contentRows },
      { data: externalServices },
    ] = await Promise.all([
      supabase
        .from("offer_equipment")
        .select(`
          id, title, quantity, monthly_payment, selling_price, purchase_price, margin,
          attributes:offer_equipment_attributes(key, value),
          specifications:offer_equipment_specifications(key, value)
        `)
        .eq("offer_id", offerId)
        .order("created_at", { ascending: true }),
      supabase
        .from("company_customizations")
        .select(
          "company_name, logo_url, company_address, company_city, company_postal_code, company_email, company_phone, company_vat_number",
        )
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("pdf_content_blocks")
        .select("page_name, block_key, content")
        .eq("company_id", companyId),
      supabase
        .from("offer_external_services")
        .select("provider_name, product_name, description, price_htva, billing_period, quantity")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: true }),
    ]);

    // Blocs de contenu configurables, indexés page → clé.
    const blocks: Record<string, Record<string, string>> = {};
    (contentRows || []).forEach((b: any) => {
      blocks[b.page_name] ??= {};
      blocks[b.page_name][b.block_key] = b.content;
    });
    const block = (page: string, key: string, fallback = "") =>
      blocks[page]?.[key] || fallback;

    const equipment: EquipmentLine[] = (equipmentRows || []).map((e: any) => ({
      title: e.title || "Equipement",
      quantity: Number(e.quantity) || 1,
      monthlyPayment: Number(e.monthly_payment) || 0,
      sellingPrice: Number(e.selling_price) || 0,
      attributes: toRecord(e.attributes),
      specifications: toRecord(e.specifications),
    }));

    const isPurchase = offer.is_purchase === true;

    // `monthly_payment` est déjà le total de la ligne, pas un prix unitaire :
    // c'est la convention de la base, à ne pas multiplier par la quantité.
    const totalMonthly =
      equipment.reduce((s, e) => s + e.monthlyPayment, 0) ||
      Number(offer.monthly_payment) || 0;
    const totalSellingPrice =
      isPurchase && offer.financed_amount
        ? Number(offer.financed_amount)
        : equipment.reduce((s, e) => s + e.sellingPrice * e.quantity, 0);

    // Acompte et mensualité ajustée : formule canonique de la page offre.
    const coefficient = Number(offer.coefficient) || 0;
    const downPayment = Number(offer.down_payment) || 0;
    const baseFinanced =
      totalSellingPrice > 0
        ? totalSellingPrice
        : coefficient > 0 && totalMonthly > 0
          ? (totalMonthly * 100) / coefficient
          : Number(offer.financed_amount) || Number(offer.amount) || 0;
    const financedAfterDown = Math.max(0, baseFinanced - downPayment);
    const adjustedMonthly =
      downPayment > 0 && coefficient > 0
        ? Math.round(((financedAfterDown * coefficient) / 100) * 100) / 100
        : totalMonthly;

    const client = (offer.clients as any) || {};
    const clientAddress =
      [client.billing_address, client.billing_postal_code, client.billing_city, client.billing_country]
        .filter(Boolean)
        .join(", ") ||
      [client.address, client.postal_code, client.city, client.country].filter(Boolean).join(", ");

    const companyName = branding?.company_name || offer.companies?.name || "";
    const companyAddress = [
      branding?.company_address,
      [branding?.company_postal_code, branding?.company_city].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");

    const offerNumber = offer.dossier_number || `OFF-${String(offer.id).slice(0, 8)}`;
    const duration = Number(offer.duration) || 36;

    // ─── Document ─────────────────────────────────────────────────────────────

    const doc = await PDFDocument.create();
    doc.setTitle(`Offre ${offerNumber}`);
    doc.setAuthor(companyName);
    doc.setSubject(`Offre commerciale pour ${offer.client_name || "client"}`);

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const W = PageSizes.A4[0];
    const H = PageSizes.A4[1];
    const MARGIN = 46;
    const CONTENT = W - 2 * MARGIN;

    const brandColor = rgb(0.16, 0.24, 0.72);
    const gray = rgb(0.45, 0.47, 0.53);
    const light = rgb(0.93, 0.94, 0.97);
    const dark = rgb(0.11, 0.12, 0.16);

    // Logo de l'entreprise, si téléchargeable. Un logo manquant ne doit jamais
    // faire échouer la génération.
    let logoImage: any = null;
    const logoUrl = branding?.logo_url || offer.companies?.logo_url;
    if (logoUrl) {
      try {
        const res = await fetch(logoUrl);
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer());
          const type = res.headers.get("content-type") || "";
          logoImage = type.includes("jpeg") || type.includes("jpg")
            ? await doc.embedJpg(bytes)
            : await doc.embedPng(bytes);
        }
      } catch (_) {
        logoImage = null;
      }
    }

    let page = doc.addPage(PageSizes.A4);
    let y = H;

    const header = () => {
      if (logoImage) {
        const maxW = 130;
        const scale = Math.min(maxW / logoImage.width, 34 / logoImage.height);
        page.drawImage(logoImage, {
          x: MARGIN,
          y: H - MARGIN - logoImage.height * scale,
          width: logoImage.width * scale,
          height: logoImage.height * scale,
        });
      } else if (companyName) {
        page.drawText(sanitize(companyName), {
          x: MARGIN,
          y: H - MARGIN - 14,
          font: bold,
          size: 14,
          color: brandColor,
        });
      }

      const right = (text: string, offsetY: number, size = 7.5) => {
        const t = sanitize(text);
        if (!t) return;
        page.drawText(t, {
          x: W - MARGIN - font.widthOfTextAtSize(t, size),
          y: H - MARGIN - offsetY,
          font,
          size,
          color: gray,
        });
      };
      right(companyAddress, 10);
      right(branding?.company_email || "", 20);
      right(branding?.company_phone || "", 30);
      right(branding?.company_vat_number ? `TVA ${branding.company_vat_number}` : "", 40);

      page.drawLine({
        start: { x: MARGIN, y: H - MARGIN - 52 },
        end: { x: W - MARGIN, y: H - MARGIN - 52 },
        thickness: 1.5,
        color: brandColor,
      });

      y = H - MARGIN - 76;
    };

    const footer = (index: number) => {
      const text = sanitize(`${companyName} — Offre ${offerNumber} — page ${index}`);
      page.drawText(text, {
        x: MARGIN,
        y: 28,
        font,
        size: 7,
        color: gray,
      });
    };

    let pageIndex = 1;
    const newPage = () => {
      footer(pageIndex);
      page = doc.addPage(PageSizes.A4);
      pageIndex += 1;
      header();
    };

    /** Réserve `needed` points de hauteur, en changeant de page si nécessaire. */
    const ensure = (needed: number) => {
      if (y - needed < 60) newPage();
    };

    const heading = (text: string) => {
      ensure(34);
      page.drawText(sanitize(text), { x: MARGIN, y, font: bold, size: 13, color: brandColor });
      y -= 8;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: MARGIN + 46, y },
        thickness: 2,
        color: brandColor,
      });
      y -= 18;
    };

    const paragraph = (text: string, size = 9.5) => {
      if (!text) return;
      for (const line of wrapText(text, font, size, CONTENT)) {
        ensure(size + 4);
        if (line) {
          page.drawText(line, { x: MARGIN, y, font, size, color: dark });
        }
        y -= size + 4;
      }
      y -= 6;
    };

    header();

    // ─── Titre et parties ─────────────────────────────────────────────────────

    const title = isPurchase ? "OFFRE D'ACHAT" : "OFFRE DE LEASING";
    page.drawText(title, { x: MARGIN, y, font: bold, size: 20, color: dark });
    y -= 22;
    page.drawText(sanitize(`N° ${offerNumber} — ${formatDate(offer.created_at)}`), {
      x: MARGIN,
      y,
      font,
      size: 10,
      color: gray,
    });
    y -= 28;

    // Encadré client
    const clientLines = [
      offer.client_company || client.company || "",
      offer.client_name || "",
      clientAddress,
      client.vat_number ? `TVA ${client.vat_number}` : "",
      offer.client_email || client.email || "",
      client.phone || "",
    ].filter(Boolean);

    const boxHeight = 22 + clientLines.length * 12;
    ensure(boxHeight + 10);
    page.drawRectangle({
      x: MARGIN,
      y: y - boxHeight,
      width: CONTENT,
      height: boxHeight,
      color: light,
    });
    page.drawText("DESTINATAIRE", {
      x: MARGIN + 12,
      y: y - 15,
      font: bold,
      size: 7.5,
      color: gray,
    });
    let cy = y - 30;
    clientLines.forEach((line, i) => {
      page.drawText(sanitize(line), {
        x: MARGIN + 12,
        y: cy,
        font: i === 0 ? bold : font,
        size: 9.5,
        color: dark,
      });
      cy -= 12;
    });
    y -= boxHeight + 24;

    // ─── Introduction configurable ────────────────────────────────────────────

    const greeting = block("cover", "greeting");
    const introduction = block("cover", "introduction");
    if (greeting) paragraph(stripHtml(greeting));
    if (introduction) paragraph(stripHtml(introduction));

    // ─── Équipements ──────────────────────────────────────────────────────────

    heading(block("equipment", "title", "Votre configuration"));

    const colQty = MARGIN + CONTENT - 150;
    const colPrice = MARGIN + CONTENT - 100;

    ensure(20);
    page.drawText("DESIGNATION", { x: MARGIN, y, font: bold, size: 7.5, color: gray });
    page.drawText("QTE", { x: colQty, y, font: bold, size: 7.5, color: gray });
    const priceHeader = isPurchase ? "PRIX" : "MENSUALITE";
    page.drawText(priceHeader, {
      x: MARGIN + CONTENT - bold.widthOfTextAtSize(priceHeader, 7.5),
      y,
      font: bold,
      size: 7.5,
      color: gray,
    });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + CONTENT, y },
      thickness: 0.7,
      color: gray,
    });
    y -= 14;

    for (const item of equipment) {
      // Les attributs distinguent deux lignes d'un même modèle : ils font
      // partie de la désignation, pas d'un détail annexe.
      const specs = { ...item.attributes, ...item.specifications };
      const specLine = Object.entries(specs)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k} : ${v}`)
        .join(" - ");

      const titleLines = wrapText(item.title, bold, 10, colQty - MARGIN - 12);
      const specLines = specLine ? wrapText(specLine, font, 8, colQty - MARGIN - 12) : [];
      ensure(titleLines.length * 13 + specLines.length * 10 + 14);

      const rowTop = y;
      titleLines.forEach((line) => {
        page.drawText(line, { x: MARGIN, y, font: bold, size: 10, color: dark });
        y -= 13;
      });
      specLines.forEach((line) => {
        page.drawText(line, { x: MARGIN, y, font, size: 8, color: gray });
        y -= 10;
      });

      page.drawText(String(item.quantity), {
        x: colQty,
        y: rowTop,
        font,
        size: 10,
        color: dark,
      });

      const amount = isPurchase
        ? formatCurrency(item.sellingPrice * item.quantity)
        : `${formatCurrency(item.monthlyPayment)}/mois`;
      page.drawText(amount, {
        x: MARGIN + CONTENT - font.widthOfTextAtSize(amount, 10),
        y: rowTop,
        font,
        size: 10,
        color: dark,
      });

      y -= 6;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: MARGIN + CONTENT, y },
        thickness: 0.4,
        color: light,
      });
      y -= 12;
      void colPrice;
    }

    // ─── Total ────────────────────────────────────────────────────────────────

    ensure(70);
    y -= 6;
    const totalHeight = downPayment > 0 ? 62 : 44;
    page.drawRectangle({
      x: MARGIN,
      y: y - totalHeight,
      width: CONTENT,
      height: totalHeight,
      color: brandColor,
    });

    const totalLabel = isPurchase ? "TOTAL" : `MENSUALITE — ${duration} mois`;
    page.drawText(sanitize(totalLabel), {
      x: MARGIN + 14,
      y: y - 26,
      font: bold,
      size: 11,
      color: rgb(1, 1, 1),
    });
    const totalValue = isPurchase
      ? formatCurrency(totalSellingPrice)
      : `${formatCurrency(adjustedMonthly)} HTVA / mois`;
    page.drawText(sanitize(totalValue), {
      x: MARGIN + CONTENT - 14 - bold.widthOfTextAtSize(sanitize(totalValue), 13),
      y: y - 27,
      font: bold,
      size: 13,
      color: rgb(1, 1, 1),
    });

    if (downPayment > 0) {
      const downText = sanitize(
        `Acompte de ${formatCurrency(downPayment)} deduit — montant finance ${formatCurrency(financedAfterDown)}`,
      );
      page.drawText(downText, {
        x: MARGIN + 14,
        y: y - 46,
        font,
        size: 8.5,
        color: rgb(0.85, 0.88, 1),
      });
    }
    y -= totalHeight + 18;

    const footerNote = block("equipment", "footer_note");
    if (footerNote) paragraph(stripHtml(footerNote), 8.5);

    // ─── Prestations externes ─────────────────────────────────────────────────

    if (externalServices && externalServices.length > 0) {
      heading("Prestations complementaires");
      paragraph(
        "Ces prestations sont facturees directement par leur prestataire et ne sont pas comprises dans la mensualite ci-dessus.",
        8.5,
      );

      for (const service of externalServices as any[]) {
        ensure(24);
        const label = sanitize(
          `${service.product_name || ""}${service.provider_name ? ` — ${service.provider_name}` : ""}`,
        );
        page.drawText(label, { x: MARGIN, y, font: bold, size: 9.5, color: dark });

        const price = `${formatCurrency(Number(service.price_htva) || 0)}${
          service.billing_period === "monthly" ? "/mois" : ""
        }`;
        page.drawText(price, {
          x: MARGIN + CONTENT - font.widthOfTextAtSize(price, 9.5),
          y,
          font,
          size: 9.5,
          color: dark,
        });
        y -= 13;

        if (service.description) {
          for (const line of wrapText(stripHtml(service.description), font, 8, CONTENT - 80)) {
            ensure(11);
            page.drawText(line, { x: MARGIN, y, font, size: 8, color: gray });
            y -= 10;
          }
        }
        y -= 6;
      }
    }

    // ─── Validité et conditions ───────────────────────────────────────────────

    const validity = block("cover", "validity");
    const generalConditions = block(
      "conditions",
      isPurchase ? "sale_general_conditions" : "general_conditions",
    );
    const additionalInfo = block("conditions", "additional_info");
    const contactInfo = block("conditions", "contact_info");

    if (validity || generalConditions || additionalInfo || contactInfo) {
      heading("Conditions");
      if (validity) paragraph(stripHtml(validity), 9);
      if (generalConditions) paragraph(stripHtml(generalConditions), 8.5);
      if (additionalInfo) paragraph(stripHtml(additionalInfo), 8.5);
      if (contactInfo) paragraph(stripHtml(contactInfo), 8.5);
    }

    // ─── Signature déjà recueillie ────────────────────────────────────────────

    if (offer.signature_data && offer.signed_at) {
      ensure(150);
      heading("Signature du client");

      paragraph(
        `Signe electroniquement par ${offer.signer_name || offer.client_name || "le client"} le ${formatDate(offer.signed_at)}${
          offer.signer_ip ? ` depuis l'adresse IP ${offer.signer_ip}` : ""
        }.`,
        9,
      );

      try {
        const base64 = String(offer.signature_data).split(",")[1];
        if (base64) {
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const image = String(offer.signature_data).includes("image/jpeg")
            ? await doc.embedJpg(bytes)
            : await doc.embedPng(bytes);
          const scale = Math.min(200 / image.width, 80 / image.height);
          ensure(image.height * scale + 16);
          page.drawImage(image, {
            x: MARGIN,
            y: y - image.height * scale,
            width: image.width * scale,
            height: image.height * scale,
          });
          y -= image.height * scale + 16;
        }
      } catch (_) {
        // Une signature illisible ne doit pas empêcher la production du PDF.
      }
    }

    footer(pageIndex);

    const bytes = await doc.save();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));

    const safeClient = String(offer.client_name || "Client")
      .normalize("NFD")
      .replace(/[\u0300-\u036F]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const fileName = `Offre_${offerNumber}_${safeClient}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new Response(
      JSON.stringify({ success: true, fileName, contentType: "application/pdf", pdfBase64: base64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[GENERATE-OFFER-PDF]", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
