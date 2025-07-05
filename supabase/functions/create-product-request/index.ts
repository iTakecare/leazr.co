
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

    // Récupérer les données de la requête
    const data = await req.json();
    console.log("Données reçues par la fonction Edge:", data);

    // Créer un client Supabase avec la clé de service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Générer des identifiants uniques pour le client et la demande
    const clientId = crypto.randomUUID();
    const requestId = crypto.randomUUID();

    // Préparer les données du client
    const clientData = {
      id: clientId,
      name: data.client_name,
      email: data.client_email,
      company: data.client_company,
      phone: data.phone || '',
      vat_number: data.client_vat_number || '',
      address: data.address || '',
      city: data.city || '',
      postal_code: data.postal_code || '',
      country: data.country || 'BE',
      status: 'active',
      contact_name: data.client_name,
      company_id: data.company_id
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

    // CORRECTION: Utiliser les prix fixes du catalogue
    const coefficient = Number(data.coefficient) || 3.55; // Coefficient correct
    const monthlyPayment = Number(data.monthly_payment) || 0; // Prix fixe du catalogue (pas calculé)
    const totalAmount = Number(data.amount) || 0; // Prix d'achat total
    const financedAmount = Number(data.financed_amount) || 0; // Montant financé déjà calculé
    
    // Calculer la marge correcte
    const marginAmount = financedAmount - totalAmount;
    const marginPercentage = totalAmount > 0 ? parseFloat(((marginAmount / totalAmount) * 100).toFixed(2)) : 82;

    // Préparer les données de l'offre
    const offerData = {
      id: requestId,
      client_id: clientId,
      client_name: data.client_name,
      client_email: data.client_email,
      equipment_description: data.equipment_description,
      amount: totalAmount, // Prix d'achat total
      monthly_payment: monthlyPayment, // Mensualité totale
      coefficient: coefficient,
      financed_amount: financedAmount,
      margin: marginPercentage,
      commission: 0,
      type: "client_request",
      workflow_status: "requested",
      status: "pending",
      remarks: data.message || '',
      user_id: null,
      company_id: data.company_id
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

      // Récupérer le modèle d'email de demande de produit
      const { data: emailTemplate, error: templateError } = await supabaseAdmin
        .from('email_templates')
        .select('subject, html_content')
        .eq('type', 'product_request')
        .eq('active', true)
        .single();
      
      let subject = `Bienvenue sur iTakecare - Confirmation de votre demande`;
      let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bienvenue ${data.client_name},</h2>
          <p>Votre demande d'équipement a été créée avec succès sur la plateforme iTakecare.</p>
          <p>Voici un récapitulatif de votre demande :</p>
          <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <li>Équipement : ${data.equipment_description}</li>
            <li>Montant total : ${data.amount} €</li>
            <li>Paiement mensuel estimé : ${data.monthly_payment} €/mois</li>
          </ul>
          <p>Notre équipe va étudier votre demande et vous contactera rapidement.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
      `;
      
      // Utiliser le modèle de la base de données s'il existe
      if (emailTemplate && !templateError) {
        console.log("Modèle d'email trouvé, utilisation du modèle personnalisé");
        
        subject = emailTemplate.subject.replace("{{client_name}}", data.client_name);
        
        // Remplacer les variables dans le contenu HTML
        htmlContent = emailTemplate.html_content
          .replace(/{{client_name}}/g, data.client_name)
          .replace(/{{equipment_description}}/g, data.equipment_description)
          .replace(/{{amount}}/g, data.amount)
          .replace(/{{monthly_payment}}/g, data.monthly_payment);
      } else if (templateError) {
        console.log("Erreur lors de la récupération du modèle d'email, utilisation du modèle par défaut:", templateError);
      } else {
        console.log("Aucun modèle d'email trouvé, utilisation du modèle par défaut");
      }
      
      // Vérifier si l'utilisateur a demandé la création d'un compte
      if (data.has_client_account === true) {
        console.log("L'utilisateur a demandé la création d'un compte client");
        
        try {
          // Générer un mot de passe aléatoire temporaire
          const tempPassword = Math.random().toString(36).slice(-12);
          
          // Créer un compte utilisateur
          const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: data.client_email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { 
              name: data.client_name,
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
            
            // Envoyer un email de réinitialisation de mot de passe
            const { error: resetPasswordError } = await supabaseAdmin.auth.admin.generateLink({
              type: "recovery",
              email: data.client_email,
              options: {
                redirectTo: `${Deno.env.get('SITE_URL') || ''}/auth/callback`
              }
            });
            
            if (resetPasswordError) {
              console.error("Erreur lors de la génération du lien de réinitialisation:", resetPasswordError);
            } else {
              console.log("Email de réinitialisation de mot de passe envoyé");
            }
          }
        } catch (accountError) {
          console.error("Exception lors de la création du compte:", accountError);
          // On ne bloque pas le processus même si la création du compte échoue
        }
      } else {
        console.log("L'utilisateur n'a pas demandé de création de compte client");
        
        // Générer un lien d'inscription pour l'utilisateur qui souhaiterait créer un compte plus tard
        // (ce lien sera inclus dans l'email, même s'il n'a pas coché la case)
        const { data: signupLinkData, error: signupLinkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: data.client_email,
          options: {
            redirectTo: `${Deno.env.get('SITE_URL') || ''}/auth/callback`
          }
        });
        
        if (signupLinkError) {
          console.error("Erreur lors de la génération du lien de création de compte:", signupLinkError);
        } else {
          const accountCreationLink = signupLinkData?.properties?.action_link || `${Deno.env.get('SITE_URL') || ''}/auth/signup?email=${encodeURIComponent(data.client_email)}`;
          console.log("Lien d'inscription généré:", accountCreationLink);
          
          // Remplacer la variable du lien dans le template d'email
          htmlContent = htmlContent.replace(/{{account_creation_link}}/g, accountCreationLink);
        }
      }
      
      // Texte brut pour les clients qui ne peuvent pas afficher le HTML
      const text = stripHtml(htmlContent);
      
      // Vérifier si une clé API Resend est disponible
      if (!smtpSettings.resend_api_key) {
        console.error("Clé API Resend non configurée dans la base de données");
        throw new Error("Clé API Resend non configurée");
      }
      
      // Initialiser Resend avec la clé API
      const resend = new Resend(smtpSettings.resend_api_key);
      
      // Format d'expéditeur
      const fromName = smtpSettings.from_name || "iTakecare";
      const fromEmail = smtpSettings.from_email || "noreply@itakecare.app";
      const from = `${fromName} <${fromEmail}>`;
      
      console.log(`Tentative d'envoi d'email via Resend à ${data.client_email} depuis ${from}`);
      
      // Envoyer l'email avec Resend
      const emailResult = await resend.emails.send({
        from,
        to: data.client_email,
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
      client_name: data.client_name,
      client_email: data.client_email,
      client_company: data.client_company,
      equipment_description: data.equipment_description,
      amount: data.amount,
      monthly_payment: data.monthly_payment,
      coefficient: coefficient,
      financed_amount: financedAmount,
      margin: parseFloat(marginPercentage.toFixed(2)),
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
