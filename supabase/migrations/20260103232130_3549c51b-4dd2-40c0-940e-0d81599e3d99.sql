-- Create 3 document reminder templates (L1, L2, L3)
-- and update offer templates to remove amount mentions

-- Insert document_reminder_l1 template for all companies that have email templates
INSERT INTO public.email_templates (company_id, type, name, subject, html_content, active)
SELECT DISTINCT 
  company_id,
  'document_reminder_l1',
  'document_reminder_l1',
  'Rappel : Documents en attente pour votre dossier',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Bonjour {{client_name}},</h2>
    <p>Nous espérons que vous allez bien.</p>
    <p>Nous vous rappelons que certains documents sont encore en attente pour finaliser votre dossier.</p>
    {{#if documents_list}}
    <p><strong>Documents demandés :</strong></p>
    <ul>
      {{documents_list}}
    </ul>
    {{/if}}
    {{#if upload_links}}
    <p>Vous pouvez téléverser vos documents en cliquant sur les liens ci-dessous :</p>
    {{upload_links}}
    {{/if}}
    {{custom_message}}
    <p>N''hésitez pas à nous contacter si vous avez des questions.</p>
    <p>Cordialement,<br>{{company_name}}</p>
    <p style="color: #666; font-size: 12px;">{{contact_email}} | {{contact_phone}}</p>
  </div>',
  true
FROM public.email_templates
WHERE name = 'offer_reminder_j1'
ON CONFLICT (company_id, name) DO NOTHING;

-- Insert document_reminder_l2 template
INSERT INTO public.email_templates (company_id, type, name, subject, html_content, active)
SELECT DISTINCT 
  company_id,
  'document_reminder_l2',
  'document_reminder_l2',
  'Second rappel : Documents toujours en attente',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Bonjour {{client_name}},</h2>
    <p>Nous revenons vers vous concernant les documents nécessaires à la finalisation de votre dossier.</p>
    <p><strong>Ces documents sont essentiels pour poursuivre le traitement de votre demande.</strong></p>
    {{#if documents_list}}
    <p><strong>Documents demandés :</strong></p>
    <ul>
      {{documents_list}}
    </ul>
    {{/if}}
    {{#if upload_links}}
    <p>Veuillez téléverser vos documents via les liens suivants :</p>
    {{upload_links}}
    {{/if}}
    {{custom_message}}
    <p>Nous restons à votre disposition pour toute question.</p>
    <p>Cordialement,<br>{{company_name}}</p>
    <p style="color: #666; font-size: 12px;">{{contact_email}} | {{contact_phone}}</p>
  </div>',
  true
FROM public.email_templates
WHERE name = 'offer_reminder_j1'
ON CONFLICT (company_id, name) DO NOTHING;

-- Insert document_reminder_l3 template (urgent)
INSERT INTO public.email_templates (company_id, type, name, subject, html_content, active)
SELECT DISTINCT 
  company_id,
  'document_reminder_l3',
  'document_reminder_l3',
  'URGENT : Dernière demande de documents',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Bonjour {{client_name}},</h2>
    <p style="color: #dc2626; font-weight: bold;">⚠️ Ceci est notre dernier rappel concernant les documents en attente.</p>
    <p>Sans réponse de votre part dans les plus brefs délais, nous ne serons malheureusement pas en mesure de poursuivre le traitement de votre dossier.</p>
    {{#if documents_list}}
    <p><strong>Documents requis :</strong></p>
    <ul>
      {{documents_list}}
    </ul>
    {{/if}}
    {{#if upload_links}}
    <p>Merci de téléverser vos documents immédiatement :</p>
    {{upload_links}}
    {{/if}}
    {{custom_message}}
    <p>Si vous rencontrez des difficultés, contactez-nous rapidement.</p>
    <p>Cordialement,<br>{{company_name}}</p>
    <p style="color: #666; font-size: 12px;">{{contact_email}} | {{contact_phone}}</p>
  </div>',
  true
FROM public.email_templates
WHERE name = 'offer_reminder_j1'
ON CONFLICT (company_id, name) DO NOTHING;

-- Update offer_reminder_j1 to remove amount
UPDATE public.email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Bonjour {{client_name}},</h2>
  <p>Nous espérons que vous allez bien. Nous souhaitions revenir vers vous concernant notre offre.</p>
  <p>Avez-vous eu l''occasion de l''étudier ? Nous serions ravis de répondre à vos éventuelles questions.</p>
  {{custom_message}}
  <p>N''hésitez pas à nous contacter pour en discuter.</p>
  <p>Cordialement,<br>{{company_name}}</p>
  <p style="color: #666; font-size: 12px;">{{contact_email}} | {{contact_phone}}</p>
</div>'
WHERE name = 'offer_reminder_j1';

-- Update offer_reminder_j3 to remove amount
UPDATE public.email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Bonjour {{client_name}},</h2>
  <p>Nous revenons vers vous concernant notre offre.</p>
  <p>Nous sommes à votre disposition pour répondre à toutes vos questions et adapter notre proposition si nécessaire.</p>
  {{custom_message}}
  <p>Pouvons-nous convenir d''un moment pour en discuter ?</p>
  <p>Cordialement,<br>{{company_name}}</p>
  <p style="color: #666; font-size: 12px;">{{contact_email}} | {{contact_phone}}</p>
</div>'
WHERE name = 'offer_reminder_j3';

-- Update offer_reminder_j5 to remove amount
UPDATE public.email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Bonjour {{client_name}},</h2>
  <p>Nous n''avons pas eu de nouvelles concernant notre offre.</p>
  <p>Si vous avez des interrogations ou si certains points méritent d''être éclaircis, nous serions heureux d''en discuter avec vous.</p>
  {{custom_message}}
  <p>Votre retour nous serait précieux.</p>
  <p>Cordialement,<br>{{company_name}}</p>
  <p style="color: #666; font-size: 12px;">{{contact_email}} | {{contact_phone}}</p>
</div>'
WHERE name = 'offer_reminder_j5';

-- Update offer_reminder_j9 to remove amount
UPDATE public.email_templates
SET html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Bonjour {{client_name}},</h2>
  <p>Nous tenions à vous recontacter une dernière fois au sujet de notre offre.</p>
  <p>Si votre projet n''est plus d''actualité, n''hésitez pas à nous le faire savoir. Nous pourrons ainsi clôturer votre dossier.</p>
  <p>Dans le cas contraire, nous restons à votre entière disposition pour finaliser cette collaboration.</p>
  {{custom_message}}
  <p>Dans l''attente de votre retour,</p>
  <p>Cordialement,<br>{{company_name}}</p>
  <p style="color: #666; font-size: 12px;">{{contact_email}} | {{contact_phone}}</p>
</div>'
WHERE name = 'offer_reminder_j9';