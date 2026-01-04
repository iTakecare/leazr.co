-- Update document_reminder_l1 with professional signature
UPDATE email_templates 
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937;">Bonjour {{client_name}},</h2>
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
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <table style="width: 100%;">
      <tr>
        <td style="vertical-align: top; padding-right: 15px; width: 60px;">
          <img src="{{company_logo}}" alt="{{company_name}}" style="width: 50px; height: auto; border-radius: 8px;">
        </td>
        <td style="vertical-align: top;">
          <p style="margin: 0; font-weight: bold; color: #1f2937;">{{representative_name}}</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">{{representative_title}}</p>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #6b7280;">{{company_name}}</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">
            <a href="mailto:{{contact_email}}" style="color: #2563eb; text-decoration: none;">{{contact_email}}</a>
            <span style="color: #d1d5db; margin: 0 8px;">|</span>
            <span style="color: #6b7280;">{{contact_phone}}</span>
          </p>
        </td>
      </tr>
    </table>
</div>',
updated_at = now()
WHERE name = 'document_reminder_l1';

-- Update document_reminder_l2 with professional signature
UPDATE email_templates 
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937;">Bonjour {{client_name}},</h2>
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
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <table style="width: 100%;">
      <tr>
        <td style="vertical-align: top; padding-right: 15px; width: 60px;">
          <img src="{{company_logo}}" alt="{{company_name}}" style="width: 50px; height: auto; border-radius: 8px;">
        </td>
        <td style="vertical-align: top;">
          <p style="margin: 0; font-weight: bold; color: #1f2937;">{{representative_name}}</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">{{representative_title}}</p>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #6b7280;">{{company_name}}</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">
            <a href="mailto:{{contact_email}}" style="color: #2563eb; text-decoration: none;">{{contact_email}}</a>
            <span style="color: #d1d5db; margin: 0 8px;">|</span>
            <span style="color: #6b7280;">{{contact_phone}}</span>
          </p>
        </td>
      </tr>
    </table>
</div>',
updated_at = now()
WHERE name = 'document_reminder_l2';

-- Update document_reminder_l3 with professional signature  
UPDATE email_templates 
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937;">Bonjour {{client_name}},</h2>
    <p><strong>Rappel urgent</strong> : Nous attendons toujours les documents nécessaires au traitement de votre dossier.</p>
    <p style="color: #dc2626;"><strong>Sans ces documents, nous ne pourrons malheureusement pas poursuivre le traitement de votre demande.</strong></p>
    <p><strong>Documents demandés :</strong></p>
    {{requested_documents}}
    <p>Merci de nous les transmettre dans les plus brefs délais :</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{upload_link}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Envoyer mes documents immédiatement
      </a>
    </p>
    {{custom_message}}
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <table style="width: 100%;">
      <tr>
        <td style="vertical-align: top; padding-right: 15px; width: 60px;">
          <img src="{{company_logo}}" alt="{{company_name}}" style="width: 50px; height: auto; border-radius: 8px;">
        </td>
        <td style="vertical-align: top;">
          <p style="margin: 0; font-weight: bold; color: #1f2937;">{{representative_name}}</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">{{representative_title}}</p>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #6b7280;">{{company_name}}</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">
            <a href="mailto:{{contact_email}}" style="color: #2563eb; text-decoration: none;">{{contact_email}}</a>
            <span style="color: #d1d5db; margin: 0 8px;">|</span>
            <span style="color: #6b7280;">{{contact_phone}}</span>
          </p>
        </td>
      </tr>
    </table>
</div>',
updated_at = now()
WHERE name = 'document_reminder_l3';