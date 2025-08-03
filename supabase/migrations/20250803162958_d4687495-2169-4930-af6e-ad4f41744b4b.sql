-- Ajouter le template d'email pour la demande de documents
INSERT INTO public.email_templates (
  id,
  company_id,
  type,
  name,
  subject,
  html_content,
  active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0', -- iTakecare company ID
  'document_request',
  'Demande de documents - Offre de leasing',
  'Documents requis - Offre de leasing',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documents requis</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 24px;">Documents requis pour votre offre de leasing</h1>
    </div>
    
    <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <p style="margin-top: 0;">Bonjour {{client_name}},</p>
        
        <p>Nous avons le plaisir de vous informer que votre demande de leasing a été étudiée. Pour finaliser votre dossier, nous aurions besoin des documents suivants :</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Documents demandés :</h3>
            <div style="color: #6b7280;">{{requested_documents}}</div>
        </div>
        
        {{#if custom_message}}
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 10px 0; color: #92400e;">Message personnalisé :</h3>
            <p style="margin: 0; color: #92400e;">{{custom_message}}</p>
        </div>
        {{/if}}
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{upload_link}}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"
               target="_blank" rel="noopener noreferrer">
                📎 Télécharger mes documents
            </a>
        </div>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">Informations importantes :</h4>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                <li>Ce lien est sécurisé et personnel</li>
                <li>Vous pouvez télécharger plusieurs fichiers</li>
                <li>Formats acceptés : PDF, JPG, PNG</li>
                <li>Taille maximum par fichier : 10 MB</li>
            </ul>
        </div>
        
        <p>Si vous avez des questions, n''hésitez pas à nous contacter.</p>
        
        <p style="margin-bottom: 0;">Cordialement,<br>
        <strong>{{company_name}}</strong></p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.</p>
    </div>
</body>
</html>',
  true,
  now(),
  now()
);