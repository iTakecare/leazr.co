
import { supabase } from '@/integrations/supabase/client';
import { Leaser } from '@/types/equipment';
import { defaultLeasers } from '@/data/leasers';
import { toast } from 'sonner';

/**
 * Récupère la liste des leasers depuis la base de données
 * @returns Array de leasers
 */
export const getLeasers = async (): Promise<Leaser[]> => {
  try {
    // Tenter de charger les leasers depuis la base de données Supabase
    const { data, error } = await supabase
      .from('leasers')
      .select(`
        id, 
        name,
        logo_url,
        is_default,
        ranges:leaser_ranges(
          id,
          min,
          max,
          coefficient
        )
      `)
      .order('name');
    
    if (error) {
      console.error('Erreur lors du chargement des leasers:', error);
      throw error;
    }
    
    // Si aucun leaser n'est trouvé, utiliser les leasers par défaut
    if (!data || data.length === 0) {
      console.log('Aucun leaser trouvé en base de données, utilisation des leasers par défaut');
      return defaultLeasers;
    }
    
    // Transformer les données de la base de données au format attendu par l'application
    const formattedLeasers: Leaser[] = data.map((leaser) => ({
      id: leaser.id,
      name: leaser.name,
      logo_url: leaser.logo_url,
      is_default: leaser.is_default || false,
      ranges: leaser.ranges.sort((a: any, b: any) => a.min - b.min)
    }));
    
    return formattedLeasers;
  } catch (error) {
    console.error('Exception lors du chargement des leasers:', error);
    // En cas d'erreur, retourner les leasers par défaut
    return defaultLeasers;
  }
};

/**
 * Récupère un leaser par son ID
 * @param id ID du leaser à récupérer
 * @returns Le leaser correspondant ou null
 */
export const getLeaserById = async (id: string): Promise<Leaser | null> => {
  try {
    const { data, error } = await supabase
      .from('leasers')
      .select(`
        id, 
        name,
        logo_url,
        is_default,
        ranges:leaser_ranges(
          id,
          min,
          max,
          coefficient
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Erreur lors du chargement du leaser:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      logo_url: data.logo_url,
      is_default: data.is_default || false,
      ranges: data.ranges.sort((a: any, b: any) => a.min - b.min)
    };
  } catch (error) {
    console.error('Exception lors du chargement du leaser:', error);
    return null;
  }
};

/**
 * Ajoute un nouveau leaser
 * @param leaser Données du leaser à ajouter
 * @returns Le leaser créé
 */
export const createLeaser = async (leaser: Omit<Leaser, 'id'>): Promise<Leaser | null> => {
  try {
    // Si le leaser est défini par défaut, réinitialiser tous les autres leasers
    if (leaser.is_default) {
      await resetDefaultLeasers();
    }

    const { data, error } = await supabase
      .from('leasers')
      .insert({
        name: leaser.name,
        logo_url: leaser.logo_url || null,
        is_default: leaser.is_default || false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erreur lors de la création du leaser:', error);
      toast.error("Erreur lors de la création du leaser");
      return null;
    }
    
    // Après avoir créé le leaser, ajouter les tranches
    if (leaser.ranges && leaser.ranges.length > 0) {
      const rangesToInsert = leaser.ranges.map(range => ({
        leaser_id: data.id,
        min: range.min,
        max: range.max,
        coefficient: range.coefficient
      }));
      
      const { error: rangeError } = await supabase
        .from('leaser_ranges')
        .insert(rangesToInsert);
        
      if (rangeError) {
        console.error('Erreur lors de l\'ajout des tranches:', rangeError);
        toast.error("Le leaser a été créé mais les tranches n'ont pas pu être ajoutées");
      }
    }
    
    // Récupérer le leaser complet pour le renvoyer
    return await getLeaserById(data.id);
  } catch (error) {
    console.error('Exception lors de la création du leaser:', error);
    toast.error("Erreur lors de la création du leaser");
    return null;
  }
};

/**
 * Ajoute un nouveau leaser
 * Cette fonction est un alias de createLeaser pour maintenir la compatibilité
 */
export const addLeaser = createLeaser;

/**
 * Met à jour un leaser existant
 * @param id ID du leaser à mettre à jour
 * @param leaser Nouvelles données du leaser
 * @returns true si la mise à jour a réussi, false sinon
 */
export const updateLeaser = async (id: string, leaser: Omit<Leaser, 'id'>): Promise<boolean> => {
  try {
    // Si le leaser est défini par défaut, réinitialiser tous les autres leasers
    if (leaser.is_default) {
      await resetDefaultLeasers();
    }

    // Mettre à jour les informations de base du leaser
    const { error } = await supabase
      .from('leasers')
      .update({
        name: leaser.name,
        logo_url: leaser.logo_url || null,
        is_default: leaser.is_default || false
      })
      .eq('id', id);
    
    if (error) {
      console.error('Erreur lors de la mise à jour du leaser:', error);
      toast.error("Erreur lors de la mise à jour du leaser");
      return false;
    }
    
    // Supprimer les anciennes tranches
    const { error: deleteError } = await supabase
      .from('leaser_ranges')
      .delete()
      .eq('leaser_id', id);
    
    if (deleteError) {
      console.error('Erreur lors de la suppression des anciennes tranches:', deleteError);
      toast.error("Erreur lors de la mise à jour des tranches");
      return false;
    }
    
    // Ajouter les nouvelles tranches
    if (leaser.ranges && leaser.ranges.length > 0) {
      const rangesToInsert = leaser.ranges.map(range => ({
        leaser_id: id,
        min: range.min,
        max: range.max,
        coefficient: range.coefficient
      }));
      
      const { error: rangeError } = await supabase
        .from('leaser_ranges')
        .insert(rangesToInsert);
        
      if (rangeError) {
        console.error('Erreur lors de l\'ajout des nouvelles tranches:', rangeError);
        toast.error("Les informations du leaser ont été mises à jour, mais pas les tranches");
        return false;
      }
    }
    
    toast.success("Leaser mis à jour avec succès");
    return true;
  } catch (error) {
    console.error('Exception lors de la mise à jour du leaser:', error);
    toast.error("Erreur lors de la mise à jour du leaser");
    return false;
  }
};

/**
 * Réinitialise tous les leasers par défaut à false
 * @returns true si la réinitialisation a réussi, false sinon
 */
export const resetDefaultLeasers = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('leasers')
      .update({ is_default: false })
      .neq('id', 'no-match'); // Cette condition permet de mettre à jour tous les enregistrements
    
    if (error) {
      console.error('Erreur lors de la réinitialisation des leasers par défaut:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception lors de la réinitialisation des leasers par défaut:', error);
    return false;
  }
};

/**
 * Définit un leaser comme leaser par défaut
 * @param id ID du leaser à définir par défaut
 * @returns true si l'opération a réussi, false sinon
 */
export const setDefaultLeaser = async (id: string): Promise<boolean> => {
  try {
    // Réinitialiser tous les leasers par défaut
    await resetDefaultLeasers();
    
    // Définir le leaser spécifié comme leaser par défaut
    const { error } = await supabase
      .from('leasers')
      .update({ is_default: true })
      .eq('id', id);
    
    if (error) {
      console.error('Erreur lors de la définition du leaser par défaut:', error);
      toast.error("Erreur lors de la définition du leaser par défaut");
      return false;
    }
    
    toast.success("Leaser défini par défaut avec succès");
    return true;
  } catch (error) {
    console.error('Exception lors de la définition du leaser par défaut:', error);
    toast.error("Erreur lors de la définition du leaser par défaut");
    return false;
  }
};

/**
 * Récupère le leaser par défaut
 * @returns Le leaser par défaut ou null
 */
export const getDefaultLeaser = async (): Promise<Leaser | null> => {
  try {
    const { data, error } = await supabase
      .from('leasers')
      .select(`
        id, 
        name,
        logo_url,
        is_default,
        ranges:leaser_ranges(
          id,
          min,
          max,
          coefficient
        )
      `)
      .eq('is_default', true)
      .maybeSingle();
    
    if (error) {
      console.error('Erreur lors de la récupération du leaser par défaut:', error);
      return null;
    }
    
    if (!data) {
      // Si aucun leaser par défaut n'est trouvé, utiliser le premier leaser de la base de données
      const { data: allLeasers, error: allLeasersError } = await supabase
        .from('leasers')
        .select(`
          id, 
          name,
          logo_url,
          is_default,
          ranges:leaser_ranges(
            id,
            min,
            max,
            coefficient
          )
        `)
        .order('name')
        .limit(1)
        .maybeSingle();
      
      if (allLeasersError || !allLeasers) {
        // Si aucun leaser n'est trouvé, utiliser le premier leaser par défaut
        return defaultLeasers.length > 0 ? defaultLeasers[0] : null;
      }
      
      return {
        id: allLeasers.id,
        name: allLeasers.name,
        logo_url: allLeasers.logo_url,
        is_default: allLeasers.is_default || false,
        ranges: allLeasers.ranges.sort((a: any, b: any) => a.min - b.min)
      };
    }
    
    return {
      id: data.id,
      name: data.name,
      logo_url: data.logo_url,
      is_default: data.is_default || false,
      ranges: data.ranges.sort((a: any, b: any) => a.min - b.min)
    };
  } catch (error) {
    console.error('Exception lors de la récupération du leaser par défaut:', error);
    // En cas d'erreur, utiliser le premier leaser par défaut
    return defaultLeasers.length > 0 ? defaultLeasers[0] : null;
  }
};

/**
 * Supprime un leaser
 * @param id ID du leaser à supprimer
 * @returns true si la suppression a réussi, false sinon
 */
export const deleteLeaser = async (id: string): Promise<boolean> => {
  try {
    // Supprimer d'abord les tranches associées
    const { error: rangeError } = await supabase
      .from('leaser_ranges')
      .delete()
      .eq('leaser_id', id);
    
    if (rangeError) {
      console.error('Erreur lors de la suppression des tranches:', rangeError);
      toast.error("Erreur lors de la suppression des tranches");
      return false;
    }
    
    // Supprimer ensuite le leaser
    const { error } = await supabase
      .from('leasers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erreur lors de la suppression du leaser:', error);
      toast.error("Erreur lors de la suppression du leaser");
      return false;
    }
    
    toast.success("Leaser supprimé avec succès");
    return true;
  } catch (error) {
    console.error('Exception lors de la suppression du leaser:', error);
    toast.error("Erreur lors de la suppression du leaser");
    return false;
  }
};

/**
 * Insère les leasers par défaut si la table est vide
 * @returns true si l'opération a réussi, false sinon
 */
export const insertDefaultLeasers = async (): Promise<boolean> => {
  try {
    // Vérifier si des leasers existent déjà
    const { count, error: countError } = await supabase
      .from('leasers')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Erreur lors de la vérification des leasers existants:', countError);
      return false;
    }
    
    // Si des leasers existent déjà, ne pas insérer les leasers par défaut
    if (count && count > 0) {
      console.log('Des leasers existent déjà, pas d\'insertion des leasers par défaut');
      return true;
    }
    
    // Insérer les leasers par défaut
    for (const leaser of defaultLeasers) {
      const { data, error } = await supabase
        .from('leasers')
        .insert({
          id: leaser.id,  // Conserver l'ID d'origine pour garantir la cohérence
          name: leaser.name,
          logo_url: leaser.logo_url || null,
          is_default: leaser.is_default || false
        })
        .select()
        .single();
      
      if (error) {
        console.error('Erreur lors de l\'insertion d\'un leaser par défaut:', error);
        continue;
      }
      
      // Insérer les tranches pour ce leaser
      if (leaser.ranges && leaser.ranges.length > 0) {
        const rangesToInsert = leaser.ranges.map(range => ({
          leaser_id: data.id,
          min: range.min,
          max: range.max,
          coefficient: range.coefficient
        }));
        
        const { error: rangeError } = await supabase
          .from('leaser_ranges')
          .insert(rangesToInsert);
          
        if (rangeError) {
          console.error('Erreur lors de l\'insertion des tranches pour un leaser par défaut:', rangeError);
        }
      }
    }
    
    console.log('Leasers par défaut insérés avec succès');
    return true;
  } catch (error) {
    console.error('Exception lors de l\'insertion des leasers par défaut:', error);
    return false;
  }
};

export default {
  getLeasers,
  getLeaserById,
  createLeaser,
  addLeaser,
  updateLeaser,
  deleteLeaser,
  insertDefaultLeasers,
  setDefaultLeaser,
  getDefaultLeaser,
  resetDefaultLeasers
};
