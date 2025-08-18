
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Configuration CORS pour permettre les requêtes depuis n'importe quelle origine
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Vérifier que c'est bien une requête POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Méthode non supportée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      );
    }

    // Créer un client Supabase avec la clé de service admin AVANT son utilisation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      }
    );

    // Log pour vérifier les variables d'environnement
    console.log('SUPABASE_URL configuré:', !!Deno.env.get('SUPABASE_URL'));
    console.log('SUPABASE_SERVICE_ROLE_KEY configuré:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    // Récupérer les données de la requête
    const data = await req.json();
    console.log("Données reçues par la fonction Edge:", data);
    
    // Validation des données requises
    if (!data.company_info?.company_name || !data.contact_info?.email) {
      return new Response(
        JSON.stringify({ error: 'Données manquantes : company_info.company_name et contact_info.email sont requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // CORRECTION: Détecter automatiquement le company_id basé sur le domaine
    let targetCompanyId = null;
    
    // Récupérer l'URL de referer pour détecter le domaine
    const referer = req.headers.get('referer') || '';
    console.log("Referer URL:", referer);
    
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const hostname = refererUrl.hostname;
        console.log("Hostname détecté:", hostname);
        
        // Vérifier si c'est un sous-domaine de leazr.co
        if (hostname.includes('.leazr.co')) {
          const subdomain = hostname.split('.')[0];
          console.log("Sous-domaine détecté:", subdomain);
          
          // Chercher le company_id correspondant dans company_domains
          const { data: domainData, error: domainError } = await supabaseAdmin
            .from('company_domains')
            .select('company_id')
            .eq('subdomain', subdomain)
            .eq('is_active', true)
            .single();
          
          if (domainError) {
            console.log("Erreur lors de la recherche du domaine:", domainError);
          } else if (domainData) {
            targetCompanyId = domainData.company_id;
            console.log("Company_id trouvé via domaine:", targetCompanyId);
          }
        }
      } catch (urlError) {
        console.log("Erreur lors du parsing de l'URL:", urlError);
      }
    }
    
    // Fallback : utiliser le company_id fourni dans les données ou iTakecare par défaut
    if (!targetCompanyId) {
      targetCompanyId = data.company_id || 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
      console.log("Utilisation du company_id par défaut:", targetCompanyId);
    }

    // Générer des identifiants uniques pour le client et la demande
    const clientId = crypto.randomUUID();
    const requestId = crypto.randomUUID();

    // Adapter les données de la nouvelle structure vers l'ancienne
    const clientName = `${data.contact_info.first_name || ''} ${data.contact_info.last_name || ''}`.trim();
    const companyName = data.company_info.company_name;
    const clientEmail = data.contact_info.email;
    
    // Calculer les montants depuis les produits et créer la liste d'équipements
    let totalPurchaseAmount = 0; // Montant total d'achat (somme des total_price)
    let totalMonthlyPayment = 0; // Mensualité totale (somme des unit_price)
    let equipmentList = [];
    let detailedEquipmentList = [];
    
    console.log("Traitement des produits:", JSON.stringify(data.products, null, 2));
    
    if (data.products && Array.isArray(data.products)) {
      for (const product of data.products) {
        console.log("Produit reçu:", JSON.stringify(product, null, 2));
        
        // Récupérer le nom du produit depuis la table products
        let productName = product.product_name || product.name || 'Produit';
        let productDescription = '';
        
        if (product.product_id) {
          console.log(`Récupération du nom du produit pour product_id: ${product.product_id}`);
          
          try {
            const { data: productInfo, error: productInfoError } = await supabaseAdmin
              .from('products')
              .select('name, description')
              .eq('id', product.product_id)
              .single();
            
            if (productInfo && !productInfoError) {
              console.log(`Informations produit récupérées:`, productInfo);
              productName = productInfo.name || productName;
              productDescription = productInfo.description || '';
            }
          } catch (error) {
            console.log(`Erreur lors de la récupération du nom du produit:`, error);
          }
        }
        
        // Récupérer les attributs du variant
        let variantAttributes = {};
        const variantName = product.variant_name || '';
        const quantity = product.quantity || 1;
        const duration = product.duration || 36;
        
        // Essayer différentes propriétés possibles pour les prix
        let unitPrice = product.unit_price || product.monthly_price || product.price || 0;
        let totalPrice = product.total_price || product.purchase_price || 0;
        
        // Si pas de totalPrice mais on a un unitPrice, calculer approximativement
        if (!totalPrice && unitPrice) {
          // Estimation : prix mensuel * durée / coefficient moyen
          totalPrice = unitPrice * duration / 3.5; // Coefficient moyen approximatif
        }
        
        // Si on a un variant_id, essayer de récupérer les prix et attributs depuis product_variant_prices
        if ((!unitPrice || !totalPrice) && product.variant_id) {
          console.log(`Tentative de récupération des prix et attributs pour variant_id: ${product.variant_id}`);
          
          try {
            const { data: variantData, error: variantError } = await supabaseAdmin
              .from('product_variant_prices')
              .select('price, monthly_price, attributes')
              .eq('id', product.variant_id)
              .single();
            
            if (variantData && !variantError) {
              console.log(`Prix et attributs récupérés de product_variant_prices:`, variantData);
              if (!unitPrice) unitPrice = variantData.monthly_price || 0;
              if (!totalPrice) totalPrice = variantData.price || 0;
              variantAttributes = variantData.attributes || {};
            }
          } catch (error) {
            console.log(`Erreur lors de la récupération des prix variant:`, error);
          }
        }
        
        // Fallback: Si pas de variant_id ou pas de prix trouvé, essayer avec product_id dans products
        if ((!unitPrice || !totalPrice) && product.product_id) {
          console.log(`Fallback: tentative de récupération des prix pour product_id: ${product.product_id}`);
          
          try {
            const { data: productData, error: productError } = await supabaseAdmin
              .from('products')
              .select('price, monthly_price')
              .eq('id', product.product_id)
              .single();
            
            if (productData && !productError) {
              console.log(`Prix récupérés de products (fallback):`, productData);
              if (!unitPrice) unitPrice = productData.monthly_price || 0;
              if (!totalPrice) totalPrice = productData.price || 0;
            }
          } catch (error) {
            console.log(`Erreur lors de la récupération des prix product:`, error);
          }
        }
        
        console.log(`Prix calculés - Unitaire: ${unitPrice}, Total: ${totalPrice}, Quantité: ${quantity}`)
        
        // Accumuler les montants (multiplier par la quantité)
        totalPurchaseAmount += totalPrice * quantity;
        totalMonthlyPayment += unitPrice * quantity;
        
        // Construire le nom complet de l'équipement
        let fullProductName = productName;
        if (variantName) {
          fullProductName += ` - ${variantName}`;
        }
        
        // Ajouter à la liste pour la description
        equipmentList.push(`${fullProductName} (x${quantity})`);
        
        // Stocker les détails pour créer les équipements
        detailedEquipmentList.push({
          title: fullProductName,
          purchase_price: totalPrice, // Prix d'achat total pour cet équipement
          quantity: quantity,
          monthly_payment: unitPrice, // Prix mensuel pour cet équipement
          duration: duration,
          product_id: product.product_id,
          variant_id: product.variant_id,
          attributes: variantAttributes // Ajouter les attributs du variant
        });
      }
    }
    
    console.log("Montants calculés - Total d'achat:", totalPurchaseAmount, "Mensuel:", totalMonthlyPayment);
    console.log("Liste d'équipements:", equipmentList);

    // Préparer les données du client avec séparation des adresses
    const clientData = {
      id: clientId,
      name: clientName || companyName, // Utiliser le nom de contact ou le nom d'entreprise
      email: clientEmail,
      company: companyName,
      phone: data.contact_info.phone || '',
      vat_number: data.company_info.vat_number || '',
      // Adresses existantes (pour compatibilité)
      address: data.company_info.address || '',
      city: data.company_info.city || '',
      postal_code: data.company_info.postal_code || '',
      country: data.company_info.country || 'BE',
      // Nouvelles adresses de facturation (depuis company_info)
      billing_address: data.company_info.address || '',
      billing_city: data.company_info.city || '',
      billing_postal_code: data.company_info.postal_code || '',
      billing_country: data.company_info.country || 'BE',
      // Adresses de livraison (depuis delivery_info)
      delivery_address: data.delivery_info?.address || data.company_info.address || '',
      delivery_city: data.delivery_info?.city || data.company_info.city || '',
      delivery_postal_code: data.delivery_info?.postal_code || data.company_info.postal_code || '',
      delivery_country: data.delivery_info?.country || data.company_info.country || 'BE',
      delivery_same_as_billing: !data.delivery_info || (
        data.delivery_info.address === data.company_info.address &&
        data.delivery_info.city === data.company_info.city &&
        data.delivery_info.postal_code === data.company_info.postal_code &&
        data.delivery_info.country === data.company_info.country
      ),
      status: 'active',
      contact_name: clientName,
      company_id: targetCompanyId
    };

    console.log("Création du client avec les données:", clientData);

    // Insérer le client
    const { data: clientResult, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (clientError) {
      console.error("Erreur lors de la création du client:", clientError);
      // On continue même si la création du client échoue
    }

    // FORCER L'UTILISATION DE GRENKE POUR TOUTES LES DEMANDES API
    let defaultLeaser = null;
    const GRENKE_ID = 'd60b86d7-a129-4a17-a877-e8e5caa66949';
    
    try {
      // Récupérer spécifiquement Grenke avec toutes ses tranches
      const { data: leasers, error: leaserError } = await supabaseAdmin
        .from('leasers')
        .select(`
          id, name,
          leaser_ranges(
            id, min, max, coefficient,
            leaser_duration_coefficients(duration_months, coefficient)
          )
        `)
        .eq('id', GRENKE_ID)
        .single();
        
      if (!leaserError && leasers) {
        defaultLeaser = leasers;
        console.log("GRENKE forcé avec tranches:", defaultLeaser.name, "- Nombre de tranches:", defaultLeaser.leaser_ranges?.length || 0);
      } else {
        console.error("Erreur: Grenke introuvable!", leaserError);
      }
    } catch (error) {
      console.log("Erreur lors de la récupération du leaser:", error);
    }

    // Fonction helper pour trouver le coefficient selon le montant et la durée
    const getCoefficientFromLeaser = (leaser: any, amount: number, duration: number = 36): number => {
      if (!leaser || !leaser.leaser_ranges || leaser.leaser_ranges.length === 0) {
        return 3.160; // Coefficient Grenke par défaut
      }

      // Trouver la tranche qui contient le montant
      const matchingRange = leaser.leaser_ranges.find((range: any) => 
        amount >= range.min && amount <= range.max
      );

      if (!matchingRange) {
        return leaser.leaser_ranges[0]?.coefficient || 3.160;
      }

      // Si la tranche a des coefficients par durée, les utiliser
      if (matchingRange.leaser_duration_coefficients && matchingRange.leaser_duration_coefficients.length > 0) {
        const durationCoeff = matchingRange.leaser_duration_coefficients.find(
          (dc: any) => dc.duration_months === duration
        );
        
        if (durationCoeff) {
          return durationCoeff.coefficient;
        }
      }

      return matchingRange.coefficient;
    };

    // Durée par défaut (36 mois)
    const duration = 36;

    // ============== LOGIQUE GRENKE CORRECTE ===============
    // Logique basée sur les calculs réels de Grenke :
    // 1. Utiliser la mensualité totale (déjà calculée)
    // 2. Calculer le montant financé à partir de la mensualité et du coefficient Grenke
    // 3. La marge = montant financé - prix d'achat total
    
    console.log(`Mensualité totale des produits: ${totalMonthlyPayment.toFixed(2)}€`);
    
    // 1. Obtenir le coefficient Grenke (estimation initiale pour trouver le bon range)
    let coefficient = getCoefficientFromLeaser(defaultLeaser, totalPurchaseAmount, duration);
    
    // 2. Calculer le montant financé selon la logique Grenke inverse
    // montant_financé = (mensualité × 100) / coefficient
    let totalFinancedAmount = (totalMonthlyPayment * 100) / coefficient;
    
    // 3. Vérifier si on est dans le bon range et ajuster le coefficient si nécessaire
    const refinedCoefficient = getCoefficientFromLeaser(defaultLeaser, totalFinancedAmount, duration);
    if (Math.abs(refinedCoefficient - coefficient) > 0.001) {
      totalFinancedAmount = (totalMonthlyPayment * 100) / refinedCoefficient;
      coefficient = refinedCoefficient;
    }
    
    console.log(`Calculs selon le calculateur d'offre:
      - Prix d'achat total: ${totalPurchaseAmount}€
      - Montant financé total: ${totalFinancedAmount.toFixed(2)}€
      - Coefficient utilisé: ${coefficient}
      - Mensualité calculée: ${totalMonthlyPayment.toFixed(2)}€`);
    
    // 4. Utiliser les valeurs finales
    const calculatedMonthlyPayment = totalMonthlyPayment;
    
    // 5. Calculer la marge correcte: montant financé - prix d'achat
    const marginAmount = totalFinancedAmount - totalPurchaseAmount;
    const marginPercentage = totalPurchaseAmount > 0 ? parseFloat(((marginAmount / totalPurchaseAmount) * 100).toFixed(2)) : 0;
    
    // Créer la description de l'équipement depuis la liste
    const equipmentDescription = equipmentList.length > 0 
      ? equipmentList.join(', ') 
      : 'Demande de produit depuis le catalogue';

    // Préparer les données de l'offre avec Grenke assigné
    const offerData = {
      id: requestId,
      client_id: clientId,
      client_name: clientName || companyName,
      client_email: clientEmail,
      equipment_description: equipmentDescription,
      amount: totalPurchaseAmount,
      monthly_payment: calculatedMonthlyPayment,
      coefficient: coefficient,
      financed_amount: totalFinancedAmount,
      margin: marginAmount,
      commission: 0,
      type: "client_request",
      workflow_status: "draft",
      status: "pending",
      remarks: `Demande créée via API web avec Grenke (36 mois)${data.notes ? ' - ' + data.notes : ''}`,
      user_id: null,
      company_id: targetCompanyId,
      leaser_id: GRENKE_ID, // FORCER GRENKE
      duration: duration // Assurer 36 mois
    };

    console.log("Création de l'offre avec les données:", offerData);

    // Insérer l'offre
    const { data: offerResult, error: offerError } = await supabaseAdmin
      .from('offers')
      .insert(offerData)
      .select()
      .single();

    if (offerError) {
      console.error("Erreur lors de la création de l'offre:", offerError);
      return new Response(
        JSON.stringify({ error: `Échec de création de l'offre: ${offerError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Créer les équipements détaillés pour l'offre
    if (detailedEquipmentList.length > 0) {
      console.log("Création des équipements détaillés:", detailedEquipmentList.length, "items");
      
      for (const equipment of detailedEquipmentList) {
        // Calculer la marge proportionnelle pour cet équipement
        const equipmentTotalPrice = equipment.purchase_price * equipment.quantity;
        const equipmentMargin = totalPurchaseAmount > 0 
          ? (equipmentTotalPrice / totalPurchaseAmount) * marginAmount 
          : 0;
        
        const equipmentData = {
          offer_id: requestId,
          title: equipment.title,
          purchase_price: equipment.purchase_price,
          quantity: equipment.quantity,
          monthly_payment: equipment.monthly_payment,
          margin: equipmentMargin,
          duration: equipment.duration,
        };
        
        console.log("Création de l'équipement:", equipmentData);
        console.log("Attributs du variant à stocker:", equipment.attributes);
        
        const { data: equipmentResult, error: equipmentError } = await supabaseAdmin
          .from('offer_equipment')
          .insert(equipmentData)
          .select('id')
          .single();
        
        if (equipmentError) {
          console.error("Erreur lors de la création de l'équipement:", equipmentError);
          // On continue même si la création d'un équipement échoue
        } else {
          console.log("Équipement créé avec succès:", equipment.title);
          
          // Stocker les attributs du variant si disponibles
          if (equipmentResult && equipment.attributes && Object.keys(equipment.attributes).length > 0) {
            console.log("Stockage des attributs pour l'équipement ID:", equipmentResult.id);
            
            for (const [key, value] of Object.entries(equipment.attributes)) {
              const attributeData = {
                equipment_id: equipmentResult.id,
                key: key,
                value: String(value)
              };
              
              const { error: attributeError } = await supabaseAdmin
                .from('offer_equipment_attributes')
                .insert(attributeData);
              
              if (attributeError) {
                console.error(`Erreur lors de la création de l'attribut ${key}:`, attributeError);
              } else {
                console.log(`Attribut ${key}: ${value} créé avec succès`);
              }
            }
          }
        }
      }
    }

    try {
      console.log("Début de la procédure d'envoi d'email...");
      
      // Récupérer les paramètres SMTP depuis la base de données
      const { data: smtpSettings, error: smtpError } = await supabaseAdmin
        .from('smtp_settings')
        .select('resend_api_key, from_email, from_name, use_resend')
        .eq('id', 1)
        .single();
      
      if (smtpError) {
        console.error("Erreur lors de la récupération des paramètres SMTP:", smtpError);
        throw new Error(`Erreur de base de données: ${smtpError.message}`);
      }
      
      if (!smtpSettings) {
        console.error("Paramètres SMTP non trouvés");
        throw new Error("Paramètres SMTP non trouvés");
      }
      
      console.log("Paramètres email récupérés:", {
        from_email: smtpSettings.from_email, 
        from_name: smtpSettings.from_name,
        use_resend: smtpSettings.use_resend
      });

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

      // Récupérer les informations de la company iTakecare pour le logo
      const { data: companyInfo, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('name, logo_url')
        .eq('id', targetCompanyId)
        .single();
      
      const companyLogo = companyInfo?.logo_url || '';
      const companyName = companyInfo?.name || 'iTakecare';
      
      // Récupérer le modèle d'email de demande de produit
      const { data: emailTemplate, error: templateError } = await supabaseAdmin
        .from('email_templates')
        .select('subject, html_content')
        .eq('type', 'product_request')
        .eq('active', true)
        .single();
      
      let subject = `🎉 Bienvenue sur ${companyName} - Confirmation de votre demande`;
      let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="height: 50px; max-width: 200px; object-fit: contain;">` : `<h1 style="color: #2d618f; margin-bottom: 10px;">${companyName}</h1>`}
          </div>
          <h2 style="color: #2d618f; border-bottom: 2px solid #2d618f; padding-bottom: 10px;">👋 Bienvenue ${clientName || companyName} !</h2>
          <p style="font-size: 16px; line-height: 1.6;">✨ Votre demande d'équipement a été créée avec succès sur la plateforme iTakecare.</p>
          <p style="font-size: 16px; line-height: 1.6;">📋 Voici un récapitulatif de votre demande :</p>
          <ul style="background: linear-gradient(135deg, #f8fafd 0%, #e8f4fd 100%); padding: 20px; border-radius: 10px; list-style: none; margin: 20px 0; border-left: 4px solid #2d618f;">
            ${generateSummaryItems(equipmentDescription, totalPurchaseAmount, totalMonthlyPayment)}
          </ul>
          <p style="font-size: 16px; line-height: 1.6;">⏱️ Notre équipe va étudier votre demande et vous contactera rapidement.</p>
          <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a90e2;">
            <p style="margin: 0; color: #2d618f; font-weight: bold;">💡 Prochaines étapes :</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Un de nos experts vous contactera dans les plus brefs délais pour finaliser votre demande.</p>
          </div>
          <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666;">🤝 Cordialement,<br><strong>L'équipe ${companyName}</strong></p>
        </div>
      `;
      
      // Utiliser le modèle de la base de données s'il existe
      if (emailTemplate && !templateError) {
        console.log("Modèle d'email trouvé, utilisation du modèle personnalisé");
        
        subject = emailTemplate.subject.replace("{{client_name}}", clientName || companyName);
        
        // Remplacer les variables dans le contenu HTML
        htmlContent = emailTemplate.html_content
          .replace(/{{client_name}}/g, clientName || companyName)
          .replace(/{{equipment_description}}/g, equipmentDescription)
          .replace(/{{amount}}/g, totalPurchaseAmount.toString())
          .replace(/{{monthly_payment}}/g, totalMonthlyPayment.toString());
      } else if (templateError) {
        console.log("Erreur lors de la récupération du modèle d'email, utilisation du modèle par défaut:", templateError);
      } else {
        console.log("Aucun modèle d'email trouvé, utilisation du modèle par défaut");
      }
      
      // Vérifier si l'utilisateur a demandé la création d'un compte
      if (data.create_client_account === true) {
        console.log("L'utilisateur a demandé la création d'un compte client");
        
        try {
          // Créer un compte utilisateur sans mot de passe (il définira le sien)
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
          
          // Mettre à jour le client avec l'ID utilisateur
          if (userData.user) {
            const { error: updateClientError } = await supabaseAdmin
              .from('clients')
              .update({
                has_user_account: true,
                user_account_created_at: new Date().toISOString(),
                user_id: userData.user.id
              })
              .eq('id', clientId);
            
            if (updateClientError) {
              console.error("Erreur lors de la mise à jour du client:", updateClientError);
            } else {
              console.log("Client mis à jour avec l'ID utilisateur");
            }
            
            // Générer un lien pour définir le mot de passe
            const { data: passwordLinkData, error: passwordLinkError } = await supabaseAdmin.auth.admin.generateLink({
              type: "recovery",
              email: clientEmail,
              options: {
                redirectTo: `${Deno.env.get('SITE_URL') || ''}/auth/callback`
              }
            });
            
            if (passwordLinkError) {
              console.error("Erreur lors de la génération du lien de mot de passe:", passwordLinkError);
            } else {
              console.log("Lien de définition de mot de passe généré");
              
              // Modifier le template d'email pour inclure les instructions de création de compte
              const passwordLink = passwordLinkData?.properties?.action_link || '';
              
              // Template spécial pour création de compte
              htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="height: 50px; max-width: 200px; object-fit: contain;">` : `<h1 style="color: #2d618f; margin-bottom: 10px;">${companyName}</h1>`}
                  </div>
                  <h2 style="color: #2d618f; border-bottom: 2px solid #2d618f; padding-bottom: 10px;">👋 Bienvenue ${clientName || companyName} !</h2>
                  <p style="font-size: 16px; line-height: 1.6;">✨ Votre demande d'équipement a été créée avec succès sur la plateforme iTakecare.</p>
                  
                  <div style="background: linear-gradient(135deg, #e8f4fd 0%, #d1e9fc 100%); padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #2d618f;">
                    <h3 style="color: #2d618f; margin-top: 0; display: flex; align-items: center;">🎉 Votre compte client a été créé !</h3>
                    <p style="font-size: 16px; line-height: 1.6;">🔐 Pour finaliser la création de votre compte et définir votre mot de passe, cliquez sur le bouton ci-dessous :</p>
                    <div style="text-align: center; margin: 25px 0;">
                      <a href="${passwordLink}" style="background: linear-gradient(135deg, #2d618f 0%, #4a90e2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(45, 97, 143, 0.3);">🚀 Définir mon mot de passe</a>
                    </div>
                    <p style="font-size: 12px; color: #666; text-align: center;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : ${passwordLink}</p>
                  </div>
                  
                  <p style="font-size: 16px; line-height: 1.6;">📋 Voici un récapitulatif de votre demande :</p>
                  <ul style="background: linear-gradient(135deg, #f8fafd 0%, #e8f4fd 100%); padding: 20px; border-radius: 10px; list-style: none; margin: 20px 0; border-left: 4px solid #2d618f;">
                    ${generateSummaryItems(equipmentDescription, totalPurchaseAmount, totalMonthlyPayment)}
                  </ul>
                  <p style="font-size: 16px; line-height: 1.6;">⏱️ Notre équipe va étudier votre demande et vous contactera rapidement.</p>
                  <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a90e2;">
                    <p style="margin: 0; color: #2d618f; font-weight: bold;">💡 Prochaines étapes :</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Un de nos experts vous contactera dans les plus brefs délais pour finaliser votre demande.</p>
                  </div>
                  <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #666;">🤝 Cordialement,<br><strong>L'équipe ${companyName}</strong></p>
                </div>
              `;
              
              subject = `Bienvenue sur ${companyName} - Créez votre mot de passe`;
            }
          }
        } catch (accountError) {
          console.error("Exception lors de la création du compte:", accountError);
          // On ne bloque pas le processus même si la création du compte échoue
        }
      } else {
        console.log("L'utilisateur n'a pas demandé de création de compte client");
      }
      
      // Texte brut pour les clients qui ne peuvent pas afficher le HTML
      const text = stripHtml(htmlContent);
      
      // Utiliser la clé API Resend spécifique d'iTakecare en priorité
      const globalResendKey = Deno.env.get('ITAKECARE_RESEND_API');
      const resendApiKey = globalResendKey || smtpSettings.resend_api_key;
      
      if (!resendApiKey) {
        console.error("Clé API Resend non configurée - ni en global ni dans la base de données");
        throw new Error("Clé API Resend non configurée");
      }
      
      // Initialiser Resend avec la clé API
      const resend = new Resend(resendApiKey);
      
      // Format d'expéditeur (utiliser iTakecare par défaut si clé globale utilisée)
      const fromName = globalResendKey ? "iTakecare" : (smtpSettings.from_name || "iTakecare");
      const fromEmail = globalResendKey ? "noreply@itakecare.be" : (smtpSettings.from_email || "noreply@itakecare.be");
      const from = `${fromName} <${fromEmail}>`;
      
      console.log(`Tentative d'envoi d'email via Resend à ${clientEmail} depuis ${from}`);
      
      // Envoyer l'email avec Resend
      const emailResult = await resend.emails.send({
        from,
        to: clientEmail,
        subject,
        html: htmlContent,
        text,
      });
      
      if (emailResult.error) {
        console.error("Erreur lors de l'envoi de l'email via Resend:", emailResult.error);
        throw new Error(`Erreur lors de l'envoi de l'email via Resend: ${emailResult.error.message}`);
      }
      
      console.log("Email envoyé avec succès via Resend:", emailResult.data);
    } catch (emailError) {
      console.error("Exception lors de la procédure d'envoi d'email:", emailError);
      // On ne bloque pas le processus même si l'envoi d'email échoue
    }

    // Préparer les données de réponse
    const responseData = {
      id: requestId,
      client_id: clientId,
      client_name: clientName || companyName,
      client_email: clientEmail,
      client_company: companyName,
      equipment_description: equipmentDescription,
      amount: totalPurchaseAmount,
      monthly_payment: calculatedMonthlyPayment,
      coefficient: coefficient,
      financed_amount: totalFinancedAmount,
      margin: parseFloat(marginAmount.toFixed(2)),
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
      JSON.stringify({ error: `Une erreur est survenue: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Utilitaire pour supprimer les balises HTML d'une chaîne
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}
