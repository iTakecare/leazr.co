
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const generateOfferPdf = async (offer) => {
  try {
    console.log("Generating PDF for offer:", offer.id);
    
    // Si un modèle est spécifié dans l'offre, l'utiliser
    let templateId = offer.__template?.id;
    
    // Si aucun modèle n'est spécifié, vérifier si l'ambassadeur ou le partenaire a un modèle assigné
    if (!templateId) {
      if (offer.ambassador_id) {
        const { data: ambassador } = await supabase
          .from('ambassadors')
          .select('pdf_template_id')
          .eq('id', offer.ambassador_id)
          .single();
          
        if (ambassador?.pdf_template_id) {
          templateId = ambassador.pdf_template_id;
        }
      } else if (offer.partner_id) {
        const { data: partner } = await supabase
          .from('partners')
          .select('pdf_template_id')
          .eq('id', offer.partner_id)
          .single();
          
        if (partner?.pdf_template_id) {
          templateId = partner.pdf_template_id;
        }
      }
    }
    
    // Si aucun modèle n'est trouvé, utiliser le modèle par défaut
    if (!templateId) {
      console.log("No template specified, using default template");
      templateId = "default";
    }
    
    // Récupérer le modèle
    const { data: template, error: templateError } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', templateId)
      .single();
      
    if (templateError && templateError.code !== 'PGRST116') {
      console.error("Error fetching template:", templateError);
      throw new Error("Erreur lors de la récupération du modèle");
    }
    
    // Utiliser le modèle par défaut si le modèle spécifié n'est pas trouvé
    if (!template) {
      console.log("Specified template not found, using default template");
      const { data: defaultTemplate, error: defaultTemplateError } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', 'default')
        .single();
        
      if (defaultTemplateError) {
        console.error("Error fetching default template:", defaultTemplateError);
        throw new Error("Erreur lors de la récupération du modèle par défaut");
      }
      
      offer.__template = defaultTemplate;
    } else {
      offer.__template = template;
    }
    
    // Obtenir l'URL de l'API si définie
    const apiUrl = import.meta.env.VITE_API_URL;
    
    // Mode de développement ou API non configurée - générer un PDF en fonction du preview
    if (import.meta.env.DEV || !apiUrl) {
      console.log("Using mock PDF generation based on preview (dev mode or no API URL configured)");
      
      // Simuler un délai pour imiter l'API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // En développement, créer un blob PDF basé sur le contenu de preview
      const mockFilename = `offre_${offer.id || 'preview'}_${new Date().getTime()}.pdf`;
      console.log("Mock PDF generated:", mockFilename);
      
      // Créer un PDF basé sur la preview
      const pdfContent = await generatePreviewBasedPdf(offer);
      
      // Convertir le data URI en Blob
      const byteString = atob(pdfContent.split(',')[1]);
      const mimeString = pdfContent.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const pdfBlob = new Blob([ab], { type: mimeString });
      
      // Retourner un objet avec le nom de fichier et un flag indiquant qu'il s'agit d'un mock
      return {
        filename: mockFilename,
        isMock: true,
        pdfUrl: null,
        pdfBlob: pdfBlob
      };
    }
    
    // Appel à l'API pour générer le PDF en mode production
    console.log("Making API request to:", `${apiUrl}/api/offer-pdf`);
    const response = await fetch(`${apiUrl}/api/offer-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify(offer),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response from PDF API:", errorText);
      throw new Error(`Erreur lors de la génération du PDF: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log("PDF generated successfully:", result);
    
    // Retourner les informations complètes (incluant l'URL du PDF s'il est disponible)
    return {
      filename: result.filename,
      isMock: false,
      pdfUrl: result.pdfUrl || null,
      pdfBlob: null
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Erreur lors de la génération du PDF");
    
    // En cas d'erreur en développement, retourner un fichier fictif plutôt que de bloquer l'utilisateur
    if (import.meta.env.DEV) {
      console.log("Returning mock filename due to error in development mode");
      const mockFilename = `error_mock_${new Date().getTime()}.pdf`;
      
      // Créer un PDF valide même en cas d'erreur
      const pdfContent = generateMockPdfDataUri({ 
        id: "error", 
        client_name: "Erreur PDF", 
        amount: 0,
        monthly_payment: 0,
        __template: { name: "Template par défaut" }
      });
      
      // Convertir le data URI en Blob
      const byteString = atob(pdfContent.split(',')[1]);
      const mimeString = pdfContent.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const pdfBlob = new Blob([ab], { type: mimeString });
      
      return {
        filename: mockFilename,
        isMock: true,
        pdfUrl: null,
        pdfBlob: pdfBlob
      };
    }
    
    throw error;
  }
};

// Fonction pour générer un PDF basé sur la preview exacte
const generatePreviewBasedPdf = async (offer) => {
  console.log("Generating PDF based on preview for template:", offer.__template?.name || "Default");
  
  // Créer un PDF structuré qui correspond visuellement à la preview
  const hasTemplateImages = offer.__template?.templateImages && 
                           Array.isArray(offer.__template.templateImages) && 
                           offer.__template.templateImages.length > 0;
  
  // Contenu PDF initial
  let pdfContent = `
    %PDF-1.4
    1 0 obj
    <<
    /Type /Catalog
    /Pages 2 0 R
    >>
    endobj
    2 0 obj
    <<
    /Type /Pages
    /Kids [3 0 R]
    /Count 1
    >>
    endobj
    3 0 obj
    <<
    /Type /Page
    /Parent 2 0 R
    /Resources 4 0 R
    /MediaBox [0 0 595 842]
    /Contents 5 0 R
    >>
    endobj
    4 0 obj
    <<
    /Font <<
    /F1 <<
    /Type /Font
    /Subtype /Type1
    /BaseFont /Helvetica
    >>
    /F2 <<
    /Type /Font
    /Subtype /Type1
    /BaseFont /Helvetica-Bold
    >>
    >>
    >>
    endobj
    5 0 obj
    << /Length 2000 >>
    stream
    BT
    /F2 16 Tf
    50 800 Td
  `;
  
  // Ajout d'informations correspondant au template
  if (hasTemplateImages) {
    pdfContent += `(PDF basé sur le template avec images: ${offer.__template.name || 'Sans nom'}) Tj\n`;
  } else {
    pdfContent += `(${offer.__template?.headerText?.replace('{offer_id}', offer.id || 'PREVIEW') || 'OFFRE'}) Tj\n`;
  }
  
  // Informations client
  pdfContent += `
    /F1 12 Tf
    0 -40 Td
    (Client: ${offer.client_name || offer.clients?.name || 'Client'}) Tj
    0 -20 Td
    (Société: ${offer.clients?.company || 'Entreprise'}) Tj
    0 -20 Td
    (Email: ${offer.client_email || offer.clients?.email || 'contact@exemple.fr'}) Tj
    0 -20 Td
    (Téléphone: ${offer.clients?.phone || '+33 1 23 45 67 89'}) Tj
    0 -20 Td
    (Adresse: ${offer.clients?.address || '123 Rue de l\'Exemple, 75000 Paris'}) Tj
  `;
  
  // Montant et détails financiers
  pdfContent += `
    0 -40 Td
    /F2 14 Tf
    (Détails de l'offre) Tj
    /F1 12 Tf
    0 -20 Td
    (Montant total: ${formatCurrency(offer.amount)}) Tj
    0 -20 Td
    (Mensualité: ${formatCurrency(offer.monthly_payment)}) Tj
  `;
  
  // Tableau d'équipements si disponible
  if (offer.equipment_description) {
    let equipment = [];
    try {
      if (typeof offer.equipment_description === 'string') {
        equipment = JSON.parse(offer.equipment_description);
      } else if (Array.isArray(offer.equipment_description)) {
        equipment = offer.equipment_description;
      }
    } catch (e) {
      console.error("Error parsing equipment:", e);
    }
    
    if (equipment.length > 0) {
      pdfContent += `
        0 -40 Td
        /F2 14 Tf
        (Équipements) Tj
        /F1 10 Tf
      `;
      
      equipment.forEach((item, index) => {
        const y = -20 - (index * 15);
        pdfContent += `
          0 ${y} Td
          (${item.title || item.name || 'Item'} - Qté: ${item.quantity || 1} - Prix: ${formatCurrency(item.purchasePrice)}) Tj
        `;
      });
    }
  }
  
  // Informations supplémentaires et pied de page
  pdfContent += `
    0 -60 Td
    /F1 10 Tf
    (${offer.__template?.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."}) Tj
    0 -20 Td
    (Date de génération: ${new Date().toLocaleDateString()}) Tj
    0 -20 Td
    (Document généré par ${offer.__template?.companyName || 'iTakeCare'}) Tj
    ET
    stream
    endobj
    xref
    0 6
    0000000000 65535 f
    0000000010 00000 n
    0000000059 00000 n
    0000000118 00000 n
    0000000217 00000 n
    0000000330 00000 n
    trailer
    <<
    /Size 6
    /Root 1 0 R
    >>
    startxref
    2400
    %%EOF
  `;
  
  // Convertir en base64 pour créer un data URI
  const base64 = btoa(pdfContent);
  return `data:application/pdf;base64,${base64}`;
};

// Fonction pour formater les montants
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0,00 €';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

// Fonction utilitaire pour générer un PDF simple au format Data URI
const generateMockPdfDataUri = (offer) => {
  // Créer un PDF simple avec des données de l'offre
  const pdfContent = `
    %PDF-1.4
    1 0 obj
    <<
    /Type /Catalog
    /Pages 2 0 R
    >>
    endobj
    2 0 obj
    <<
    /Type /Pages
    /Kids [3 0 R]
    /Count 1
    >>
    endobj
    3 0 obj
    <<
    /Type /Page
    /Parent 2 0 R
    /Resources 4 0 R
    /MediaBox [0 0 595 842]
    /Contents 5 0 R
    >>
    endobj
    4 0 obj
    <<
    /Font <<
    /F1 <<
    /Type /Font
    /Subtype /Type1
    /BaseFont /Helvetica
    >>
    >>
    >>
    endobj
    5 0 obj
    << /Length 1000 >>
    stream
    BT
    /F1 16 Tf
    50 750 Td
    (Aperçu PDF - Mode Développement) Tj
    /F1 12 Tf
    0 -30 Td
    (Offre: ${offer.id || 'ID non disponible'}) Tj
    0 -20 Td
    (Client: ${offer.client_name || 'Nom client non disponible'}) Tj
    0 -20 Td
    (Montant: ${offer.amount ? offer.amount + ' €' : 'Montant non disponible'}) Tj
    0 -20 Td
    (Mensualité: ${offer.monthly_payment ? offer.monthly_payment + ' €' : 'Mensualité non disponible'}) Tj
    0 -40 Td
    (Modèle: ${offer.__template?.name || 'Modèle par défaut'}) Tj
    0 -40 Td
    (Ce PDF est un document de démonstration généré en mode développement.) Tj
    0 -20 Td
    (Date de génération: ${new Date().toLocaleString()}) Tj
    ET
    stream
    endobj
    xref
    0 6
    0000000000 65535 f
    0000000010 00000 n
    0000000059 00000 n
    0000000118 00000 n
    0000000217 00000 n
    0000000300 00000 n
    trailer
    <<
    /Size 6
    /Root 1 0 R
    >>
    startxref
    1354
    %%EOF
  `;
  
  // Convertir en base64 pour créer un data URI
  const base64 = btoa(pdfContent);
  return `data:application/pdf;base64,${base64}`;
};

// Fonction utilitaire pour télécharger un fichier
export const downloadFile = (data, filename, mimeType = 'application/pdf') => {
  // Créer un élément a pour le téléchargement
  const downloadLink = document.createElement('a');
  
  // Si les données sont déjà un Blob, les utiliser directement
  let blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (typeof data === 'string') {
    // Si c'est une URL, définir l'attribut href
    if (data.startsWith('http') || data.startsWith('data:')) {
      downloadLink.href = data;
    } else {
      // Sinon, créer un blob à partir de la chaîne
      blob = new Blob([data], { type: mimeType });
    }
  } else {
    console.error("Type de données non pris en charge pour le téléchargement");
    return;
  }
  
  // Si nous avons un blob, créer une URL d'objet
  if (blob) {
    const blobUrl = URL.createObjectURL(blob);
    downloadLink.href = blobUrl;
    
    // Nettoyer l'URL de l'objet après le téléchargement
    downloadLink.onload = () => {
      URL.revokeObjectURL(blobUrl);
    };
  }
  
  // Définir le nom du fichier téléchargé
  downloadLink.download = filename;
  
  // Ajouter temporairement à la page et cliquer
  document.body.appendChild(downloadLink);
  downloadLink.click();
  
  // Supprimer le lien après le déclenchement du téléchargement
  document.body.removeChild(downloadLink);
};
