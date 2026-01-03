-- Create new offer_reminder_l1 template (friendly first follow-up)
INSERT INTO email_templates (company_id, name, subject, html_content, active, type)
SELECT 
  company_id,
  'offer_reminder_l1',
  'Votre offre - Premier suivi',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1f2937;">Bonjour {{client_name}},</h2>
  
  <p>Nous espérons que vous allez bien.</p>
  <p>Nous souhaitions revenir vers vous concernant l''offre que nous vous avons transmise récemment.</p>
  <p>Avez-vous eu l''occasion de l''étudier ? Nous serions ravis de répondre à vos éventuelles questions.</p>
  
  {{custom_message}}
  
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{offer_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Consulter mon offre
    </a>
  </p>
  
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
  true,
  'offer_reminder'
FROM email_templates
WHERE name = 'offer_reminder_j1' AND active = true
ON CONFLICT (company_id, name) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  active = EXCLUDED.active;

-- Create new offer_reminder_l2 template (moderate follow-up)
INSERT INTO email_templates (company_id, name, subject, html_content, active, type)
SELECT 
  company_id,
  'offer_reminder_l2',
  'Votre offre en attente - Relance',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1f2937;">Bonjour {{client_name}},</h2>
  
  <p>Nous nous permettons de vous relancer concernant l''offre que nous vous avons envoyée.</p>
  <p>Si vous avez des questions ou si certains points nécessitent des éclaircissements, n''hésitez pas à nous contacter.</p>
  <p>Nous restons à votre disposition pour en discuter à votre convenance.</p>
  
  {{custom_message}}
  
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{offer_link}}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Consulter mon offre
    </a>
  </p>
  
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
  true,
  'offer_reminder'
FROM email_templates
WHERE name = 'offer_reminder_j1' AND active = true
ON CONFLICT (company_id, name) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  active = EXCLUDED.active;

-- Create new offer_reminder_l3 template (urgent final reminder)
INSERT INTO email_templates (company_id, name, subject, html_content, active, type)
SELECT 
  company_id,
  'offer_reminder_l3',
  '⚠️ Dernier rappel - Votre offre expire bientôt',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #dc2626;">Bonjour {{client_name}},</h2>
  
  <p><strong>Ceci est notre dernier rappel concernant votre offre.</strong></p>
  <p>Sans réponse de votre part dans les prochains jours, nous considérerons que cette offre ne vous intéresse plus et nous procéderons à sa clôture.</p>
  <p>Si vous souhaitez toujours donner suite à cette proposition, merci de nous contacter rapidement.</p>
  
  {{custom_message}}
  
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{offer_link}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Consulter mon offre maintenant
    </a>
  </p>
  
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
  true,
  'offer_reminder'
FROM email_templates
WHERE name = 'offer_reminder_j1' AND active = true
ON CONFLICT (company_id, name) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  active = EXCLUDED.active;

-- Deactivate old j1/j3/j5/j9 templates
UPDATE email_templates 
SET active = false 
WHERE name IN ('offer_reminder_j1', 'offer_reminder_j3', 'offer_reminder_j5', 'offer_reminder_j9');