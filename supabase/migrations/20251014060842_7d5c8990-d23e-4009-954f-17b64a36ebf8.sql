-- Mettre à jour le template HTML pour qu'il ressemble au template React actuel
UPDATE public.html_templates
SET html_content = '<!DOCTYPE html>
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
      font-size: 9pt;
    }
    
    .page {
      width: 190mm;
      min-height: 277mm;
      max-height: 277mm;
      padding: 0;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      background-color: white;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5mm 10mm;
      border-bottom: 0.5mm solid #1A2C3A;
      background-color: #1A2C3A;
      color: white;
    }
    
    .header img {
      height: 8mm;
    }
    
    .header-title {
      font-size: 12pt;
      font-weight: bold;
    }
    
    .content {
      padding: 5mm 10mm;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .offer-ref {
      text-align: center;
      margin: 2mm 0 5mm 0;
    }
    
    .offer-ref h1 {
      font-size: 11pt;
      font-weight: bold;
      margin: 0;
      color: #1A2C3A;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin: 0 0 5mm 0;
      padding: 3mm;
      border: 0.2mm solid #e5e7eb;
      border-radius: 1mm;
    }
    
    .info-section h2 {
      font-size: 9pt;
      font-weight: bold;
      margin: 0 0 1mm 0;
    }
    
    .info-section p {
      margin: 0.5mm 0;
      font-size: 9pt;
    }
    
    .section-title {
      font-size: 9pt;
      font-weight: bold;
      margin: 0 0 2mm 0;
      color: #1A2C3A;
    }
    
    .equipment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      table-layout: fixed;
      margin-bottom: 5mm;
    }
    
    .equipment-table thead tr {
      background-color: #f3f4f6;
    }
    
    .equipment-table th,
    .equipment-table td {
      padding: 2mm;
      border: 0.2mm solid #e5e7eb;
    }
    
    .equipment-table th {
      text-align: left;
      font-weight: bold;
    }
    
    .equipment-table th:nth-child(1) { width: 60%; }
    .equipment-table th:nth-child(2) { width: 10%; text-align: center; }
    .equipment-table th:nth-child(3) { width: 30%; text-align: right; }
    
    .equipment-table td:nth-child(2) { text-align: center; }
    .equipment-table td:nth-child(3) { text-align: right; }
    
    .equipment-table tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    .summary-box {
      margin: 0 0 5mm 0;
      padding: 3mm;
      background-color: #f9fafb;
      border-radius: 1mm;
      border: 0.2mm solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .summary-box h3 {
      font-size: 9pt;
      font-weight: bold;
      margin: 0 0 1mm 0;
    }
    
    .summary-box p {
      font-size: 8pt;
      margin: 0;
    }
    
    .summary-amount {
      font-size: 12pt;
      font-weight: bold;
      color: #2563EB;
    }
    
    .advantages-box {
      display: flex;
      margin: 0 0 5mm 0;
      padding: 3mm;
      border: 0.2mm solid #e5e7eb;
      border-radius: 1mm;
    }
    
    .advantages-title {
      width: 30%;
      font-size: 9pt;
      font-weight: bold;
      margin: 0 0 2mm 0;
      color: #1A2C3A;
    }
    
    .advantages-list {
      width: 70%;
      display: flex;
      flex-wrap: wrap;
    }
    
    .advantages-list > div {
      width: 50%;
    }
    
    .advantages-list p {
      margin: 0 0 1mm 0;
      font-size: 8pt;
    }
    
    .signature-section {
      margin: 5mm 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .signature-section h3 {
      font-size: 9pt;
      font-weight: bold;
      margin: 0 0 2mm 0;
      text-align: center;
    }
    
    .signature-placeholder {
      width: 40mm;
      height: 20mm;
      border: 0.2mm dashed #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .signature-placeholder p {
      color: #9ca3af;
      font-size: 7pt;
      font-style: italic;
      text-align: center;
    }
    
    .footer {
      border-top: 0.2mm solid #e5e7eb;
      padding: 2mm;
      text-align: center;
      font-size: 7pt;
      color: #6b7280;
      margin-top: auto;
      background-color: #f9fafb;
    }
    
    .footer p {
      margin: 0 0 1mm 0;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- En-tête -->
    <div class="header">
      <img src="/lovable-uploads/645b6558-da78-4099-a8d4-c78f40873b60.png" alt="iTakecare Logo" />
      <span class="header-title">OFFRE COMMERCIALE</span>
    </div>

    <!-- Contenu principal -->
    <div class="content">
      <!-- Référence offre -->
      <div class="offer-ref">
        <h1>RÉFÉRENCE: {{offer_id}}</h1>
      </div>

      <!-- Informations client et date -->
      <div class="info-section">
        <div>
          <h2>Informations client</h2>
          <p>{{client_company}}</p>
          <p>{{client_name}}</p>
          <p>{{client_email}}</p>
        </div>
        <div>
          <p style="text-align: right;">Date: {{offer_date}}</p>
          <p style="text-align: right;">Validité: 30 jours</p>
        </div>
      </div>

      <!-- Tableau des équipements -->
      <div style="margin: 0 0 5mm 0;">
        <h2 class="section-title">Détail des équipements</h2>
        <table class="equipment-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Qté</th>
              <th>Mensualité</th>
            </tr>
          </thead>
          <tbody>
            {{{equipment_rows}}}
          </tbody>
        </table>
      </div>

      <!-- Récapitulatif -->
      <div class="summary-box">
        <div>
          <h3>Récapitulatif</h3>
          <p>Engagement sur 36 mois</p>
        </div>
        <div class="summary-amount">
          {{monthly_payment}} HTVA/mois
        </div>
      </div>

      <!-- Avantages -->
      <div class="advantages-box">
        <h3 class="advantages-title">Les avantages de notre solution</h3>
        <div class="advantages-list">
          <div>
            <p>✓ Optimisation fiscale</p>
            <p>✓ Préservation de trésorerie</p>
          </div>
          <div>
            <p>✓ Matériel toujours à jour</p>
            <p>✓ Service et support inclus</p>
          </div>
        </div>
      </div>

      <!-- Signature -->
      <div class="signature-section">
        <h3>Signature client</h3>
        <div class="signature-placeholder">
          <p>Signature précédée de<br/>"Bon pour accord pour {{monthly_payment}} hors TVA par mois pendant 36 mois"</p>
        </div>
      </div>
      
      <div style="flex: 1;"></div>
    </div>

    <!-- Pied de page -->
    <div class="footer">
      <p>Cette offre est valable 30 jours à compter de sa date d''émission.</p>
      <p>iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique - TVA: BE 0795.642.894</p>
    </div>
  </div>
</body>
</html>',
  description = 'Template HTML complet reproduisant le design du template React actuel avec toutes les informations (tableau équipements, récapitulatif, avantages, signature)'
WHERE name = 'Offre commerciale iTakecare - Design Canva';
