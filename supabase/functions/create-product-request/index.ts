import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { getAppUrl, getFromEmail, getFromName } from "../_shared/url-utils.ts";
import { createProductRequestSchema, createValidationErrorResponse } from "../_shared/validationSchemas.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getClientIp } from "../_shared/security.ts";
import { stripHtml, generateClientConfirmationEmail, generateClientAccountEmail, generateAdminNotificationEmail } from "../_shared/emailTemplates.ts";
import { z } from "npm:zod@3.22.4";

// Configuration CORS pour permettre les requêtes depuis n'importe quelle origine
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Configuration des environnements Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("SUPABASE_URL configuré:", !!supabaseUrl);
    console.log("SUPABASE_SERVICE_ROLE_KEY configuré:", !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables d'environnement Supabase manquantes");
    }
    
    // Client Supabase avec les privilèges admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Récupération et validation des données
    const rawData = await req.json();
    
    // Validation with zod to prevent injection attacks
    let data;
    try {
      data = createProductRequestSchema.parse(rawData);
      console.log("✅ Données validées avec succès");
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Validation échouée:", error.errors);
        return createValidationErrorResponse(error, corsHeaders);
      }
      throw error;
    }

    // Rate limit public request creation to reduce spam/abuse.
    const clientIp = getClientIp(req);
    const ipLimit = await checkRateLimit(
      supabaseAdmin,
      `create-product-request:${clientIp}`,
      "create-product-request-ip",
      { maxRequests: 10, windowSeconds: 60 }
    );

    if (!ipLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests" }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': ipLimit.remaining.toString(),
          }
        }
      );
    }

    const requesterEmail = (data?.client?.email || data?.contact_info?.email || '').toString().trim().toLowerCase();
    if (requesterEmail) {
      const emailLimit = await checkRateLimit(
        supabaseAdmin,
        `create-product-request-email:${requesterEmail}`,
        "create-product-request-email",
        { maxRequests: 5, windowSeconds: 60 }
      );

      if (!emailLimit.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many requests" }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': emailLimit.remaining.toString(),
            }
          }
        );
      }
    }
    
    console.log("Données reçues par la fonction Edge:", data);
    
    // ========= EXTRACTION DES INFORMATIONS CLIENT ==========
    let clientName: string;
    let clientEmail: string;
    let clientCompany: string | undefined;
    let clientPhone: string | undefined;
    let clientAddress: string | undefined;
    let clientCity: string | undefined;
    let clientPostalCode: string | undefined;
    let clientCountry: string | undefined;
    let clientVatNumber: string | undefined;
    let deliveryAddress: string | undefined;
    let deliveryCity: string | undefined;
    let deliveryPostalCode: string | undefined;
    let deliveryCountry: string | undefined;
    let deliverySameAsBilling = true;

    if (data.client) {
      console.log("📦 Utilisation du format ancien (client)");
      clientName = data.client.name;
      clientEmail = data.client.email;
      clientCompany = data.client.company;
      clientPhone = data.client.phone;
    } else if (data.contact_info && data.company_info) {
      console.log("📦 Utilisation du format nouveau (contact_info + company_info)");
      const firstName = data.contact_info.first_name || '';
      const lastName = data.contact_info.last_name || '';
      clientName = `${firstName} ${lastName}`.trim();
      clientEmail = data.contact_info.email || '';
      clientPhone = data.contact_info.phone;
      
      clientCompany = data.company_info.company_name;
      clientVatNumber = data.company_info.vat_number;
      clientAddress = data.company_info.address;
      clientCity = data.company_info.city;
      clientPostalCode = data.company_info.postal_code;
      clientCountry = data.company_info.country;
      
      if (data.delivery_info) {
        deliverySameAsBilling = data.delivery_info.same_as_company ?? true;
        deliveryAddress = deliverySameAsBilling ? clientAddress : data.delivery_info.address;
        deliveryCity = deliverySameAsBilling ? clientCity : data.delivery_info.city;
        deliveryPostalCode = deliverySameAsBilling ? clientPostalCode : data.delivery_info.postal_code;
        deliveryCountry = deliverySameAsBilling ? clientCountry : data.delivery_info.country;
      }
    }

    console.log("Informations client extraites:", {
      clientName,
      clientEmail,
      clientCompany,
      format: data.client ? 'ancien' : 'nouveau'
    });
    
    const companyName = clientCompany || '';
    
    // Traitement des produits
    console.log("Traitement des produits:", data.products);
    
    // Récupération de l'URL de referer pour détecter la company
    const refererHeader = req.headers.get('referer') || req.headers.get('origin') || '';
    console.log("Referer URL:", refererHeader);
    
    // Détecter la company à partir du domaine/sous-domaine
    let targetCompanyId = null;
    
    if (refererHeader.includes('.leazr.co')) {
      const subdomain = refererHeader.split('//')[1]?.split('.')[0];
      if (subdomain && subdomain !== 'www') {
        const { data: companyDomain } = await supabaseAdmin
          .from('company_domains')
          .select('company_id')
          .eq('subdomain', subdomain)
          .single();
        
        if (companyDomain) {
          targetCompanyId = companyDomain.company_id;
        }
      }
    }
    
    if (!targetCompanyId) {
      console.log("Utilisation du company_id par défaut: c1ce66bb-3ad2-474d-b477-583baa7ff1c0");
      targetCompanyId = "c1ce66bb-3ad2-474d-b477-583baa7ff1c0";
    }

    const equipmentList = [];
    const equipmentCalculations = [];
    let totalPurchaseAmount = 0;
    let totalMonthlyPayment = 0;
    let totalFinancedAmountEstimate = 0;

    // Traitement des produits individuels
    for (const product of data.products) {
      console.log("Produit reçu:", JSON.stringify(product, null, 2));
      
      const { data: productInfo, error: productError } = await supabaseAdmin
        .from('products')
        .select('name, description')
        .eq('id', product.product_id)
        .single();
      
      const productName = productError 
        ? "Produit inconnu" 
        : (productInfo?.name || "Produit inconnu");
      
      if (productError) {
        console.warn("⚠️ Produit non trouvé dans la DB:", product.product_id);
      } else {
        console.log("✅ Informations produit récupérées:", productInfo);
      }

      // ========== RÉCUPÉRATION DES PRIX ==========
      let price = 0;
      let attributes = {};
      let variantMonthlyPrice = 0;
      let productMonthlyPrice = 0;

      console.log(`🔍 Récupération des prix depuis DB Leazr pour ${productName}`);
      
      if (product.variant_id) {
        const { data: variantData, error: variantError } = await supabaseAdmin
          .from('product_variant_prices')
          .select('price, attributes, monthly_price')
          .eq('id', product.variant_id)
          .single();
        
        if (!variantError && variantData) {
          price = variantData.price || 0;
          attributes = variantData.attributes || {};
          variantMonthlyPrice = variantData.monthly_price || 0;
          console.log(`✅ Prix récupérés de product_variant_prices: achat=${price}€, mensuel=${variantMonthlyPrice}€`);
        } else {
          console.log("⚠️ Variante non trouvée, fallback sur products");
        }
      }
      
      if (price === 0) {
        const { data: productPrices } = await supabaseAdmin
          .from('products')
          .select('price, monthly_price')
          .eq('id', product.product_id)
          .single();
        
        price = productPrices?.price || 0;
        productMonthlyPrice = productPrices?.monthly_price || 0;
        console.log(`✅ Prix récupérés de products (fallback): achat=${price}€, mensuel=${productMonthlyPrice}€`);
      }

      let monthlyPrice = 0;

      if (product.unit_price && product.unit_price > 0) {
        // Prix envoyé par iTakecare = ce que le client a vu (déjà arrondi, déjà remisé)
        monthlyPrice = product.unit_price;
        console.log(`📊 Mensualité UNITAIRE iTakecare (prioritaire): ${monthlyPrice}€`);

        // Validation de cohérence avec la DB (log seulement)
        let dbMonthly = variantMonthlyPrice || productMonthlyPrice || 0;
        if (dbMonthly > 0 && product.pack_discount_percentage && product.pack_discount_percentage > 0) {
          dbMonthly = Math.round(dbMonthly * (1 - product.pack_discount_percentage / 100) * 100) / 100;
        }
        if (dbMonthly > 0 && Math.abs(monthlyPrice - dbMonthly) / dbMonthly > 0.05) {
          console.warn(`⚠️ Écart >5% entre iTakecare (${monthlyPrice}€) et DB (${dbMonthly}€) pour ${productName}`);
        }
      } else {
        // Fallback : calcul depuis la DB (cas sans iTakecare)
        monthlyPrice = variantMonthlyPrice || productMonthlyPrice || 0;
        console.log(`📊 Mensualité UNITAIRE DB Leazr (fallback): ${monthlyPrice}€`);
        if (monthlyPrice > 0 && product.pack_discount_percentage && product.pack_discount_percentage > 0) {
          const originalMonthly = monthlyPrice;
          monthlyPrice = Math.round(monthlyPrice * (1 - product.pack_discount_percentage / 100) * 100) / 100;
          console.log(`🏷️ Réduction pack ${product.pack_discount_percentage}% appliquée: ${originalMonthly}€ → ${monthlyPrice}€`);
        }
      }
      
      const totalMonthlyForLine = Math.round(monthlyPrice * product.quantity * 100) / 100;
      
      const coefficientInit = 3.53;
      const sellingPrice = (monthlyPrice * 100) / coefficientInit;
      const equipmentMargin = price > 0 ? ((sellingPrice - price) / price) * 100 : 0;
      
      const totalPurchasePrice = price * product.quantity;
      const totalSellingPrice = sellingPrice * product.quantity;
      
      console.log(`💰 Calculs pour ${productName}:`, {
        quantite: product.quantity,
        prix_achat_unitaire: price.toFixed(2),
        prix_achat_total: totalPurchasePrice.toFixed(2),
        mensualite_unitaire_db: monthlyPrice.toFixed(2),
        mensualite_totale_ligne: totalMonthlyForLine.toFixed(2),
        prix_vente_unitaire: sellingPrice.toFixed(2),
        prix_vente_total: totalSellingPrice.toFixed(2),
        marge_pct: equipmentMargin.toFixed(2) + '%',
        pack_discount: product.pack_discount_percentage || 0
      });
      
      totalPurchaseAmount += totalPurchasePrice;
      totalMonthlyPayment += totalMonthlyForLine;
      totalFinancedAmountEstimate += totalSellingPrice;
      
      equipmentCalculations.push({
        productName,
        productId: product.product_id,
        variantId: product.variant_id,
        quantity: product.quantity,
        purchasePrice: price,
        monthlyPrice,
        sellingPrice,
        margin: equipmentMargin,
        attributes,
        packId: product.pack_id,
        packDiscountPercentage: product.pack_discount_percentage
      });
      
      equipmentList.push(`${productName} (x${product.quantity})`);
    }
    
    console.log("Liste d'équipements:", equipmentList);
    console.log("Mensualité totale des produits (somme unit_prices):", totalMonthlyPayment + "€");

    // ====== CORRECTION MENSUALITÉ : utiliser data.total - services externes ======
    if (data.total && data.total > 0) {
      const externalServicesTotal = (data.external_services || []).reduce(
        (acc: number, svc: any) => acc + (svc.price_htva * (svc.quantity || 1)), 0
      );
      const correctMonthlyTotal = Math.round((data.total - externalServicesTotal) * 100) / 100;
      
      console.log(`📊 data.total: ${data.total}€, services externes: ${externalServicesTotal}€, mensualité équipements correcte: ${correctMonthlyTotal}€`);
      
      if (Math.abs(correctMonthlyTotal - totalMonthlyPayment) > 0.01) {
        console.log(`⚠️ Correction mensualité: ${totalMonthlyPayment}€ → ${correctMonthlyTotal}€`);
        
        // Redistribution proportionnelle au prix d'achat (marges homogènes)
        const totalPurchase = equipmentCalculations.reduce(
          (sum: number, item: any) => sum + item.purchasePrice * item.quantity, 0
        );
        
        if (totalPurchase > 0) {
          let redistributedTotal = 0;
          for (let i = 0; i < equipmentCalculations.length; i++) {
            const item = equipmentCalculations[i];
            const weight = (item.purchasePrice * item.quantity) / totalPurchase;
            // Mensualité unitaire = part proportionnelle du total / quantité
            item.monthlyPrice = Math.round((correctMonthlyTotal * weight / item.quantity) * 100) / 100;
            redistributedTotal += item.monthlyPrice * item.quantity;
          }
          // Ajustement du reste d'arrondi sur la dernière ligne
          const remainder = Math.round((correctMonthlyTotal - redistributedTotal) * 100) / 100;
          if (Math.abs(remainder) > 0 && equipmentCalculations.length > 0) {
            const last = equipmentCalculations[equipmentCalculations.length - 1];
            last.monthlyPrice = Math.round((last.monthlyPrice + remainder / last.quantity) * 100) / 100;
          }
        } else {
          // Fallback : répartition égale si pas de prix d'achat
          const totalQty = equipmentCalculations.reduce((s: number, i: any) => s + i.quantity, 0);
          const equalShare = Math.round((correctMonthlyTotal / totalQty) * 100) / 100;
          equipmentCalculations.forEach((item: any) => {
            item.monthlyPrice = equalShare;
          });
        }
        
        totalMonthlyPayment = correctMonthlyTotal;
        console.log(`✅ Mensualité corrigée: ${totalMonthlyPayment}€ (redistribution par prix d'achat)`);
      }
    }

    // Récupérer le leaser Grenke et ses tranches
    const { data: leaserData } = await supabaseAdmin
      .from('leasers')
      .select(`id, name, leaser_ranges (min, max, coefficient)`)
      .eq('name', '1. Grenke Lease')
      .single();

    if (!leaserData || !leaserData.leaser_ranges) {
      throw new Error('Leaser Grenke non trouvé ou tranches manquantes');
    }

    function getCoefficientForAmount(amount: number, ranges: any[]): number {
      const sortedRanges = ranges.sort((a, b) => a.min - b.min);
      for (const range of sortedRanges) {
        if (amount >= range.min && amount <= range.max) {
          return range.coefficient || 3.53;
        }
      }
      const lastRange = sortedRanges[sortedRanges.length - 1];
      return lastRange?.coefficient || 3.53;
    }

    let estimatedFinancedAmount = (totalMonthlyPayment * 100) / 3.53;
    let coefficient = getCoefficientForAmount(estimatedFinancedAmount, leaserData.leaser_ranges);
    let totalFinancedAmount = (totalMonthlyPayment * 100) / coefficient;
    
    for (let i = 0; i < 5; i++) {
      const newCoefficient = getCoefficientForAmount(totalFinancedAmount, leaserData.leaser_ranges);
      if (Math.abs(newCoefficient - coefficient) < 0.001) break;
      coefficient = newCoefficient;
      totalFinancedAmount = (totalMonthlyPayment * 100) / coefficient;
    }
    
    console.log(`✅ Coefficient final convergé: ${coefficient} pour montant financé: ${totalFinancedAmount.toFixed(2)}€`);

    const marginAmount = totalFinancedAmount - totalPurchaseAmount;
    const marginPercentage = totalPurchaseAmount > 0 ? (marginAmount / totalPurchaseAmount) * 100 : 0;
    const calculatedMonthlyPayment = totalMonthlyPayment;

    // Génération d'un ID unique pour la demande
    const requestId = crypto.randomUUID();
    const clientId = crypto.randomUUID();
    
    let dossierNumber = data.reference_number;
    if (!dossierNumber) {
      // Générer un numéro séquentiel via la séquence PostgreSQL
      const { data: seqNumber, error: seqError } = await supabaseAdmin.rpc('get_next_dossier_number');
      if (seqError || !seqNumber) {
        console.warn('⚠️ Fallback dossier number (sequence error):', seqError);
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-4);
        dossierNumber = `ITC-${year}-OFF-${timestamp}`;
      } else {
        dossierNumber = seqNumber;
      }
    }
    console.log(`📋 Numéro de dossier: ${dossierNumber}`);

    const equipmentDescription = equipmentList.join(', ');

    // Création du client
    const clientData = {
      id: clientId,
      name: clientName,
      email: clientEmail,
      company: clientCompany,
      phone: clientPhone,
      vat_number: clientVatNumber || '',
      address: clientAddress,
      city: clientCity,
      postal_code: clientPostalCode,
      country: clientCountry,
      billing_address: clientAddress,
      billing_city: clientCity,
      billing_postal_code: clientPostalCode,
      billing_country: clientCountry,
      delivery_address: deliveryAddress,
      delivery_city: deliveryCity,
      delivery_postal_code: deliveryPostalCode,
      delivery_country: deliveryCountry,
      delivery_same_as_billing: deliverySameAsBilling,
      status: 'active',
      contact_name: clientName,
      company_id: targetCompanyId
    };

    const { error: clientError } = await supabaseAdmin.from('clients').insert(clientData);
    if (clientError) throw new Error(`Erreur client: ${clientError.message}`);

    // Déterminer le leaser
    const { data: leaserIdData } = await supabaseAdmin
      .from('leasers').select('id').eq('name', 'Grenke Lease').single();
    const leaserId = leaserIdData?.id || 'd60b86d7-a129-4a17-a877-e8e5caa66949';

    const offerSource = 'site_web';
    let offerType: string;
    if (data.partner_slug) {
      offerType = 'partner_request';
    } else if (data.packs && data.packs.length > 0) {
      offerType = 'custom_pack_request';
    } else {
      offerType = 'web_request';
    }
    
    console.log(`Type: ${offerType}, Source: ${offerSource}, Partner: ${data.partner_slug || 'none'}`);

    const offerData = {
      id: requestId,
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      equipment_description: equipmentDescription,
      amount: totalPurchaseAmount,
      monthly_payment: calculatedMonthlyPayment,
      coefficient: coefficient,
      financed_amount: totalFinancedAmount,
      margin: marginPercentage,
      commission: 0,
      type: offerType,
      source: offerSource,
      workflow_status: 'draft',
      status: 'pending',
      remarks: data.partner_slug 
        ? `Demande via partenaire ${data.partner_name || data.partner_slug} (Grenke 36 mois)`
        : 'Demande créée via API web avec Grenke (36 mois)',
      user_id: null,
      company_id: targetCompanyId,
      leaser_id: leaserId,
      dossier_number: dossierNumber,
      partner_slug: data.partner_slug || null,
      partner_name: data.partner_name || null
    };

    const { error: offerError } = await supabaseAdmin.from('offers').insert(offerData);
    if (offerError) throw new Error(`Erreur offre: ${offerError.message}`);

    // ========= GESTION DES PACKS PERSONNALISÉS ==========
    if (data.packs && data.packs.length > 0) {
      for (const pack of data.packs) {
        const packProducts = data.products.filter(p => p.pack_id === pack.custom_pack_id);
        const originalMonthlyTotal = packProducts.reduce((sum, p) => {
          const originalUnitPrice = p.unit_price ? p.unit_price / (1 - (p.pack_discount_percentage || 0) / 100) : 0;
          return sum + (originalUnitPrice * p.quantity);
        }, 0);
        const discountedMonthlyTotal = packProducts.reduce((sum, p) => sum + ((p.unit_price || 0) * p.quantity), 0);
        const monthlySavings = originalMonthlyTotal - discountedMonthlyTotal;
        
        const { data: createdPack, error: packError } = await supabaseAdmin
          .from('offer_custom_packs')
          .insert({
            offer_id: requestId,
            custom_pack_id: pack.custom_pack_id,
            pack_name: pack.pack_name,
            discount_percentage: pack.discount_percentage,
            original_monthly_total: originalMonthlyTotal,
            discounted_monthly_total: discountedMonthlyTotal,
            monthly_savings: monthlySavings
          })
          .select('id')
          .single();
        
        if (packError) {
          console.error("Erreur pack:", packError);
          continue;
        }
        console.log("Pack créé:", pack.pack_name, "- ID:", createdPack.id);
      }
    }

    // Création des équipements détaillés
    for (let i = 0; i < equipmentCalculations.length; i++) {
      const calc = equipmentCalculations[i];
      const product = data.products[i];
      
      const finalSellingPrice = (calc.monthlyPrice * 100) / coefficient;
      const finalMargin = calc.purchasePrice > 0 ? ((finalSellingPrice - calc.purchasePrice) / calc.purchasePrice) * 100 : 0;

      let customPackDbId = null;
      if (calc.packId) {
        const { data: packData } = await supabaseAdmin
          .from('offer_custom_packs').select('id')
          .eq('offer_id', requestId).eq('custom_pack_id', calc.packId).single();
        customPackDbId = packData?.id || null;
      }
      
      const originalUnitPrice = calc.packDiscountPercentage 
        ? calc.monthlyPrice / (1 - calc.packDiscountPercentage / 100)
        : null;

      const equipmentData = {
        offer_id: requestId,
        title: product.product_name || calc.productName,
        purchase_price: calc.purchasePrice,
        quantity: calc.quantity,
        monthly_payment: calc.monthlyPrice * calc.quantity,
        selling_price: finalSellingPrice,
        margin: finalMargin,
        coefficient: coefficient,
        duration: product.duration || 36,
        product_id: calc.productId || null,
        variant_id: calc.variantId || null,
        custom_pack_id: customPackDbId,
        pack_discount_percentage: calc.packDiscountPercentage || null,
        original_unit_price: originalUnitPrice,
        is_part_of_custom_pack: !!calc.packId
      };

      const { data: equipment, error: equipmentError } = await supabaseAdmin
        .from('offer_equipment').insert(equipmentData).select('id').single();

      if (equipmentError) {
        console.error("Erreur équipement:", equipmentError);
        continue;
      }

      if (equipment && calc.attributes && Object.keys(calc.attributes).length > 0) {
        for (const [key, value] of Object.entries(calc.attributes)) {
          await supabaseAdmin.from('offer_equipment_attributes').insert({
            equipment_id: equipment.id,
            key: key,
            value: String(value)
          });
        }
      }
    }

    // ========= INSERTION DES SERVICES EXTERNES ==========
    if (data.external_services && data.external_services.length > 0) {
      console.log(`📦 Insertion de ${data.external_services.length} services externes`);
      
      for (const service of data.external_services) {
        const { error: serviceError } = await supabaseAdmin
          .from('offer_external_services')
          .insert({
            offer_id: requestId,
            provider_name: service.provider_name,
            product_name: service.product_name,
            description: service.description || null,
            price_htva: service.price_htva,
            billing_period: service.billing_period,
            quantity: service.quantity || 1
          });
        
        if (serviceError) {
          console.error(`❌ Erreur service externe ${service.product_name}:`, serviceError);
        } else {
          console.log(`✅ Service externe créé: ${service.provider_name} - ${service.product_name}`);
        }
      }
    }

    // ========= ENVOI D'EMAIL AU CLIENT ==========
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const timeStr = new Date().toLocaleTimeString('fr-FR');
    
    if (clientEmail) {
      const { data: smtpSettings, error: settingsError } = await supabaseAdmin
        .from('smtp_settings')
        .select('resend_api_key, from_email, from_name, use_resend')
        .eq('id', 1).single();
      
      if (settingsError || !smtpSettings) throw new Error("Paramètres SMTP non trouvés");

      const { data: companyInfo } = await supabaseAdmin
        .from('companies').select('name, logo_url').eq('id', targetCompanyId).single();
      
      const companyLogo = companyInfo?.logo_url || '';
      const platformCompanyName = companyInfo?.name || 'iTakecare';

      const formatMonthlyPayment = (p: number) => parseFloat(p.toFixed(2)).toString();
      const summaryItemsHtml = [
        `<li>📱 Équipement : ${equipmentDescription}</li>`,
        `<li>📅 Mensualité : ${formatMonthlyPayment(totalMonthlyPayment)} €/mois</li>`
      ].join('\n            ');

      // Check for custom email template
      const { data: emailTemplate } = await supabaseAdmin
        .from('email_templates').select('subject, html_content')
        .eq('type', 'product_request').eq('company_id', targetCompanyId).single();
      
      // Création de compte client si demandé
      if (data.create_client_account) {
        try {
          const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: clientEmail,
            email_confirm: true,
            user_metadata: { name: clientName || companyName, role: "client", client_id: clientId },
          });
          
          if (createUserError) throw createUserError;

          const { data: passwordLinkData, error: passwordLinkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery', email: clientEmail,
          });

          if (!passwordLinkError) {
            const passwordLink = passwordLinkData?.properties?.action_link || '';
            const subject = `🎉 Bienvenue sur ${platformCompanyName} - Votre compte a été créé`;
            const htmlContent = generateClientAccountEmail({
              companyLogo, platformCompanyName, clientName, companyName,
              passwordLink, summaryItemsHtml, dateStr, timeStr
            });

            // Envoi email uniquement pour la création de compte
            const globalResendKey = Deno.env.get('ITAKECARE_RESEND_API');
            const resendApiKey = globalResendKey || smtpSettings.resend_api_key;
            
            if (resendApiKey) {
              const resend = new Resend(resendApiKey);
              const fromName = globalResendKey ? "iTakecare" : getFromName(smtpSettings);
              const fromEmail = globalResendKey ? "noreply@itakecare.be" : getFromEmail(smtpSettings);
              const from = `${fromName} <${fromEmail}>`;
              
              const emailResult = await resend.emails.send({
                from, to: clientEmail, subject, html: htmlContent, text: stripHtml(htmlContent),
              });
              
              if (emailResult.error) {
                console.error("Erreur Resend:", emailResult.error);
              } else {
                console.log("Email compte client envoyé:", emailResult.data);
              }
            }
          }
        } catch (accountError) {
          console.error("Erreur création compte:", accountError);
        }
      } else {
        console.log("Pas de création de compte demandée, aucun email client envoyé");
      }
    }

    // ========= NOTIFICATION AUX ADMINISTRATEURS ==========
    try {
      const { data: adminUsers, error: adminError } = await supabaseAdmin
        .rpc('get_admin_emails_for_company', { p_company_id: targetCompanyId });
      
      const fallbackNotification = async (errorReason: string) => {
        await supabaseAdmin.from('admin_notifications').insert({
          company_id: targetCompanyId,
          offer_id: requestId,
          type: 'new_offer',
          title: `Nouvelle demande d'offre - ${clientName || companyName}`,
          message: `Demande reçue de ${clientEmail}. Montant: ${totalMonthlyPayment.toFixed(2)}€/mois`,
          metadata: { client_name: clientName, company_name: companyName, client_email: clientEmail, total_monthly: totalMonthlyPayment, error: errorReason }
        });
      };

      if (adminError || !adminUsers || adminUsers.length === 0) {
        await fallbackNotification(adminError ? adminError.message : 'No admin users found');
      } else {
        const adminEmails = adminUsers.map(a => ({ email: a.email, name: a.name || 'Administrateur' }));
        
        if (adminEmails.length === 0) {
          await fallbackNotification('No valid admin emails');
        } else {
          const globalResendKey = Deno.env.get('ITAKECARE_RESEND_API');
          const { data: smtpSettings } = await supabaseAdmin
            .from('smtp_settings').select('resend_api_key, from_email, from_name').eq('id', 1).single();
          
          const resendApiKey = globalResendKey || smtpSettings?.resend_api_key;
          
          if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            const fromName = globalResendKey ? "iTakecare" : getFromName(smtpSettings);
            const fromEmailAddr = globalResendKey ? "noreply@itakecare.be" : getFromEmail(smtpSettings);
            const from = `${fromName} <${fromEmailAddr}>`;
            
      const { data: companyInfo } = await supabaseAdmin
        .from('companies').select('name, logo_url, slug').eq('id', targetCompanyId).single();
            
            const adminSubject = `🚨 Nouvelle demande d'offre reçue - ${clientName || companyName}`;
            const adminHtmlContent = generateAdminNotificationEmail({
              companyLogo: companyInfo?.logo_url || '',
              platformCompanyName: companyInfo?.name || 'iTakecare',
              clientName, companyName, clientEmail,
              contactPhone: data.contact_info?.phone || clientPhone || '',
              companyAddress: data.company_info?.address || clientAddress || '',
              companyCity: data.company_info?.city || clientCity || '',
              companyPostalCode: data.company_info?.postal_code || clientPostalCode || '',
              vatNumber: data.company_info?.vat_number || clientVatNumber || '',
              equipmentDescription, totalPurchaseAmount, totalMonthlyPayment,
              coefficient, totalFinancedAmount, marginAmount, marginPercentage,
              partnerSlug: data.partner_slug,
              partnerName: data.partner_name,
              externalServices: data.external_services,
              deliveryInfo: data.delivery_info,
              adminLink: `${getAppUrl(req)}/${companyInfo?.slug || 'itakecare'}/admin/offers/${requestId}`,
              dateStr, timeStr,
            });
            
            const recipients = adminEmails.map(a => a.email);
            try {
              let adminEmailResult = await resend.emails.send({
                from, to: recipients, subject: adminSubject,
                html: adminHtmlContent, text: stripHtml(adminHtmlContent),
              });

              if (adminEmailResult.error && ((adminEmailResult.error as any).name === 'rate_limit_exceeded' || /Too many requests/i.test(((adminEmailResult.error as any).message) || ''))) {
                await new Promise((r) => setTimeout(r, 800));
                adminEmailResult = await resend.emails.send({
                  from, to: recipients, subject: adminSubject,
                  html: adminHtmlContent, text: stripHtml(adminHtmlContent),
                });
              }

              if (adminEmailResult.error) {
                console.error('❌ Erreur email admin:', adminEmailResult.error);
                await fallbackNotification('Email sending failed');
              } else {
                console.log(`✅ Email admin envoyé à: ${recipients.join(', ')}`);
              }
            } catch (adminEmailError) {
              console.error('❌ Exception email admin:', adminEmailError);
              await fallbackNotification('Email exception');
            }
          }
        }
      }
    } catch (adminNotificationError) {
      console.error("Exception notifications admin:", adminNotificationError);
    }

    // Récupérer les packs créés pour la réponse
    let packsSummary = [];
    if (data.packs && data.packs.length > 0) {
      const { data: createdPacks } = await supabaseAdmin
        .from('offer_custom_packs')
        .select('pack_name, discount_percentage, monthly_savings, original_monthly_total, discounted_monthly_total')
        .eq('offer_id', requestId);
      
      if (createdPacks) {
        packsSummary = createdPacks.map(pack => ({
          pack_name: pack.pack_name,
          discount_percentage: pack.discount_percentage,
          monthly_savings: parseFloat(pack.monthly_savings.toFixed(2)),
          original_monthly_total: parseFloat(pack.original_monthly_total.toFixed(2)),
          discounted_monthly_total: parseFloat(pack.discounted_monthly_total.toFixed(2))
        }));
      }
    }

    const responseData = {
      id: requestId,
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      client_company: companyName,
      equipment_description: equipmentDescription,
      amount: totalPurchaseAmount,
      monthly_payment: calculatedMonthlyPayment,
      coefficient: coefficient,
      financed_amount: totalFinancedAmount,
      margin: parseFloat(marginAmount.toFixed(2)),
      packs_summary: packsSummary,
      partner_slug: data.partner_slug || null,
      partner_name: data.partner_name || null,
      external_services_count: data.external_services?.length || 0,
      created_at: new Date().toISOString()
    };

    console.log("Traitement réussi:", responseData);
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Erreur dans la fonction Edge:", error);
    return new Response(
      JSON.stringify({ error: `Une erreur est survenue: ${error instanceof Error ? error.message : 'Unknown error'}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
