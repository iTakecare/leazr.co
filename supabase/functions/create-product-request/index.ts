import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getAppUrl, getFromEmail, getFromName } from "../_shared/url-utils.ts";
import { createProductRequestSchema, createValidationErrorResponse } from "../_shared/validationSchemas.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getClientIp } from "../_shared/security.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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
    // Support des deux formats : ancien (client) et nouveau (contact_info + company_info)
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
      // Format ancien (client direct)
      console.log("📦 Utilisation du format ancien (client)");
      clientName = data.client.name;
      clientEmail = data.client.email;
      clientCompany = data.client.company;
      clientPhone = data.client.phone;
    } else if (data.contact_info && data.company_info) {
      // Format nouveau (iTakecare)
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
      
      // Adresse de livraison
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
    
    // Traitement des produits
    console.log("Traitement des produits:", data.products);
    
    // Récupération de l'URL de referer pour détecter la company
    const refererHeader = req.headers.get('referer') || req.headers.get('origin') || '';
    console.log("Referer URL:", refererHeader);
    
    // Détecter la company à partir du domaine/sous-domaine
    let targetCompanyId = null;
    
    if (refererHeader.includes('.leazr.co')) {
      // Extraction du sous-domaine
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
    
    // Si pas de company détectée, utiliser la company par défaut (iTakecare)
    if (!targetCompanyId) {
      console.log("Utilisation du company_id par défaut: c1ce66bb-3ad2-474d-b477-583baa7ff1c0");
      targetCompanyId = "c1ce66bb-3ad2-474d-b477-583baa7ff1c0";
    }

    const equipmentList = [];
    const equipmentCalculations = []; // Store calculations for later use
    let totalPurchaseAmount = 0;
    let totalMonthlyPayment = 0;
    let totalFinancedAmountEstimate = 0;

    // Traitement des produits individuels
    for (const product of data.products) {
      console.log("Produit reçu:", JSON.stringify(product, null, 2));
      
      // Récupérer le nom du produit
      console.log("Récupération du nom du produit pour product_id:", product.product_id);
      
      const { data: productInfo, error: productError } = await supabaseAdmin
        .from('products')
        .select('name, description')
        .eq('id', product.product_id)
        .single();
      
      // Si produit non trouvé → mettre "Produit inconnu"
      const productName = productError 
        ? "Produit inconnu" 
        : (productInfo?.name || "Produit inconnu");
      
      if (productError) {
        console.warn("⚠️ Produit non trouvé dans la DB:", product.product_id);
      } else {
        console.log("✅ Informations produit récupérées:", productInfo);
      }

      // ========== RÉCUPÉRATION DES PRIX ==========
      let price = 0; // Prix d'achat unitaire (purchase_price)
      let attributes = {};
      let variantMonthlyPrice = 0; // Mensualité unitaire depuis variant
      let productMonthlyPrice = 0; // Mensualité unitaire depuis product (fallback)

      // 🔵 PRIX D'ACHAT + MENSUALITÉ : TOUJOURS depuis DB Leazr (source de vérité)
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
      
      // Fallback sur la table products si variante non trouvée ou pas de variant_id
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

      // 🟢 MENSUALITÉ UNITAIRE : DB Leazr comme source de vérité
      let monthlyPrice = variantMonthlyPrice || productMonthlyPrice || 0;
      console.log(`📊 Mensualité UNITAIRE DB Leazr: ${monthlyPrice}€`);
      
      // Appliquer la réduction pack partenaire si applicable
      if (monthlyPrice > 0 && product.pack_discount_percentage && product.pack_discount_percentage > 0) {
        const originalMonthly = monthlyPrice;
        monthlyPrice = monthlyPrice * (1 - product.pack_discount_percentage / 100);
        console.log(`🏷️ Réduction pack ${product.pack_discount_percentage}% appliquée: ${originalMonthly}€ → ${monthlyPrice}€`);
      }
      
      // Fallback sur unit_price iTakecare UNIQUEMENT si pas de prix mensuel en DB
      if (monthlyPrice === 0) {
        monthlyPrice = (product.unit_price || 0) / product.quantity;
        console.log(`⚠️ Fallback sur unit_price iTakecare: ${monthlyPrice}€/u`);
      }
      
      const totalMonthlyForLine = monthlyPrice * product.quantity;
      
      // Calculs par équipement
      const coefficient = 3.53; // Estimation initiale
      const sellingPrice = (monthlyPrice * 100) / coefficient;
      const equipmentMargin = price > 0 ? ((sellingPrice - price) / price) * 100 : 0;
      
      // Totaux pour cet équipement
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
      
      // Accumuler les totaux
      totalPurchaseAmount += totalPurchasePrice;
      totalMonthlyPayment += totalMonthlyForLine; // Utiliser le total mensuel depuis DB Leazr
      totalFinancedAmountEstimate += totalSellingPrice;
      
      console.log("Montants cumulés - Total d'achat:", totalPurchaseAmount, "Mensuel:", totalMonthlyPayment);
      
      // Stocker les calculs pour plus tard
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
      console.log("Attributs du variant à stocker:", attributes);
    }
    
    console.log("Liste d'équipements:", equipmentList);
    console.log("Mensualité totale des produits:", totalMonthlyPayment + "€");

    // Récupérer le leaser Grenke et ses tranches
    const { data: leaserData } = await supabaseAdmin
      .from('leasers')
      .select(`
        id,
        name,
        leaser_ranges (
          min,
          max,
          coefficient
        )
      `)
      .eq('name', '1. Grenke Lease')
      .single();

    if (!leaserData || !leaserData.leaser_ranges) {
      throw new Error('Leaser Grenke non trouvé ou tranches manquantes');
    }

    console.log("GRENKE trouvé avec tranches:", leaserData.name, "- Nombre de tranches:", leaserData.leaser_ranges.length);

    // Fonction pour trouver le coefficient selon le montant
    function getCoefficientForAmount(amount: number, ranges: any[]): number {
      const sortedRanges = ranges.sort((a, b) => a.min - b.min);
      
      for (const range of sortedRanges) {
        if (amount >= range.min && amount <= range.max) {
          return range.coefficient || 3.53; // Fallback par défaut
        }
      }
      
      // Si pas de tranche trouvée, utiliser la dernière tranche
      const lastRange = sortedRanges[sortedRanges.length - 1];
      return lastRange?.coefficient || 3.53;
    }

    // Calcul itératif pour trouver le bon coefficient
    // Estimation initiale correcte : mensualité × 100 / coefficient_par_défaut
    let estimatedFinancedAmount = (totalMonthlyPayment * 100) / 3.53;
    let coefficient = getCoefficientForAmount(estimatedFinancedAmount, leaserData.leaser_ranges);
    let totalFinancedAmount = (totalMonthlyPayment * 100) / coefficient; // Formule Grenke
    
    // Itération pour convergence (max 5 itérations)
    for (let i = 0; i < 5; i++) {
      const newCoefficient = getCoefficientForAmount(totalFinancedAmount, leaserData.leaser_ranges);
      if (Math.abs(newCoefficient - coefficient) < 0.001) {
        break; // Convergence atteinte
      }
      coefficient = newCoefficient;
      totalFinancedAmount = (totalMonthlyPayment * 100) / coefficient;
    }
    
    console.log(`✅ Coefficient final convergé: ${coefficient} pour montant financé: ${totalFinancedAmount.toFixed(2)}€`);

    const marginAmount = totalFinancedAmount - totalPurchaseAmount;
    const marginPercentage = totalPurchaseAmount > 0 ? (marginAmount / totalPurchaseAmount) * 100 : 0;
    const calculatedMonthlyPayment = totalMonthlyPayment;

    console.log("📊 Calculs finaux de l'offre:\n" +
      "      - Prix d'achat total: " + totalPurchaseAmount.toFixed(2) + "€\n" +
      "      - Montant financé total: " + totalFinancedAmount.toFixed(2) + "€\n" +
      "      - Coefficient utilisé: " + coefficient + "\n" +
      "      - Mensualité totale: " + calculatedMonthlyPayment.toFixed(2) + "€\n" +
      "      - Marge: " + marginAmount.toFixed(2) + "€ (" + marginPercentage.toFixed(2) + "%)");

    // Génération d'un ID unique pour la demande
    const requestId = crypto.randomUUID();
    const clientId = crypto.randomUUID();
    
    // Génération du numéro de dossier (même format que le frontend)
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-4);
    const dossierNumber = `ITC-${year}-OFF-${timestamp}`;
    console.log("Numéro de dossier généré:", dossierNumber);

    // Les informations client ont déjà été extraites plus haut (lignes 55-106)
    const equipmentDescription = equipmentList.join(', ');

    // Création du client avec les informations extraites
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

    console.log("Création du client avec les données:", clientData);

    const { error: clientError } = await supabaseAdmin
      .from('clients')
      .insert(clientData);

    if (clientError) {
      console.error("Erreur lors de la création du client :", clientError);
      throw new Error(`Erreur client: ${clientError.message}`);
    }

    // Déterminer le leaser (Grenke pour ce cas)
    const { data: leaserIdData } = await supabaseAdmin
      .from('leasers')
      .select('id')
      .eq('name', 'Grenke Lease')
      .single();

    const leaserId = leaserIdData?.id || 'd60b86d7-a129-4a17-a877-e8e5caa66949';

    // La source est toujours 'site_web' car toutes les demandes viennent du site iTakecare
    const offerSource = 'site_web';
    
    // Le type est déterminé selon la présence de partenaire ou de packs personnalisés
    let offerType: string;
    if (data.partner_slug) {
      offerType = 'partner_request';  // Demande via un partenaire
    } else if (data.packs && data.packs.length > 0) {
      offerType = 'custom_pack_request';  // Demande web avec pack personnalisé
    } else {
      offerType = 'web_request';         // Demande web standard (catalogue)
    }
    
    console.log(`Type: ${offerType}, Source: ${offerSource}, Partner: ${data.partner_slug || 'none'}`);

    // Création de l'offre
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

    console.log("Création de l'offre avec les données:", offerData);

    const { error: offerError } = await supabaseAdmin
      .from('offers')
      .insert(offerData);

    if (offerError) {
      console.error("Erreur lors de la création de l'offre :", offerError);
      throw new Error(`Erreur offre: ${offerError.message}`);
    }

    // ========= GESTION DES PACKS PERSONNALISÉS ==========
    if (data.packs && data.packs.length > 0) {
      console.log("Traitement des packs personnalisés:", data.packs.length, "packs");
      
      for (const pack of data.packs) {
        console.log("Création du pack:", pack.pack_name);
        
        // Calculer les totaux du pack à partir des produits
        const packProducts = data.products.filter(p => p.pack_id === pack.custom_pack_id);
        
        const originalMonthlyTotal = packProducts.reduce((sum, p) => {
          // Recalculer le prix original sans réduction
          const originalUnitPrice = p.unit_price ? p.unit_price / (1 - (p.pack_discount_percentage || 0) / 100) : 0;
          return sum + (originalUnitPrice * p.quantity);
        }, 0);
        
        const discountedMonthlyTotal = packProducts.reduce((sum, p) => 
          sum + ((p.unit_price || 0) * p.quantity), 0
        );
        
        const monthlySavings = originalMonthlyTotal - discountedMonthlyTotal;
        
        // Insérer le pack personnalisé
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
          console.error("Erreur lors de la création du pack personnalisé:", packError);
          // Ne pas bloquer la création de l'offre, juste logger
          continue;
        }
        
        console.log("Pack personnalisé créé avec succès:", pack.pack_name, "- ID:", createdPack.id);
      }
    }

    // Création des équipements détaillés
    console.log("Création des équipements détaillés:", equipmentCalculations.length, "items");

    for (let i = 0; i < equipmentCalculations.length; i++) {
      const calc = equipmentCalculations[i];
      const product = data.products[i];
      
      // Recalculer le prix de vente et la marge avec le coefficient final
      const finalSellingPrice = (calc.monthlyPrice * 100) / coefficient;
      const finalMargin = calc.purchasePrice > 0 ? ((finalSellingPrice - calc.purchasePrice) / calc.purchasePrice) * 100 : 0;
      
      console.log(`✅ Création équipement ${calc.productName}:`, {
        prix_achat: calc.purchasePrice.toFixed(2),
        prix_vente: finalSellingPrice.toFixed(2),
        mensualite_unitaire: calc.monthlyPrice.toFixed(2),
        marge: finalMargin.toFixed(2) + '%',
        quantity: calc.quantity
      });

      // Récupérer l'ID du pack personnalisé si applicable
      let customPackDbId = null;
      if (calc.packId) {
        const { data: packData } = await supabaseAdmin
          .from('offer_custom_packs')
          .select('id')
          .eq('offer_id', requestId)
          .eq('custom_pack_id', calc.packId)
          .single();
        
        customPackDbId = packData?.id || null;
      }
      
      // Calculer le prix original si le produit fait partie d'un pack
      const originalUnitPrice = calc.packDiscountPercentage 
        ? calc.monthlyPrice / (1 - calc.packDiscountPercentage / 100)
        : null;

      const equipmentData = {
        offer_id: requestId,
        title: product.product_name || calc.productName,
        purchase_price: calc.purchasePrice,
        quantity: calc.quantity,
        monthly_payment: calc.monthlyPrice * calc.quantity, // TOTAL de la ligne (convention: monthly_payment = total)
        selling_price: finalSellingPrice,
        margin: finalMargin,
        coefficient: coefficient,
        duration: product.duration || 36,
        product_id: calc.productId || null,
        variant_id: calc.variantId || null,
        
        // Champs pour les packs
        custom_pack_id: customPackDbId,
        pack_discount_percentage: calc.packDiscountPercentage || null,
        original_unit_price: originalUnitPrice,
        is_part_of_custom_pack: !!calc.packId
      };

      console.log("Création de l'équipement:", equipmentData);

      const { data: equipment, error: equipmentError } = await supabaseAdmin
        .from('offer_equipment')
        .insert(equipmentData)
        .select('id')
        .single();

      if (equipmentError) {
        console.error("Erreur lors de la création de l'équipement:", equipmentError);
        continue;
      }

      console.log("Équipement créé avec succès:", calc.productName);

      // Stockage des attributs
      if (equipment && calc.attributes && Object.keys(calc.attributes).length > 0) {
        console.log("Stockage des attributs pour l'équipement ID:", equipment.id);
        
        for (const [key, value] of Object.entries(calc.attributes)) {
          const { error: attrError } = await supabaseAdmin
            .from('offer_equipment_attributes')
            .insert({
              equipment_id: equipment.id,
              key: key,
              value: String(value)
            });

          if (attrError) {
            console.error(`Erreur lors de la création de l'attribut ${key}:`, attrError);
          } else {
            console.log(`Attribut ${key}: ${value} créé avec succès`);
          }
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
          console.error(`❌ Erreur insertion service externe ${service.product_name}:`, serviceError);
        } else {
          console.log(`✅ Service externe créé: ${service.provider_name} - ${service.product_name}`);
        }
      }
    }

    // ========= ENVOI D'EMAIL AU CLIENT ==========
    if (clientEmail) {
      console.log("Début de la procédure d'envoi d'email...");
      
      // Récupérer les paramètres d'email de l'entreprise
      const { data: smtpSettings, error: settingsError } = await supabaseAdmin
        .from('smtp_settings')
        .select('resend_api_key, from_email, from_name, use_resend')
        .eq('id', 1)
        .single();
      
      if (settingsError || !smtpSettings) {
        console.error("Erreur lors de la récupération des paramètres SMTP:", settingsError);
        throw new Error("Paramètres SMTP non trouvés");
      }
      
      console.log("Paramètres email récupérés:", {
        from_email: smtpSettings.from_email, 
        from_name: smtpSettings.from_name,
        use_resend: smtpSettings.use_resend
      });

      // Récupérer les informations de l'entreprise pour personnaliser les emails
      const { data: companyInfo, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('name, logo_url')
        .eq('id', targetCompanyId)
        .single();
      
      const companyLogo = companyInfo?.logo_url || '';
      const platformCompanyName = companyInfo?.name || 'iTakecare';

      // Fonctions utilitaires pour formatter les emails
      const formatAmount = (amount: number): string => {
        return parseFloat(amount.toFixed(2)).toString();
      };
      
      const formatMonthlyPayment = (payment: number): string => {
        return parseFloat(payment.toFixed(2)).toString();
      };
      
      const generateSummaryItems = (equipment: string, totalAmount: number, monthlyPayment: number): string => {
        let items = [`<li>📱 Équipement : ${equipment}</li>`];
        items.push(`<li>📅 Mensualité : ${formatMonthlyPayment(monthlyPayment)} €/mois</li>`);
        return items.join('\n            ');
      };

      // Récupérer le modèle d'email de demande de produit
      const { data: emailTemplate, error: templateError } = await supabaseAdmin
        .from('email_templates')
        .select('subject, html_content')
        .eq('type', 'product_request')
        .eq('company_id', targetCompanyId)
        .single();
      
      if (templateError) {
        console.log("Erreur lors de la récupération du modèle d'email, utilisation du modèle par défaut:", templateError);
      }

      let subject = `🎉 Bienvenue sur ${platformCompanyName} - Confirmation de votre demande`;
      let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            ${companyLogo ? `<img src="${companyLogo}" alt="${platformCompanyName}" style="height: 50px; max-width: 200px; object-fit: contain;">` : `<h1 style="color: #2d618f; margin-bottom: 10px;">${platformCompanyName}</h1>`}
          </div>
          <h2 style="color: #2d618f; border-bottom: 2px solid #2d618f; padding-bottom: 10px;">👋 Bienvenue ${clientName || companyName} !</h2>
          <p style="font-size: 16px; line-height: 1.6;">✨ Votre demande d'équipement a été créée avec succès sur la plateforme iTakecare.</p>
          <p style="font-size: 16px; line-height: 1.6;">📋 Voici un récapitulatif de votre demande :</p>
          <ul style="background: linear-gradient(135deg, #f8fafd 0%, #e8f4fd 100%); padding: 20px; border-radius: 10px; list-style: none; margin: 20px 0; border-left: 4px solid #2d618f;">
            ${generateSummaryItems(equipmentDescription, totalPurchaseAmount, totalMonthlyPayment)}
          </ul>
          <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4ecd4 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #4caf50;">
            <h3 style="color: #2e7d32; margin-top: 0; display: flex; align-items: center;">🎯 Prochaines étapes</h3>
            <ol style="color: #2e7d32; padding-left: 20px; line-height: 1.8;">
              <li><strong>Traitement de votre demande</strong> : Notre équipe analyse votre demande sous 24h ouvrées</li>
              <li><strong>Validation et signature</strong> : Une fois acceptée, nous finalisons ensemble votre contrat</li>
            </ol>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">💬 Vous avez des questions ? Notre équipe est là pour vous aider !</p>
          </div>
          <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            📧 Cet email a été envoyé automatiquement suite à votre demande d'équipement.<br>
            🕐 Demande reçue le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </p>
          <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 11px; margin: 0;">
              ${platformCompanyName} - Solution de leasing professionnel<br>
              Merci de votre confiance ! 🙏
            </p>
          </div>
        </div>
      `;

      if (emailTemplate && emailTemplate.html_content) {
        subject = emailTemplate.subject || subject;
        htmlContent = emailTemplate.html_content;
      }

      // Vérifier si l'utilisateur demande la création d'un compte
      if (data.create_client_account) {
        console.log("L'utilisateur a demandé la création d'un compte client");
        
        try {
          // Créer un compte utilisateur sans mot de passe
          const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: clientEmail,
            email_confirm: true,
            user_metadata: { 
              name: clientName || companyName,
              role: "client",
              client_id: clientId 
            },
          });
          
          if (createUserError) {
            console.error("Erreur lors de la création du compte utilisateur:", createUserError);
            throw new Error(`Erreur lors de la création du compte: ${createUserError.message}`);
          }
          
          console.log("Compte utilisateur créé avec succès:", userData);

          // Créer un lien de définition de mot de passe
          const { data: passwordLinkData, error: passwordLinkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: clientEmail,
          });

          if (passwordLinkError) {
            console.error("Erreur lors de la génération du lien de mot de passe:", passwordLinkError);
          } else {
            console.log("Lien de définition de mot de passe généré avec succès");
            
            const passwordLink = passwordLinkData?.properties?.action_link || '';
            
            // Template spécial pour création de compte
            htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                  ${companyLogo ? `<img src="${companyLogo}" alt="${platformCompanyName}" style="height: 50px; max-width: 200px; object-fit: contain;">` : `<h1 style="color: #2d618f; margin-bottom: 10px;">${platformCompanyName}</h1>`}
                </div>
                <h2 style="color: #2d618f; border-bottom: 2px solid #2d618f; padding-bottom: 10px;">👋 Bienvenue ${clientName || companyName} !</h2>
                <p style="font-size: 16px; line-height: 1.6;">✨ Votre demande d'équipement a été créée avec succès sur la plateforme iTakecare.</p>
                
                <div style="background: linear-gradient(135deg, #e8f4fd 0%, #d1e9fc 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #2d618f;">
                  <h3 style="color: #2d618f; margin-top: 0; display: flex; align-items: center;">🎉 Votre compte client a été créé !</h3>
                  <p style="color: #2d618f; margin: 10px 0;">Nous avons créé votre compte personnel pour suivre vos demandes et gérer vos équipements.</p>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${passwordLink}" style="background: linear-gradient(135deg, #2d618f 0%, #4a90e2 100%); color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                      🔐 Définir mon mot de passe
                    </a>
                  </div>
                  <p style="color: #666; font-size: 12px; margin: 0;">Ce lien est valable pendant 24 heures. Vous pourrez ensuite accéder à votre espace client personnalisé.</p>
                </div>

                <p style="font-size: 16px; line-height: 1.6;">📋 Récapitulatif de votre demande :</p>
                <ul style="background: linear-gradient(135deg, #f8fafd 0%, #e8f4fd 100%); padding: 20px; border-radius: 10px; list-style: none; margin: 20px 0; border-left: 4px solid #2d618f;">
                  ${generateSummaryItems(equipmentDescription, totalPurchaseAmount, totalMonthlyPayment)}
                </ul>

                <div style="background: linear-gradient(135deg, #e8f5e8 0%, #d4ecd4 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #4caf50;">
                  <h3 style="color: #2e7d32; margin-top: 0;">🎯 Prochaines étapes</h3>
                  <ol style="color: #2e7d32; padding-left: 20px; line-height: 1.8;">
                    <li><strong>Activez votre compte</strong> : Cliquez sur le lien ci-dessus pour définir votre mot de passe</li>
                    <li><strong>Accédez à votre espace</strong> : Suivez le traitement de votre demande en temps réel</li>
                    <li><strong>Recevez votre offre</strong> : Notre équipe vous contactera sous 24h ouvrées</li>
                  </ol>
                </div>

                <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                  📧 Cet email a été envoyé automatiquement suite à votre demande d'équipement.<br>
                  🕐 Demande reçue le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
                </p>
              </div>
            `;
          }
        } catch (accountError) {
          console.error("Erreur lors de la création du compte:", accountError);
          // Continuer sans bloquer l'envoi d'email
        }
      } else {
        console.log("L'utilisateur n'a pas demandé de création de compte client");
      }

      // Envoi de l'email de confirmation au client
      const globalResendKey = Deno.env.get('ITAKECARE_RESEND_API');
      const resendApiKey = globalResendKey || smtpSettings.resend_api_key;
      
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const fromName = globalResendKey ? "iTakecare" : getFromName(smtpSettings);
        const fromEmail = globalResendKey ? "noreply@itakecare.be" : getFromEmail(smtpSettings);
        const from = `${fromName} <${fromEmail}>`;
        
        console.log("Tentative d'envoi d'email via Resend à", clientEmail, "depuis", from);
        
        const emailResult = await resend.emails.send({
          from,
          to: clientEmail,
          subject,
          html: htmlContent,
          text: stripHtml(htmlContent),
        });
        
        if (emailResult.error) {
          console.error("Erreur lors de l'envoi via Resend:", emailResult.error);
        } else {
          console.log("Email envoyé avec succès via Resend:", emailResult.data);
        }
      }
    }

    // ========= NOTIFICATION AUX ADMINISTRATEURS ==========
    try {
      console.log("🔔 Début de l'envoi des notifications aux administrateurs...");
      
      // Récupérer tous les administrateurs avec leurs emails directement via SQL
      const { data: adminUsers, error: adminError } = await supabaseAdmin
        .rpc('get_admin_emails_for_company', { p_company_id: targetCompanyId });
      
      console.log("✅ Nombre d'admins trouvés:", adminUsers?.length || 0);
      console.log("✅ Détails des admins:", JSON.stringify(adminUsers));
      
      if (adminError) {
        console.error("❌ Erreur lors de la récupération des administrateurs:", adminError);
        
        // Créer une notification de secours dans la base
        await supabaseAdmin.from('admin_notifications').insert({
          company_id: targetCompanyId,
          offer_id: requestId,
          type: 'new_offer',
          title: `Nouvelle demande d'offre - ${clientName || companyName}`,
          message: `Une nouvelle demande d'offre a été reçue de ${clientEmail}. Montant: ${totalMonthlyPayment.toFixed(2)}€/mois`,
          metadata: {
            client_name: clientName,
            company_name: companyName,
            client_email: clientEmail,
            total_monthly: totalMonthlyPayment,
            error: 'Failed to retrieve admin emails'
          }
        });
      } else if (!adminUsers || adminUsers.length === 0) {
        console.log("⚠️ Aucun administrateur trouvé pour l'entreprise");
        
        // Créer une notification de secours dans la base
        await supabaseAdmin.from('admin_notifications').insert({
          company_id: targetCompanyId,
          offer_id: requestId,
          type: 'new_offer',
          title: `Nouvelle demande d'offre - ${clientName || companyName}`,
          message: `Une nouvelle demande d'offre a été reçue de ${clientEmail}. Montant: ${totalMonthlyPayment.toFixed(2)}€/mois`,
          metadata: {
            client_name: clientName,
            company_name: companyName,
            client_email: clientEmail,
            total_monthly: totalMonthlyPayment,
            error: 'No admin users found'
          }
        });
      } else {
        const adminEmails = adminUsers.map(admin => ({
          email: admin.email,
          name: admin.name || 'Administrateur'
        }));
        
        console.log("✅ Emails récupérés:", adminEmails.map(a => a.email).join(', '));
        
        if (adminEmails.length === 0) {
          console.log("⚠️ Aucun email d'administrateur valide récupéré");
          
          // Créer une notification de secours dans la base
          await supabaseAdmin.from('admin_notifications').insert({
            company_id: targetCompanyId,
            offer_id: requestId,
            type: 'new_offer',
            title: `Nouvelle demande d'offre - ${clientName || companyName}`,
            message: `Une nouvelle demande d'offre a été reçue de ${clientEmail}. Montant: ${totalMonthlyPayment.toFixed(2)}€/mois`,
            metadata: {
              client_name: clientName,
              company_name: companyName,
              client_email: clientEmail,
              total_monthly: totalMonthlyPayment,
              error: 'No valid admin emails'
            }
          });
        } else {
          console.log(`Envoi de notifications à ${adminEmails.length} administrateur(s)`);
          
          // Utiliser les mêmes paramètres email que pour le client
          const globalResendKey = Deno.env.get('ITAKECARE_RESEND_API');
          const { data: smtpSettings } = await supabaseAdmin
            .from('smtp_settings')
            .select('resend_api_key, from_email, from_name')
            .eq('id', 1)
            .single();
          
          const resendApiKey = globalResendKey || smtpSettings?.resend_api_key;
          
          console.log("✅ Clé Resend configurée:", !!resendApiKey);
          
          if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            const fromName = globalResendKey ? "iTakecare" : getFromName(smtpSettings);
            const fromEmail = globalResendKey ? "noreply@itakecare.be" : getFromEmail(smtpSettings);
            const from = `${fromName} <${fromEmail}>`;
            
            // Récupérer les informations de l'entreprise
            const { data: companyInfo } = await supabaseAdmin
              .from('companies')
              .select('name, logo_url')
              .eq('id', targetCompanyId)
              .single();
            
            const companyLogo = companyInfo?.logo_url || '';
            const platformCompanyName = companyInfo?.name || 'iTakecare';
            
            // Template d'email pour les administrateurs
            const adminSubject = `🚨 Nouvelle demande d'offre reçue - ${clientName || companyName}`;
            const adminHtmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                  ${companyLogo ? `<img src="${companyLogo}" alt="${platformCompanyName}" style="height: 50px; max-width: 200px; object-fit: contain;">` : `<h1 style="color: #2d618f; margin-bottom: 10px;">${platformCompanyName}</h1>`}
                </div>
                
                <h2 style="color: #d73527; border-bottom: 2px solid #d73527; padding-bottom: 10px;">🚨 Nouvelle demande d'offre reçue</h2>
                
                <div style="background: linear-gradient(135deg, #fff3f3 0%, #ffe8e8 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #d73527;">
                  <h3 style="color: #d73527; margin-top: 0;">📋 Informations client</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin: 8px 0;"><strong>👤 Nom :</strong> ${clientName || 'Non renseigné'}</li>
                    <li style="margin: 8px 0;"><strong>🏢 Entreprise :</strong> ${companyName || 'Non renseignée'}</li>
                    <li style="margin: 8px 0;"><strong>📧 Email :</strong> ${clientEmail}</li>
                    <li style="margin: 8px 0;"><strong>📞 Téléphone :</strong> ${data.contact_info.phone || 'Non renseigné'}</li>
                    <li style="margin: 8px 0;"><strong>🏠 Adresse :</strong> ${data.company_info.address || 'Non renseignée'}, ${data.company_info.city || ''} ${data.company_info.postal_code || ''}</li>
                    ${data.company_info.vat_number ? `<li style="margin: 8px 0;"><strong>🆔 N° TVA :</strong> ${data.company_info.vat_number}</li>` : ''}
                  </ul>
                </div>
                
                <div style="background: linear-gradient(135deg, #f0f8ff 0%, #e1f0ff 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #2d618f;">
                  <h3 style="color: #2d618f; margin-top: 0;">💰 Détails financiers</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin: 8px 0;"><strong>📱 Équipement :</strong> ${equipmentDescription}</li>
                    <li style="margin: 8px 0;"><strong>💶 Prix d'achat total :</strong> ${totalPurchaseAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</li>
                    <li style="margin: 8px 0;"><strong>📅 Mensualité :</strong> ${totalMonthlyPayment.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/mois</li>
                    <li style="margin: 8px 0;"><strong>🔢 Coefficient :</strong> ${coefficient}</li>
                    <li style="margin: 8px 0;"><strong>💵 Montant financé :</strong> ${totalFinancedAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</li>
                    <li style="margin: 8px 0;"><strong>📈 Marge :</strong> ${marginAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € (${marginPercentage}%)</li>
                  </ul>
                </div>
                
                ${data.partner_slug ? `
                <div style="background: linear-gradient(135deg, #fef3e2 0%, #fde8c8 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #e67e22;">
                  <h3 style="color: #d35400; margin-top: 0;">🤝 Source partenaire</h3>
                  <p style="margin: 0;"><strong>${data.partner_name || data.partner_slug}</strong></p>
                </div>
                ` : ''}

                ${data.external_services && data.external_services.length > 0 ? `
                <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e8d5ff 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #8e44ad;">
                  <h3 style="color: #7b2d8e; margin-top: 0;">📡 Services externes (${data.external_services.length})</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    ${data.external_services.map((svc: any) => {
                      const period = svc.billing_period === 'monthly' ? '/mois' : svc.billing_period === 'yearly' ? '/an' : '';
                      const qty = (svc.quantity || 1) > 1 ? ` × ${svc.quantity}` : '';
                      return `<li style="margin: 8px 0;">• <strong>${svc.provider_name}</strong> — ${svc.product_name}${qty} : ${svc.price_htva.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HTVA${period}</li>`;
                    }).join('')}
                  </ul>
                </div>
                ` : ''}

                ${data.delivery_info ? `
                <div style="background: linear-gradient(135deg, #f8fff0 0%, #efffdc 100%); padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4caf50;">
                  <h3 style="color: #2e7d32; margin-top: 0;">🚚 Adresse de livraison</h3>
                  <p style="margin: 0;">${data.delivery_info.address || ''}<br>
                  ${data.delivery_info.city || ''} ${data.delivery_info.postal_code || ''}<br>
                  ${data.delivery_info.country || ''}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${getAppUrl(req)}/offers/${requestId}" 
                     style="background: linear-gradient(135deg, #2d618f 0%, #4a90e2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(45, 97, 143, 0.3);">
                    👀 Voir l'offre dans l'interface admin
                  </a>
                </div>
                
                <div style="background-color: #fff8e1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
                  <p style="margin: 0; color: #f57c00; font-weight: bold;">⚡ Action requise</p>
                  <p style="margin: 5px 0 0 0; font-size: 14px;">Cette demande nécessite votre attention. Connectez-vous à l'interface d'administration pour traiter la demande.</p>
                </div>
                
                <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                  📧 Cet email a été envoyé automatiquement suite à une demande d'offre via le catalogue web.<br>
                  🕐 Demande reçue le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
                </p>
              </div>
            `;
            
            // Envoyer un email groupé à tous les administrateurs pour éviter le rate limit
            const recipients = adminEmails.map(a => a.email);
            try {
              let adminEmailResult = await resend.emails.send({
                from,
                to: recipients,
                subject: adminSubject,
                html: adminHtmlContent,
                text: stripHtml(adminHtmlContent),
              });

              // Gestion simple du rate limit (429)
              if (
                adminEmailResult.error &&
                ((adminEmailResult.error as any).name === 'rate_limit_exceeded' ||
                  /Too many requests/i.test(((adminEmailResult.error as any).message) || ''))
              ) {
                console.log('Rate limit détecté, nouvel essai dans 800ms...');
                await new Promise((r) => setTimeout(r, 800));
                adminEmailResult = await resend.emails.send({
                  from,
                  to: recipients,
                  subject: adminSubject,
                  html: adminHtmlContent,
                  text: stripHtml(adminHtmlContent),
                });
              }

              if (adminEmailResult.error) {
                console.error('❌ Erreur lors de l\'envoi groupé aux admins:', adminEmailResult.error);
                
                // Créer une notification de secours dans la base
                await supabaseAdmin.from('admin_notifications').insert({
                  company_id: targetCompanyId,
                  offer_id: requestId,
                  type: 'new_offer',
                  title: `Nouvelle demande d'offre - ${clientName || companyName}`,
                  message: `Une nouvelle demande d'offre a été reçue de ${clientEmail}. Montant: ${totalMonthlyPayment.toFixed(2)}€/mois`,
                  metadata: {
                    client_name: clientName,
                    company_name: companyName,
                    client_email: clientEmail,
                    total_monthly: totalMonthlyPayment,
                    error: 'Email sending failed',
                    error_details: adminEmailResult.error
                  }
                });
              } else {
                console.log(`✅ Email admin groupé envoyé avec succès à: ${recipients.join(', ')}`);
              }
            } catch (adminEmailError) {
              console.error('❌ Exception lors de l\'envoi groupé aux admins:', adminEmailError);
              
              // Créer une notification de secours dans la base
              await supabaseAdmin.from('admin_notifications').insert({
                company_id: targetCompanyId,
                offer_id: requestId,
                type: 'new_offer',
                title: `Nouvelle demande d'offre - ${clientName || companyName}`,
                message: `Une nouvelle demande d'offre a été reçue de ${clientEmail}. Montant: ${totalMonthlyPayment.toFixed(2)}€/mois`,
                metadata: {
                  client_name: clientName,
                  company_name: companyName,
                  client_email: clientEmail,
                  total_monthly: totalMonthlyPayment,
                  error: 'Email exception',
                  error_details: String(adminEmailError)
                }
              });
            }
          }
        }
      }
    } catch (adminNotificationError) {
      console.error("Exception lors de l'envoi des notifications admin:", adminNotificationError);
      // Ne pas bloquer le processus même si les notifications admin échouent
    }

    // ✅ NOUVEAU : Récupérer les packs créés pour la réponse
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

    // Préparer les données de réponse
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

    console.log("Traitement réussi, retour de la réponse:", responseData);
    
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

// Utilitaire pour supprimer les balises HTML d'une chaîne
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}
