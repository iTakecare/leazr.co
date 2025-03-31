
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const defaultTemplates = [
  {
    type: "welcome",
    name: "Email de bienvenue",
    subject: "Bienvenue sur iTakecare {{client_name}} !",
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bienvenue {{client_name}},</h2>
        <p>Votre compte a été créé avec succès sur la plateforme iTakecare.</p>
        <p>Vous pouvez dès maintenant vous connecter à votre espace personnel pour :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Consulter vos contrats</li>
          <li>Suivre vos équipements</li>
          <li>Effectuer de nouvelles demandes</li>
        </ul>
        <div style="text-align: center; margin: 20px 0;">
          <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Accéder à mon compte</a>
        </div>
        <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter notre équipe support.</p>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `,
    active: true
  },
  {
    type: "product_request",
    name: "Confirmation de demande de produit",
    subject: "Bienvenue sur iTakecare - Confirmation de votre demande",
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bonjour {{client_name}},</h2>
        <p>Votre demande d'équipement a été créée avec succès sur la plateforme iTakecare.</p>
        <p>Voici un récapitulatif de votre demande :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Équipement : {{equipment_description}}</li>
          <li>Montant total : {{amount}} €</li>
          <li>Paiement mensuel estimé : {{monthly_payment}} €/mois</li>
        </ul>
        <p>Notre équipe va étudier votre demande et vous contactera rapidement.</p>
        <p>Pour suivre l'avancement de votre demande et accéder à toutes les fonctionnalités de notre plateforme, vous pouvez créer un compte client :</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Créer mon compte</a>
        </div>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `,
    active: true
  },
  {
    type: "offer_accepted",
    name: "Offre acceptée",
    subject: "iTakecare - Votre offre a été acceptée",
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Félicitations {{client_name}} !</h2>
        <p>Nous avons le plaisir de vous informer que votre offre a été acceptée.</p>
        <p>Détails de l'offre :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Équipement : {{equipment_description}}</li>
          <li>Montant total : {{amount}} €</li>
          <li>Paiement mensuel : {{monthly_payment}} €/mois</li>
        </ul>
        <p>Les prochaines étapes :</p>
        <ol style="margin-left: 20px;">
          <li>Notre équipe va vous contacter pour finaliser le contrat</li>
          <li>Préparation de votre équipement</li>
          <li>Livraison selon les modalités convenues</li>
        </ol>
        <p>Suivez l'avancement de votre commande directement depuis votre espace client :</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Accéder à mon espace client</a>
        </div>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `,
    active: true
  },
  {
    type: "contract_signed",
    name: "Contrat signé",
    subject: "iTakecare - Confirmation de signature de contrat",
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Merci {{client_name}} !</h2>
        <p>Nous vous confirmons la bonne réception de votre contrat signé pour :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Équipement : {{equipment_description}}</li>
          <li>Montant total : {{amount}} €</li>
          <li>Paiement mensuel : {{monthly_payment}} €/mois</li>
        </ul>
        <p>Votre contrat est maintenant en cours de traitement. Voici les prochaines étapes :</p>
        <ol style="margin-left: 20px;">
          <li>Validation finale par notre service administratif</li>
          <li>Préparation de votre commande</li>
          <li>Livraison et installation</li>
        </ol>
        <p>Vous pouvez suivre l'avancement du processus dans votre espace client :</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Accéder à mon espace client</a>
        </div>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `,
    active: true
  },
  {
    type: "delivery_scheduled",
    name: "Livraison programmée",
    subject: "iTakecare - Votre livraison est programmée",
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bonjour {{client_name}},</h2>
        <p>Bonne nouvelle ! Votre équipement est prêt à être livré.</p>
        <p>Détails de la livraison :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Équipement : {{equipment_description}}</li>
          <li>Date de livraison prévue : {{date}}</li>
          <li>Contact logistique : Notre équipe vous appellera pour confirmer l'heure exacte</li>
        </ul>
        <p>Rappel de votre contrat :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Montant total : {{amount}} €</li>
          <li>Paiement mensuel : {{monthly_payment}} €/mois</li>
        </ul>
        <p>Pour toute question concernant votre livraison, n'hésitez pas à nous contacter ou à consulter votre espace client :</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Accéder à mon espace client</a>
        </div>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `,
    active: true
  },
  {
    type: "password_reset",
    name: "Réinitialisation de mot de passe",
    subject: "iTakecare - Réinitialisation de votre mot de passe",
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bonjour {{client_name}},</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Pour définir un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous :</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Réinitialiser mon mot de passe</a>
        </div>
        <p>Ce lien est valable pendant 24 heures. Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `,
    active: true
  },
  {
    type: "payment_reminder",
    name: "Rappel de paiement",
    subject: "iTakecare - Rappel de paiement",
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bonjour {{client_name}},</h2>
        <p>Nous vous rappelons que le paiement mensuel de votre équipement est attendu prochainement :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Équipement : {{equipment_description}}</li>
          <li>Montant à payer : {{monthly_payment}} €</li>
          <li>Date d'échéance : {{date}}</li>
        </ul>
        <p>Pour effectuer votre paiement ou consulter les détails de votre contrat, connectez-vous à votre espace client :</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Accéder à mon espace client</a>
        </div>
        <p>Si vous avez déjà effectué ce paiement, veuillez ignorer cet email.</p>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `,
    active: true
  },
  {
    type: "contract_completed",
    name: "Contrat terminé",
    subject: "iTakecare - Votre contrat est arrivé à terme",
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Félicitations {{client_name}} !</h2>
        <p>Nous avons le plaisir de vous informer que votre contrat de leasing est arrivé à son terme.</p>
        <p>Détails du contrat :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Équipement : {{equipment_description}}</li>
          <li>Montant total payé : {{amount}} €</li>
        </ul>
        <p>Vous disposez maintenant des options suivantes :</p>
        <ol style="margin-left: 20px;">
          <li>Garder votre équipement (aucune action requise de votre part)</li>
          <li>Renouveler avec un nouvel équipement</li>
          <li>Retourner l'équipement (si prévu dans votre contrat)</li>
        </ol>
        <p>Notre équipe commerciale se tient à votre disposition pour vous conseiller sur les nouvelles offres disponibles :</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Découvrir les nouvelles offres</a>
        </div>
        <p>Nous vous remercions pour votre confiance et espérons vous compter parmi nos clients pour longtemps.</p>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `,
    active: true
  },
  {
    type: "maintenance_scheduled",
    name: "Maintenance programmée",
    subject: "iTakecare - Maintenance programmée pour votre équipement",
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bonjour {{client_name}},</h2>
        <p>Dans le cadre de votre contrat de maintenance, nous vous informons qu'une intervention est programmée pour votre équipement.</p>
        <p>Détails de la maintenance :</p>
        <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <li>Équipement : {{equipment_description}}</li>
          <li>Date prévue : {{date}}</li>
          <li>Type d'intervention : Maintenance préventive</li>
        </ul>
        <p>Un technicien vous contactera prochainement pour confirmer l'heure exacte de l'intervention.</p>
        <p>Pour toute question ou pour modifier ce rendez-vous, connectez-vous à votre espace client :</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Accéder à mon espace client</a>
        </div>
        <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
      </div>
    `,
    active: true
  }
];

serve(async (req) => {
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Créer un client Supabase avec la clé de service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false } }
    );

    // Vérifier si les modèles existent déjà
    const { data: existingTemplates, error: checkError } = await supabaseAdmin
      .from('email_templates')
      .select('type')
      .order('type');

    if (checkError) {
      console.error("Erreur lors de la vérification des modèles:", checkError);
      throw checkError;
    }

    const existingTypes = new Set(existingTemplates?.map(t => t.type) || []);
    const templatesToInsert = defaultTemplates.filter(template => !existingTypes.has(template.type));

    let insertResult = { data: null, error: null };
    
    if (templatesToInsert.length > 0) {
      console.log(`Insertion de ${templatesToInsert.length} nouveaux modèles d'email...`);
      insertResult = await supabaseAdmin
        .from('email_templates')
        .insert(templatesToInsert)
        .select();
      
      if (insertResult.error) {
        console.error("Erreur lors de l'insertion des modèles:", insertResult.error);
        throw insertResult.error;
      }
    } else {
      console.log("Aucun nouveau modèle à insérer.");
    }

    // Obtenir tous les modèles après l'insertion
    const { data: allTemplates, error: getAllError } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .order('name');

    if (getAllError) {
      console.error("Erreur lors de la récupération de tous les modèles:", getAllError);
      throw getAllError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: templatesToInsert.length,
        total: allTemplates?.length || 0,
        templates: allTemplates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Erreur dans la fonction Edge:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Une erreur est survenue: ${error.message}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
