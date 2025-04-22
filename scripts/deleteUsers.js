
// Script pour supprimer plusieurs utilisateurs spécifiques
import { deleteSpecificUsers } from '../src/utils/accountUtils.js';

console.log("Début de la suppression des comptes utilisateurs...");

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
