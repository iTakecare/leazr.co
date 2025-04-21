
import { supabase, getAdminSupabaseClient, SERVICE_ROLE_KEY, SUPABASE_URL, getSupabaseClient } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

/**
 * Tests if client creation permissions are properly configured
 */
export const testClientCreationPermission = async (): Promise<{success: boolean; message?: string; clientId?: string}> => {
  try {
    console.log("Testing client creation...");
    const testId = uuidv4();
    const testEmail = `test-${testId.substring(0, 8)}@test.com`;
    
    // Check if service key is defined
    if (!SERVICE_ROLE_KEY) {
      return { 
        success: false, 
        message: "SERVICE_ROLE_KEY is not defined or is empty" 
      };
    }
    
    console.log("[TEST] Creating admin client for testing...");
    
    // Get a new admin client instance
    const adminClient = getAdminSupabaseClient();
    
    // Test data for client
    const testClientData = {
      id: testId,
      name: "Test Client",
      email: testEmail,
      company: "Test Company",
      phone: "+32000000000",
      address: "Test Street 123",
      city: "Test City",
      postal_code: "1000",
      country: "BE",
      vat_number: "BE0123456789",
      status: "active" as const
    };
    
    console.log("[TEST] Attempting insertion with admin client...");
    
    try {
      // Test insertion with admin client
      const { data, error } = await adminClient
        .from('clients')
        .insert(testClientData)
        .select()
        .single();
      
      if (error) {
        console.error("[TEST] Error testing client creation:", error);
        return { 
          success: false, 
          message: `Error: ${error.message} (Code: ${error.code})` 
        };
      }
      
      console.log("[TEST] Client creation test successful");
      return { success: true, clientId: testId };
    } catch (insertError) {
      console.error("[TEST] Exception during test client insertion:", insertError);
      return { 
        success: false, 
        message: insertError instanceof Error 
          ? `Exception: ${insertError.message}` 
          : 'Unknown error during insertion' 
      };
    }
  } catch (error) {
    console.error("[TEST] Global exception during client creation test:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Specifically tests admin client configuration
 */
export const testAdminClientConfiguration = async (): Promise<{success: boolean; message: string}> => {
  try {
    console.log("[TEST] Testing admin client configuration...");
    
    // Check if service key is defined and valid
    if (!SERVICE_ROLE_KEY) {
      return { 
        success: false, 
        message: "Service key (SERVICE_ROLE_KEY) is empty or undefined" 
      };
    }
    
    if (SERVICE_ROLE_KEY.length < 30) {
      return {
        success: false,
        message: "Service key appears invalid (too short)"
      };
    }
    
    // Get admin client
    const adminClient = getAdminSupabaseClient();
    
    // Basic connection test
    console.log("[TEST] Testing connection with admin client...");
    
    // Simple selection test
    try {
      const { data, error } = await adminClient
        .from('clients')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error("[TEST] Connection test failed:", error);
        return { 
          success: false, 
          message: `Connection error: ${error.message}` 
        };
      }
      
      console.log("[TEST] Connection test successful");
      return { 
        success: true, 
        message: "Admin client configuration is correct" 
      };
    } catch (testError) {
      console.error("[TEST] Exception during test:", testError);
      return { 
        success: false, 
        message: `Exception: ${testError instanceof Error ? testError.message : 'Unknown error'}` 
      };
    }
  } catch (error) {
    console.error("[TEST] Global exception:", error);
    return { 
      success: false, 
      message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

/**
 * Explicitly tests offer retrieval
 */
export const testOffersRetrieval = async (): Promise<{success: boolean; message: string; data?: any}> => {
  try {
    console.log("[TEST] Testing offer retrieval...");
    
    // Get admin client
    const adminClient = getAdminSupabaseClient();
    
    // Test offer retrieval
    try {
      const { data, error } = await adminClient
        .from('offers')
        .select('id, client_name, created_at')
        .limit(5);
      
      if (error) {
        console.error("[TEST] Error retrieving offers:", error);
        return {
          success: false,
          message: `Error: ${error.message}`
        };
      }
      
      console.log("[TEST] Offer retrieval successful:", data?.length || 0, "offers");
      return {
        success: true,
        message: `${data?.length || 0} offers successfully retrieved`,
        data: data
      };
    } catch (retrievalError) {
      console.error("[TEST] Exception during retrieval:", retrievalError);
      return {
        success: false,
        message: `Exception: ${retrievalError instanceof Error ? retrievalError.message : 'Unknown error'}`
      };
    }
  } catch (error) {
    console.error("[TEST] Global exception:", error);
    return {
      success: false,
      message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
