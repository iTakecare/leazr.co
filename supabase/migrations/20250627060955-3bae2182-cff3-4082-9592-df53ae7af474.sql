
-- Vérifier le contenu du template email "offer_ready"
SELECT id, type, name, subject, html_content, active 
FROM email_templates 
WHERE type = 'offer_ready';
