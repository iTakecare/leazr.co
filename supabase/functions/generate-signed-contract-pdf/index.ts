import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import PDFDocument from "https://esm.sh/pdfkit@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

/**
 * Strip HTML tags to plain text
 */
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
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
};

/**
 * Replace placeholders in template text
 */
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
    const action = body.action || 'download'; // 'download' or 'upload'
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

    // Fetch pdf_content_blocks for contract template
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

    // Build data object for placeholder replacement
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
    const primaryColor = contract.companies?.primary_color || '#33638e';

    console.log('[GENERATE-SIGNED-CONTRACT-PDF] Creating PDF document');

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 50, left: 40, right: 40 },
      info: {
        Title: `Contrat ${trackingNumber}`,
        Author: pdfData.company_name,
        Subject: `Contrat de location pour ${pdfData.client_name}`,
      },
      bufferPages: true,
    });

    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    const pdfPromise = new Promise<Uint8Array>((resolve, reject) => {
      doc.on('end', () => {
        const result = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
        let offset = 0;
        for (const c of chunks) { result.set(c, offset); offset += c.length; }
        resolve(result);
      });
      doc.on('error', reject);
    });

    const pageWidth = 515;

    // Helper: draw header
    const drawHeader = () => {
      const startY = doc.y;
      doc.fontSize(12).fillColor(primaryColor)
        .text(pdfData.company_name, 40, 40, { width: 250 });
      
      doc.fontSize(7).fillColor('#64748b')
        .text(pdfData.company_address || '', 350, 40, { width: 205, align: 'right' });
      if (pdfData.company_vat_number) {
        doc.text(`N° BCE : ${pdfData.company_vat_number}`, 350, doc.y, { width: 205, align: 'right' });
      }
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b')
        .text(`Réf: ${trackingNumber}`, 350, doc.y, { width: 205, align: 'right' });
      doc.font('Helvetica');

      // Line under header
      const lineY = Math.max(doc.y, 70) + 5;
      doc.moveTo(40, lineY).lineTo(555, lineY).strokeColor(primaryColor).lineWidth(2).stroke();
      doc.y = lineY + 10;
    };

    // Helper: draw footer
    const drawFooter = (pageNum: number, totalPages: number) => {
      doc.fontSize(7).fillColor('#64748b');
      doc.text(pdfData.company_name, 40, doc.page.height - 40, { width: 250 });
      doc.text(`Page ${pageNum}/${totalPages}`, 350, doc.page.height - 40, { width: 205, align: 'right' });
    };

    // Estimate total pages
    const articleKeys = ['article_1','article_2','article_3','article_4','article_5','article_6','article_7','article_8',
      'article_9','article_10','article_11','article_12','article_13','article_14','article_15','article_16','article_17'];
    const activeArticles = articleKeys.filter(k => contractContent[k]);
    const totalPages = 1 + Math.ceil(activeArticles.length / 4) + 1; // cover + articles + signature

    // ===== PAGE 1: Cover, Equipment, Financial Summary =====
    drawHeader();

    // Title
    doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor)
      .text(contractContent.title 
        ? stripHtml(replacePlaceholders(contractContent.title, pdfData))
        : 'CONTRAT DE LOCATION DE MATÉRIEL INFORMATIQUE',
        { align: 'center' });
    doc.font('Helvetica');
    doc.moveDown();

    // Parties section
    if (contractContent.parties) {
      const partiesText = stripHtml(replacePlaceholders(contractContent.parties, pdfData));
      doc.fontSize(8).fillColor('#374151').text(partiesText, { lineGap: 2 });
      doc.moveDown();
    }

    // Equipment table
    doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor)
      .text('Description des équipements');
    doc.font('Helvetica');
    doc.moveDown(0.5);

    // Table header
    const tableY = doc.y;
    doc.rect(40, tableY, pageWidth, 18).fill(primaryColor);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Description', 45, tableY + 4, { width: 300 });
    doc.text('Qté', 350, tableY + 4, { width: 50, align: 'center' });
    doc.text('Mensualité HT', 405, tableY + 4, { width: 150, align: 'right' });
    doc.font('Helvetica');
    doc.y = tableY + 20;

    // Equipment rows
    const equipmentList = equipment || [];
    let totalMonthly = 0;
    equipmentList.forEach((eq: any, idx: number) => {
      const rowY = doc.y;
      if (idx % 2 === 0) {
        doc.rect(40, rowY - 2, pageWidth, 16).fill('#f8fafc');
      }
      doc.fontSize(8).fillColor('#1e293b');
      doc.text(eq.title || 'Équipement', 45, rowY, { width: 300 });
      doc.text(String(eq.quantity || 1), 350, rowY, { width: 50, align: 'center' });
      doc.text(formatCurrency(eq.monthly_payment || 0), 405, rowY, { width: 150, align: 'right' });
      totalMonthly += (eq.monthly_payment || 0);
      doc.y = rowY + 16;
    });

    // Total row
    const totalY = doc.y;
    doc.rect(40, totalY, pageWidth, 20).fill(primaryColor);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text(hasDownPayment ? 'Mensualité ajustée HT' : 'Total mensuel HT', 45, totalY + 5, { width: 350 });
    doc.text(formatCurrency(hasDownPayment ? adjustedMonthlyPayment : contract.monthly_payment), 405, totalY + 5, { width: 150, align: 'right' });
    doc.font('Helvetica');
    doc.y = totalY + 25;
    doc.moveDown();

    // Financial summary box
    doc.rect(40, doc.y, pageWidth, hasDownPayment ? 80 : 60).fill('#f8fafc');
    doc.moveTo(40, doc.y).lineTo(43, doc.y).lineTo(43, doc.y + (hasDownPayment ? 80 : 60)).lineTo(40, doc.y + (hasDownPayment ? 80 : 60))
      .fill(primaryColor);
    
    const boxY = doc.y + 8;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
      .text('Conditions du contrat', 50, boxY);
    doc.font('Helvetica');
    let detailY = boxY + 16;
    doc.fontSize(8).fillColor('#64748b').text('Durée du contrat :', 50, detailY, { width: 200 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text(`${pdfData.contract_duration} mois`, 350, detailY, { width: 200, align: 'right' });
    doc.font('Helvetica');
    detailY += 14;

    if (hasDownPayment) {
      doc.fontSize(8).fillColor('#64748b').text('Acompte :', 50, detailY, { width: 200 });
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text(formatCurrency(downPayment), 350, detailY, { width: 200, align: 'right' });
      doc.font('Helvetica');
      detailY += 14;
      doc.fontSize(8).fillColor('#64748b').text('Mensualité ajustée HT :', 50, detailY, { width: 200 });
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text(formatCurrency(adjustedMonthlyPayment), 350, detailY, { width: 200, align: 'right' });
      doc.font('Helvetica');
    } else {
      doc.fontSize(8).fillColor('#64748b').text('Mensualité HT :', 50, detailY, { width: 200 });
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text(formatCurrency(contract.monthly_payment), 350, detailY, { width: 200, align: 'right' });
      doc.font('Helvetica');
    }
    detailY += 14;
    if (pdfData.file_fee > 0) {
      doc.fontSize(8).fillColor('#64748b').text('Frais de dossier (unique) :', 50, detailY, { width: 200 });
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text(formatCurrency(pdfData.file_fee), 350, detailY, { width: 200, align: 'right' });
      doc.font('Helvetica');
    }

    doc.y = doc.y + (hasDownPayment ? 85 : 65);

    // Client IBAN
    if (contract.client_iban) {
      doc.moveDown(0.5);
      doc.rect(40, doc.y, pageWidth, 40).fill('#f8fafc');
      doc.moveTo(40, doc.y).lineTo(43, doc.y).lineTo(43, doc.y + 40).lineTo(40, doc.y + 40).fill(primaryColor);
      const ibanY = doc.y + 8;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
        .text('Coordonnées bancaires du Locataire', 50, ibanY);
      doc.font('Helvetica');
      doc.fontSize(8).fillColor('#64748b').text('IBAN :', 50, ibanY + 16, { width: 200 });
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text(contract.client_iban, 350, ibanY + 16, { width: 200, align: 'right' });
      doc.font('Helvetica');
      doc.y += 45;
    }

    // Special provisions
    if (contract.special_provisions) {
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text('Dispositions particulières');
      doc.font('Helvetica');
      doc.fontSize(8).fillColor('#374151').text(stripHtml(contract.special_provisions), { lineGap: 2 });
    }

    drawFooter(1, totalPages);

    // ===== ARTICLES PAGES =====
    const articlesPerPage = 4;
    let currentPage = 2;

    for (let i = 0; i < activeArticles.length; i += articlesPerPage) {
      doc.addPage();
      drawHeader();
      
      if (i === 0) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor)
          .text('Conditions Générales du Contrat');
        doc.font('Helvetica');
        doc.moveDown(0.5);
      }

      const pageArticles = activeArticles.slice(i, i + articlesPerPage);
      for (const key of pageArticles) {
        let articleText = contractContent[key];
        if (!articleText) continue;
        
        const processedText = stripHtml(replacePlaceholders(articleText, pdfData));
        const paragraphs = processedText.split('\n').filter((p: string) => p.trim());
        
        for (const para of paragraphs) {
          const trimmed = para.trim();
          // Detect article titles (e.g., "1. Objet")
          if (trimmed.match(/^(\d+\.)\s+[A-ZÀ-Ü]/)) {
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(trimmed);
            doc.font('Helvetica');
          } else {
            doc.fontSize(8).fillColor('#374151').text(trimmed, { lineGap: 1.5, align: 'justify' });
          }
        }
        doc.moveDown(0.5);
      }

      drawFooter(currentPage, totalPages);
      currentPage++;
    }

    // ===== SIGNATURE PAGE =====
    doc.addPage();
    drawHeader();

    // Annexes
    if (contractContent.annexes) {
      doc.fontSize(8).fillColor('#374151')
        .text(stripHtml(replacePlaceholders(contractContent.annexes, pdfData)), { lineGap: 2 });
      doc.moveDown();
    }

    // Signature section
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.moveDown();

    const sigY = doc.y + 10;
    const colWidth = pageWidth / 2 - 20;

    // LEFT: Le Bailleur
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b')
      .text('Le Bailleur', 40, sigY, { width: colWidth, align: 'center' });
    doc.font('Helvetica');
    doc.fontSize(9).fillColor('#374151')
      .text(pdfData.company_name, 40, doc.y + 5, { width: colWidth, align: 'center' });
    
    if (contract.companies?.signature_representative_name) {
      doc.fontSize(7).fillColor('#64748b')
        .text(contract.companies.signature_representative_name, 40, doc.y + 3, { width: colWidth, align: 'center' });
    }
    if (contract.companies?.signature_representative_title) {
      doc.fontSize(6).fillColor('#94a3b8')
        .text(contract.companies.signature_representative_title, 40, doc.y + 2, { width: colWidth, align: 'center' });
    }

    // Try to embed lessor signature
    if (contract.companies?.signature_url) {
      try {
        const sigRes = await fetch(contract.companies.signature_url);
        if (sigRes.ok) {
          const sigBuf = await sigRes.arrayBuffer();
          const sigBytes = new Uint8Array(sigBuf);
          doc.image(sigBytes, 90, doc.y + 5, { width: 150, height: 60 });
          doc.y += 70;
        }
      } catch (e) {
        console.warn('[GENERATE-SIGNED-CONTRACT-PDF] Could not embed lessor signature:', e);
        doc.moveTo(80, doc.y + 50).lineTo(80 + colWidth - 40, doc.y + 50).strokeColor('#64748b').lineWidth(1).stroke();
        doc.y += 55;
      }
    } else {
      doc.moveTo(80, doc.y + 50).lineTo(80 + colWidth - 40, doc.y + 50).strokeColor('#64748b').lineWidth(1).stroke();
      doc.y += 55;
    }

    // RIGHT: Le Locataire
    const rightX = 40 + colWidth + 40;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b')
      .text('Le Locataire', rightX, sigY, { width: colWidth, align: 'center' });
    doc.font('Helvetica');
    doc.fontSize(9).fillColor('#374151')
      .text(pdfData.signer_name || pdfData.client_name, rightX, sigY + 18, { width: colWidth, align: 'center' });

    // Try to embed client signature
    const signatureData = contract.contract_signature_data || contract.signature_data;
    if (signatureData && signatureData.startsWith('data:')) {
      try {
        doc.image(signatureData, rightX + 30, sigY + 35, { width: 150, height: 60 });
      } catch (e) {
        console.warn('[GENERATE-SIGNED-CONTRACT-PDF] Could not embed client signature:', e);
        doc.moveTo(rightX + 20, sigY + 85).lineTo(rightX + colWidth - 20, sigY + 85)
          .strokeColor('#64748b').lineWidth(1).stroke();
      }
    } else {
      doc.moveTo(rightX + 20, sigY + 85).lineTo(rightX + colWidth - 20, sigY + 85)
        .strokeColor('#64748b').lineWidth(1).stroke();
    }

    // Signature metadata
    if (signatureData) {
      const metaY = Math.max(doc.y, sigY + 100) + 15;
      doc.moveTo(40, metaY).lineTo(555, metaY).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.fontSize(7).fillColor('#64748b');
      const signedAt = contract.contract_signed_at || contract.signed_at;
      const signerIp = contract.contract_signer_ip || contract.signer_ip;
      let metaText = `Contrat signé électroniquement le ${formatDateFull(signedAt)}`;
      if (signerIp) metaText += ` • IP: ${signerIp}`;
      doc.text(metaText, 40, metaY + 8, { width: pageWidth, align: 'center' });
      doc.fontSize(6).fillColor('#92400e')
        .text('Conformément au règlement eIDAS (UE) n° 910/2014', 40, doc.y + 5, { width: pageWidth, align: 'center' });
    }

    drawFooter(currentPage, totalPages);

    doc.end();
    const pdfBuffer = await pdfPromise;

    console.log(`[GENERATE-SIGNED-CONTRACT-PDF] PDF generated: ${pdfBuffer.length} bytes`);

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
        .upload(fileName, pdfBuffer, {
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

      // Update contract record
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
    return new Response(pdfBuffer, {
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
