
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
    
    // Vérifier si VITE_API_URL est défini
    const apiUrl = import.meta.env.VITE_API_URL;
    
    if (!apiUrl) {
      console.error("VITE_API_URL is not defined in environment variables");
      throw new Error("Configuration d'API manquante. Veuillez configurer VITE_API_URL.");
    }
    
    console.log("Using API URL:", apiUrl);
    
    // Simulation de génération PDF pour le développement
    // Si nous sommes en environnement de développement sans API
    if (import.meta.env.DEV && (!apiUrl || apiUrl === 'http://localhost:1234')) {
      console.log("Using mock PDF generation in development");
      
      // Simuler un délai pour imiter l'API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Retourner un nom de fichier fictif
      const mockFilename = `offre_${offer.id}_${new Date().getTime()}.pdf`;
      console.log("Mock PDF generated:", mockFilename);
      
      return mockFilename;
    }
    
    // Appel à l'API pour générer le PDF
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
    
    return result.filename;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};
