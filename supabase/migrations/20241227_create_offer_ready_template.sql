
-- Créer le template email "offer_ready" pour l'envoi du lien de signature
INSERT INTO email_templates (type, name, subject, html_content, text_content, active)
VALUES (
  'offer_ready',
  'Contrat prêt à signer',
  'Votre contrat pour {{equipment_description}} est prêt à signer',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Contrat prêt à signer</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f7f7f7;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; color: #333333;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="{{site_logo}}" alt="Logo" style="max-width: 200px; height: auto;" />
    </div>
    
    <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">
      Bonjour {{client_name}},
    </h2>
    
    <p style="font-size: 16px; line-height: 1.6;">
      Nous avons le plaisir de vous informer que votre contrat de financement est maintenant disponible pour consultation et signature.
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2d618f;">Détails du contrat :</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 5px 0;"><strong>Équipement :</strong> {{equipment_description}}</li>
        <li style="padding: 5px 0;"><strong>Montant financé :</strong> {{amount}}€</li>
        <li style="padding: 5px 0;"><strong>Mensualité :</strong> {{monthly_payment}}€</li>
      </ul>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">
      Pour consulter les détails complets et signer votre contrat, veuillez cliquer sur le bouton ci-dessous :
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{offer_link}}" 
         style="background-color: #4CAF50; 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: bold; 
                font-size: 16px;
                display: inline-block;
                transition: background-color 0.3s;">
        Consulter et signer mon contrat
      </a>
    </div>
    
    <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;">
        <strong>Important :</strong> Ce lien vous permet d''accéder à votre contrat et de le signer électroniquement si les conditions vous conviennent.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">
      Si vous avez des questions concernant ce contrat, n''hésitez pas à nous contacter.
    </p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666;">
      <p>Cordialement,<br>L''équipe iTakecare</p>
    </div>
  </div>
</body>
</html>',
  'Bonjour {{client_name}},

Nous avons le plaisir de vous informer que votre contrat de financement est maintenant disponible pour consultation et signature.

Détails du contrat :
- Équipement : {{equipment_description}}
- Montant financé : {{amount}}€
- Mensualité : {{monthly_payment}}€

Pour consulter et signer votre contrat, rendez-vous sur : {{offer_link}}

Si vous avez des questions, n''hésitez pas à nous contacter.

Cordialement,
L''équipe iTakecare',
  true
) ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  active = EXCLUDED.active,
  updated_at = now();
