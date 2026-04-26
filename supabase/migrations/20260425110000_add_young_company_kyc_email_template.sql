BEGIN;

-- Template email "document_request_young_company" : demande KYC renforcé
-- aux clients dont l'offre a été refusée pour ancienneté insuffisante.
INSERT INTO public.email_templates (company_id, type, name, subject, html_content, text_content, active)
SELECT
  c.id,
  'document_request_young_company',
  'document_request_young_company',
  'Documents complémentaires requis pour reprendre l''étude de votre dossier',
  '<h2>Bonjour {{client_name}},</h2>
<p>Nous revenons vers vous suite à l''analyse de votre demande de leasing par notre partenaire financier.</p>
<p>Compte tenu de l''ancienneté de votre société, des éléments financiers complémentaires nous permettraient de <strong>retravailler votre dossier et de le reproposer au bailleur</strong> dans de meilleures conditions.</p>
<p><strong>Documents à nous transmettre :</strong></p>
{{requested_documents}}
<p>Pour faciliter la transmission, vous pouvez utiliser le lien sécurisé ci-dessous :</p>
<p style="text-align: center; margin: 30px 0;">
  <a href="{{upload_link}}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Déposer mes documents
  </a>
</p>
{{#if custom_message}}
<p>{{custom_message}}</p>
{{/if}}
<p>Une fois ces pièces reçues et validées, nous pourrons soumettre une nouvelle proposition au bailleur.</p>
<p>Nous restons à votre disposition pour toute question.</p>
<p>Cordialement,<br>{{company_name}}</p>',
  'Bonjour {{client_name}}, suite au refus initial de votre dossier (ancienneté de société), merci de nous transmettre des documents financiers complémentaires via ce lien sécurisé : {{upload_link}}',
  true
FROM public.companies c
ON CONFLICT (company_id, name) DO NOTHING;

COMMIT;
