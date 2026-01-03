-- Remove the problematic unique constraint that prevents multiple active templates of the same type
ALTER TABLE public.email_templates DROP CONSTRAINT IF EXISTS email_templates_company_type_active_key;

-- Add a more appropriate unique constraint on company_id and name
ALTER TABLE public.email_templates ADD CONSTRAINT email_templates_company_name_unique UNIQUE (company_id, name);

-- Insert reminder email templates
-- document_reminder
INSERT INTO public.email_templates (company_id, type, name, subject, html_content, text_content, active)
SELECT 
  c.id,
  'document_reminder',
  'document_reminder',
  'Rappel : Documents en attente pour votre dossier',
  '<h2>Bonjour {{client_name}},</h2>
<p>Nous vous avons contacté il y a quelques jours concernant des documents nécessaires pour finaliser votre dossier de leasing.</p>
<p><strong>Sans ces documents, nous ne pouvons pas traiter votre demande.</strong></p>
<p>Documents demandés :</p>
{{requested_documents}}
<p>Pour nous transmettre vos documents en toute sécurité, cliquez sur le bouton ci-dessous :</p>
<p style="text-align: center; margin: 30px 0;">
  <a href="{{upload_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Envoyer mes documents
  </a>
</p>
{{custom_message}}
<p>Si vous avez des questions, n''hésitez pas à nous contacter.</p>
<p>Cordialement,<br>{{company_name}}</p>',
  'Bonjour {{client_name}}, nous attendons vos documents pour traiter votre dossier. Lien: {{upload_link}}',
  true
FROM public.companies c
ON CONFLICT (company_id, name) DO NOTHING;

-- offer_reminder_j1
INSERT INTO public.email_templates (company_id, type, name, subject, html_content, text_content, active)
SELECT 
  c.id,
  'offer_reminder_j1',
  'offer_reminder_j1',
  'Suite à notre offre - Avez-vous des questions ?',
  '<h2>Bonjour {{client_name}},</h2>
<p>Nous vous avons transmis une offre de leasing hier et nous souhaitions nous assurer que vous l''avez bien reçue.</p>
<p><strong>Récapitulatif de l''offre :</strong></p>
<ul>
  <li>Montant : {{offer_amount}} €</li>
  <li>Mensualité : {{monthly_payment}} €/mois</li>
</ul>
{{custom_message}}
<p>Si vous avez des questions ou souhaitez en discuter, n''hésitez pas à nous contacter :</p>
<ul>
  <li>Email : {{contact_email}}</li>
  <li>Téléphone : {{contact_phone}}</li>
</ul>
<p>Cordialement,<br>{{company_name}}</p>',
  'Bonjour {{client_name}}, avez-vous bien reçu notre offre ? Contactez-nous: {{contact_email}} / {{contact_phone}}',
  true
FROM public.companies c
ON CONFLICT (company_id, name) DO NOTHING;

-- offer_reminder_j3
INSERT INTO public.email_templates (company_id, type, name, subject, html_content, text_content, active)
SELECT 
  c.id,
  'offer_reminder_j3',
  'offer_reminder_j3',
  'Rappel : Votre offre de leasing vous attend',
  '<h2>Bonjour {{client_name}},</h2>
<p>Nous vous avons envoyé une offre de leasing il y a 3 jours et nous n''avons pas encore eu de retour de votre part.</p>
<p><strong>Nous tenions à vous rappeler que les conditions de cette offre sont valables pour une durée limitée.</strong></p>
<p>Récapitulatif :</p>
<ul>
  <li>Montant : {{offer_amount}} €</li>
  <li>Mensualité : {{monthly_payment}} €/mois</li>
</ul>
{{custom_message}}
<p>Pour toute question, nous restons à votre disposition :</p>
<ul>
  <li>Email : {{contact_email}}</li>
  <li>Téléphone : {{contact_phone}}</li>
</ul>
<p>Cordialement,<br>{{company_name}}</p>',
  'Bonjour {{client_name}}, rappel concernant votre offre de leasing. Contactez-nous: {{contact_email}} / {{contact_phone}}',
  true
FROM public.companies c
ON CONFLICT (company_id, name) DO NOTHING;

-- offer_reminder_j5
INSERT INTO public.email_templates (company_id, type, name, subject, html_content, text_content, active)
SELECT 
  c.id,
  'offer_reminder_j5',
  'offer_reminder_j5',
  'Important : Votre offre expire bientôt',
  '<h2>Bonjour {{client_name}},</h2>
<p>Il y a maintenant 5 jours que nous vous avons transmis notre offre de leasing.</p>
<p><strong>⚠️ Sans retour de votre part, nous ne pouvons plus garantir les tarifs proposés.</strong></p>
<p>Les prix des équipements et les conditions de financement peuvent évoluer. Pour bénéficier des conditions actuelles, nous vous invitons à nous faire part de votre décision rapidement.</p>
<p>Récapitulatif de l''offre :</p>
<ul>
  <li>Montant : {{offer_amount}} €</li>
  <li>Mensualité : {{monthly_payment}} €/mois</li>
</ul>
{{custom_message}}
<p>Contactez-nous :</p>
<ul>
  <li>Email : {{contact_email}}</li>
  <li>Téléphone : {{contact_phone}}</li>
</ul>
<p>Cordialement,<br>{{company_name}}</p>',
  'IMPORTANT: Votre offre expire bientôt. Sans retour, nous ne pouvons garantir les prix. Contactez-nous: {{contact_email}}',
  true
FROM public.companies c
ON CONFLICT (company_id, name) DO NOTHING;

-- offer_reminder_j9
INSERT INTO public.email_templates (company_id, type, name, subject, html_content, text_content, active)
SELECT 
  c.id,
  'offer_reminder_j9',
  'offer_reminder_j9',
  'Dernier rappel : Votre offre de leasing',
  '<h2>Bonjour {{client_name}},</h2>
<p>Ceci est notre dernier rappel concernant l''offre de leasing que nous vous avons transmise il y a 9 jours.</p>
<p><strong>🚨 Sans réponse de votre part, cette offre sera considérée comme caduque et les conditions tarifaires ne seront plus garanties.</strong></p>
<p>Si vous êtes toujours intéressé(e), nous vous invitons à nous contacter dans les plus brefs délais pour finaliser votre dossier.</p>
<p>Récapitulatif :</p>
<ul>
  <li>Montant : {{offer_amount}} €</li>
  <li>Mensualité : {{monthly_payment}} €/mois</li>
</ul>
{{custom_message}}
<p>Pour nous joindre :</p>
<ul>
  <li>Email : {{contact_email}}</li>
  <li>Téléphone : {{contact_phone}}</li>
</ul>
<p>Cordialement,<br>{{company_name}}</p>',
  'DERNIER RAPPEL: Offre caduque sans réponse. Contactez-nous rapidement: {{contact_email}} / {{contact_phone}}',
  true
FROM public.companies c
ON CONFLICT (company_id, name) DO NOTHING;