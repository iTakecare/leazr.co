
// Script pour supprimer plusieurs utilisateurs spécifiques
import { deleteSpecificUsers } from '../src/utils/accountUtils.js';

console.log("Début de la suppression des comptes utilisateurs...");

deleteSpecificUsers()
  .then(() => {
    console.log("Opération terminée.");
  })
  .catch((error) => {
    console.error("Erreur lors de la suppression:", error);
  });
