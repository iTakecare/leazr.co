import html2pdf from 'html2pdf.js';
import HtmlTemplateService, { convertOfferToTemplateData, HtmlTemplateData } from '@/services/htmlTemplateService';

/**
 * Options pour la génération PDF à partir de HTML
 */
export interface HtmlPdfOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margin?: number | number[];
  quality?: number;
  scale?: number;
}

/**
 * Template HTML complet iTakecare avec design fidèle et images base64
 */
export const ITAKECARE_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offre commerciale iTakecare</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      color: #1c1c1c;
      line-height: 1.6;
      background: white;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 20mm;
      page-break-after: always;
      position: relative;
      background: white;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* PAGE 1 - COUVERTURE */
    .cover-page {
      background: linear-gradient(135deg, #0a376e 0%, #1e5f99 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .cover-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('{{base64_image_cover}}');
      background-size: cover;
      background-position: center;
      opacity: 0.2;
      z-index: 0;
    }
    
    .cover-content {
      position: relative;
      z-index: 1;
    }
    
    .cover-title {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 30px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .cover-subtitle {
      font-size: 24px;
      margin-bottom: 40px;
      opacity: 0.9;
    }
    
    .logo {
      width: 150px;
      height: auto;
      margin-bottom: 30px;
    }
    
    .client-info {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      padding: 30px;
      border-radius: 15px;
      margin-top: 40px;
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    .client-info h2 {
      font-size: 28px;
      margin-bottom: 20px;
      color: #87ceeb;
    }
    
    .client-details {
      font-size: 18px;
      text-align: left;
    }
    
    .client-details p {
      margin-bottom: 10px;
    }
    
    /* PAGE 2 - VISION */
    .vision-page {
      background: linear-gradient(to bottom, #f8fbff 0%, #e8f4fd 100%);
    }
    
    .vision-header {
      text-align: center;
      margin-bottom: 50px;
    }
    
    .vision-title {
      font-size: 42px;
      color: #0a376e;
      font-weight: bold;
      margin-bottom: 20px;
    }
    
    .vision-image {
      width: 100%;
      max-width: 600px;
      height: 300px;
      background-image: url('{{base64_image_vision}}');
      background-size: cover;
      background-position: center;
      border-radius: 15px;
      margin: 30px auto;
      box-shadow: 0 10px 30px rgba(10, 55, 110, 0.2);
    }
    
    .vision-content {
      font-size: 18px;
      text-align: center;
      color: #2c3e50;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.8;
    }
    
    /* PAGE 3 - OFFRE */
    .offer-page {
      background: white;
    }
    
    .offer-header {
      background: linear-gradient(135deg, #0a376e 0%, #1e5f99 100%);
      color: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      margin-bottom: 40px;
    }
    
    .offer-title {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .offer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
    }
    
    .offer-card {
      background: #f8fbff;
      padding: 25px;
      border-radius: 12px;
      border-left: 5px solid #0a376e;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .offer-card h3 {
      color: #0a376e;
      font-size: 20px;
      margin-bottom: 15px;
    }
    
    .price-highlight {
      font-size: 32px;
      color: #0a376e;
      font-weight: bold;
    }
    
    .offer-benefits {
      background: #e8f4fd;
      padding: 20px;
      border-radius: 10px;
      margin-top: 30px;
    }
    
    .offer-benefits ul {
      list-style: none;
      padding: 0;
    }
    
    .offer-benefits li {
      padding: 8px 0;
      position: relative;
      padding-left: 25px;
    }
    
    .offer-benefits li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #0a376e;
      font-weight: bold;
    }
    
    /* PAGE 4 - SOLUTION */
    .solution-page {
      background: white;
    }
    
    .solution-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .solution-title {
      font-size: 36px;
      color: #0a376e;
      margin-bottom: 20px;
    }
    
    .equipment-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      border-radius: 10px;
      overflow: hidden;
    }
    
    .equipment-table th {
      background: linear-gradient(135deg, #0a376e 0%, #1e5f99 100%);
      color: white;
      padding: 20px;
      text-align: left;
      font-weight: bold;
      font-size: 16px;
    }
    
    .equipment-table td {
      padding: 15px 20px;
      border-bottom: 1px solid #e0e0e0;
      background: white;
    }
    
    .equipment-table tr:nth-child(even) td {
      background: #f8fbff;
    }
    
    .equipment-table tr:hover td {
      background: #e8f4fd;
    }
    
    /* PAGE 5 - ÉTAPES */
    .steps-page {
      background: linear-gradient(to bottom, #f8fbff 0%, #e8f4fd 100%);
    }
    
    .steps-title {
      font-size: 36px;
      color: #0a376e;
      text-align: center;
      margin-bottom: 50px;
    }
    
    .steps-container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .step-item {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      position: relative;
    }
    
    .step-number {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #0a376e 0%, #1e5f99 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      margin-right: 25px;
      flex-shrink: 0;
    }
    
    .step-content {
      flex: 1;
      font-size: 16px;
      line-height: 1.6;
    }
    
    /* PAGE 6 - MODALITÉS */
    .modalities-page {
      background: white;
    }
    
    .modalities-title {
      font-size: 36px;
      color: #0a376e;
      text-align: center;
      margin-bottom: 40px;
    }
    
    .modality-card {
      background: #f8fbff;
      padding: 30px;
      border-radius: 15px;
      margin-bottom: 25px;
      border-left: 5px solid #0a376e;
    }
    
    .modality-card h3 {
      color: #0a376e;
      margin-bottom: 15px;
      font-size: 20px;
    }
    
    .insurance-highlight {
      background: linear-gradient(135deg, #0a376e 0%, #1e5f99 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      margin-top: 30px;
    }
    
    /* PAGE 7 - VALEURS */
    .values-page {
      background: linear-gradient(135deg, #0a376e 0%, #1e5f99 100%);
      color: white;
    }
    
    .values-title {
      font-size: 42px;
      text-align: center;
      margin-bottom: 50px;
      font-weight: bold;
    }
    
    .values-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
      margin-top: 40px;
    }
    
    .value-card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      padding: 30px;
      border-radius: 20px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    .value-icon {
      width: 80px;
      height: 80px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 36px;
    }
    
    .value-card h3 {
      font-size: 24px;
      margin-bottom: 15px;
      color: #87ceeb;
    }
    
    .value-card p {
      font-size: 16px;
      line-height: 1.6;
      opacity: 0.9;
    }
    
    /* PAGE 8 - CONTACT */
    .contact-page {
      background: white;
    }
    
    .contact-title {
      font-size: 36px;
      color: #0a376e;
      text-align: center;
      margin-bottom: 40px;
    }
    
    .contact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }
    
    .contact-card {
      background: #f8fbff;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
    }
    
    .contact-card h3 {
      color: #0a376e;
      margin-bottom: 20px;
      font-size: 24px;
    }
    
    .contact-info {
      font-size: 16px;
      line-height: 1.8;
    }
    
    /* PAGE 9 - SIGNATURE */
    .signature-page {
      background: white;
    }
    
    .signature-title {
      font-size: 36px;
      color: #0a376e;
      text-align: center;
      margin-bottom: 40px;
    }
    
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      margin-top: 60px;
    }
    
    .signature-box {
      border: 2px solid #0a376e;
      border-radius: 10px;
      padding: 30px;
      text-align: center;
      min-height: 200px;
    }
    
    .signature-box h3 {
      color: #0a376e;
      margin-bottom: 20px;
    }
    
    .signature-line {
      border-top: 1px solid #ccc;
      margin-top: 100px;
      padding-top: 10px;
      font-size: 14px;
      color: #666;
    }
    
    @media print {
      .page {
        margin: 0;
        padding: 15mm;
        page-break-inside: avoid;
      }
      
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <!-- PAGE 1 - COUVERTURE -->
  <div class="page cover-page">
    <div class="cover-bg"></div>
    <div class="cover-content">
      {{#if base64_image_logo}}
      <img src="{{base64_image_logo}}" alt="iTakecare Logo" class="logo" />
      {{/if}}
      
      <h1 class="cover-title">iTakecare</h1>
      <p class="cover-subtitle">Services de Leasing IT</p>
      
      <div class="client-info">
        <h2>Proposition Commerciale</h2>
        <div class="client-details">
          <p><strong>Client :</strong> {{client_name}}</p>
          <p><strong>Entreprise :</strong> {{company_name}}</p>
          <p><strong>Adresse :</strong> {{client_address}}</p>
          <p><strong>Date :</strong> {{offer_date}}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE 2 - NOTRE VISION -->
  <div class="page vision-page">
    <div class="vision-header">
      <h1 class="vision-title">Notre Vision</h1>
      <div class="vision-image"></div>
    </div>
    
    <div class="vision-content">
      <p>Nous souhaitons être un acteur majeur dans l'accès aux technologies pour tous les professionnels du secteur Européen.</p>
      <br>
      <p>Nous travaillons chaque jour à un monde plus juste et plus ouvert, où l'innovation technologique est accessible à tous.</p>
      <br>
      <p>Notre mission est de démocratiser l'accès aux équipements informatiques de pointe grâce à des solutions de leasing flexibles et adaptées à chaque besoin.</p>
    </div>
  </div>

  <!-- PAGE 3 - NOTRE OFFRE -->
  <div class="page offer-page">
    <div class="offer-header">
      <h1 class="offer-title">Notre Offre</h1>
      <p>Une solution complète adaptée à vos besoins</p>
    </div>
    
    <div class="offer-grid">
      <div class="offer-card">
        <h3>Mensualité</h3>
        <div class="price-highlight">{{monthly_price}}</div>
        <p>HTVA/mois</p>
      </div>
      
      <div class="offer-card">
        <h3>Assurance Annuelle</h3>
        <div class="price-highlight">{{insurance}}</div>
        <p>Estimation</p>
      </div>
      
      <div class="offer-card">
        <h3>Frais de Dossier</h3>
        <div class="price-highlight">{{setup_fee}}</div>
        <p>HTVA (unique)</p>
      </div>
      
      <div class="offer-card">
        <h3>Durée du Contrat</h3>
        <div class="price-highlight">{{contract_duration}}</div>
        <p>mois</p>
      </div>
    </div>
    
    <div class="offer-benefits">
      <h3>Inclus dans votre contrat :</h3>
      <ul>
        <li>Livraison et installation sur site</li>
        <li>Maintenance complète incluse</li>
        <li>Garantie en échange direct</li>
        <li>Support technique dédié</li>
        <li>Mise à jour des équipements</li>
      </ul>
    </div>
  </div>

  <!-- PAGE 4 - NOTRE SOLUTION -->
  <div class="page solution-page">
    <div class="solution-header">
      <h1 class="solution-title">Notre Solution</h1>
      <p>Équipements sélectionnés pour votre entreprise</p>
    </div>
    
    <table class="equipment-table">
      <thead>
        <tr>
          <th>Catégorie</th>
          <th>Désignation</th>
          <th>Quantité</th>
        </tr>
      </thead>
      <tbody>
        {{#each products}}
        <tr>
          <td>{{category}}</td>
          <td>{{description}}</td>
          <td>{{quantity}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>

  <!-- PAGE 5 - LES PROCHAINES ÉTAPES -->
  <div class="page steps-page">
    <h1 class="steps-title">Les Prochaines Étapes</h1>
    
    <div class="steps-container">
      <div class="step-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <strong>Validation de votre part</strong><br>
          Vous marquez votre accord pour cette proposition par retour de mail
        </div>
      </div>
      
      <div class="step-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <strong>Analyse financière</strong><br>
          Nous soumettons votre demande auprès de nos partenaires financiers
        </div>
      </div>
      
      <div class="step-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <strong>Signature électronique</strong><br>
          Après accord, nous vous envoyons les contrats électroniques à signer
        </div>
      </div>
      
      <div class="step-item">
        <div class="step-number">4</div>
        <div class="step-content">
          <strong>Commande et livraison</strong><br>
          Une fois signés, nous commandons le matériel et fixons une date de livraison
        </div>
      </div>
      
      <div class="step-item">
        <div class="step-number">5</div>
        <div class="step-content">
          <strong>Profitez de votre équipement !</strong><br>
          En cas de souci, un simple mail ou appel suffit
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE 6 - MODALITÉS DU LEASING -->
  <div class="page modalities-page">
    <h1 class="modalities-title">Modalités du Leasing</h1>
    
    <div class="modality-card">
      <h3>Modalités de Paiement</h3>
      <p>Les prélèvements sont effectués trimestriellement par domiciliation SEPA. Cette solution vous garantit une gestion simplifiée de vos paiements avec une prévisibilité totale de vos charges.</p>
    </div>
    
    <div class="modality-card">
      <h3>Assurance du Matériel</h3>
      <p>Le client est tenu d'assurer le matériel loué, soit via sa propre assurance entreprise, soit via l'assurance proposée par le leaser.</p>
    </div>
    
    <div class="modality-card">
      <h3>Maintenance et Support</h3>
      <p>Une maintenance complète est incluse dans votre contrat, couvrant les réparations, les remplacements et le support technique pendant toute la durée du leasing.</p>
    </div>
    
    <div class="insurance-highlight">
      <h3>Estimation Assurance</h3>
      <p>Assurance proposée : environ 3,5% du montant total du contrat</p>
      <p><strong>{{insurance_example}}</strong></p>
    </div>
  </div>

  <!-- PAGE 7 - NOS VALEURS -->
  <div class="page values-page">
    <h1 class="values-title">Nos Valeurs</h1>
    
    <div class="values-grid">
      <div class="value-card">
        <div class="value-icon">🤝</div>
        <h3>Confiance</h3>
        <p>Nous valorisons les relations humaines authentiques et durables avec nos clients et partenaires. La transparence guide chacune de nos actions.</p>
      </div>
      
      <div class="value-card">
        <div class="value-icon">🤲</div>
        <h3>Entraide</h3>
        <p>Nous nous rendons disponibles pour nous entraider, partager nos connaissances et faire grandir chaque membre de notre écosystème.</p>
      </div>
      
      <div class="value-card">
        <div class="value-icon">📈</div>
        <h3>Évolution</h3>
        <p>Nous adaptons constamment nos idées à la réalité du terrain pour anticiper et devancer les besoins technologiques de demain.</p>
      </div>
    </div>
  </div>

  <!-- PAGE 8 - CONTACT -->
  <div class="page contact-page">
    <h1 class="contact-title">Votre Contact</h1>
    
    <div class="contact-grid">
      <div class="contact-card">
        <h3>Gianni Sergi</h3>
        <div class="contact-info">
          <p><strong>Responsable Commercial</strong></p>
          <p>📧 gianni@itakecare.be</p>
          <p>📱 +32 XXX XX XX XX</p>
          <p>🌐 www.itakecare.be</p>
        </div>
      </div>
      
      <div class="contact-card">
        <h3>iTakecare</h3>
        <div class="contact-info">
          <p><strong>Siège Social</strong></p>
          <p>📍 Adresse entreprise</p>
          <p>🏢 Belgique</p>
          <p>📋 N° TVA : BE XXXX.XXX.XXX</p>
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE 9 - ACCORD ET SIGNATURE -->
  <div class="page signature-page">
    <h1 class="signature-title">Accord et Engagement</h1>
    
    <p style="text-align: center; margin-bottom: 40px; font-size: 18px;">
      En signant ce document, les deux parties s'engagent dans un partenariat de confiance 
      pour la réalisation de ce projet de leasing informatique.
    </p>
    
    <div class="signature-grid">
      <div class="signature-box">
        <h3>Pour l'Entreprise Cliente</h3>
        <p style="margin-bottom: 80px;">{{company_name}}</p>
        <div class="signature-line">
          Nom, Prénom et Signature
        </div>
      </div>
      
      <div class="signature-box">
        <h3>Pour iTakecare</h3>
        <p style="margin-bottom: 80px;">Gianni Sergi</p>
        <div class="signature-line">
          Responsable Commercial
        </div>
      </div>
    </div>
    
    <p style="text-align: center; margin-top: 40px; font-style: italic; color: #666;">
      Document généré le {{offer_date}} - Offre valable 30 jours
    </p>
  </div>
</body>
</html>`;

/**
 * Générer un PDF à partir d'un template HTML et de données
 */
export const generatePdfFromHtmlTemplate = async (
  htmlTemplate: string,
  data: HtmlTemplateData,
  options: HtmlPdfOptions = {}
): Promise<string> => {
  try {
    console.log("Début de la génération PDF à partir du template HTML");
    
    // Obtenir l'instance du service de template
    const templateService = HtmlTemplateService.getInstance();
    
    // Compiler le template avec les données
    const compiledHtml = templateService.compileTemplate(htmlTemplate, data);
    
    // Configuration pour le PDF multi-pages
    const pdfOptions = {
      margin: options.margin || [10, 10, 10, 10], // Marges en mm
      filename: options.filename || `offre-${Date.now()}.pdf`,
      image: { 
        type: 'jpeg', 
        quality: options.quality || 0.95 
      },
      html2canvas: { 
        scale: options.scale || 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        imageTimeout: 15000,
        height: window.innerHeight,
        width: window.innerWidth,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: options.format || 'a4', 
        orientation: options.orientation || 'portrait',
        compress: true,
        precision: 16
      },
      pagebreak: { 
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.section'
      }
    };
    
    // Créer un conteneur temporaire pour le HTML
    const container = document.createElement('div');
    container.style.width = 'auto';
    container.style.maxWidth = '210mm';
    container.style.margin = '0 auto';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.backgroundColor = 'white';
    container.innerHTML = compiledHtml;
    
    // Ajouter le container au document temporairement
    document.body.appendChild(container);
    
    try {
      // Générer le PDF
      console.log("Génération du PDF en cours avec html2pdf...");
      await html2pdf()
        .from(container)
        .set(pdfOptions)
        .save();
      
      console.log("PDF généré avec succès");
      return pdfOptions.filename;
    } finally {
      // Nettoyer le DOM
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw error;
  }
};

/**
 * Générer un PDF d'offre iTakecare à partir des données d'offre Leazr
 */
export const generateItakecareOfferPdf = async (
  offerData: any,
  customTemplate?: string,
  options: HtmlPdfOptions = {}
): Promise<string> => {
  try {
    console.log("Génération PDF iTakecare pour l'offre:", offerData.id);
    
    // Convertir les données d'offre au format template
    const templateData = convertOfferToTemplateData(offerData);
    
    // Utiliser le template personnalisé ou celui par défaut
    const htmlTemplate = customTemplate || ITAKECARE_HTML_TEMPLATE;
    
    // Générer le nom de fichier
    const filename = options.filename || `offre-itakecare-${offerData.id?.substring(0, 8)}.pdf`;
    
    // Générer le PDF
    return await generatePdfFromHtmlTemplate(htmlTemplate, templateData, {
      ...options,
      filename
    });
  } catch (error) {
    console.error("Erreur lors de la génération du PDF iTakecare:", error);
    throw error;
  }
};

/**
 * Prévisualiser un template HTML dans une nouvelle fenêtre
 */
export const previewHtmlTemplate = (htmlTemplate: string, data?: HtmlTemplateData): Window | null => {
  try {
    const templateService = HtmlTemplateService.getInstance();
    
    // Utiliser les données fournies ou créer des données d'exemple
    const previewData = data || {
      client_name: 'Jean Dupont',
      company_name: 'ACME SA',
      client_address: '123 Rue de la Paix, 1000 Bruxelles, Belgique',
      offer_date: new Date().toLocaleDateString('fr-FR'),
      monthly_price: '250,00 €',
      insurance: '450 €',
      setup_fee: '150 €',
      contract_duration: '36',
      products: [
        {
          category: 'Ordinateur portable',
          description: 'Dell Latitude 5520 - Intel i5, 16GB RAM, 512GB SSD',
          quantity: 2
        }
      ],
      insurance_example: 'Pour un contrat de 10.000 €, assurance = 350 €/an'
    };
    
    // Compiler le template
    const compiledHtml = templateService.compileTemplate(htmlTemplate, previewData);
    
    // Ouvrir dans une nouvelle fenêtre
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(compiledHtml);
      previewWindow.document.close();
    }
    
    return previewWindow;
  } catch (error) {
    console.error("Erreur lors de la prévisualisation:", error);
    throw error;
  }
};

export default {
  generatePdfFromHtmlTemplate,
  generateItakecareOfferPdf,
  previewHtmlTemplate,
  ITAKECARE_HTML_TEMPLATE
};