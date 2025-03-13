
import { supabase } from "@/integrations/supabase/client";
import { Leaser } from "@/types/equipment";
import { toast } from "sonner";
import { defaultLeasers } from "@/data/leasers";

// Cache pour les leasers
let leasersCache: Leaser[] | null = null;
let lastFetchTime = 0;
const CACHE_EXPIRY = 1000 * 60 * 5; // 5 minutes

/**
 * Récupère tous les leasers de la base de données avec gestion de cache
 */
export const getLeasers = async (): Promise<Leaser[]> => {
  const now = Date.now();
  
  // Utiliser le cache si disponible et pas expiré
  if (leasersCache && now - lastFetchTime < CACHE_EXPIRY) {
    return leasersCache;
  }
  
  try {
    // Récupérer tous les leasers
    const { data: leasers, error } = await supabase
      .from("leasers")
      .select("*")
      .order("name")
      .timeout(3000); // 3 secondes maximum

    if (error) throw error;

    // Pour chaque leaser, récupérer ses tranches
    const leasersWithRanges = await Promise.all(
      leasers.map(async (leaser) => {
        const { data: ranges, error: rangesError } = await supabase
          .from("leaser_ranges")
          .select("*")
          .eq("leaser_id", leaser.id)
          .order("min")
          .timeout(3000);

        if (rangesError) {
          console.error(`Erreur lors de la récupération des tranches pour ${leaser.name}:`, rangesError);
          return {
            ...leaser,
            ranges: []
          };
        }

        // Convertir les ranges au format attendu
        const formattedRanges = ranges.map(range => ({
          id: range.id,
          min: range.min,
          max: range.max,
          coefficient: range.coefficient
        }));

        return {
          id: leaser.id,
          name: leaser.name,
          logo_url: leaser.logo_url,
          ranges: formattedRanges
        };
      })
    );

    // Mettre à jour le cache
    leasersCache = leasersWithRanges;
    lastFetchTime = now;

    return leasersWithRanges;
  } catch (error: any) {
    console.error("Error fetching leasers:", error);
    
    // Si leasersCache existe, retourner le cache même s'il est expiré
    if (leasersCache) {
      return leasersCache;
    }
    
    // Sinon, retourner les leasers par défaut
    return defaultLeasers;
  }
};

// Fonction pour vider le cache
export const clearLeasersCache = () => {
  leasersCache = null;
  lastFetchTime = 0;
};

/**
 * Ajoute un nouveau leaser
 */
export const addLeaser = async (leaser: Omit<Leaser, "id">): Promise<Leaser | null> => {
  try {
    // Insérer le leaser
    const { data: newLeaser, error } = await supabase
      .from("leasers")
      .insert({
        name: leaser.name,
        logo_url: leaser.logo_url
      })
      .select()
      .single();

    if (error) throw error;

    // Insérer les tranches
    if (leaser.ranges && leaser.ranges.length > 0) {
      const rangesToInsert = leaser.ranges.map(range => ({
        leaser_id: newLeaser.id,
        min: range.min,
        max: range.max,
        coefficient: range.coefficient
      }));

      const { error: rangesError } = await supabase
        .from("leaser_ranges")
        .insert(rangesToInsert);

      if (rangesError) throw rangesError;
    }

    toast.success("Leaser ajouté avec succès");
    
    // Vider le cache pour forcer un rechargement
    clearLeasersCache();
    
    // Récupérer le leaser complet avec ses tranches
    return {
      ...newLeaser,
      ranges: leaser.ranges
    };
  } catch (error: any) {
    toast.error(`Erreur lors de l'ajout du leaser: ${error.message}`);
    return null;
  }
};

/**
 * Met à jour un leaser existant
 */
export const updateLeaser = async (id: string, leaser: Partial<Leaser>): Promise<boolean> => {
  try {
    // Mettre à jour le leaser
    const { error } = await supabase
      .from("leasers")
      .update({
        name: leaser.name,
        logo_url: leaser.logo_url
      })
      .eq("id", id);

    if (error) throw error;

    // Si des tranches sont fournies, les mettre à jour
    if (leaser.ranges) {
      // Supprimer les anciennes tranches
      const { error: deleteError } = await supabase
        .from("leaser_ranges")
        .delete()
        .eq("leaser_id", id);

      if (deleteError) throw deleteError;

      // Ajouter les nouvelles tranches
      if (leaser.ranges.length > 0) {
        const rangesToInsert = leaser.ranges.map(range => ({
          leaser_id: id,
          min: range.min,
          max: range.max,
          coefficient: range.coefficient
        }));

        const { error: insertError } = await supabase
          .from("leaser_ranges")
          .insert(rangesToInsert);

        if (insertError) throw insertError;
      }
    }

    // Vider le cache pour forcer un rechargement
    clearLeasersCache();
    
    toast.success("Leaser mis à jour avec succès");
    return true;
  } catch (error: any) {
    toast.error(`Erreur lors de la mise à jour du leaser: ${error.message}`);
    return false;
  }
};

/**
 * Supprime un leaser
 */
export const deleteLeaser = async (id: string): Promise<boolean> => {
  try {
    // Supprimer d'abord les tranches (contraintes de clés étrangères)
    const { error: rangesError } = await supabase
      .from("leaser_ranges")
      .delete()
      .eq("leaser_id", id);

    if (rangesError) throw rangesError;

    // Puis supprimer le leaser
    const { error } = await supabase
      .from("leasers")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // Vider le cache pour forcer un rechargement
    clearLeasersCache();
    
    toast.success("Leaser supprimé avec succès");
    return true;
  } catch (error: any) {
    toast.error(`Erreur lors de la suppression du leaser: ${error.message}`);
    return false;
  }
};
