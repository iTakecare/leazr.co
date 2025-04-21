
// This file handles Supabase client initialization and configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Define environment constants
export const SUPABASE_URL = "https://cifbetjefyfocafanlhv.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw";
export const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.39wjC_Ld_qXnExyLgCawiip5hBDfCY6Hkb1rktomIxk";

// Create a public global client
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/**
 * Creates a fresh instance of Supabase client with service_role key
 * IMPORTANT: This function creates A NEW INSTANCE each time it's called
 */
export const getAdminSupabaseClient = () => {
  return createClient<Database>(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
};

// For backward compatibility (if any code is still using getSupabaseClient)
export const getSupabaseClient = getAdminSupabaseClient;

// Export storage URL and key as constants
export const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;
export const SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY;
