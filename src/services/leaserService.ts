
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
      toast.error(`Erreur de base de données: ${error.message}`);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No leasers found in database');
      toast.warning('Aucun leaser trouvé dans la base de données');
      return [];
    }
    
    // Transformer les données de la base de données au format attendu par l'application
    const formattedLeasers: Leaser[] = data.map((leaser) => ({
      id: leaser.id,
      name: leaser.name,
      logo_url: leaser.logo_url,
      ranges: (leaser.ranges || []).sort((a: any, b: any) => a.min - b.min)
    }));
    
    return formattedLeasers;
  } catch (error) {
    console.error('Exception during leaser loading:', error);
    toast.error(`Erreur lors du chargement: ${error}`);
    return [];
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
    // Get current user's company_id for new leasers
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    // Get default company if no profile found
    let companyId = profile?.company_id;
    if (!companyId) {
      const { data: defaultCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', 'iTakecare (Default)')
        .maybeSingle();
      
      companyId = defaultCompany?.id;
    }

    const { data, error } = await supabase
      .from('leasers')
      .insert({
        name: leaser.name,
        logo_url: leaser.logo_url || null,
        company_id: companyId
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
 * Insère TOUS les leasers par défaut dans la base de données
 * @returns true si l'opération a réussi, false sinon
 */
export const insertDefaultLeasers = async (): Promise<boolean> => {
  try {
    console.log('=== INSERTING DEFAULT LEASERS ===');
    
    // Get or create the default company
    let { data: defaultCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', 'iTakecare (Default)')
      .maybeSingle();

    let companyId = defaultCompany?.id;

    // If no default company, create one
    if (!companyId) {
      console.log('Creating default company...');
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: 'iTakecare (Default)',
          plan: 'business',
          is_active: true
        })
        .select()
        .single();
      
      if (companyError) {
        console.error('Error creating default company:', companyError);
        return false;
      }
      
      companyId = newCompany.id;
      console.log('Default company created with ID:', companyId);
    }
    
    // Clear all existing leasers and ranges to start fresh
    console.log('Clearing existing leasers...');
    await supabase.from('leaser_ranges').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('leasers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Insert each default leaser
    let insertedCount = 0;
    for (const leaser of defaultLeasers) {
      try {
        console.log(`Inserting leaser: ${leaser.name}`);
        
        const { data, error } = await supabase
          .from('leasers')
          .insert({
            name: leaser.name,
            logo_url: leaser.logo_url || null,
            company_id: companyId
          })
          .select()
          .single();
        
        if (error) {
          console.error(`Error inserting leaser ${leaser.name}:`, error);
          continue;
        }
        
        const leaserId = data.id;
        insertedCount++;
        console.log(`Successfully inserted leaser: ${leaser.name} with ID: ${leaserId}`);
        
        // Insert ranges for this leaser
        if (leaser.ranges && leaser.ranges.length > 0) {
          const rangesToInsert = leaser.ranges.map(range => ({
            leaser_id: leaserId,
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
            console.log(`Successfully inserted ${rangesToInsert.length} ranges for ${leaser.name}`);
          }
        }
      } catch (individualError) {
        console.error(`Error processing leaser ${leaser.name}:`, individualError);
      }
    }
    
    console.log(`=== DEFAULT LEASERS INSERTION COMPLETED ===`);
    console.log(`Total leasers inserted: ${insertedCount}`);
    
    return insertedCount > 0;
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
