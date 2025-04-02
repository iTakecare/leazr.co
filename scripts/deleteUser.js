
// Script pour supprimer un utilisateur spécifique
import { deleteSpecificProblemUser } from '../src/utils/accountUtils.js';

console.log("Début de la suppression du compte utilisateur problématique...");

deleteSpecificProblemUser()
  .then(() => {
    console.log("Opération terminée.");
  })
  .catch((error) => {
    console.error("Erreur lors de la suppression:", error);
  });
