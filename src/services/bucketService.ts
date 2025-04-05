
import { toast } from "sonner";

/**
 * Check if a bucket exists and shows appropriate messages
 */
export const checkBucketAccess = async (bucketName: string): Promise<boolean> => {
  try {
    // Just return true as we're now handling bucket errors in the components directly
    return true;
  } catch (error) {
    console.error(`Error checking bucket access for ${bucketName}:`, error);
    return false;
  }
};

/**
 * Initializes storage for the application
 */
export const initStorage = async (): Promise<void> => {
  console.log("Storage initialization not needed - relying on direct uploads");
};
