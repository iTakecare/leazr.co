
import { supabase } from "@/integrations/supabase/client";
import { Leaser } from "@/types/equipment";
import { toast } from "sonner";
import { defaultLeasers } from "@/data/leasers";
import { validate as isUUID } from 'uuid';

// Cache pour les leasers
let leasersCache: Leaser[] | null = null;
let lastFetchTime = 0;
const CACHE_EXPIRY = 1000 * 60 * 5; // 5 minutes
const FETCH_TIMEOUT = 10000; // 10 secondes

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
    // Utiliser Promise.race pour implémenter le timeout
    const leasersPromise = supabase
      .from("leasers")
      .select("*")
      .order("name");
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Fetch leasers timed out after ${FETCH_TIMEOUT}ms`)), FETCH_TIMEOUT);
    });
    
    const result = await Promise.race([leasersPromise, timeoutPromise]);
    const { data: leasers, error } = result as any;
    
    if (error) throw error;

    // Pour chaque leaser, récupérer ses tranches de manière parallèle
    const leasersWithRanges = await Promise.all(
      leasers.map(async (leaser: any) => {
        try {
          // Requête pour récupérer les ranges
          const { data: ranges, error: rangesError } = await supabase
            .from("leaser_ranges")
            .select("*")
            .eq("leaser_id", leaser.id)
            .order("min");
          
          if (rangesError) throw rangesError;

          // Convertir les ranges au format attendu
          const formattedRanges = ranges.map((range: any) => ({
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
        } catch (error) {
          console.error(`Error fetching ranges for ${leaser.name}:`, error);
          return {
            ...leaser,
            ranges: []
          };
        }
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

    // Vider le cache pour forcer un rechargement
    clearLeasersCache();
    
    toast.success("Leaser ajouté avec succès");
    
    // Récupérer le leaser complet avec ses tranches
    return {
      ...newLeaser,
      ranges: leaser.ranges
    };
  } catch (error: any) {
    console.error("Erreur lors de l'ajout du leaser:", error);
    toast.error(`Erreur lors de l'ajout du leaser: ${error.message}`);
    return null;
  }
};

/**
 * Met à jour un leaser existant
 */
export const updateLeaser = async (id: string, leaser: Partial<Leaser>): Promise<boolean> => {
  try {
    // Vérifier que l'ID est un UUID valide
    if (!isUUID(id)) {
      throw new Error(`ID invalide: ${id} - doit être un UUID valide`);
    }
    
    // Log détaillé de la mise à jour pour débogage
    console.log("Mise à jour du leaser avec ID (UUID validé):", id);
    console.log("Données de mise à jour:", JSON.stringify(leaser, null, 2));
    
    // Préparer les données à mettre à jour (uniquement le nom et le logo)
    const updateData: any = {};
    if (leaser.name !== undefined) updateData.name = leaser.name;
    if (leaser.logo_url !== undefined) updateData.logo_url = leaser.logo_url;
    
    // Mettre à jour le leaser seulement si on a des données à mettre à jour
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("leasers")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    }

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
    console.error("Erreur lors de la mise à jour du leaser:", error);
    toast.error(`Erreur lors de la mise à jour du leaser: ${error.message}`);
    return false;
  }
};

/**
 * Supprime un leaser
 */
export const deleteLeaser = async (id: string): Promise<boolean> => {
  try {
    // Vérifier que l'ID est un UUID valide
    if (!isUUID(id)) {
      throw new Error(`ID invalide: ${id} - doit être un UUID valide`);
    }
    
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
    console.error("Erreur lors de la suppression du leaser:", error);
    toast.error(`Erreur lors de la suppression du leaser: ${error.message}`);
    return false;
  }
};
