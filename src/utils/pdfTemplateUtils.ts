
import { getSupabaseClient } from "@/integrations/supabase/client";
import { generateTemplateId } from "@/lib/utils";
import { toast } from "sonner";

// Modèle par défaut pour les PDF
export const DEFAULT_MODEL = {
  id: 'default',
  name: 'Modèle par défaut',
  companyName: 'iTakeCare',
  companyAddress: 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique',
  companyContact: 'Tel: +32 471 511 121 - Email: hello@itakecare.be',
  companySiret: 'TVA: BE 0795.642.894',
  logoURL: '',
  primaryColor: '#2C3E50',
  secondaryColor: '#3498DB',
  headerText: 'OFFRE N° {offer_id}',
  footerText: 'Cette offre est valable 30 jours à compter de sa date d\'émission.',
  templateImages: [],
  fields: []
};

// Fonction pour sauvegarder un modèle PDF
export const savePDFTemplate = async (template: any): Promise<boolean> => {
  try {
    console.log("Sauvegarde du modèle PDF:", template.id);
    
    const supabase = getSupabaseClient();
    
    // Vérifier si la table existe
    const { data: existsData, error: existsError } = await supabase
      .from('pdf_templates')
      .select('id')
      .eq('id', template.id)
      .maybeSingle();
    
    if (existsError && existsError.code !== 'PGRST116') {
      console.error("Erreur lors de la vérification de la table:", existsError);
      throw new Error("Erreur de base de données");
    }
    
    // Si la table existe, essayer de sauvegarder dans Supabase
    const exists = !!existsData;
    
    if (exists) {
      // Mise à jour d'un modèle existant
      const { error: updateError } = await supabase
        .from('pdf_templates')
        .update(template)
        .eq('id', template.id);
      
      if (updateError) {
        console.error("Erreur lors de la mise à jour dans Supabase:", updateError);
        throw new Error("Erreur de mise à jour");
      }
    } else {
      // Insertion d'un nouveau modèle
      const { error: insertError } = await supabase
        .from('pdf_templates')
        .insert([template]);
      
      if (insertError) {
        console.error("Erreur lors de l'insertion dans Supabase:", insertError);
        throw new Error("Erreur d'insertion");
      }
    }
    
    console.log("Modèle sauvegardé avec succès dans Supabase");
    return true;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du modèle:", error);
    throw error;
  }
};

// Fonction pour charger un modèle PDF
export const loadPDFTemplate = async (id: string = 'default'): Promise<any> => {
  try {
    console.log(`Chargement du modèle PDF: ${id}`);
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error("Erreur lors du chargement depuis Supabase:", error);
      throw new Error("Erreur de base de données");
    }
    
    if (data) {
      console.log("Modèle chargé depuis Supabase:", data);
      return data;
    }
    
    // Si le modèle n'existe pas dans Supabase et c'est le modèle par défaut
    if (id === 'default') {
      console.log("Création du modèle par défaut dans Supabase");
      
      // Insérer le modèle par défaut dans Supabase
      const { error: insertError } = await supabase
        .from('pdf_templates')
        .insert([DEFAULT_MODEL]);
      
      if (insertError) {
        console.error("Erreur lors de l'insertion du modèle par défaut:", insertError);
        throw new Error("Erreur d'insertion");
      }
      
      return DEFAULT_MODEL;
    }
    
    return null;
  } catch (error) {
    console.error("Erreur lors du chargement du modèle:", error);
    throw error;
  }
};

// Fonction pour récupérer tous les modèles PDF
export const getAllPDFTemplates = async (): Promise<any[]> => {
  try {
    console.log("Chargement de tous les modèles PDF");
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .order('name');
    
    if (error && error.code !== 'PGRST116') {
      console.error("Erreur lors du chargement des modèles depuis Supabase:", error);
      throw new Error("Erreur de base de données");
    }
    
    if (data && data.length > 0) {
      console.log(`${data.length} modèles chargés depuis Supabase`);
      return data;
    }
    
    // Si aucun modèle n'existe, créer le modèle par défaut
    console.log("Aucun modèle trouvé, création du modèle par défaut dans Supabase");
    
    // Vérifier si le modèle par défaut existe déjà
    const { data: defaultExists } = await supabase
      .from('pdf_templates')
      .select('id')
      .eq('id', 'default')
      .maybeSingle();
    
    if (!defaultExists) {
      // Tentative d'insertion du modèle par défaut
      try {
        const { error: insertError } = await supabase
          .from('pdf_templates')
          .insert([DEFAULT_MODEL]);
        
        if (insertError) {
          console.error("Erreur lors de l'insertion du modèle par défaut:", insertError);
          throw new Error("Erreur d'insertion");
        }
        
        return [DEFAULT_MODEL];
      } catch (insertError) {
        console.error("Erreur lors de l'insertion:", insertError);
        throw insertError;
      }
    }
    
    return [];
  } catch (error) {
    console.error("Erreur lors du chargement des modèles:", error);
    throw error;
  }
};

// Fonction pour supprimer un modèle PDF
export const deletePDFTemplate = async (id: string): Promise<boolean> => {
  // Ne pas permettre la suppression du modèle par défaut
  if (id === 'default') {
    throw new Error("Le modèle par défaut ne peut pas être supprimé");
  }
  
  try {
    console.log(`Suppression du modèle PDF: ${id}`);
    
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('pdf_templates')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Erreur lors de la suppression depuis Supabase:", error);
      throw new Error("Erreur de suppression");
    }
    
    console.log("Modèle supprimé avec succès de Supabase");
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression du modèle:", error);
    throw error;
  }
};
