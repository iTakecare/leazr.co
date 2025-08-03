-- Insérer simplement le modèle document_request manquant
INSERT INTO public.email_templates (
  type,
  company_id,
  name,
  subject,
  html_content,
  text_content,
  active
) VALUES (
  'document_request',
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  'Demande de documents',
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
      
      <p>Veuillez cliquer sur le lien ci-dessous pour télécharger vos documents :</p>
      
      <div style="text-align: center;">
        <a href="{{upload_link}}" class="btn">Télécharger mes documents</a>
      </div>
      
      <p><strong>Important :</strong> Ce lien expire après 7 jours.</p>
      
      <p>Cordialement,<br>L''équipe {{company_name}}</p>
    </div>
    
    <div class="footer">
      <p>Cet email a été envoyé automatiquement.</p>
    </div>
  </div>
</body>
</html>',
  'Documents requis pour votre dossier de leasing. Veuillez utiliser le lien fourni pour télécharger les documents demandés.',
  true
);