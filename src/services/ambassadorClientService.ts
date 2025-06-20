
import { getCurrentAmbassadorProfile } from "./ambassador/ambassadorProfile";
import { getAmbassadorClients, deleteAmbassadorClient } from "./ambassador/ambassadorClients";
import { linkClientToAmbassador, updateAmbassadorClientCount, createClientAsAmbassadorDb } from "./ambassador/ambassadorOperations";

// Re-export all functions to maintain compatibility
export {
  getCurrentAmbassadorProfile,
  getAmbassadorClients,
  linkClientToAmbassador,
  updateAmbassadorClientCount,
  createClientAsAmbassadorDb,
  deleteAmbassadorClient
};
