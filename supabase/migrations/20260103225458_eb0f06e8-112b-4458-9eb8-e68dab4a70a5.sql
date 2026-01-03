-- Update document_reminder template to include contact information
UPDATE public.email_templates
SET html_content = REPLACE(
  html_content,
  '<p>Si vous avez des questions, n''hésitez pas à nous contacter.</p>
<p>Cordialement,<br>{{company_name}}</p>',
  '<p>Si vous avez des questions, n''hésitez pas à nous contacter :</p>
<ul style="list-style: none; padding-left: 0;">
  <li>📧 Email : <a href="mailto:{{contact_email}}">{{contact_email}}</a></li>
  <li>📞 Téléphone : {{contact_phone}}</li>
</ul>
<p>Cordialement,<br>L''équipe {{company_name}}</p>'
),
updated_at = now()
WHERE name = 'document_reminder';