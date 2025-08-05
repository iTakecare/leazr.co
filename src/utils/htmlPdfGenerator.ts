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
 * Template HTML par défaut pour iTakecare (basé sur le template fourni)
 */
export const ITAKECARE_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offre commerciale iTakecare</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #1c1c1c;
      line-height: 1.6;
    }
    h1, h2, h3 {
      color: #0a376e;
    }
    .section {
      margin-bottom: 60px;
      page-break-inside: avoid;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
    }
    .subtitle {
      font-size: 18px;
      font-weight: bold;
    }
    .info {
      margin: 15px 0;
    }
    .values {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .values > div {
      flex: 1;
      min-width: 250px;
      margin-right: 20px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .table th, .table td {
      border: 1px solid #ccc;
      padding: 10px;
      text-align: left;
    }
    .table th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .steps {
      padding-left: 0;
    }
    .steps li {
      margin-bottom: 10px;
      list-style-type: none;
      counter-increment: step-counter;
    }
    .steps {
      counter-reset: step-counter;
    }
    @media print {
      .section {
        page-break-inside: avoid;
      }
      body {
        margin: 20px;
      }
    }
  </style>
</head>
<body>
  <!-- PAGE 1 - INTRO -->
  <div class="section">
    <div class="title">Proposition Commerciale<br />pour Services de Leasing IT</div>
    <p><strong>Par :</strong> Gianni Sergi - iTakecare</p>
    <div class="info">
      <p>Offre spécialement conçue pour : <strong>{{client_name}}</strong><br />
      Entreprise : <strong>{{company_name}}</strong><br />
      Adresse : <strong>{{client_address}}</strong><br />
      Date : <strong>{{offer_date}}</strong></p>
    </div>
    <p>Bienvenue dans une nouvelle ère de location informatique, où la confiance, le progrès et le soutien forment la pierre angulaire de chaque décision que nous prenons ensemble.</p>
  </div>

  <!-- PAGE 2 - NOTRE VISION -->
  <div class="section">
    <h2>Notre vision</h2>
    <p>Nous souhaitons être un acteur majeur dans l'accès aux technologies pour tous les professionnels du secteur Européen. Nous travaillons chaque jour à un monde plus juste et plus ouvert.</p>
  </div>

  <!-- PAGE 3 - OFFRE -->
  <div class="section">
    <h2>Notre offre</h2>
    <p><strong>Mensualité totale :</strong> {{monthly_price}} HTVA/mois</p>
    <p><strong>Estimation assurance annuelle :</strong> {{insurance}}</p>
    <p><strong>Frais de dossier unique :</strong> {{setup_fee}} HTVA</p>
    <p>Contrat de {{contract_duration}} mois - Livraison & installation incluse - Maintenance incluse - Garantie en échange direct incluse</p>
  </div>

  <!-- PAGE 4 - LISTE DU MATÉRIEL -->
  <div class="section">
    <h2>Notre solution</h2>
    <table class="table">
      <thead>
        <tr><th>Catégorie</th><th>Désignation</th><th>Quantité</th></tr>
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

  <!-- PAGE 5 - ETAPES -->
  <div class="section">
    <h2>Les prochaines étapes</h2>
    <ol class="steps">
      <li>1. Vous marquez votre accord pour la proposition par retour de mail</li>
      <li>2. Nous soumettons votre demande auprès de nos partenaires financiers</li>
      <li>3. Après accord, nous vous envoyons les contrats électroniques à signer</li>
      <li>4. Une fois signés, nous commandons le matériel et fixons une date de livraison</li>
      <li>5. Profitez de votre équipement ! En cas de souci : un mail ou appel suffit</li>
    </ol>
  </div>

  <!-- PAGE 6 - MODALITES -->
  <div class="section">
    <h2>Modalités du leasing</h2>
    <p>Les prélèvements sont trimestriels, par domiciliation SEPA. Le client est tenu d'assurer le matériel, soit via sa propre assurance, soit via celle du leaser.</p>
    <p>Assurance proposée : env. 3,5% du montant total du contrat. Exemple : {{insurance_example}}</p>
  </div>

  <!-- PAGE 7 - VALEURS -->
  <div class="section">
    <h2>Nos valeurs</h2>
    <div class="values">
      <div>
        <h3>Confiance</h3>
        <p>Nous valorisons les relations humaines authentiques et durables avec nos clients et partenaires.</p>
      </div>
      <div>
        <h3>Entraide</h3>
        <p>Nous nous rendons disponibles pour nous entraider, partager et faire grandir chacun.</p>
      </div>
      <div>
        <h3>Évolution</h3>
        <p>Nous adaptons nos idées à la réalité du terrain pour devancer les besoins de demain.</p>
      </div>
    </div>
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