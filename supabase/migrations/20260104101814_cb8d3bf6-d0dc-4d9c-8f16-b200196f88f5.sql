-- Update offer_reminder_l2 - replace button with attachment message (Teal color)
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<p style="text-align: center; margin: 30px 0;">
    <a href="{{offer_link}}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Consulter mon offre
    </a>
  </p>',
  '<div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #ccfbf1; border: 2px solid #14b8a6; border-radius: 8px;">
    <p style="margin: 0; font-size: 16px; color: #0f766e; font-weight: bold;">
      📎 Vous trouverez votre offre détaillée en pièce jointe de cet email.
    </p>
  </div>'
),
updated_at = now()
WHERE name = 'offer_reminder_l2';

-- Update offer_reminder_l3 - replace button with attachment message (Sky color - urgent)
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<p style="text-align: center; margin: 30px 0;">
    <a href="{{offer_link}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Consulter mon offre maintenant
    </a>
  </p>',
  '<div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #e0f2fe; border: 2px solid #0ea5e9; border-radius: 8px;">
    <p style="margin: 0; font-size: 16px; color: #0369a1; font-weight: bold;">
      📎 Vous trouverez votre offre détaillée en pièce jointe de cet email.
    </p>
  </div>'
),
updated_at = now()
WHERE name = 'offer_reminder_l3';