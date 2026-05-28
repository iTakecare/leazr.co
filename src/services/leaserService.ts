
import { supabase } from '@/integrations/supabase/client';
import { Leaser } from '@/types/equipment';
import { defaultLeasers } from '@/data/leasers';
import { toast } from 'sonner';
import { getCurrentUserCompanyId } from '@/services/multiTenantService';
import { checkDataIsolation } from '@/utils/crmCacheUtils';

/**
 * Récupère la liste des leasers depuis la base de données
 * @returns Array de leasers
 */
export const getLeasers = async (): Promise<Leaser[]> => {
  try {
    // Récupérer le company_id de l'utilisateur pour le filtrage
    const userCompanyId = await getCurrentUserCompanyId();
    
    const { data, error } = await supabase
      .from('leasers')
      .select(`
        id, 
        name,
        company_name,
        logo_url,
        address,
        city,
        postal_code,
        country,
        vat_number,
        phone,
        email,
        available_durations,
        use_duration_coefficients,
        is_own_company,
        residual_value_percentage,
        ranges:leaser_ranges(
          id,
          min,
          max,
          coefficient,
          duration_coefficients:leaser_duration_coefficients(
            duration_months,
            coefficient
          )
        )
      `)
      .eq('company_id', userCompanyId)
      .order('name');
    
    if (error) {
      console.error('Error loading leasers from database:', error);
      toast.error(`Erreur de base de données: ${error.message}`);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No leasers found in database for this company');
      return [];
    }
    
    // Vérification d'isolation déjà effectuée par le filtre .eq('company_id', userCompanyId)
    
    // Transformer les données de la base de données au format attendu par l'application
    const formattedLeasers: (Leaser & { use_duration_coefficients?: boolean; is_own_company?: boolean })[] = data.map((leaser) => ({
      id: leaser.id,
      name: leaser.name,
      company_name: leaser.company_name,
      logo_url: leaser.logo_url,
      address: leaser.address,
      city: leaser.city,
      postal_code: leaser.postal_code,
      country: leaser.country,
      vat_number: leaser.vat_number,
      phone: leaser.phone,
      email: leaser.email,
      available_durations: leaser.available_durations || [12,18,24,36,48,60,72],
      use_duration_coefficients: leaser.use_duration_coefficients || false,
      is_own_company: leaser.is_own_company || false,
      residual_value_percentage: leaser.residual_value_percentage ?? 3,
      ranges: (leaser.ranges || []).sort((a: any, b: any) => a.min - b.min)
    }));
    
    console.log(`Loaded ${formattedLeasers.length} leasers from database:`, formattedLeasers);
    
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
    // Récupérer le company_id de l'utilisateur pour le filtrage
    const userCompanyId = await getCurrentUserCompanyId();
    
    const { data, error } = await supabase
      .from('leasers')
      .select(`
        id, 
        name,
        company_name,
        logo_url,
        address,
        city,
        postal_code,
        country,
        vat_number,
        phone,
        email,
        available_durations,
        use_duration_coefficients,
        is_own_company,
        residual_value_percentage,
        ranges:leaser_ranges(
          id,
          min,
          max,
          coefficient,
          duration_coefficients:leaser_duration_coefficients(
            duration_months,
            coefficient
          )
        )
      `)
      .eq('company_id', userCompanyId)
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
      company_name: data.company_name,
      logo_url: data.logo_url,
      address: data.address,
      city: data.city,
      postal_code: data.postal_code,
      country: data.country,
      vat_number: data.vat_number,
      phone: data.phone,
      email: data.email,
      available_durations: data.available_durations || [12,18,24,36,48,60,72],
      use_duration_coefficients: data.use_duration_coefficients || false,
      is_own_company: data.is_own_company || false,
      residual_value_percentage: data.residual_value_percentage ?? 3,
      ranges: data.ranges.sort((a: any, b: any) => a.min - b.min)
    } as Leaser & { use_duration_coefficients?: boolean; is_own_company?: boolean };
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
    // Utiliser la fonction sécurisée existante pour récupérer le company_id
    const companyId = await getCurrentUserCompanyId();
    
    console.log("🏢 createLeaser - Company ID récupéré:", companyId);
    
    if (!companyId) {
      throw new Error("Impossible de déterminer votre entreprise. Veuillez vous reconnecter.");
    }

    const { data, error } = await supabase
      .from('leasers')
      .insert({
        name: leaser.name,
        company_name: leaser.company_name || null,
        logo_url: leaser.logo_url || null,
        address: leaser.address || null,
        city: leaser.city || null,
        postal_code: leaser.postal_code || null,
        country: leaser.country || null,
        vat_number: leaser.vat_number || null,
        phone: leaser.phone || null,
        email: leaser.email || null,
        available_durations: leaser.available_durations || [12, 18, 24, 36, 48, 60, 72],
        use_duration_coefficients: (leaser as any).use_duration_coefficients || false,
        is_own_company: (leaser as any).is_own_company || false,
        residual_value_percentage: leaser.residual_value_percentage ?? 3,
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
      
      console.log("📊 createLeaser - Tranches à insérer:", rangesToInsert);
      
      const { data: insertedRanges, error: rangeError } = await supabase
        .from('leaser_ranges')
        .insert(rangesToInsert)
        .select('id');
        
      if (rangeError) {
        console.error('Error adding ranges:', rangeError);
        toast.error("Le leaser a été créé mais les tranches n'ont pas pu être ajoutées");
      } else if (insertedRanges && insertedRanges.length > 0) {
        // Insérer les duration_coefficients
        const durationCoeffsToInsert: any[] = [];
        
        leaser.ranges.forEach((range, index) => {
          if (range.duration_coefficients && range.duration_coefficients.length > 0) {
            const rangeId = insertedRanges[index]?.id;
            if (rangeId) {
              range.duration_coefficients.forEach(dc => {
                durationCoeffsToInsert.push({
                  leaser_range_id: rangeId,
                  duration_months: dc.duration_months,
                  coefficient: dc.coefficient
                });
              });
            }
          }
        });
        
        if (durationCoeffsToInsert.length > 0) {
          console.log("📊 createLeaser - Duration coefficients à insérer:", durationCoeffsToInsert);
          
          const { error: durationError } = await supabase
            .from('leaser_duration_coefficients')
            .insert(durationCoeffsToInsert);
            
          if (durationError) {
            console.error('Error adding duration coefficients:', durationError);
            toast.error("Les tranches ont été créées mais les coefficients par durée n'ont pas pu être ajoutés");
          }
        }
      }
    }
    
    // Récupérer le leaser complet pour le renvoyer
    try {
      const fullLeaser = await getLeaserById(data.id);
      if (fullLeaser) return fullLeaser;
      console.warn('getLeaserById returned null, using inserted row fallback');
    } catch (e) {
      console.warn('getLeaserById failed, using inserted row fallback', e);
    }
    
    // Fallback: retourner les données insérées même si getLeaserById échoue
    return {
      id: data.id,
      name: data.name,
      company_name: data.company_name ?? undefined,
      logo_url: data.logo_url ?? undefined,
      address: data.address ?? undefined,
      city: data.city ?? undefined,
      postal_code: data.postal_code ?? undefined,
      country: data.country ?? undefined,
      vat_number: data.vat_number ?? undefined,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
      available_durations: data.available_durations ?? [12,18,24,36,48,60,72],
      use_duration_coefficients: (data as any).use_duration_coefficients ?? false,
      is_own_company: (data as any).is_own_company ?? false,
      residual_value_percentage: (data as any).residual_value_percentage ?? 3,
      ranges: []
    } as Leaser & { use_duration_coefficients?: boolean; is_own_company?: boolean };
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
        company_name: leaser.company_name || null,
        logo_url: leaser.logo_url || null,
        address: leaser.address || null,
        city: leaser.city || null,
        postal_code: leaser.postal_code || null,
        country: leaser.country || null,
        vat_number: leaser.vat_number || null,
        phone: leaser.phone || null,
        email: leaser.email || null,
        available_durations: leaser.available_durations || [12, 18, 24, 36, 48, 60, 72],
        use_duration_coefficients: (leaser as any).use_duration_coefficients || false,
        is_own_company: (leaser as any).is_own_company || false,
        residual_value_percentage: leaser.residual_value_percentage ?? 3
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
      
      const { data: insertedRanges, error: rangeError } = await supabase
        .from('leaser_ranges')
        .insert(rangesToInsert)
        .select('id');
        
      if (rangeError) {
        console.error('Error adding new ranges:', rangeError);
        toast.error("Les informations du leaser ont été mises à jour, mais pas les tranches");
        return false;
      }
      
      // Insérer les duration_coefficients
      if (insertedRanges && insertedRanges.length > 0) {
        const durationCoeffsToInsert: any[] = [];
        
        leaser.ranges.forEach((range, index) => {
          if (range.duration_coefficients && range.duration_coefficients.length > 0) {
            const rangeId = insertedRanges[index]?.id;
            if (rangeId) {
              range.duration_coefficients.forEach(dc => {
                durationCoeffsToInsert.push({
                  leaser_range_id: rangeId,
                  duration_months: dc.duration_months,
                  coefficient: dc.coefficient
                });
              });
            }
          }
        });
        
        if (durationCoeffsToInsert.length > 0) {
          console.log("📊 updateLeaser - Duration coefficients à insérer:", durationCoeffsToInsert);
          
          const { error: durationError } = await supabase
            .from('leaser_duration_coefficients')
            .insert(durationCoeffsToInsert);
            
          if (durationError) {
            console.error('Error adding duration coefficients:', durationError);
            toast.error("Les tranches ont été mises à jour mais les coefficients par durée n'ont pas pu être ajoutés");
          }
        }
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
 * Duplique un leaser existant
 * @param id ID du leaser à dupliquer
 * @returns Le leaser dupliqué ou null en cas d'erreur
 */
export const duplicateLeaser = async (id: string): Promise<Leaser | null> => {
  try {
    // Récupérer le leaser complet avec ses ranges et duration_coefficients
    const sourceLeaser = await getLeaserById(id);
    if (!sourceLeaser) {
      toast.error("Leaser source introuvable");
      return null;
    }
    
    // Créer un nouveau leaser avec nom "(Copie)"
    const duplicatedLeaserData: Omit<Leaser, 'id'> = {
      name: `${sourceLeaser.name} (Copie)`,
      company_name: sourceLeaser.company_name,
      logo_url: sourceLeaser.logo_url,
      address: sourceLeaser.address,
      city: sourceLeaser.city,
      postal_code: sourceLeaser.postal_code,
      country: sourceLeaser.country,
      vat_number: sourceLeaser.vat_number,
      phone: sourceLeaser.phone,
      email: sourceLeaser.email,
      available_durations: sourceLeaser.available_durations,
      residual_value_percentage: sourceLeaser.residual_value_percentage ?? 3,
      ranges: sourceLeaser.ranges.map(range => ({
        ...range,
        id: undefined // Remove ID so new ones are created
      }))
    };
    
    // Ajouter use_duration_coefficients et is_own_company si présents
    if ((sourceLeaser as any).use_duration_coefficients !== undefined) {
      (duplicatedLeaserData as any).use_duration_coefficients = (sourceLeaser as any).use_duration_coefficients;
    }
    if ((sourceLeaser as any).is_own_company !== undefined) {
      (duplicatedLeaserData as any).is_own_company = (sourceLeaser as any).is_own_company;
    }
    
    // Utiliser createLeaser qui gère déjà les ranges et duration_coefficients
    const duplicated = await createLeaser(duplicatedLeaserData);
    
    if (duplicated) {
      toast.success(`Leaser "${sourceLeaser.name}" dupliqué avec succès`);
    }
    
    return duplicated;
  } catch (error) {
    console.error('Exception during leaser duplication:', error);
    toast.error("Erreur lors de la duplication du leaser");
    return null;
  }
};

export default {
  getLeasers,
  getLeaserById,
  createLeaser,
  addLeaser,
  updateLeaser,
  deleteLeaser,
  duplicateLeaser
};
