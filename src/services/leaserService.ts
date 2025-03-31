
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
    const { data, error } = await supabase
      .from('leasers')
      .insert({
        name: leaser.name,
        logo_url: leaser.logo_url || null
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

export default {
  getLeasers,
  getLeaserById,
  createLeaser
};
