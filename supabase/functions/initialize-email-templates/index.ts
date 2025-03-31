
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Configuration CORS
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
    // Créer un client Supabase avec la clé de service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false } }
    );
    
    // Modèles d'email à initialiser
    const templates = [
      {
        type: 'welcome',
        name: 'Email de bienvenue',
        subject: 'Bienvenue sur iTakecare, {{client_name}} !',
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bienvenue sur iTakecare !</h2>
          <p>Bonjour {{client_name}},</p>
          <p>Nous sommes ravis de vous accueillir sur la plateforme iTakecare.</p>
          <p>Votre compte a été créé avec succès. Vous recevrez prochainement un email pour définir votre mot de passe.</p>
          <p>Une fois connecté, vous pourrez suivre vos demandes de financement, consulter vos équipements et gérer vos contrats.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      },
      {
        type: 'password_reset',
        name: 'Réinitialisation du mot de passe',
        subject: 'Réinitialisation de votre mot de passe iTakecare',
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Réinitialisation de mot de passe</h2>
          <p>Bonjour {{client_name}},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte iTakecare.</p>
          <p>Veuillez cliquer sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{reset_link}}" style="background-color: #2d618f; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Réinitialiser mon mot de passe</a>
          </div>
          <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
          <p>Ce lien est valable pour une durée de 24 heures.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      },
      {
        type: 'new_account',
        name: 'Création de compte',
        subject: 'Votre compte iTakecare a été créé',
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Votre compte iTakecare est prêt !</h2>
          <p>Bonjour {{client_name}},</p>
          <p>Nous sommes heureux de vous informer que votre compte iTakecare a été créé avec succès.</p>
          <p>Pour définir votre mot de passe et accéder à votre espace personnel, veuillez cliquer sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{account_creation_link}}" style="background-color: #2d618f; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Activer mon compte</a>
          </div>
          <p>Une fois connecté, vous pourrez suivre vos demandes de financement et gérer vos équipements en leasing.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      },
      {
        type: 'offer_ready',
        name: 'Offre prête à consulter',
        subject: 'Votre offre de financement est prête - iTakecare',
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Votre offre de financement est prête</h2>
          <p>Bonjour {{client_name}},</p>
          <p>Nous avons le plaisir de vous informer que votre offre de financement pour <strong>{{equipment_description}}</strong> est maintenant prête à être consultée.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin-top: 0;"><strong>Récapitulatif de l'offre :</strong></p>
            <p>- Équipement : {{equipment_description}}</p>
            <p>- Montant total : {{amount}} €</p>
            <p>- Paiement mensuel : {{monthly_payment}} €</p>
          </div>
          
          <p>Pour consulter les détails complets de votre offre et la valider, veuillez cliquer sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{offer_link}}" style="background-color: #2d618f; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Consulter mon offre</a>
          </div>
          <p>Si vous avez des questions concernant cette offre, n'hésitez pas à nous contacter.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      },
      {
        type: 'document_request',
        name: 'Demande de documents',
        subject: 'Documents requis pour finaliser votre offre iTakecare',
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Documents complémentaires requis</h2>
          <p>Bonjour {{client_name}},</p>
          <p>Afin de finaliser l'analyse de votre dossier pour le financement de <strong>{{equipment_description}}</strong>, nous avons besoin des documents suivants :</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin-top: 0;"><strong>Documents à fournir :</strong></p>
            <ul style="padding-left: 20px;">
              {{requested_documents}}
            </ul>
          </div>
          
          <p>{{custom_message}}</p>
          
          <p>Vous pouvez nous transmettre ces documents en répondant directement à cet email ou en les téléchargeant dans votre espace client.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{client_portal_link}}" style="background-color: #2d618f; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accéder à mon espace client</a>
          </div>
          <p>Nous vous remercions pour votre coopération et restons à votre disposition pour toute question.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      },
      {
        type: 'offer_accepted',
        name: 'Offre acceptée',
        subject: 'Confirmation - Votre offre iTakecare a été acceptée',
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Votre offre a été acceptée !</h2>
          <p>Bonjour {{client_name}},</p>
          <p>Nous avons le plaisir de vous informer que votre offre de financement pour <strong>{{equipment_description}}</strong> a été acceptée par notre équipe.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin-top: 0;"><strong>Détails de l'offre :</strong></p>
            <p>- Équipement : {{equipment_description}}</p>
            <p>- Montant total : {{amount}} €</p>
            <p>- Paiement mensuel : {{monthly_payment}} €</p>
            <p>- Date d'acceptation : {{date}}</p>
          </div>
          
          <p>Les prochaines étapes pour finaliser votre contrat vous seront communiquées très prochainement.</p>
          <p>Vous pouvez suivre l'avancement de votre dossier dans votre espace client :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{client_portal_link}}" style="background-color: #2d618f; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accéder à mon espace client</a>
          </div>
          <p>Nous vous remercions pour votre confiance et restons à votre disposition pour toute question.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      },
      {
        type: 'offer_rejected',
        name: 'Offre refusée',
        subject: 'Information concernant votre demande de financement iTakecare',
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Statut de votre demande de financement</h2>
          <p>Bonjour {{client_name}},</p>
          <p>Suite à l'étude de votre dossier pour le financement de <strong>{{equipment_description}}</strong>, nous regrettons de vous informer que nous ne sommes pas en mesure de donner une suite favorable à votre demande actuelle.</p>
          <p>Nos conseillers restent à votre disposition pour discuter des alternatives possibles ou pour étudier une nouvelle demande avec des conditions différentes.</p>
          <p>N'hésitez pas à nous contacter pour plus d'informations.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      },
      {
        type: 'contract_ready',
        name: 'Contrat prêt à signer',
        subject: 'Votre contrat de financement est prêt à signer - iTakecare',
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Votre contrat est prêt à signer</h2>
          <p>Bonjour {{client_name}},</p>
          <p>Nous avons le plaisir de vous informer que votre contrat de financement pour <strong>{{equipment_description}}</strong> est maintenant prêt à être signé.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin-top: 0;"><strong>Récapitulatif du contrat :</strong></p>
            <p>- Équipement : {{equipment_description}}</p>
            <p>- Montant total : {{amount}} €</p>
            <p>- Paiement mensuel : {{monthly_payment}} €</p>
          </div>
          
          <p>Pour consulter et signer votre contrat, veuillez cliquer sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{contract_link}}" style="background-color: #2d618f; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Consulter et signer mon contrat</a>
          </div>
          <p>Si vous avez des questions concernant ce contrat, n'hésitez pas à nous contacter.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      }
    ];
    
    console.log(`Tentative d'initialisation de ${templates.length} modèles d'email...`);
    
    // Vérifier quels modèles existent déjà
    let insertedCount = 0;
    let totalCount = 0;
    
    for (const template of templates) {
      // Vérifier si le modèle existe déjà
      const { data: existingTemplate, error: checkError } = await supabaseAdmin
        .from('email_templates')
        .select('id')
        .eq('type', template.type)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {  // PGRST116 = not found
        console.error(`Erreur lors de la vérification du modèle ${template.type}:`, checkError);
        continue;
      }
      
      if (existingTemplate) {
        console.log(`Le modèle ${template.type} existe déjà. Mise à jour...`);
        totalCount++;
        
        // Mettre à jour le modèle existant
        const { error: updateError } = await supabaseAdmin
          .from('email_templates')
          .update({
            name: template.name,
            subject: template.subject,
            html_content: template.html_content,
            active: template.active,
            updated_at: new Date()
          })
          .eq('id', existingTemplate.id);
          
        if (updateError) {
          console.error(`Erreur lors de la mise à jour du modèle ${template.type}:`, updateError);
        } else {
          console.log(`Modèle ${template.type} mis à jour avec succès`);
        }
      } else {
        console.log(`Le modèle ${template.type} n'existe pas. Création...`);
        
        // Créer le nouveau modèle
        const { error: insertError } = await supabaseAdmin
          .from('email_templates')
          .insert({
            type: template.type,
            name: template.name,
            subject: template.subject,
            html_content: template.html_content,
            active: template.active,
            created_at: new Date(),
            updated_at: new Date()
          });
          
        if (insertError) {
          console.error(`Erreur lors de la création du modèle ${template.type}:`, insertError);
        } else {
          console.log(`Modèle ${template.type} créé avec succès`);
          insertedCount++;
          totalCount++;
        }
      }
    }
    
    console.log(`Initialisation des modèles d'email terminée. ${insertedCount} nouveaux modèles ajoutés sur un total de ${totalCount}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        total: totalCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de l'initialisation des modèles d'email:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
