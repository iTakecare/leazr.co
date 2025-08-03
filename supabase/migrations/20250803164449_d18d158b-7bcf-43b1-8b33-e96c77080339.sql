-- Recréer immédiatement le modèle document_request manquant
INSERT INTO public.email_templates (
  id,
  company_id,
  subject,
  content,
  template_type,
  is_active,
  created_at,
  updated_at
) VALUES (
  'document_request',
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  'Documents requis - {{company_name}}',
  '<html>
<head>
  <meta charset="utf-8">
  <title>Documents requis</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
    .footer { background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6c757d; }
    .btn { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .documents-list { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .documents-list ul { margin: 0; padding-left: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Documents requis pour votre dossier</h1>
    </div>
    
    <div class="content">
      <p>Bonjour {{client_name}},</p>
      
      <p>Nous avons besoin de documents supplémentaires pour traiter votre demande de leasing avec <strong>{{company_name}}</strong>.</p>
      
      <div class="documents-list">
        <h3>Documents demandés :</h3>
        {{requested_documents}}
      </div>
      
      {{#if custom_message}}
      <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h4>Message personnalisé :</h4>
        <p>{{custom_message}}</p>
      </div>
      {{/if}}
      
      <p>Veuillez cliquer sur le lien ci-dessous pour télécharger vos documents :</p>
      
      <div style="text-align: center;">
        <a href="{{upload_link}}" class="btn">Télécharger mes documents</a>
      </div>
      
      <p><strong>Important :</strong></p>
      <ul>
        <li>Ce lien est sécurisé et personnel</li>
        <li>Il expire après 7 jours</li>
        <li>Vous pouvez télécharger plusieurs fichiers</li>
        <li>Formats acceptés : PDF, JPG, PNG, DOCX</li>
      </ul>
      
      <p>Si vous avez des questions, n''hésitez pas à nous contacter.</p>
      
      <p>Cordialement,<br>L''équipe {{company_name}}</p>
    </div>
    
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.</p>
    </div>
  </div>
</body>
</html>',
  'transactional',
  true,
  now(),
  now()
) ON CONFLICT (id, company_id) DO UPDATE SET
  subject = EXCLUDED.subject,
  content = EXCLUDED.content,
  template_type = EXCLUDED.template_type,
  is_active = EXCLUDED.is_active,
  updated_at = now();