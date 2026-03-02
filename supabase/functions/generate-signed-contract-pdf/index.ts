import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { PDFDocument, StandardFonts, PageSizes, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const formatCurrency = (amount: number) => {
  const num = new Intl.NumberFormat('fr-BE', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  return `${num.replace(/[\s\u00A0\u202F]/g, '.')} EUR`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return new Date().toLocaleDateString('fr-FR');
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

const formatDateFull = (dateString?: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<h[1-6][^>]*>/gi, '').replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ').replace(/<\/li>/gi, '\n')
    .replace(/<ul[^>]*>/gi, '').replace(/<\/ul>/gi, '')
    .replace(/<ol[^>]*>/gi, '').replace(/<\/ol>/gi, '')
    .replace(/<strong[^>]*>/gi, '').replace(/<\/strong>/gi, '')
    .replace(/<em[^>]*>/gi, '').replace(/<\/em>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
};

const replacePlaceholders = (text: string, data: any): string => {
  if (!text) return '';
  const monthlyPayment = data.adjustedMonthlyPayment ?? data.monthly_payment ?? 0;

  const clientFullAddress = [
    data.client_address, data.client_postal_code, data.client_city, data.client_country
  ].filter(Boolean).join(', ');

  const endDate = data.contract_end_date ? formatDate(data.contract_end_date) : '';

  const placeholders: Record<string, string> = {
    '{{company_name}}': data.company_name || '',
    '{{company_legal_form}}': 'à responsabilité limitée',
    '{{company_address}}': data.company_address || '',
    '{{company_bce}}': data.company_vat_number || '',
    '{{company_representative}}': data.lessor_representative_name || '',
    '{{company_iban}}': data.company_iban || '',
    '{{company_bic}}': data.company_bic || '',
    '{{client_name}}': data.client_name || '',
    '{{client_company}}': data.client_company || data.client_name || '',
    '{{client_bce}}': data.client_vat_number || '',
    '{{client_vat_number}}': data.client_vat_number || '',
    '{{client_address}}': clientFullAddress || '',
    '{{client_street}}': data.client_address || '',
    '{{client_city}}': data.client_city || '',
    '{{client_postal_code}}': data.client_postal_code || '',
    '{{client_country}}': data.client_country || 'Belgique',
    '{{client_phone}}': data.client_phone || '',
    '{{client_representative}}': data.signer_name || data.client_name || '',
    '{{client_iban}}': data.client_iban || '',
    '{{client_bic}}': data.client_bic || '',
    '{{duration}}': String(data.contract_duration || 36),
    '{{monthly_payment}}': formatCurrency(monthlyPayment).replace('EUR', '').trim(),
    '{{payment_day}}': data.payment_day === 1 ? '1er' : String(data.payment_day || 1),
    '{{file_fee}}': formatCurrency(data.file_fee || 0).replace('EUR', '').trim(),
    '{{admin_fee}}': formatCurrency(50).replace('EUR', '').trim(),
    '{{residual_value}}': '1',
    '{{residual_amount}}': formatCurrency((monthlyPayment * (data.contract_duration || 36)) * 0.01).replace('EUR', '').trim(),
    '{{repair_threshold}}': '150',
    '{{penalty_percentage}}': '50',
    '{{contract_location}}': 'Belgique',
    '{{contract_date}}': formatDate(data.signed_at || data.created_at),
    '{{contract_start_date}}': data.contract_start_date ? formatDate(data.contract_start_date) : formatDate(data.created_at),
    '{{start_date}}': data.contract_start_date ? formatDate(data.contract_start_date) : formatDate(data.created_at),
    '{{contract_end_date}}': endDate,
    '{{end_date}}': endDate,
    '{{down_payment}}': formatCurrency(data.down_payment || 0).replace('EUR', '').trim(),
    '{{adjusted_monthly_payment}}': formatCurrency(monthlyPayment).replace('EUR', '').trim(),
  };

  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.split(key).join(value);
  }
  return result;
};

// Helper: parse hex color to rgb
const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  return rgb(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  );
};

// Helper: wrap text into lines that fit a given width
const wrapText = (text: string, font: any, fontSize: number, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
};

// Helper: draw multi-line text, returns new Y position
const drawMultiLineText = (
  page: any, text: string, x: number, y: number,
  font: any, fontSize: number, color: any, maxWidth: number, lineHeight: number
): number => {
  const paragraphs = text.split('\n');
  let currentY = y;

  for (const para of paragraphs) {
    if (!para.trim()) {
      currentY -= lineHeight;
      continue;
    }
    const lines = wrapText(para.trim(), font, fontSize, maxWidth);
    for (const line of lines) {
      if (currentY < 60) return currentY; // stop near bottom
      page.drawText(line, { x, y: currentY, font, size: fontSize, color });
      currentY -= lineHeight;
    }
  }
  return currentY;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[GENERATE-SIGNED-CONTRACT-PDF] Starting');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const contractId = body.contractId;
    const action = body.action || 'download';
    if (!contractId) throw new Error('Missing contractId');

    console.log('[GENERATE-SIGNED-CONTRACT-PDF] Fetching contract:', contractId);

    // Fetch contract with relations
    const { data: contract, error: contractError } = await supabaseClient
      .from('contracts')
      .select(`
        *,
        companies!inner(name, logo_url, primary_color, signature_url, signature_representative_name, signature_representative_title),
        clients(company, address, city, postal_code, country, vat_number, phone, email),
        offers(file_fee, annual_insurance, down_payment, coefficient, financed_amount, amount)
      `)
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      console.error('[GENERATE-SIGNED-CONTRACT-PDF] Contract not found:', contractError);
      throw new Error('Contract not found');
    }

    // Fetch customization
    const { data: customization } = await supabaseClient
      .from('company_customizations')
      .select('company_email, company_phone, company_address, company_vat_number, company_name, logo_url')
      .eq('company_id', contract.company_id)
      .single();

    // Fetch equipment
    const { data: equipment } = await supabaseClient
      .from('contract_equipment')
      .select('id, title, quantity, monthly_payment, purchase_price, margin, serial_number')
      .eq('contract_id', contractId);

    // Fetch leaser
    let leaserDisplayName = contract.leaser_name || 'Non spécifié';
    let isSelfLeasing = false;
    if (contract.leaser_id) {
      const { data: leaser } = await supabaseClient
        .from('leasers')
        .select('name, company_name, is_own_company')
        .eq('id', contract.leaser_id)
        .single();
      if (leaser) {
        leaserDisplayName = leaser.company_name || leaser.name;
        isSelfLeasing = leaser.is_own_company === true;
      }
    }

    // Fetch pdf_content_blocks
    const { data: contentBlocks } = await supabaseClient
      .from('pdf_content_blocks')
      .select('block_key, content')
      .eq('company_id', contract.company_id)
      .eq('page_name', 'contract');

    const contractContent: Record<string, string> = {};
    if (contentBlocks && contentBlocks.length > 0) {
      for (const block of contentBlocks) {
        contractContent[block.block_key] = block.content;
      }
    }

    // Calculate financial values
    const downPayment = contract.offers?.down_payment || 0;
    const coefficient = contract.offers?.coefficient || 0;
    const financedAmount = contract.offers?.financed_amount || contract.offers?.amount || 0;
    const hasDownPayment = downPayment > 0 && coefficient > 0 && isSelfLeasing;
    const adjustedMonthlyPayment = hasDownPayment
      ? Math.round(((financedAmount - downPayment) * coefficient) / 100 * 100) / 100
      : contract.monthly_payment;

    const pdfData = {
      company_name: customization?.company_name || contract.companies?.name || '',
      company_address: customization?.company_address || '',
      company_vat_number: customization?.company_vat_number || '',
      company_email: customization?.company_email || '',
      company_phone: customization?.company_phone || '',
      lessor_representative_name: contract.companies?.signature_representative_name || '',
      client_name: contract.client_name || 'Client',
      client_company: contract.clients?.company || '',
      client_address: contract.clients?.address || '',
      client_city: contract.clients?.city || '',
      client_postal_code: contract.clients?.postal_code || '',
      client_country: contract.clients?.country || 'Belgique',
      client_vat_number: contract.clients?.vat_number || '',
      client_phone: contract.clients?.phone || '',
      client_email: contract.client_email || contract.clients?.email || '',
      client_iban: contract.client_iban || '',
      client_bic: contract.client_bic || '',
      signer_name: contract.contract_signer_name || contract.signer_name || contract.client_name,
      monthly_payment: contract.monthly_payment || 0,
      adjustedMonthlyPayment,
      contract_duration: contract.contract_duration || 36,
      file_fee: contract.offers?.file_fee || contract.file_fee || 0,
      annual_insurance: contract.offers?.annual_insurance || 0,
      down_payment: downPayment,
      signed_at: contract.contract_signed_at || contract.signed_at,
      created_at: contract.created_at,
      contract_start_date: contract.contract_start_date,
      contract_end_date: contract.contract_end_date,
      payment_day: 1,
    };

    const trackingNumber = contract.contract_number || contract.tracking_number || `CON-${contractId.slice(0, 8)}`;
    const primaryColorHex = contract.companies?.primary_color || '#33638e';
    const primaryColor = hexToRgb(primaryColorHex);
    const darkColor = hexToRgb('#1e293b');
    const grayColor = hexToRgb('#64748b');
    const lightGrayColor = hexToRgb('#374151');
    const bgColor = hexToRgb('#f8fafc');

    console.log('[GENERATE-SIGNED-CONTRACT-PDF] Creating PDF document with pdf-lib');

    // Create PDF document
    const doc = await PDFDocument.create();
    doc.setTitle(`Contrat ${trackingNumber}`);
    doc.setAuthor(pdfData.company_name);
    doc.setSubject(`Contrat de location pour ${pdfData.client_name}`);

    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_WIDTH = PageSizes.A4[0]; // 595.28
    const PAGE_HEIGHT = PageSizes.A4[1]; // 841.89
    const MARGIN = 40;
    const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

    // Helper: add a new page with header
    const addPageWithHeader = () => {
      const page = doc.addPage(PageSizes.A4);
      // Company name
      page.drawText(pdfData.company_name, {
        x: MARGIN, y: PAGE_HEIGHT - MARGIN - 12, font: helveticaBold, size: 12, color: primaryColor,
      });
      // Ref on right
      const refText = `Réf: ${trackingNumber}`;
      const refWidth = helveticaBold.widthOfTextAtSize(refText, 7);
      page.drawText(refText, {
        x: PAGE_WIDTH - MARGIN - refWidth, y: PAGE_HEIGHT - MARGIN - 12, font: helveticaBold, size: 7, color: grayColor,
      });
      // Company address
      if (pdfData.company_address) {
        const addrWidth = helvetica.widthOfTextAtSize(pdfData.company_address, 7);
        page.drawText(pdfData.company_address, {
          x: PAGE_WIDTH - MARGIN - addrWidth, y: PAGE_HEIGHT - MARGIN - 22, font: helvetica, size: 7, color: grayColor,
        });
      }
      if (pdfData.company_vat_number) {
        const vatText = `N° BCE : ${pdfData.company_vat_number}`;
        const vatWidth = helvetica.widthOfTextAtSize(vatText, 7);
        page.drawText(vatText, {
          x: PAGE_WIDTH - MARGIN - vatWidth, y: PAGE_HEIGHT - MARGIN - 32, font: helvetica, size: 7, color: grayColor,
        });
      }
      // Line under header
      page.drawLine({
        start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 40 },
        end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 40 },
        thickness: 2, color: primaryColor,
      });
      return page;
    };

    // ===== PAGE 1: Cover, Equipment, Financial Summary =====
    const page1 = addPageWithHeader();
    let y = PAGE_HEIGHT - MARGIN - 60;

    // Title
    const titleText = contractContent.title
      ? stripHtml(replacePlaceholders(contractContent.title, pdfData))
      : 'CONTRAT DE LOCATION DE MATÉRIEL INFORMATIQUE';
    const titleWidth = helveticaBold.widthOfTextAtSize(titleText, 14);
    page1.drawText(titleText, {
      x: (PAGE_WIDTH - titleWidth) / 2, y, font: helveticaBold, size: 14, color: primaryColor,
    });
    y -= 25;

    // Parties section
    if (contractContent.parties) {
      const partiesText = stripHtml(replacePlaceholders(contractContent.parties, pdfData));
      y = drawMultiLineText(page1, partiesText, MARGIN, y, helvetica, 8, lightGrayColor, CONTENT_WIDTH, 11);
      y -= 10;
    }

    // Equipment table title
    page1.drawText('Description des équipements', {
      x: MARGIN, y, font: helveticaBold, size: 11, color: primaryColor,
    });
    y -= 20;

    // Table header
    const tableHeaderHeight = 18;
    page1.drawRectangle({
      x: MARGIN, y: y - tableHeaderHeight, width: CONTENT_WIDTH, height: tableHeaderHeight,
      color: primaryColor,
    });
    const white = rgb(1, 1, 1);
    page1.drawText('Description', { x: MARGIN + 5, y: y - 13, font: helveticaBold, size: 8, color: white });
    page1.drawText('Qté', { x: MARGIN + 310, y: y - 13, font: helveticaBold, size: 8, color: white });
    const mensLabel = 'Mensualité HT';
    const mensWidth = helveticaBold.widthOfTextAtSize(mensLabel, 8);
    page1.drawText(mensLabel, { x: PAGE_WIDTH - MARGIN - mensWidth - 5, y: y - 13, font: helveticaBold, size: 8, color: white });
    y -= tableHeaderHeight + 2;

    // Equipment rows
    const equipmentList = equipment || [];
    let totalMonthly = 0;
    for (let idx = 0; idx < equipmentList.length; idx++) {
      const eq = equipmentList[idx];
      const rowHeight = 16;
      if (idx % 2 === 0) {
        page1.drawRectangle({ x: MARGIN, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: bgColor });
      }
      page1.drawText(eq.title || 'Équipement', { x: MARGIN + 5, y: y - 11, font: helvetica, size: 8, color: darkColor });
      page1.drawText(String(eq.quantity || 1), { x: MARGIN + 315, y: y - 11, font: helvetica, size: 8, color: darkColor });
      const monthlyText = formatCurrency(eq.monthly_payment || 0);
      const monthlyW = helvetica.widthOfTextAtSize(monthlyText, 8);
      page1.drawText(monthlyText, { x: PAGE_WIDTH - MARGIN - monthlyW - 5, y: y - 11, font: helvetica, size: 8, color: darkColor });
      totalMonthly += (eq.monthly_payment || 0);
      y -= rowHeight;
    }

    // Total row
    const totalRowHeight = 20;
    page1.drawRectangle({ x: MARGIN, y: y - totalRowHeight, width: CONTENT_WIDTH, height: totalRowHeight, color: primaryColor });
    const totalLabel = hasDownPayment ? 'Mensualité ajustée HT' : 'Total mensuel HT';
    page1.drawText(totalLabel, { x: MARGIN + 5, y: y - 14, font: helveticaBold, size: 9, color: white });
    const totalValue = formatCurrency(hasDownPayment ? adjustedMonthlyPayment : contract.monthly_payment);
    const totalValueW = helveticaBold.widthOfTextAtSize(totalValue, 9);
    page1.drawText(totalValue, { x: PAGE_WIDTH - MARGIN - totalValueW - 5, y: y - 14, font: helveticaBold, size: 9, color: white });
    y -= totalRowHeight + 15;

    // Financial summary box
    const boxHeight = hasDownPayment ? 80 : 60;
    page1.drawRectangle({ x: MARGIN, y: y - boxHeight, width: CONTENT_WIDTH, height: boxHeight, color: bgColor });
    page1.drawRectangle({ x: MARGIN, y: y - boxHeight, width: 3, height: boxHeight, color: primaryColor });

    let detailY = y - 14;
    page1.drawText('Conditions du contrat', { x: MARGIN + 10, y: detailY, font: helveticaBold, size: 9, color: darkColor });
    detailY -= 16;

    page1.drawText('Durée du contrat :', { x: MARGIN + 10, y: detailY, font: helvetica, size: 8, color: grayColor });
    const durText = `${pdfData.contract_duration} mois`;
    const durW = helveticaBold.widthOfTextAtSize(durText, 8);
    page1.drawText(durText, { x: PAGE_WIDTH - MARGIN - durW - 10, y: detailY, font: helveticaBold, size: 8, color: darkColor });
    detailY -= 14;

    if (hasDownPayment) {
      page1.drawText('Acompte :', { x: MARGIN + 10, y: detailY, font: helvetica, size: 8, color: grayColor });
      const dpText = formatCurrency(downPayment);
      const dpW = helveticaBold.widthOfTextAtSize(dpText, 8);
      page1.drawText(dpText, { x: PAGE_WIDTH - MARGIN - dpW - 10, y: detailY, font: helveticaBold, size: 8, color: darkColor });
      detailY -= 14;
      page1.drawText('Mensualité ajustée HT :', { x: MARGIN + 10, y: detailY, font: helvetica, size: 8, color: grayColor });
      const adjText = formatCurrency(adjustedMonthlyPayment);
      const adjW = helveticaBold.widthOfTextAtSize(adjText, 8);
      page1.drawText(adjText, { x: PAGE_WIDTH - MARGIN - adjW - 10, y: detailY, font: helveticaBold, size: 8, color: darkColor });
      detailY -= 14;
    } else {
      page1.drawText('Mensualité HT :', { x: MARGIN + 10, y: detailY, font: helvetica, size: 8, color: grayColor });
      const mpText = formatCurrency(contract.monthly_payment);
      const mpW = helveticaBold.widthOfTextAtSize(mpText, 8);
      page1.drawText(mpText, { x: PAGE_WIDTH - MARGIN - mpW - 10, y: detailY, font: helveticaBold, size: 8, color: darkColor });
      detailY -= 14;
    }

    if (pdfData.file_fee > 0) {
      page1.drawText('Frais de dossier (unique) :', { x: MARGIN + 10, y: detailY, font: helvetica, size: 8, color: grayColor });
      const ffText = formatCurrency(pdfData.file_fee);
      const ffW = helveticaBold.widthOfTextAtSize(ffText, 8);
      page1.drawText(ffText, { x: PAGE_WIDTH - MARGIN - ffW - 10, y: detailY, font: helveticaBold, size: 8, color: darkColor });
    }

    y -= boxHeight + 10;

    // Client IBAN
    if (contract.client_iban) {
      const ibanBoxH = 40;
      page1.drawRectangle({ x: MARGIN, y: y - ibanBoxH, width: CONTENT_WIDTH, height: ibanBoxH, color: bgColor });
      page1.drawRectangle({ x: MARGIN, y: y - ibanBoxH, width: 3, height: ibanBoxH, color: primaryColor });
      page1.drawText('Coordonnées bancaires du Locataire', { x: MARGIN + 10, y: y - 14, font: helveticaBold, size: 9, color: darkColor });
      page1.drawText('IBAN :', { x: MARGIN + 10, y: y - 28, font: helvetica, size: 8, color: grayColor });
      const ibanW = helveticaBold.widthOfTextAtSize(contract.client_iban, 8);
      page1.drawText(contract.client_iban, { x: PAGE_WIDTH - MARGIN - ibanW - 10, y: y - 28, font: helveticaBold, size: 8, color: darkColor });
      y -= ibanBoxH + 10;
    }

    // Special provisions
    if (contract.special_provisions) {
      page1.drawText('Dispositions particulières', { x: MARGIN, y, font: helveticaBold, size: 9, color: darkColor });
      y -= 14;
      y = drawMultiLineText(page1, stripHtml(contract.special_provisions), MARGIN, y, helvetica, 8, lightGrayColor, CONTENT_WIDTH, 11);
    }

    // Footer page 1
    page1.drawText(pdfData.company_name, { x: MARGIN, y: 30, font: helvetica, size: 7, color: grayColor });

    // ===== ARTICLES PAGES =====
    const articleKeys = ['article_1','article_2','article_3','article_4','article_5','article_6','article_7','article_8',
      'article_9','article_10','article_11','article_12','article_13','article_14','article_15','article_16','article_17'];
    const activeArticles = articleKeys.filter(k => contractContent[k]);

    let currentPage: any = null;
    let articleY = 0;
    let isFirstArticlePage = true;

    for (let i = 0; i < activeArticles.length; i++) {
      // Start a new page when needed
      if (!currentPage || articleY < 100) {
        currentPage = addPageWithHeader();
        articleY = PAGE_HEIGHT - MARGIN - 55;

        if (isFirstArticlePage) {
          currentPage.drawText('Conditions Générales du Contrat', {
            x: MARGIN, y: articleY, font: helveticaBold, size: 11, color: primaryColor,
          });
          articleY -= 20;
          isFirstArticlePage = false;
        }

        // Footer
        currentPage.drawText(pdfData.company_name, { x: MARGIN, y: 30, font: helvetica, size: 7, color: grayColor });
      }

      const key = activeArticles[i];
      const articleText = contractContent[key];
      if (!articleText) continue;

      const processedText = stripHtml(replacePlaceholders(articleText, pdfData));
      const paragraphs = processedText.split('\n').filter((p: string) => p.trim());

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Detect article titles
        if (trimmed.match(/^(\d+\.)\s+[A-ZÀ-Ü]/)) {
          if (articleY < 80) {
            currentPage = addPageWithHeader();
            articleY = PAGE_HEIGHT - MARGIN - 55;
            currentPage.drawText(pdfData.company_name, { x: MARGIN, y: 30, font: helvetica, size: 7, color: grayColor });
          }
          currentPage.drawText(trimmed, { x: MARGIN, y: articleY, font: helveticaBold, size: 10, color: darkColor });
          articleY -= 14;
        } else {
          articleY = drawMultiLineText(currentPage, trimmed, MARGIN, articleY, helvetica, 8, lightGrayColor, CONTENT_WIDTH, 10);
        }
      }
      articleY -= 8;
    }

    // ===== SIGNATURE PAGE =====
    const sigPage = addPageWithHeader();
    let sigY = PAGE_HEIGHT - MARGIN - 55;

    // Annexes
    if (contractContent.annexes) {
      const annexText = stripHtml(replacePlaceholders(contractContent.annexes, pdfData));
      sigY = drawMultiLineText(sigPage, annexText, MARGIN, sigY, helvetica, 8, lightGrayColor, CONTENT_WIDTH, 11);
      sigY -= 15;
    }

    // Separator line
    sigPage.drawLine({
      start: { x: MARGIN, y: sigY },
      end: { x: PAGE_WIDTH - MARGIN, y: sigY },
      thickness: 1, color: hexToRgb('#e2e8f0'),
    });
    sigY -= 20;

    const colWidth = CONTENT_WIDTH / 2 - 20;
    const leftX = MARGIN;
    const rightX = MARGIN + colWidth + 40;

    // LEFT: Le Bailleur
    const bailleurLabel = 'Le Bailleur';
    const blW = helveticaBold.widthOfTextAtSize(bailleurLabel, 10);
    sigPage.drawText(bailleurLabel, { x: leftX + (colWidth - blW) / 2, y: sigY, font: helveticaBold, size: 10, color: darkColor });
    sigY -= 15;

    const cnW = helvetica.widthOfTextAtSize(pdfData.company_name, 9);
    sigPage.drawText(pdfData.company_name, { x: leftX + (colWidth - cnW) / 2, y: sigY, font: helvetica, size: 9, color: lightGrayColor });
    sigY -= 12;

    if (contract.companies?.signature_representative_name) {
      const repName = contract.companies.signature_representative_name;
      const rnW = helvetica.widthOfTextAtSize(repName, 7);
      sigPage.drawText(repName, { x: leftX + (colWidth - rnW) / 2, y: sigY, font: helvetica, size: 7, color: grayColor });
      sigY -= 10;
    }
    if (contract.companies?.signature_representative_title) {
      const repTitle = contract.companies.signature_representative_title;
      const rtW = helvetica.widthOfTextAtSize(repTitle, 6);
      sigPage.drawText(repTitle, { x: leftX + (colWidth - rtW) / 2, y: sigY, font: helvetica, size: 6, color: grayColor });
      sigY -= 10;
    }

    // Embed lessor signature image
    if (contract.companies?.signature_url) {
      try {
        const sigRes = await fetch(contract.companies.signature_url);
        if (sigRes.ok) {
          const sigBuf = await sigRes.arrayBuffer();
          const sigBytes = new Uint8Array(sigBuf);
          let sigImg;
          const sigUrl = contract.companies.signature_url.toLowerCase();
          if (sigUrl.includes('.png') || sigUrl.includes('image/png')) {
            sigImg = await doc.embedPng(sigBytes);
          } else {
            sigImg = await doc.embedJpg(sigBytes);
          }
          sigPage.drawImage(sigImg, { x: leftX + 30, y: sigY - 60, width: 150, height: 60 });
          sigY -= 70;
        }
      } catch (e) {
        console.warn('[GENERATE-SIGNED-CONTRACT-PDF] Could not embed lessor signature:', e);
        sigPage.drawLine({
          start: { x: leftX + 20, y: sigY - 40 },
          end: { x: leftX + colWidth - 20, y: sigY - 40 },
          thickness: 1, color: grayColor,
        });
        sigY -= 50;
      }
    } else {
      sigPage.drawLine({
        start: { x: leftX + 20, y: sigY - 40 },
        end: { x: leftX + colWidth - 20, y: sigY - 40 },
        thickness: 1, color: grayColor,
      });
      sigY -= 50;
    }

    // RIGHT: Le Locataire (use the Y from before lessor sig for consistent alignment)
    const locataireStartY = PAGE_HEIGHT - MARGIN - 55 - (contractContent.annexes ? 60 : 0) - 40;
    const locLabel = 'Le Locataire';
    const llW = helveticaBold.widthOfTextAtSize(locLabel, 10);
    sigPage.drawText(locLabel, { x: rightX + (colWidth - llW) / 2, y: locataireStartY, font: helveticaBold, size: 10, color: darkColor });

    const signerName = pdfData.signer_name || pdfData.client_name;
    const snW = helvetica.widthOfTextAtSize(signerName, 9);
    sigPage.drawText(signerName, { x: rightX + (colWidth - snW) / 2, y: locataireStartY - 15, font: helvetica, size: 9, color: lightGrayColor });

    // Embed client signature
    const signatureData = contract.contract_signature_data || contract.signature_data;
    if (signatureData && signatureData.startsWith('data:')) {
      try {
        // Extract base64 data
        const base64Part = signatureData.split(',')[1];
        const sigBytes = Uint8Array.from(atob(base64Part), c => c.charCodeAt(0));
        let clientSigImg;
        if (signatureData.includes('image/png')) {
          clientSigImg = await doc.embedPng(sigBytes);
        } else {
          clientSigImg = await doc.embedJpg(sigBytes);
        }
        sigPage.drawImage(clientSigImg, { x: rightX + 30, y: locataireStartY - 90, width: 150, height: 60 });
      } catch (e) {
        console.warn('[GENERATE-SIGNED-CONTRACT-PDF] Could not embed client signature:', e);
        sigPage.drawLine({
          start: { x: rightX + 20, y: locataireStartY - 70 },
          end: { x: rightX + colWidth - 20, y: locataireStartY - 70 },
          thickness: 1, color: grayColor,
        });
      }
    } else {
      sigPage.drawLine({
        start: { x: rightX + 20, y: locataireStartY - 70 },
        end: { x: rightX + colWidth - 20, y: locataireStartY - 70 },
        thickness: 1, color: grayColor,
      });
    }

    // Signature metadata
    if (signatureData) {
      const metaY = Math.min(sigY, locataireStartY - 100) - 15;
      sigPage.drawLine({
        start: { x: MARGIN, y: metaY },
        end: { x: PAGE_WIDTH - MARGIN, y: metaY },
        thickness: 1, color: hexToRgb('#e2e8f0'),
      });
      const signedAt = contract.contract_signed_at || contract.signed_at;
      const signerIp = contract.contract_signer_ip || contract.signer_ip;
      let metaText = `Contrat signé électroniquement le ${formatDateFull(signedAt)}`;
      if (signerIp) metaText += ` · IP: ${signerIp}`;
      const metaW = helvetica.widthOfTextAtSize(metaText, 7);
      sigPage.drawText(metaText, { x: (PAGE_WIDTH - metaW) / 2, y: metaY - 12, font: helvetica, size: 7, color: grayColor });

      const eidasText = 'Conformément au règlement eIDAS (UE) n° 910/2014';
      const eidasW = helvetica.widthOfTextAtSize(eidasText, 6);
      sigPage.drawText(eidasText, { x: (PAGE_WIDTH - eidasW) / 2, y: metaY - 22, font: helvetica, size: 6, color: hexToRgb('#92400e') });
    }

    // Footer
    sigPage.drawText(pdfData.company_name, { x: MARGIN, y: 30, font: helvetica, size: 7, color: grayColor });

    // Generate PDF bytes
    const pdfBytes = await doc.save();

    console.log(`[GENERATE-SIGNED-CONTRACT-PDF] PDF generated: ${pdfBytes.length} bytes`);

    // If action is 'upload', store to signed-contracts bucket
    if (action === 'upload') {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const fileName = `${trackingNumber}-signed.pdf`;
      const { error: uploadError } = await adminClient.storage
        .from('signed-contracts')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          cacheControl: '0',
          upsert: true,
        });

      if (uploadError) {
        console.error('[GENERATE-SIGNED-CONTRACT-PDF] Upload error:', uploadError);
        throw new Error(`Upload error: ${uploadError.message}`);
      }

      const { data: urlData } = adminClient.storage
        .from('signed-contracts')
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;

      await adminClient
        .from('contracts')
        .update({ signed_contract_pdf_url: publicUrl })
        .eq('id', contractId);

      console.log('[GENERATE-SIGNED-CONTRACT-PDF] Uploaded to:', publicUrl);

      return new Response(
        JSON.stringify({ success: true, url: publicUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return PDF binary
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contrat-${trackingNumber}.pdf"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[GENERATE-SIGNED-CONTRACT-PDF] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message, details: 'Failed to generate PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
