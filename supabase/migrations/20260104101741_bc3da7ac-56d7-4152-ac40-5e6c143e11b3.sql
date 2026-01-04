-- Update offer_reminder templates to replace button with attachment message
-- Level 1 (Blue)
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<p style="text-align: center; margin: 30px 0;">
    <a href="{{offer_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Consulter mon offre
    </a>
  </p>',
  '<div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #dbeafe; border: 2px solid #3b82f6; border-radius: 8px;">
    <p style="margin: 0; font-size: 16px; color: #1d4ed8; font-weight: bold;">
      📎 Vous trouverez votre offre détaillée en pièce jointe de cet email.
    </p>
  </div>'
),
updated_at = now()
WHERE name = 'offer_reminder_l1';

-- Level 2 (Teal)
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<p style="text-align: center; margin: 30px 0;">
    <a href="{{offer_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
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

-- Level 3 (Sky - urgent)
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '<p style="text-align: center; margin: 30px 0;">
    <a href="{{offer_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Consulter mon offre
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

-- Update document_reminder templates with colored buttons matching their level
-- Level 1 (Violet)
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  'background-color: #2563eb;',
  'background-color: #8b5cf6;'
),
updated_at = now()
WHERE name = 'document_reminder_l1';

-- Level 2 (Purple) - already has orange #f59e0b, change to purple
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  'background-color: #f59e0b;',
  'background-color: #a855f7;'
),
updated_at = now()
WHERE name = 'document_reminder_l2';

-- Level 3 (Dark purple) - already has red #dc2626, change to dark purple  
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  'background-color: #dc2626;',
  'background-color: #9333ea;'
),
updated_at = now()
WHERE name = 'document_reminder_l3';