import { Client } from "@/types/client";
import { mergeClients } from "@/utils/clientDiagnostics";
import { toast } from "sonner";

export interface MergeOperation {
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
}

export interface BulkMergeResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ operation: MergeOperation; error: string }>;
}

/**
 * Fusionne plusieurs paires de clients en une seule opération
 */
export const bulkMergeClients = async (
  operations: MergeOperation[]
): Promise<BulkMergeResult> => {
  console.log(`🔄 Démarrage de la fusion en masse de ${operations.length} paires...`);
  
  const result: BulkMergeResult = {
    total: operations.length,
    success: 0,
    failed: 0,
    errors: []
  };

  for (const operation of operations) {
    try {
      console.log(`📍 Fusion: "${operation.sourceName}" → "${operation.targetName}"`);
      
      await mergeClients(operation.sourceId, operation.targetId);
      
      result.success++;
      console.log(`✅ Fusion réussie (${result.success}/${operations.length})`);
      
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      
      console.error(`❌ Échec de la fusion:`, errorMessage);
      
      result.errors.push({
        operation,
        error: errorMessage
      });
    }
  }

  // Résumé final
  console.log(`\n🏁 Fusion terminée:`);
  console.log(`   ✅ Réussies: ${result.success}`);
  console.log(`   ❌ Échouées: ${result.failed}`);
  
  if (result.success > 0) {
    toast.success(`${result.success} fusion(s) réussie(s)`);
  }
  
  if (result.failed > 0) {
    toast.error(`${result.failed} fusion(s) échouée(s)`);
  }

  return result;
};

/**
 * Prépare les opérations de fusion à partir de groupes de doublons
 * Sélectionne automatiquement le "meilleur" client comme cible
 */
export const prepareMergeOperations = (
  duplicateGroups: Array<{ clients: Client[]; confidence: number }>
): MergeOperation[] => {
  const operations: MergeOperation[] = [];

  for (const group of duplicateGroups) {
    if (group.clients.length < 2) continue;

    // Choisir le meilleur client comme cible (celui avec le plus de données)
    const sortedClients = [...group.clients].sort((a, b) => {
      // Priorité 1: Celui qui a un compte utilisateur
      if (a.has_user_account && !b.has_user_account) return -1;
      if (!a.has_user_account && b.has_user_account) return 1;
      
      // Priorité 2: Celui avec le plus de champs remplis
      const scoreA = [a.email, a.phone, a.address, a.company].filter(Boolean).length;
      const scoreB = [b.email, b.phone, b.address, b.company].filter(Boolean).length;
      return scoreB - scoreA;
    });

    const target = sortedClients[0];
    const sources = sortedClients.slice(1);

    // Créer une opération de fusion pour chaque doublon vers la cible
    for (const source of sources) {
      operations.push({
        sourceId: source.id,
        targetId: target.id,
        sourceName: source.name,
        targetName: target.name
      });
    }
  }

  return operations;
};
