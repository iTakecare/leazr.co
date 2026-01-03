-- Mettre à jour les templates document_reminder_l1, l2, l3 avec le bouton d'upload

-- Template L1 (ton amical)
UPDATE email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Bonjour {{client_name}},</h2>
    <p>Nous espérons que vous allez bien.</p>
    <p>Nous vous rappelons que certains documents sont encore en attente pour finaliser votre dossier.</p>
    <p><strong>Documents demandés :</strong></p>
    {{requested_documents}}
    <p>Pour nous transmettre vos documents en toute sécurité, cliquez sur le bouton ci-dessous :</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{upload_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Envoyer mes documents
      </a>
    </p>
    {{custom_message}}
    <p>N''hésitez pas à nous contacter si vous avez des questions.</p>
    <ul style="list-style: none; padding-left: 0;">
      <li>Email : <a href="mailto:{{contact_email}}">{{contact_email}}</a></li>
      <li>Téléphone : {{contact_phone}}</li>
    </ul>
    <p>Cordialement,<br>L''équipe {{company_name}}</p>
</div>'
WHERE name = 'document_reminder_l1';

-- Template L2 (ton plus insistant)
UPDATE email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Bonjour {{client_name}},</h2>
    <p>Nous revenons vers vous concernant les documents nécessaires à la finalisation de votre dossier.</p>
    <p><strong>Ces documents sont essentiels pour poursuivre le traitement de votre demande.</strong></p>
    <p><strong>Documents demandés :</strong></p>
    {{requested_documents}}
    <p>Veuillez téléverser vos documents via le bouton ci-dessous :</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{upload_link}}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Envoyer mes documents maintenant
      </a>
    </p>
    {{custom_message}}
    <p>Si vous rencontrez des difficultés, n''hésitez pas à nous contacter :</p>
    <ul style="list-style: none; padding-left: 0;">
      <li>Email : <a href="mailto:{{contact_email}}">{{contact_email}}</a></li>
      <li>Téléphone : {{contact_phone}}</li>
    </ul>
    <p>Cordialement,<br>L''équipe {{company_name}}</p>
</div>'
WHERE name = 'document_reminder_l2';

-- Template L3 (ton urgent)
UPDATE email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Bonjour {{client_name}},</h2>
    <p style="color: #dc2626;"><strong>URGENT : Dernier rappel concernant vos documents</strong></p>
    <p>Malgré nos précédentes relances, nous n''avons toujours pas reçu les documents nécessaires à la finalisation de votre dossier.</p>
    <p><strong>Sans ces documents, nous serons dans l''impossibilité de traiter votre demande.</strong></p>
    <p><strong>Documents demandés :</strong></p>
    {{requested_documents}}
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{upload_link}}" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        ENVOYER MES DOCUMENTS MAINTENANT
      </a>
    </p>
    {{custom_message}}
    <p>Pour toute question urgente, contactez-nous immédiatement :</p>
    <ul style="list-style: none; padding-left: 0;">
      <li>Email : <a href="mailto:{{contact_email}}">{{contact_email}}</a></li>
      <li>Téléphone : {{contact_phone}}</li>
    </ul>
    <p>Cordialement,<br>L''équipe {{company_name}}</p>
</div>'
WHERE name = 'document_reminder_l3';