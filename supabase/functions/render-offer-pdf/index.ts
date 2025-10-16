import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import PDFDocument from "https://esm.sh/pdfkit@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[RENDER-OFFER-PDF] Starting PDF generation');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { offerId } = await req.json();
    if (!offerId) {
      throw new Error('Missing offerId');
    }

    console.log('[RENDER-OFFER-PDF] Fetching offer data for:', offerId);

    // Fetch offer with all related data
    const { data: offer, error: offerError } = await supabaseClient
      .from('offers')
      .select(`
        *,
        client:clients(*),
        company:companies(*),
        leaser:leasers(*),
        equipment:offer_equipment(*)
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('[RENDER-OFFER-PDF] Offer not found:', offerError);
      throw new Error('Offer not found');
    }

    console.log('[RENDER-OFFER-PDF] Creating PDF document');

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      info: {
        Title: `Offre ${offer.id}`,
        Author: offer.company?.name || 'Company',
        Subject: `Offre de leasing pour ${offer.client?.name || 'Client'}`,
      }
    });

    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Uint8Array>((resolve, reject) => {
      doc.on('end', () => {
        console.log('[RENDER-OFFER-PDF] PDF generation complete');
        const result = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result);
      });
      doc.on('error', reject);
    });

    // Helper functions
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount || 0);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('fr-FR');
    };

    // Header with company info
    doc.fontSize(24)
       .fillColor('#3b82f6')
       .text('OFFRE DE LEASING', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(10)
       .fillColor('#64748b')
       .text(`Offre N° ${offer.id}`, { align: 'center' });
    
    doc.moveDown(2);

    // Company information (left)
    const startY = doc.y;
    doc.fontSize(12)
       .fillColor('#1e293b')
       .text(offer.company?.name || 'Société', 40, startY);
    
    if (offer.company?.logo_url) {
      doc.fontSize(8)
         .fillColor('#64748b')
         .text('Votre partenaire leasing', 40, doc.y);
    }

    // Client information (right)
    doc.fontSize(12)
       .fillColor('#1e293b')
       .text('Client', 350, startY);
    
    doc.fontSize(10)
       .fillColor('#475569')
       .text(offer.client?.name || 'Non renseigné', 350, doc.y);
    
    if (offer.client?.company) {
      doc.text(offer.client.company, 350, doc.y);
    }
    if (offer.client?.email) {
      doc.text(offer.client.email, 350, doc.y);
    }
    if (offer.client?.phone) {
      doc.text(offer.client.phone, 350, doc.y);
    }

    doc.moveDown(3);

    // Offer details section
    doc.fontSize(14)
       .fillColor('#1e293b')
       .text('Détails de l\'offre', { underline: true });
    
    doc.moveDown();
    
    doc.fontSize(10)
       .fillColor('#475569');
    
    const detailsY = doc.y;
    doc.text(`Date d'émission:`, 40, detailsY);
    doc.text(formatDate(offer.created_at), 200, detailsY);
    
    doc.text(`Statut:`, 40, doc.y);
    doc.text(offer.status || 'draft', 200, doc.y);
    
    if (offer.leaser?.name) {
      doc.text(`Organisme de leasing:`, 40, doc.y);
      doc.text(offer.leaser.name, 200, doc.y);
    }
    
    if (offer.duration_months) {
      doc.text(`Durée:`, 40, doc.y);
      doc.text(`${offer.duration_months} mois`, 200, doc.y);
    }

    doc.moveDown(2);

    // Equipment table
    doc.fontSize(14)
       .fillColor('#1e293b')
       .text('Équipements', { underline: true });
    
    doc.moveDown();

    // Table header
    const tableTop = doc.y;
    const colWidths = { desc: 200, qty: 60, price: 80, monthly: 80, total: 80 };
    
    doc.fontSize(9)
       .fillColor('#64748b');
    
    doc.rect(40, tableTop - 5, 515, 20)
       .fillAndStroke('#f1f5f9', '#e2e8f0');
    
    doc.fillColor('#1e293b')
       .text('Désignation', 45, tableTop, { width: colWidths.desc });
    doc.text('Qté', 250, tableTop, { width: colWidths.qty, align: 'center' });
    doc.text('Prix unit.', 315, tableTop, { width: colWidths.price, align: 'right' });
    doc.text('Mens.', 400, tableTop, { width: colWidths.monthly, align: 'right' });
    doc.text('Total', 485, tableTop, { width: colWidths.total, align: 'right' });

    doc.moveDown();

    // Equipment rows
    let currentY = doc.y;
    let subtotal = 0;
    let totalMonthly = 0;

    if (offer.equipment && Array.isArray(offer.equipment) && offer.equipment.length > 0) {
      offer.equipment.forEach((item: any, index: number) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 40;
        }

        const itemTotal = (item.selling_price || item.purchase_price || 0) * (item.quantity || 1);
        const itemMonthly = item.monthly_payment || 0;
        
        subtotal += itemTotal;
        totalMonthly += itemMonthly;

        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(40, currentY - 3, 515, 20)
             .fill('#fafafa');
        }

        doc.fontSize(9)
           .fillColor('#1e293b')
           .text(item.title || 'Équipement', 45, currentY, { width: colWidths.desc });
        
        doc.text(item.quantity?.toString() || '1', 250, currentY, { width: colWidths.qty, align: 'center' });
        doc.text(formatCurrency(item.selling_price || item.purchase_price || 0), 315, currentY, { width: colWidths.price, align: 'right' });
        doc.text(formatCurrency(itemMonthly), 400, currentY, { width: colWidths.monthly, align: 'right' });
        doc.text(formatCurrency(itemTotal), 485, currentY, { width: colWidths.total, align: 'right' });

        currentY = doc.y + 5;
        doc.y = currentY;
      });
    } else {
      doc.fontSize(9)
         .fillColor('#64748b')
         .text('Aucun équipement', 45, currentY);
      currentY = doc.y + 10;
    }

    doc.moveDown(2);

    // Totals section
    const totalsY = doc.y;
    
    doc.fontSize(11)
       .fillColor('#1e293b');
    
    doc.text('Montant total HT:', 350, totalsY);
    doc.text(formatCurrency(subtotal), 485, totalsY, { align: 'right' });
    
    const vatAmount = subtotal * 0.21;
    doc.text('TVA (21%):', 350, doc.y);
    doc.text(formatCurrency(vatAmount), 485, doc.y, { align: 'right' });
    
    doc.fontSize(12)
       .fillColor('#3b82f6');
    doc.text('Total TTC:', 350, doc.y);
    doc.text(formatCurrency(subtotal + vatAmount), 485, doc.y, { align: 'right' });
    
    doc.fontSize(11)
       .fillColor('#1e293b');
    doc.text('Mensualité:', 350, doc.y + 10);
    doc.text(formatCurrency(totalMonthly), 485, doc.y, { align: 'right' });

    doc.moveDown(3);

    // Conditions section
    doc.fontSize(12)
       .fillColor('#1e293b')
       .text('Conditions de financement', { underline: true });
    
    doc.moveDown();
    doc.fontSize(9)
       .fillColor('#475569')
       .text('• Offre valable 30 jours', { indent: 10 });
    doc.text('• Sous réserve d\'acceptation du dossier par l\'organisme de leasing', { indent: 10 });
    doc.text('• Frais de dossier non inclus', { indent: 10 });
    
    if (offer.additional_terms) {
      doc.text(`• ${offer.additional_terms}`, { indent: 10 });
    }

    // Footer
    const pageHeight = doc.page.height;
    doc.fontSize(8)
       .fillColor('#94a3b8')
       .text(
         `Document généré le ${formatDate(new Date().toISOString())} - ${offer.company?.name || 'Société'}`,
         40,
         pageHeight - 40,
         { align: 'center', width: 515 }
       );

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Offre-${offer.id}.pdf"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[RENDER-OFFER-PDF] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate PDF'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
