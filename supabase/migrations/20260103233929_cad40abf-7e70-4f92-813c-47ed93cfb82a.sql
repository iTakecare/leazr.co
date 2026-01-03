-- Mettre à jour les templates de rappel d'offres avec signature professionnelle

-- Template J+1 (ton amical, suivi)
UPDATE email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
</div>'
WHERE name = 'offer_reminder_j1';

-- Template J+3 (intéressé, disponible)
UPDATE email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1f2937;">Bonjour {{client_name}},</h2>
  
  <p>Nous revenons vers vous concernant notre proposition de financement.</p>
  <p>Votre offre d''un montant de <strong>{{offer_amount}} €</strong> (soit <strong>{{monthly_payment}} €/mois</strong>) est toujours disponible.</p>
  <p>Nous restons à votre disposition pour échanger sur les conditions ou adapter l''offre à vos besoins.</p>
  
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
</div>'
WHERE name = 'offer_reminder_j3';

-- Template J+5 (plus direct, importance)
UPDATE email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1f2937;">Bonjour {{client_name}},</h2>
  
  <p>Nous souhaitions nous assurer que vous aviez bien reçu notre offre de financement.</p>
  <p><strong>Votre offre de {{offer_amount}} € ({{monthly_payment}} €/mois) reste valable</strong>, mais nous voulions nous assurer qu''elle répond bien à vos attentes.</p>
  <p>Si certains éléments méritent d''être ajustés, n''hésitez pas à nous le faire savoir. Nous serons ravis de trouver la solution adaptée.</p>
  
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
</div>'
WHERE name = 'offer_reminder_j5';

-- Template J+9 (dernier rappel, clôture possible)
UPDATE email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1f2937;">Bonjour {{client_name}},</h2>
  
  <p style="color: #dc2626;"><strong>Dernier rappel concernant votre offre</strong></p>
  
  <p>Nous n''avons pas eu de retour de votre part concernant notre proposition de financement de <strong>{{offer_amount}} €</strong>.</p>
  <p>Sans nouvelles de votre part, nous considérerons que cette offre ne correspond plus à vos besoins et procéderons à sa clôture.</p>
  <p>Si vous êtes toujours intéressé(e), ou si vous avez des questions, merci de nous contacter rapidement.</p>
  
  {{custom_message}}
  
  <p style="text-align: center; margin: 30px 0;">
    <a href="{{offer_link}}" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
      CONSULTER MON OFFRE
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
</div>'
WHERE name = 'offer_reminder_j9';