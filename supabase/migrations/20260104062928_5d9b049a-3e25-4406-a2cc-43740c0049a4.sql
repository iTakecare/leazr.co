-- Supprimer la ligne {{representative_title}} de tous les templates email
UPDATE email_templates 
SET html_content = REPLACE(
  html_content, 
  '<p style="margin: 0; font-size: 13px; color: #6b7280;">{{representative_title}}</p>',
  ''
)
WHERE html_content LIKE '%representative_title%';

-- Aussi supprimer les variantes avec espaces différents
UPDATE email_templates 
SET html_content = REPLACE(
  html_content, 
  '<p style="margin: 0; font-size: 13px; color: #6b7280;">{{ representative_title }}</p>',
  ''
)
WHERE html_content LIKE '%representative_title%';