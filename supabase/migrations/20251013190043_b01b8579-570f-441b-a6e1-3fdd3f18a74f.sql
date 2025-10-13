-- Insérer le template HTML iTakecare Canva
-- Ce template reproduit le design Canva pour les offres commerciales

INSERT INTO public.html_templates (
  company_id,
  name,
  description,
  html_content,
  is_default,
  is_active,
  created_at,
  updated_at
)
SELECT 
  id as company_id,
  'Offre commerciale iTakecare - Design Canva' as name,
  'Template reproduisant le design Canva avec équipements par catégorie, mensualité et assurance' as description,
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url(''https://fonts.googleapis.com/css2?family=Carlito:wght@400;700&display=swap'');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ''Carlito'', ''Arial'', sans-serif;
      color: #333;
      background: white;
    }
    
    .page {
      width: 210mm;
      height: 297mm;
      padding: 20mm;
      page-break-after: always;
      position: relative;
    }
    
    /* Page 1 - Couverture */
    .page-cover {
      background: linear-gradient(135deg, #0066cc 0%, #003d7a 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    
    .page-cover h1 {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .page-cover h2 {
      font-size: 28px;
      font-weight: 400;
      margin-bottom: 40px;
    }
    
    .offer-date {
      font-size: 18px;
      margin-bottom: 30px;
      text-transform: uppercase;
    }
    
    .client-info {
      font-size: 20px;
      line-height: 1.8;
      margin-bottom: 40px;
    }
    
    .company-signature {
      font-size: 16px;
      text-transform: uppercase;
      margin-top: 40px;
    }
    
    /* Page 2 - Vision */
    .page-vision {
      padding: 30mm 20mm;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 700;
      color: #0066cc;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    
    .content-text {
      font-size: 14px;
      line-height: 1.8;
      text-align: justify;
      margin-bottom: 30px;
    }
    
    /* Page 3 - Offre détaillée */
    .page-offer {
      padding: 20mm;
    }
    
    .equipment-category {
      margin-bottom: 25px;
    }
    
    .equipment-category h3 {
      font-size: 18px;
      font-weight: 700;
      color: #0066cc;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .equipment-item {
      margin-bottom: 8px;
      padding-left: 15px;
    }
    
    .equipment-item p {
      font-size: 13px;
      line-height: 1.5;
    }
    
    .quantity {
      font-style: italic;
      color: #666;
    }
    
    .pricing-summary {
      margin-top: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-left: 4px solid #0066cc;
    }
    
    .pricing-summary h3 {
      font-size: 22px;
      font-weight: 700;
      color: #0066cc;
      margin-bottom: 15px;
    }
    
    .pricing-detail {
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .pricing-detail strong {
      font-weight: 700;
    }
    
    .contract-terms {
      margin-top: 20px;
      font-size: 13px;
      color: #666;
      font-style: italic;
    }
  </style>
</head>
<body>
  
  <!-- PAGE 1 : COUVERTURE -->
  <div class="page page-cover">
    <h1>Proposition Commerciale</h1>
    <h2>pour Services de Leasing IT</h2>
    <div class="offer-date">{{offer_date_canva}}</div>
    <div class="client-info">
      <p><strong>{{company_name}}</strong></p>
      <p>{{client_address}}</p>
      <p>{{client_postal_code}} {{client_city}}</p>
    </div>
    <div class="company-signature">
      <p>PAR ITAKECARE & PC DÉPANNAGE</p>
      <p>GIANNI SERGI / JOFFREY FRANÇOIS</p>
    </div>
    <div style="margin-top: 40px;">
      <h3>Une collaboration</h3>
    </div>
  </div>
  
  <!-- PAGE 2 : VISION -->
  <div class="page page-vision">
    <h2 class="section-title">Proposition Commerciale</h2>
    <div class="content-text">
      <p>Nous sommes ravis de présenter notre offre de location innovante pour le matériel informatique reconditionné ou en fin de vie commerciale, une solution conçue en pensant à la croissance et à l''efficacité de votre entreprise. Chez iTakecare, nous croyons en la construction de relations solides basées sur la confiance, en favorisant le progrès et en se soutenant mutuellement vers un succès commun.</p>
      <p style="margin-top: 20px;">Notre engagement envers ces valeurs se reflète dans notre proposition de location, qui offre non seulement du matériel informatique de haute qualité, reconditionné ou en fin de vie commerciale, mais aussi un partenariat pour naviguer dans les défis technologiques d''aujourd''hui et de demain.</p>
    </div>
    
    <h2 class="section-title">Notre Vision</h2>
    <div class="content-text">
      <p>Nous souhaitons être un acteur majeur dans l''accès aux technologies pour tous les professionnels du secteur Européen. Nous travaillons chaque jour à un monde plus juste et plus ouvert.</p>
    </div>
  </div>
  
  <!-- PAGE 3 : OFFRE DÉTAILLÉE -->
  <div class="page page-offer">
    <h2 class="section-title">Proposition Commerciale</h2>
    <h3 style="font-size: 20px; margin-bottom: 20px;">Notre solution</h3>
    <p style="margin-bottom: 20px;">Après analyse, voici l''offre que nous pouvons vous proposer :</p>
    
    <!-- Équipements groupés par catégorie -->
    {{{equipment_by_category}}}
    
    <!-- Résumé tarifaire -->
    <div class="pricing-summary">
      <h3>Mensualité totale : {{monthly_payment}}</h3>
      <p class="pricing-detail"><strong>EST. ASSURANCE ANNUELLE*</strong> : {{insurance_amount}} - <strong>FRAIS DE DOSSIER UNIQUE*</strong> : {{setup_fee}}</p>
      <p class="contract-terms">Contrat de 36 mois - Livraison incluse - Garantie en échange direct incluse</p>
      <p class="contract-terms">*voir modalités de leasing en page 6</p>
    </div>
  </div>
  
</body>
</html>' as html_content,
  true as is_default,
  true as is_active,
  now() as created_at,
  now() as updated_at
FROM public.companies
WHERE slug = 'itakecare'
LIMIT 1
ON CONFLICT DO NOTHING;