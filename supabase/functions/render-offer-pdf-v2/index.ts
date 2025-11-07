import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
// fontkit disabled; using standard fonts to avoid runtime errors

const ENGINE_VERSION = 'v2.4-unicode';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OfferData {
  id: string;
  created_at: string;
  status: string;
  duration_months: number;
  additional_terms?: string;
  client: any;
  company: any;
  leaser?: any;
  equipment: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[RENDER-OFFER-PDF-V2] ${ENGINE_VERSION} Starting PDF generation`);
    
    // Vérifier l'authentification
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

    // Récupérer l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Récupérer le rôle de l'utilisateur
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const { offerId, pdfType = 'client' } = await req.json();
    if (!offerId) {
      throw new Error('Missing offerId');
    }

    // Vérifier l'autorisation pour le PDF interne
    if (pdfType === 'internal' && profile?.role !== 'admin') {
      throw new Error('Access denied: Internal PDF requires admin role');
    }

    console.log(`[RENDER-OFFER-PDF-V2] ${ENGINE_VERSION} Generating ${pdfType} PDF for offer:`, offerId);

    // Récupérer les données de l'offre avec équipements, attributs et spécifications
    const { data: offer, error: offerError } = await supabaseClient
      .from('offers')
      .select(`
        *,
        client:clients(*),
        company:companies(*),
        leaser:leasers(*),
        equipment:offer_equipment(
          *,
          attributes:offer_equipment_attributes(key, value),
          specifications:offer_equipment_specifications(key, value)
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('[RENDER-OFFER-PDF-V2] Offer not found:', offerError);
      throw new Error('Offer not found');
    }

    // Si PDF client, supprimer les données sensibles
    if (pdfType === 'client' && offer.equipment) {
      offer.equipment.forEach((item: any) => {
        delete item.purchase_price;
        delete item.margin;
        delete item.selling_price;
      });
    }

    console.log(`[RENDER-OFFER-PDF-V2] ${ENGINE_VERSION} Creating PDF document with Unicode font support`);

    // Créer le document PDF
    const pdfDoc = await PDFDocument.create();
    
    // Using Standard Fonts to ensure reliability in all environments
    // (custom TTF/OTF embedding disabled to avoid fontkit runtime errors)
    let unicodeFont = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
    let unicodeFontBold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
    console.log('[RENDER-OFFER-PDF-V2] Using Standard Helvetica fonts (fallback mode)');

    // Couleurs
    const primaryColor = rgb(0.231, 0.51, 0.965); // #3b82f6
    const darkColor = rgb(0.118, 0.161, 0.231); // #1e293b
    const grayColor = rgb(0.392, 0.435, 0.51); // #64748b
    const lightGrayColor = rgb(0.945, 0.961, 0.984); // #f1f5f9

    // Helper functions
    
    // Fonction STRICTE pour nettoyer TOUS les caractères non-supportés par WinAnsi
    const sanitizeText = (text: string): string => {
      if (!text) return '';
      
      let sanitized = String(text);
      
      // 1. Retirer les emojis (toutes les plages Unicode d'emojis)
      sanitized = sanitized.replace(/[\u{1F000}-\u{1FAFF}]/gu, ''); // Emojis principaux
      sanitized = sanitized.replace(/[\u{2600}-\u{27BF}]/gu, '');   // Dingbats & symboles divers
      sanitized = sanitized.replace(/[\u{E000}-\u{F8FF}]/gu, '');   // Private Use Area
      sanitized = sanitized.replace(/[\u{FE00}-\u{FE0F}]/gu, '');   // Variation Selectors
      
      // 2. Normaliser les espaces (nbsp, thin space, etc.)
      sanitized = sanitized.replace(/\u202F/g, ' '); // Narrow no-break space
      sanitized = sanitized.replace(/\u00A0/g, ' '); // Non-breaking space
      
      // 3. Remplacer les caractères problématiques par des équivalents sûrs
      sanitized = sanitized.replace(/×/g, 'x');      // Symbole multiplier
      sanitized = sanitized.replace(/€/g, ' EUR');   // Symbole euro
      
      // 4. Ne garder QUE les caractères WinAnsi (0x20-0xFF)
      sanitized = sanitized.replace(/[^\x20-\xFF]/g, '');
      
      return sanitized.trim();
    };

    // ASCII fallback sanitizer (used only when WinAnsi encoding fails)
    const sanitizeAsciiFallback = (text: string): string => {
      return String(text ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/[^\x20-\x7E]/g, '')    // keep printable ASCII only
        .trim();
    };

    // Helper pour dessiner du texte de manière sécurisée (sanitized + retry fallback)
    const drawTextSafe = (page: any, text: string, options: any) => {
      const primary = sanitizeText(String(text ?? ''));
      try {
        page.drawText(primary, options);
      } catch (e) {
        const ascii = sanitizeAsciiFallback(primary);
        console.log('[DRAW-RETRY] Fallback ASCII used', { sample: primary.slice(0, 60) });
        page.drawText(ascii, options);
      }
    };

    // Compteurs globaux de scan (préflight)
    let sanitizeFieldsTouched = 0;
    let sanitizeCharsFound = 0;

    // Scanner pour détecter et logger les caractères non-supportés AVANT génération
    const scanUnsupportedChars = (obj: any, path = ''): void => {
      if (obj === null || obj === undefined) return;
      
      if (typeof obj === 'string') {
        // Détecter les caractères hors WinAnsi
        const unsupportedChars = obj.match(/[^\x20-\xFF]/g);
        if (unsupportedChars && unsupportedChars.length > 0) {
          sanitizeFieldsTouched++;
          sanitizeCharsFound += unsupportedChars.length;
          const codes = unsupportedChars.map(c => {
            const cp = (c as string).codePointAt(0) || 0;
            return cp.toString(16).toUpperCase();
          });
          console.log(`[SANITIZE] path="${path}" codes=[${codes.join(',')}] count=${unsupportedChars.length}`);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => scanUnsupportedChars(item, `${path}[${index}]`));
      } else if (typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          scanUnsupportedChars(obj[key], path ? `${path}.${key}` : key);
        });
      }
    };

    // Sanitize profond: applique sanitizeText à toutes les chaînes de l'objet (mutation in-place)
    const deepSanitizeObject = (obj: any): any => {
      if (obj == null) return obj;
      if (typeof obj === 'string') return sanitizeText(obj);
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) obj[i] = deepSanitizeObject(obj[i]);
        return obj;
      }
      if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          obj[k] = deepSanitizeObject(obj[k]);
        }
        return obj;
      }
      return obj;
    };
    const formatCurrency = (amount: number) => {
      let formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount || 0);
      return sanitizeText(formatted);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('fr-FR');
    };

    // Scanner preflight - logger les caractères problématiques
    console.log('[RENDER-OFFER-PDF-V2] Scanning offer data for unsupported characters...');
    scanUnsupportedChars(offer, 'offer');
    if (sanitizeFieldsTouched > 0) {
      console.log(`[SANITIZE] summary fields=${sanitizeFieldsTouched} chars=${sanitizeCharsFound}`);
    }

    // Deep sanitize all strings in offer to guarantee WinAnsi-safe rendering
    deepSanitizeObject(offer);


    // PAGE 1 - COUVERTURE
    let page = pdfDoc.addPage([595, 842]); // A4
    let yPosition = 750;

    // Titre principal
    drawTextSafe(page, 'OFFRE DE LEASING', {
      x: 50,
      y: yPosition,
      size: 28,
      font: unicodeFontBold,
      color: primaryColor,
    });

    yPosition -= 40;
    drawTextSafe(page, `Offre N° ${offer.id.substring(0, 8)}...`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: unicodeFont,
      color: grayColor,
    });

    yPosition -= 60;

    // Informations client
    drawTextSafe(page, 'Pour :', {
      x: 50,
      y: yPosition,
      size: 12,
      font: unicodeFontBold,
      color: darkColor,
    });

    yPosition -= 20;
    drawTextSafe(page, offer.client?.name || 'Non renseigné', {
      x: 50,
      y: yPosition,
      size: 14,
      font: unicodeFont,
      color: darkColor,
    });

    if (offer.client?.company) {
      yPosition -= 20;
      drawTextSafe(page, `Entreprise : ${offer.client.company}`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: unicodeFont,
        color: grayColor,
      });
    }

    yPosition -= 40;
    drawTextSafe(page, `Date : ${formatDate(offer.created_at)}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: unicodeFont,
      color: grayColor,
    });

    // Footer - Nom de l'entreprise
    drawTextSafe(page, offer.company?.name || 'Leazr', {
      x: 50,
      y: 50,
      size: 10,
      font: unicodeFontBold,
      color: primaryColor,
    });

    // PAGE 2 - ÉQUIPEMENTS ET MENSUALITÉS
    page = pdfDoc.addPage([595, 842]);
    yPosition = 750;

    // Titre de la section
    const sectionTitle = pdfType === 'client' 
      ? 'VOTRE SOLUTION DE LEASING'
      : 'DÉTAILS FINANCIERS COMPLETS';

    drawTextSafe(page, sectionTitle, {
      x: 50,
      y: yPosition,
      size: 16,
      font: unicodeFontBold,
      color: darkColor,
    });

    yPosition -= 40;

    // Équipements
    let totalMonthly = 0;
    let totalPurchase = 0;
    let totalMargin = 0;

    if (offer.equipment && Array.isArray(offer.equipment) && offer.equipment.length > 0) {
      for (const item of offer.equipment) {
        // Vérifier si on doit passer à une nouvelle page
        if (yPosition < 150) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = 750;
        }

        const itemMonthly = (item.monthly_payment || 0) * (item.quantity || 1);
        totalMonthly += itemMonthly;

        // Préfixe textuel au lieu d'emoji
        const iconPrefix = item.title?.toLowerCase().includes('iphone') || item.title?.toLowerCase().includes('phone') ? '[Phone] ' :
                           item.title?.toLowerCase().includes('laptop') || item.title?.toLowerCase().includes('ordinateur') ? '[PC] ' :
                           item.title?.toLowerCase().includes('office') || item.title?.toLowerCase().includes('logiciel') ? '[Soft] ' : '';

        // Titre de l'équipement
        const cleanTitle = item.title || 'Équipement';
        drawTextSafe(page, `${iconPrefix}${cleanTitle}`, {
          x: 50,
          y: yPosition,
          size: 12,
          font: unicodeFontBold,
          color: darkColor,
        });

        // Mensualité
        const monthlyText = `${item.quantity || 1} x ${formatCurrency(item.monthly_payment || 0)}/mois`;
        drawTextSafe(page, monthlyText, {
          x: 450,
          y: yPosition,
          size: 11,
          font: unicodeFontBold,
          color: primaryColor,
        });

        yPosition -= 18;

        // PDF INTERNE : Afficher les détails financiers
        if (pdfType === 'internal') {
          const purchasePrice = (item.purchase_price || 0) * (item.quantity || 1);
          const margin = (item.margin || 0) * (item.quantity || 1);
          totalPurchase += purchasePrice;
          totalMargin += margin;

          drawTextSafe(page, `Prix d'achat : ${formatCurrency(item.purchase_price || 0)}`, {
            x: 70,
            y: yPosition,
            size: 9,
            font: unicodeFont,
            color: grayColor,
          });

          drawTextSafe(page, `Marge : ${formatCurrency(item.margin || 0)}`, {
            x: 250,
            y: yPosition,
            size: 9,
            font: unicodeFont,
            color: grayColor,
          });

          yPosition -= 15;
        }

        // Attributs (ex: Couleur, Stockage)
        if (item.attributes && Array.isArray(item.attributes) && item.attributes.length > 0) {
          for (const attr of item.attributes) {
            drawTextSafe(page, `- ${attr.key}: ${attr.value}`, {
              x: 70,
              y: yPosition,
              size: 9,
              font: unicodeFont,
              color: grayColor,
            });
            yPosition -= 13;
          }
        }

        // Spécifications (ex: RAM, Processeur)
        if (item.specifications && Array.isArray(item.specifications) && item.specifications.length > 0) {
          for (const spec of item.specifications) {
            drawTextSafe(page, `- ${spec.key}: ${spec.value}`, {
              x: 70,
              y: yPosition,
              size: 9,
              font: unicodeFont,
              color: grayColor,
            });
            yPosition -= 13;
          }
        }

        yPosition -= 10; // Espace entre les équipements
      }
    } else {
      drawTextSafe(page, 'Aucun équipement', {
        x: 50,
        y: yPosition,
        size: 11,
        font: unicodeFont,
        color: grayColor,
      });
      yPosition -= 30;
    }

    // Vérifier si on a besoin d'une nouvelle page pour les totaux
    if (yPosition < 200) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = 750;
    }

    yPosition -= 30;

    // Ligne de séparation
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 545, y: yPosition },
      thickness: 1,
      color: lightGrayColor,
    });

    yPosition -= 30;

    // TOTAUX
    drawTextSafe(page, 'MENSUALITE TOTALE :', {
      x: 300,
      y: yPosition,
      size: 12,
      font: unicodeFontBold,
      color: darkColor,
    });

    drawTextSafe(page, formatCurrency(totalMonthly) + '/mois', {
      x: 470,
      y: yPosition,
      size: 14,
      font: unicodeFontBold,
      color: primaryColor,
    });

    yPosition -= 25;

    if (offer.duration_months) {
      drawTextSafe(page, `Duree du contrat : ${offer.duration_months} mois`, {
        x: 300,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: grayColor,
      });

      yPosition -= 18;

      const totalOverDuration = totalMonthly * offer.duration_months;
      drawTextSafe(page, `Total sur la duree : ${formatCurrency(totalOverDuration)}`, {
        x: 300,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: grayColor,
      });
    }

    // PDF INTERNE : Afficher les totaux financiers
    if (pdfType === 'internal') {
      yPosition -= 40;

      drawTextSafe(page, 'DETAILS FINANCIERS', {
        x: 50,
        y: yPosition,
        size: 12,
        font: unicodeFontBold,
        color: darkColor,
      });

      yPosition -= 25;

      drawTextSafe(page, `Total prix d'achat :`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: grayColor,
      });

      drawTextSafe(page, formatCurrency(totalPurchase), {
        x: 470,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: darkColor,
      });

      yPosition -= 18;

      drawTextSafe(page, `Marge totale :`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: grayColor,
      });

      drawTextSafe(page, formatCurrency(totalMargin), {
        x: 470,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: darkColor,
      });

      yPosition -= 18;

      const marginPercent = totalPurchase > 0 ? (totalMargin / totalPurchase * 100) : 0;
      drawTextSafe(page, `Taux de marge :`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: grayColor,
      });

      drawTextSafe(page, `${marginPercent.toFixed(1)}%`, {
        x: 470,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: darkColor,
      });
    }

    // PAGE 3 - CONDITIONS
    page = pdfDoc.addPage([595, 842]);
    yPosition = 750;

    drawTextSafe(page, 'CONDITIONS DU CONTRAT', {
      x: 50,
      y: yPosition,
      size: 16,
      font: unicodeFontBold,
      color: darkColor,
    });

    yPosition -= 40;

    const conditions = [
      `- Duree : ${offer.duration_months || 'A definir'} mois`,
      `- Mensualite : ${formatCurrency(totalMonthly)}/mois`,
      `- Livraison incluse`,
      `- Maintenance incluse`,
      `- Garantie echange direct incluse`,
    ];

    if (offer.leaser?.name) {
      conditions.push(`- Organisme : ${offer.leaser.name}`);
    }

    for (const condition of conditions) {
      drawTextSafe(page, condition, {
        x: 50,
        y: yPosition,
        size: 11,
        font: unicodeFont,
        color: darkColor,
      });
      yPosition -= 20;
    }

    if (offer.additional_terms) {
      yPosition -= 10;
      drawTextSafe(page, 'Conditions supplementaires :', {
        x: 50,
        y: yPosition,
        size: 11,
        font: unicodeFontBold,
        color: darkColor,
      });
      yPosition -= 18;

      drawTextSafe(page, offer.additional_terms, {
        x: 50,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: grayColor,
        maxWidth: 495,
      });
    }

    // Contact
    yPosition -= 60;

    drawTextSafe(page, 'Contact Leazr :', {
      x: 50,
      y: yPosition,
      size: 11,
      font: unicodeFontBold,
      color: darkColor,
    });

    yPosition -= 20;

    if (offer.company?.email) {
      drawTextSafe(page, `Email : ${offer.company.email}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: grayColor,
      });
      yPosition -= 18;
    }

    if (offer.company?.phone) {
      drawTextSafe(page, `Tel : ${offer.company.phone}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: unicodeFont,
        color: grayColor,
      });
    }

    // Footer sur toutes les pages
    const pageCount = pdfDoc.getPageCount();
    const pages = pdfDoc.getPages();
    const footerText = `Document genere le ${formatDate(new Date().toISOString())} - ${offer.company?.name || 'Leazr'}`;
    
    for (let i = 0; i < pageCount; i++) {
      const currentPage = pages[i];
      drawTextSafe(currentPage, footerText, {
        x: 50,
        y: 30,
        size: 8,
        font: unicodeFont,
        color: grayColor,
      });

      drawTextSafe(currentPage, `Page ${i + 1} / ${pageCount}`, {
        x: 520,
        y: 30,
        size: 8,
        font: unicodeFont,
        color: grayColor,
      });
    }

    // Générer le PDF
    const pdfBytes = await pdfDoc.save();

    console.log(`[RENDER-OFFER-PDF-V2] ${ENGINE_VERSION} PDF generated successfully (${pdfBytes.length} bytes)`);

    const filename = pdfType === 'client' 
      ? `Offre-${offer.id.substring(0, 8)}.pdf`
      : `Offre-${offer.id.substring(0, 8)}-INTERNE.pdf`;

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
        'X-PDF-Engine': ENGINE_VERSION,
      },
    });

  } catch (error) {
    console.error(`[RENDER-OFFER-PDF-V2] ${ENGINE_VERSION} Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        code: 'PDF_GENERATION_FAILED',
        engine: ENGINE_VERSION
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
