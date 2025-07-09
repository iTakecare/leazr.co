import { supabase } from "@/integrations/supabase/client";

export interface IsolationDiagnostic {
  table_name: string;
  user_company_data_count: number;
  other_company_data_count: number;
  isolation_status: 'GOOD' | 'LEAK' | 'ERROR';
}

export interface CleanupResult {
  success: boolean;
  diagnostics: IsolationDiagnostic[];
  cleaned: boolean;
  message: string;
}

/**
 * Service pour diagnostiquer et nettoyer l'isolation des données
 */
export class DataIsolationCleanupService {
  
  /**
   * Diagnostiquer l'état de l'isolation des données
   */
  static async diagnoseDataIsolation(): Promise<IsolationDiagnostic[]> {
    try {
      console.log("🔍 DIAGNOSTIC - Début du diagnostic d'isolation des données");
      
      const { data, error } = await supabase.rpc('diagnose_data_isolation');
      
      if (error) {
        console.error("🔍 DIAGNOSTIC - Erreur:", error);
        throw error;
      }
      
      console.log("🔍 DIAGNOSTIC - Résultats:", data);
      return data || [];
    } catch (error) {
      console.error('Erreur lors du diagnostic d\'isolation:', error);
      return [];
    }
  }
  
  /**
   * Nettoyer les données d'isolation
   */
  static async cleanupDataIsolation(): Promise<boolean> {
    try {
      console.log("🧹 CLEANUP - Début du nettoyage des données");
      
      const { data, error } = await supabase.rpc('cleanup_company_data_isolation');
      
      if (error) {
        console.error("🧹 CLEANUP - Erreur:", error);
        throw error;
      }
      
      console.log("🧹 CLEANUP - Résultat:", data);
      return data === true;
    } catch (error) {
      console.error('Erreur lors du nettoyage d\'isolation:', error);
      return false;
    }
  }
  
  /**
   * Effectuer un diagnostic complet et nettoyer si nécessaire
   */
  static async performFullIsolationCheck(): Promise<CleanupResult> {
    try {
      console.log("🔧 FULL CHECK - Début du contrôle complet d'isolation");
      
      // 1. Diagnostiquer d'abord
      const diagnostics = await this.diagnoseDataIsolation();
      
      // 2. Vérifier s'il y a des fuites de données
      const hasLeaks = diagnostics.some(d => d.isolation_status === 'LEAK');
      
      if (!hasLeaks) {
        console.log("🔧 FULL CHECK - Aucune fuite détectée, isolation OK");
        return {
          success: true,
          diagnostics,
          cleaned: false,
          message: "L'isolation des données est correcte"
        };
      }
      
      console.log("🔧 FULL CHECK - Fuites détectées, nettoyage en cours...");
      
      // 3. Nettoyer les données
      const cleanupSuccess = await this.cleanupDataIsolation();
      
      if (!cleanupSuccess) {
        return {
          success: false,
          diagnostics,
          cleaned: false,
          message: "Échec du nettoyage des données"
        };
      }
      
      // 4. Re-diagnostiquer après nettoyage
      const postCleanupDiagnostics = await this.diagnoseDataIsolation();
      
      console.log("🔧 FULL CHECK - Nettoyage terminé, nouvelle vérification:", postCleanupDiagnostics);
      
      return {
        success: true,
        diagnostics: postCleanupDiagnostics,
        cleaned: true,
        message: "Données nettoyées et isolation restaurée"
      };
      
    } catch (error) {
      console.error('Erreur lors du contrôle d\'isolation complet:', error);
      return {
        success: false,
        diagnostics: [],
        cleaned: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }
  
  /**
   * Vérifier et nettoyer automatiquement les données à la connexion
   */
  static async autoCleanupOnLogin(): Promise<void> {
    try {
      console.log("🚀 AUTO CLEANUP - Nettoyage automatique au login");
      
      // Attendre un peu pour que l'authentification soit complète
      setTimeout(async () => {
        const result = await this.performFullIsolationCheck();
        
        if (result.cleaned) {
          console.log("🚀 AUTO CLEANUP - Données nettoyées automatiquement");
        } else if (result.success) {
          console.log("🚀 AUTO CLEANUP - Isolation OK, aucun nettoyage nécessaire");
        } else {
          console.warn("🚀 AUTO CLEANUP - Problème détecté mais non résolu:", result.message);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors du nettoyage automatique:', error);
    }
  }
}

export default DataIsolationCleanupService;