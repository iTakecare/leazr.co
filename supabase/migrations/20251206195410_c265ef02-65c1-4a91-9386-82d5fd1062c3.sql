-- Corriger l'offre existante : mettre selling_price et monthly_payment=0
UPDATE offer_equipment 
SET 
  selling_price = purchase_price * (1 + margin / 100),  -- 1799 * 1.1867 = 2135.39
  monthly_payment = 0
WHERE offer_id = '85839de2-8e81-4c09-935b-8edf47f11b79';

-- Insérer les CGV de vente par défaut pour iTakecare
INSERT INTO pdf_content_blocks (company_id, page_name, block_key, content)
VALUES (
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  'conditions',
  'sale_general_conditions',
  '<h3>Conditions Générales de Vente</h3>
<p><strong>Modalités de paiement :</strong></p>
<ul>
<li>Paiement à réception de facture sous 30 jours</li>
<li>Modes de paiement acceptés : virement bancaire</li>
</ul>
<p><strong>Garantie :</strong></p>
<ul>
<li>Garantie constructeur standard incluse</li>
<li>Couverture des défauts de fabrication et pannes matérielles</li>
<li>Assistance technique par téléphone et email</li>
</ul>
<p><strong>Livraison :</strong></p>
<ul>
<li>Délai de livraison : 10 à 15 jours ouvrés après confirmation</li>
<li>Livraison à l''adresse de votre choix</li>
<li>Frais de livraison inclus dans le prix</li>
</ul>
<p><strong>Service après-vente :</strong></p>
<ul>
<li>Support technique disponible</li>
<li>Assistance à distance incluse</li>
</ul>'
)
ON CONFLICT ON CONSTRAINT pdf_content_blocks_company_id_page_name_block_key_key 
DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();