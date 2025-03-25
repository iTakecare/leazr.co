
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { table_name, column_name } = await req.json();
    
    if (!table_name || !column_name) {
      return new Response(
        JSON.stringify({ error: "Missing table_name or column_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Direct query to check if column exists in table
    const { data, error } = await supabaseClient
      .rpc('execute_sql', { 
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${table_name}' 
          AND column_name = '${column_name}'
        `
      });
    
    if (error) {
      console.error("Error checking column:", error);
      // Fallback direct query if RPC is not available
      const { data: directData, error: directError } = await supabaseClient
        .from('products')
        .select(`${column_name}`)
        .limit(1);
      
      if (directError && directError.message.includes("column")) {
        return new Response(
          JSON.stringify({ exists: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ exists: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    const columnExists = (data && data.length > 0);
    
    return new Response(
      JSON.stringify({ exists: columnExists }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message, exists: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
