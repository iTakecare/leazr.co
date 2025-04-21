
// Create this file if it doesn't exist already
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://cifbetjefyfocafanlhv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw';

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Export URLs and keys for direct access when needed
export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_KEY = supabaseKey;
export const STORAGE_URL = `${supabaseUrl}/storage/v1`;

// Admin client function - implement if needed with service role key
export const getAdminSupabaseClient = () => supabase;

