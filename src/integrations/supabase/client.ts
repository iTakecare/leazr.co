
// This file handles Supabase client initialization and configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Définition des constantes d'environnement
export const SUPABASE_URL = "https://cifbetjefyfocafanlhv.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw";
export const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.39wjC_Ld_qXnExyLgCawiip5hBDfCY6Hkb1rktomIxk";

// Client public global
const supabaseClient = createClient<Database>(
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

export const supabase = supabaseClient;

/**
 * Obtient une instance fraîche du client Supabase avec la clé service_role
 * IMPORTANT: Cette fonction crée UNE NOUVELLE INSTANCE à chaque appel
 */
export const getAdminSupabaseClient = () => {
  // Créer une nouvelle instance avec la clé service_role
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

// Exporter l'URL et la clé de stockage comme constantes
export const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;
export const SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY;
