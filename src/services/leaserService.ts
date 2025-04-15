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
      toast.error("Impossible de charger les leasers");
      return defaultLeasers;
    }
    
    if (!data || data.length === 0) {
      console.log('Aucun leaser trouvé en base de données, utilisation des leasers par défaut');
      return defaultLeasers;
    }
    
    const formattedLeasers: Leaser[] = data.map((leaser) => ({
      id: leaser.id,
      name: leaser.name,
      logo_url: leaser.logo_url,
      is_default: leaser.is_default,
      ranges: leaser.ranges.sort((a: any, b: any) => a.min - b.min)
    }));
    
    return formattedLeasers;
  } catch (error) {
    console.error('Exception lors du chargement des leasers:', error);
    toast.error("Erreur lors du chargement des leasers");
    return defaultLeasers;
  }
};

/**
 * Récupère le leaser défini par défaut
 * @returns Le leaser par défaut ou null si aucun
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
      .single();
      
    if (error) {
      const leasers = await getLeasers();
      return leasers.length > 0 ? leasers[0] : null;
    }
    
    return {
      id: data.id,
      name: data.name,
      logo_url: data.logo_url,
      is_default: data.is_default,
      ranges: data.ranges.sort((a: any, b: any) => a.min - b.min)
    };
  } catch (error) {
    console.error('Exception lors du chargement du leaser par défaut:', error);
    const leasers = await getLeasers();
    return leasers.length > 0 ? leasers[0] : null;
  }
};

/**
 * Définit un leaser comme étant celui par défaut
 * @param id ID du leaser à définir par défaut
 * @returns true si l'opération a réussi, false sinon
 */
export const setDefaultLeaser = async (id: string): Promise<boolean> => {
  try {
    const { error: resetError } = await supabase
      .from('leasers')
      .update({ is_default: false })
      .neq('id', id);
      
    if (resetError) {
      console.error('Erreur lors de la réinitialisation des leasers par défaut:', resetError);
      toast.error("Erreur lors de la définition du leaser par défaut");
      return false;
    }
    
    const { error } = await supabase
      .from('leasers')
      .update({ is_default: true })
      .eq('id', id);
      
    if (error) {
      console.error('Erreur lors de la définition du leaser par défaut:', error);
      toast.error("Erreur lors de la définition du leaser par défaut");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception lors de la définition du leaser par défaut:', error);
    toast.error("Erreur lors de la définition du leaser par défaut");
    return false;
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
      is_default: data.is_default,
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
    if (leaser.is_default) {
      const { error: resetError } = await supabase
        .from('leasers')
        .update({ is_default: false });
        
      if (resetError) {
        console.error('Erreur lors de la réinitialisation des leasers par défaut:', resetError);
        toast.error("Erreur lors de la création du leaser");
        return null;
      }
    }
    
    const { data, error } = await supabase
      .from('leasers')
      .insert({
        name: leaser.name,
        logo_url: leaser.logo_url || null,
        is_default: !!leaser.is_default
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erreur lors de la création du leaser:', error);
      toast.error("Erreur lors de la création du leaser");
      return null;
    }
    
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
    if (leaser.is_default) {
      const { error: resetError } = await supabase
        .from('leasers')
        .update({ is_default: false })
        .neq('id', id);
        
      if (resetError) {
        console.error('Erreur lors de la réinitialisation des leasers par défaut:', resetError);
        toast.error("Erreur lors de la mise à jour du leaser");
        return false;
      }
    }
    
    const { error } = await supabase
      .from('leasers')
      .update({
        name: leaser.name,
        logo_url: leaser.logo_url || null,
        is_default: !!leaser.is_default
      })
      .eq('id', id);
    
    if (error) {
      console.error('Erreur lors de la mise à jour du leaser:', error);
      toast.error("Erreur lors de la mise à jour du leaser");
      return false;
    }
    
    const { error: deleteError } = await supabase
      .from('leaser_ranges')
      .delete()
      .eq('leaser_id', id);
    
    if (deleteError) {
      console.error('Erreur lors de la suppression des anciennes tranches:', deleteError);
      toast.error("Erreur lors de la mise à jour des tranches");
      return false;
    }
    
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
 * Supprime un leaser
 * @param id ID du leaser à supprimer
 * @returns true si la suppression a réussi, false sinon
 */
export const deleteLeaser = async (id: string): Promise<boolean> => {
  try {
    const { data, error: checkError } = await supabase
      .from('leasers')
      .select('is_default')
      .eq('id', id)
      .single();
      
    if (checkError) {
      console.error('Erreur lors de la vérification du leaser:', checkError);
    } else if (data.is_default) {
      const { data: otherLeasers, error: othersError } = await supabase
        .from('leasers')
        .select('id')
        .neq('id', id)
        .limit(1);
        
      if (!othersError && otherLeasers && otherLeasers.length > 0) {
        await setDefaultLeaser(otherLeasers[0].id);
      }
    }
    
    const { error: rangeError } = await supabase
      .from('leaser_ranges')
      .delete()
      .eq('leaser_id', id);
    
    if (rangeError) {
      console.error('Erreur lors de la suppression des tranches:', rangeError);
      toast.error("Erreur lors de la suppression des tranches");
      return false;
    }
    
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
    const { count, error: countError } = await supabase
      .from('leasers')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Erreur lors de la vérification des leasers existants:', countError);
      return false;
    }
    
    if (count && count > 0) {
      console.log('Des leasers existent déjà, pas d\'insertion des leasers par défaut');
      return true;
    }
    
    for (const leaser of defaultLeasers) {
      const { data, error } = await supabase
        .from('leasers')
        .insert({
          id: leaser.id,
          name: leaser.name,
          logo_url: leaser.logo_url || null,
          is_default: !!leaser.is_default
        })
        .select()
        .single();
      
      if (error) {
        console.error('Erreur lors de l\'insertion d\'un leaser par défaut:', error);
        continue;
      }
      
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
  getDefaultLeaser,
  setDefaultLeaser,
  createLeaser,
  addLeaser,
  updateLeaser,
  deleteLeaser,
  insertDefaultLeasers
};
