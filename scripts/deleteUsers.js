
// Script pour supprimer plusieurs utilisateurs spécifiques
import { deleteSpecificUsers } from '../src/utils/accountUtils.js';

console.log("Début de la suppression des comptes utilisateurs...");
console.log("Cette opération va tenter de supprimer les utilisateurs listés dans accountUtils.ts");
console.log("Utilisé principalement pour nettoyer les comptes problématiques ou de test");

// Exécuter la fonction de suppression des utilisateurs
deleteSpecificUsers()
  .then(() => {
    console.log("Opération terminée avec succès.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erreur lors de la suppression:", error);
    process.exit(1);
  });
