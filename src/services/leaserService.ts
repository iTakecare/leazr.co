
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
    console.log('Fetching leasers from database...');
    
    // First ensure we have default leasers in the database
    await insertDefaultLeasers();
    
    // Tenter de charger les leasers depuis la base de données Supabase
    const { data, error } = await supabase
      .from('leasers')
      .select(`
        id, 
        name,
        logo_url,
        ranges:leaser_ranges(
          id,
          min,
          max,
          coefficient
        )
      `)
      .order('name');
    
    if (error) {
      console.error('Error loading leasers from database:', error);
      console.log('Using default leasers as fallback');
      return defaultLeasers;
    }
    
    console.log('Raw data from database:', data);
    
    // Si aucun leaser n'est trouvé après insertion, utiliser les leasers par défaut
    if (!data || data.length === 0) {
      console.log('No leasers found in database even after insertion, using default leasers');
      return defaultLeasers;
    }
    
    // Transformer les données de la base de données au format attendu par l'application
    const formattedLeasers: Leaser[] = data.map((leaser) => ({
      id: leaser.id,
      name: leaser.name,
      logo_url: leaser.logo_url,
      ranges: (leaser.ranges || []).sort((a: any, b: any) => a.min - b.min)
    }));
    
    console.log('Formatted leasers:', formattedLeasers);
    return formattedLeasers;
  } catch (error) {
    console.error('Exception during leaser loading:', error);
    console.log('Using default leasers as fallback');
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
      console.error('Error loading leaser:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      logo_url: data.logo_url,
      ranges: data.ranges.sort((a: any, b: any) => a.min - b.min)
    };
  } catch (error) {
    console.error('Exception during leaser loading:', error);
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
    const { data, error } = await supabase
      .from('leasers')
      .insert({
        name: leaser.name,
        logo_url: leaser.logo_url || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating leaser:', error);
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
        console.error('Error adding ranges:', rangeError);
        toast.error("Le leaser a été créé mais les tranches n'ont pas pu être ajoutées");
      }
    }
    
    // Récupérer le leaser complet pour le renvoyer
    return await getLeaserById(data.id);
  } catch (error) {
    console.error('Exception during leaser creation:', error);
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
    // Mettre à jour les informations de base du leaser
    const { error } = await supabase
      .from('leasers')
      .update({
        name: leaser.name,
        logo_url: leaser.logo_url || null
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating leaser:', error);
      toast.error("Erreur lors de la mise à jour du leaser");
      return false;
    }
    
    // Supprimer les anciennes tranches
    const { error: deleteError } = await supabase
      .from('leaser_ranges')
      .delete()
      .eq('leaser_id', id);
    
    if (deleteError) {
      console.error('Error deleting old ranges:', deleteError);
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
        console.error('Error adding new ranges:', rangeError);
        toast.error("Les informations du leaser ont été mises à jour, mais pas les tranches");
        return false;
      }
    }
    
    toast.success("Leaser mis à jour avec succès");
    return true;
  } catch (error) {
    console.error('Exception during leaser update:', error);
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
    // Supprimer d'abord les tranches associées
    const { error: rangeError } = await supabase
      .from('leaser_ranges')
      .delete()
      .eq('leaser_id', id);
    
    if (rangeError) {
      console.error('Error deleting ranges:', rangeError);
      toast.error("Erreur lors de la suppression des tranches");
      return false;
    }
    
    // Supprimer ensuite le leaser
    const { error } = await supabase
      .from('leasers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting leaser:', error);
      toast.error("Erreur lors de la suppression du leaser");
      return false;
    }
    
    toast.success("Leaser supprimé avec succès");
    return true;
  } catch (error) {
    console.error('Exception during leaser deletion:', error);
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
    console.log('Checking if default leasers need to be inserted...');
    
    // Vérifier si des leasers existent déjà
    const { count, error: countError } = await supabase
      .from('leasers')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error checking existing leasers:', countError);
      return false;
    }
    
    // Si des leasers existent déjà, ne pas insérer les leasers par défaut
    if (count && count > 0) {
      console.log(`${count} leasers already exist, skipping default insertion`);
      return true;
    }
    
    console.log('No leasers found, inserting default leasers...');
    
    // Insérer les leasers par défaut un par un pour éviter les conflits
    for (const leaser of defaultLeasers) {
      try {
        // D'abord vérifier si ce leaser existe déjà (par ID ou nom)
        const { data: existingLeaser } = await supabase
          .from('leasers')
          .select('id')
          .or(`id.eq.${leaser.id},name.eq.${leaser.name}`)
          .single();
        
        if (existingLeaser) {
          console.log(`Leaser ${leaser.name} already exists, skipping...`);
          continue;
        }

        const { data, error } = await supabase
          .from('leasers')
          .insert({
            id: leaser.id,
            name: leaser.name,
            logo_url: leaser.logo_url || null
          })
          .select()
          .single();
        
        if (error) {
          console.error(`Error inserting default leaser ${leaser.name}:`, error);
          continue;
        }
        
        console.log(`Inserted leaser: ${leaser.name}`);
        
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
            console.error(`Error inserting ranges for leaser ${leaser.name}:`, rangeError);
          } else {
            console.log(`Inserted ${rangesToInsert.length} ranges for ${leaser.name}`);
          }
        }
      } catch (individualError) {
        console.error(`Error processing leaser ${leaser.name}:`, individualError);
      }
    }
    
    console.log('Default leasers insertion completed');
    return true;
  } catch (error) {
    console.error('Exception during default leasers insertion:', error);
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
  insertDefaultLeasers
};
