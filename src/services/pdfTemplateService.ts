import { supabase } from "@/integrations/supabase/client";
import { downloadAndUploadImage } from "@/services/storageService";
import { generateOfferPdf } from "@/utils/pdfGenerator";

/**
 * Récupère tous les modèles PDF
 */
export const getPDFTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching PDF templates:', error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPDFTemplates:', error);
    throw error;
  }
};

/**
 * Récupère un modèle PDF spécifique par ID
 */
export const getPDFTemplate = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching PDF template with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error in getPDFTemplate:', error);
    throw error;
  }
};

/**
 * Enregistre un modèle PDF (crée ou met à jour)
 */
export const savePDFTemplate = async (template: any) => {
  try {
    // Gestion du logo (si présent)
    if (template.logoURL && template.logoURL.startsWith('blob:')) {
      console.log('Processing logoURL from blob');
      const logoURL = await downloadAndUploadImage(
        template.logoURL,
        `logo-${Date.now()}`,
        'pdf-templates'
      );
      template.logoURL = logoURL;
    }

    // Gestion des images de page
    if (template.templateImages && template.templateImages.length > 0) {
      for (let i = 0; i < template.templateImages.length; i++) {
        const image = template.templateImages[i];
        if (image.imageUrl && image.imageUrl.startsWith('blob:')) {
          console.log(`Processing template image ${i} from blob`);
          const imageUrl = await downloadAndUploadImage(
            image.imageUrl,
            `template-${Date.now()}-page-${i}`,
            'pdf-templates'
          );
          template.templateImages[i].imageUrl = imageUrl;
        }
      }
    }

    // Générer un ID unique si c'est un nouveau modèle
    const isNewTemplate = !template.id;
    const templateId = template.id || `template-${Date.now()}`;

    const { data, error } = await supabase
      .from('pdf_templates')
      .upsert({
        id: templateId,
        name: template.name,
        companyName: template.companyName,
        companyAddress: template.companyAddress,
        companySiret: template.companySiret,
        companyContact: template.companyContact,
        headerText: template.headerText || '',
        footerText: template.footerText || '',
        primaryColor: template.primaryColor || '#3B82F6',
        secondaryColor: template.secondaryColor || '#1E3A8A',
        logoURL: template.logoURL || null,
        templateImages: template.templateImages || [],
        fields: template.fields || {},
        created_at: isNewTemplate ? new Date() : undefined,
        updated_at: new Date()
      })
      .select();

    if (error) {
      console.error('Error saving PDF template:', error);
      throw new Error(error.message);
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error in savePDFTemplate:', error);
    throw error;
  }
};

/**
 * Supprime un modèle PDF
 */
export const deletePDFTemplate = async (id: string) => {
  try {
    const { error } = await supabase
      .from('pdf_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting PDF template with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    console.error('Error in deletePDFTemplate:', error);
    throw error;
  }
};

/**
 * Génère un PDF basé sur un modèle et des données
 */
export const generatePDFFromTemplate = async (templateId: string, data: any) => {
  try {
    // Récupérer le modèle
    const template = await getPDFTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
    
    // Ici, dans une implémentation réelle, on utiliserait le template pour générer le PDF
    // avec les données fournies (client, offre, etc.)
    // Pour l'instant, on utilise la fonction existante comme solution temporaire
    return generateOfferPdf(data.offer || {});
  } catch (error) {
    console.error('Error in generatePDFFromTemplate:', error);
    throw error;
  }
};

/**
 * Attribue un modèle PDF à un ambassadeur ou partenaire
 */
export const assignPDFTemplateToUser = async (templateId: string, userId: string, userType: 'ambassador' | 'partner') => {
  try {
    const tableName = userType === 'ambassador' ? 'ambassadors' : 'partners';
    
    const { error } = await supabase
      .from(tableName)
      .update({ pdf_template_id: templateId })
      .eq('user_id', userId);

    if (error) {
      console.error(`Error assigning PDF template to ${userType}:`, error);
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    console.error('Error in assignPDFTemplateToUser:', error);
    throw error;
  }
};
