import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getAppUrl, getFromEmail, getFromName } from "../_shared/url-utils.ts";

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
    
    // Récupération des données depuis le body de la requête
    const data = await req.json();
    
    console.log("Données reçues par la fonction Edge:", data);
    
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
    let totalPurchaseAmount = 0;
    let totalMonthlyPayment = 0;

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
      
      if (productError) {
        console.error("Erreur lors de la récupération du produit:", productError);
        throw new Error(`Produit non trouvé: ${product.product_id}`);
      }
      
      console.log("Informations produit récupérées:", productInfo);

      // Récupérer les prix et attributs du variant
      console.log("Tentative de récupération des prix et attributs pour variant_id:", product.variant_id);
      
      let price = 0;
      let monthlyPrice = 0;
      let attributes = {};

      if (product.variant_id) {
        const { data: variantData, error: variantError } = await supabaseAdmin
          .from('product_variant_prices')
          .select('price, monthly_price, attributes')
          .eq('id', product.variant_id)
          .single();
        
        if (!variantError && variantData) {
          console.log("Prix et attributs récupérés de product_variant_prices:", {
            price: variantData.price,
            monthly_price: variantData.monthly_price,
            attributes: variantData.attributes
          });
          
          price = variantData.price || 0;
          monthlyPrice = variantData.monthly_price || 0;
          attributes = variantData.attributes || {};
        } else {
          console.log("Fallback: tentative de récupération des prix pour product_id:", product.product_id);
          
          const { data: productPrices } = await supabaseAdmin
            .from('products')
            .select('price, monthly_price')
            .eq('id', product.product_id)
            .single();
          
          console.log("Prix récupérés de products (fallback):", { price: productPrices?.price || 0, monthly_price: productPrices?.monthly_price || 0 });
          
          price = productPrices?.price || 0;
          monthlyPrice = productPrices?.monthly_price || 0;
        }
      }

      console.log("Prix calculés - Unitaire:", monthlyPrice, "Total:", price, "Quantité:", product.quantity);
      
      const itemTotalPrice = price * product.quantity;
      const itemTotalMonthly = monthlyPrice * product.quantity;
      
      totalPurchaseAmount += itemTotalPrice;
      totalMonthlyPayment += itemTotalMonthly;
      
      console.log("Montants calculés - Total d'achat:", totalPurchaseAmount, "Mensuel:", totalMonthlyPayment);
      
      equipmentList.push(`${productInfo.name} (x${product.quantity})`);
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
    let estimatedFinancedAmount = totalMonthlyPayment * 3.53; // Estimation initiale
    let coefficient = getCoefficientForAmount(estimatedFinancedAmount, leaserData.leaser_ranges);
    let totalFinancedAmount = (totalMonthlyPayment * 100) / coefficient; // Formule correcte
    
    // Itération pour convergence (max 3 itérations)
    for (let i = 0; i < 3; i++) {
      const newCoefficient = getCoefficientForAmount(totalFinancedAmount, leaserData.leaser_ranges);
      if (Math.abs(newCoefficient - coefficient) < 0.001) {
        break; // Convergence atteinte
      }
      coefficient = newCoefficient;
      totalFinancedAmount = (totalMonthlyPayment * 100) / coefficient;
    }

    const marginAmount = totalFinancedAmount - totalPurchaseAmount;
    const marginPercentage = totalPurchaseAmount > 0 ? ((marginAmount / totalPurchaseAmount) * 100).toFixed(1) : "0.0";
    const calculatedMonthlyPayment = totalMonthlyPayment;

    console.log("Calculs selon le calculateur d'offre:\n" +
      "      - Prix d'achat total: " + totalPurchaseAmount + "€\n" +
      "      - Montant financé total: " + totalFinancedAmount.toFixed(2) + "€\n" +
      "      - Coefficient utilisé: " + coefficient + "\n" +
      "      - Mensualité calculée: " + calculatedMonthlyPayment + "€\n" +
      "      - Marge calculée: " + marginAmount.toFixed(2) + "€ (" + marginPercentage + "%)");

    // Génération d'un ID unique pour la demande
    const requestId = crypto.randomUUID();
    const clientId = crypto.randomUUID();

    // Extraction des informations clients
    const clientName = `${data.contact_info.first_name || ''} ${data.contact_info.last_name || ''}`.trim();
    const clientEmail = data.contact_info.email;
    const companyName = data.company_info.company_name;
    const equipmentDescription = equipmentList.join(', ');

    // Création du client
    const clientData = {
      id: clientId,
      name: clientName,
      email: clientEmail,
      company: companyName,
      phone: data.contact_info.phone,
      vat_number: data.company_info.vat_number || '',
      address: data.company_info.address,
      city: data.company_info.city,
      postal_code: data.company_info.postal_code,
      country: data.company_info.country,
      billing_address: data.company_info.address,
      billing_city: data.company_info.city,
      billing_postal_code: data.company_info.postal_code,
      billing_country: data.company_info.country,
      delivery_address: data.delivery_info.same_as_company ? data.company_info.address : data.delivery_info.address,
      delivery_city: data.delivery_info.same_as_company ? data.company_info.city : data.delivery_info.city,
      delivery_postal_code: data.delivery_info.same_as_company ? data.company_info.postal_code : data.delivery_info.postal_code,
      delivery_country: data.delivery_info.same_as_company ? data.company_info.country : data.delivery_info.country,
      delivery_same_as_billing: data.delivery_info.same_as_company,
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
      margin: totalFinancedAmount,
      commission: 0,
      type: 'client_request',
      workflow_status: 'draft',
      status: 'pending',
      remarks: 'Demande créée via API web avec Grenke (36 mois)',
      user_id: null,
      company_id: targetCompanyId,
      leaser_id: leaserId
    };

    console.log("Création de l'offre avec les données:", offerData);

    const { error: offerError } = await supabaseAdmin
      .from('offers')
      .insert(offerData);

    if (offerError) {
      console.error("Erreur lors de la création de l'offre :", offerError);
      throw new Error(`Erreur offre: ${offerError.message}`);
    }

    // Création des équipements détaillés
    console.log("Création des équipements détaillés:", data.products.length, "items");

    for (const product of data.products) {
      // Récupérer les informations et prix du produit
      const { data: productInfo } = await supabaseAdmin
        .from('products')
        .select('name')
        .eq('id', product.product_id)
        .single();

      let monthlyPrice = 0;
      let purchasePrice = 0;
      let attributes = {};

      if (product.variant_id) {
        const { data: variantData } = await supabaseAdmin
          .from('product_variant_prices')
          .select('price, monthly_price, attributes')
          .eq('id', product.variant_id)
          .single();
        
        if (variantData) {
          purchasePrice = variantData.price || 0;
          monthlyPrice = variantData.monthly_price || 0;
          attributes = variantData.attributes || {};
        }
      }

      const equipmentData = {
        offer_id: requestId,
        title: productInfo?.name || 'Produit',
        purchase_price: purchasePrice,
        quantity: product.quantity,
        monthly_payment: monthlyPrice * product.quantity,
        margin: 0,
        duration: 36
      };

      console.log("Création de l'équipement:", equipmentData);

      const { data: equipment, error: equipmentError } = await supabaseAdmin
        .from('offer_equipment')
        .insert(equipmentData)
        .select('id')
        .single();

      if (equipmentError) {
        console.error("Erreur lors de la création de l'équipement :", equipmentError);
        continue;
      }

      console.log("Équipement créé avec succès:", productInfo?.name);

      // Stockage des attributs
      if (equipment && attributes && Object.keys(attributes).length > 0) {
        console.log("Stockage des attributs pour l'équipement ID:", equipment.id);
        
        for (const [key, value] of Object.entries(attributes)) {
          const { error: attrError } = await supabaseAdmin
            .from('offer_equipment_attributes')
            .insert({
              equipment_id: equipment.id,
              key: key,
              value: value
            });

          if (attrError) {
            console.error(`Erreur lors de la création de l'attribut ${key}:`, attrError);
          } else {
            console.log(`Attribut ${key}: ${value} créé avec succès`);
          }
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
      console.log("Début de l'envoi des notifications aux administrateurs...");
      
      // Récupérer tous les administrateurs de l'entreprise
      const { data: adminUsers, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('company_id', targetCompanyId)
        .eq('role', 'admin');
      
      if (adminError) {
        console.error("Erreur lors de la récupération des administrateurs:", adminError);
      } else if (!adminUsers || adminUsers.length === 0) {
        console.log("Aucun administrateur trouvé pour l'entreprise");
      } else {
        console.log(`${adminUsers.length} administrateur(s) trouvé(s)`);
        
        // Récupérer les emails des administrateurs depuis auth.users
        const adminEmails = [];
        for (const admin of adminUsers) {
          const { data: userAuth, error: userError } = await supabaseAdmin.auth.admin.getUserById(admin.id);
          if (!userError && userAuth?.user?.email) {
            adminEmails.push({
              email: userAuth.user.email,
              name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Administrateur'
            });
          }
        }
        
        if (adminEmails.length === 0) {
          console.log("Aucun email d'administrateur récupéré");
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
                console.error('Erreur lors de l\'envoi groupé aux admins:', adminEmailResult.error);
              } else {
                console.log(`Email admin groupé envoyé avec succès à: ${recipients.join(', ')}`);
              }
            } catch (adminEmailError) {
              console.error('Exception lors de l\'envoi groupé aux admins:', adminEmailError);
            }
          }
        }
      }
    } catch (adminNotificationError) {
      console.error("Exception lors de l'envoi des notifications admin:", adminNotificationError);
      // Ne pas bloquer le processus même si les notifications admin échouent
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