import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GetAmbassadorCompanyRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { token }: GetAmbassadorCompanyRequest = await req.json();

    if (!token) {
      console.error('❌ get-ambassador-company: No token provided');
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔍 get-ambassador-company: Validating token:', token);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the custom token
    const { data: tokenData, error: tokenError } = await supabase
      .from('custom_auth_tokens')
      .select('*')
      .eq('token', token)
      .in('token_type', ['password_reset', 'invitation'])
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.error('❌ get-ambassador-company: Invalid or expired token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ get-ambassador-company: Token validated:', tokenData.id);

    // Extract entity_id from metadata
    const entityId = tokenData.metadata?.entity_id;
    if (!entityId) {
      console.error('❌ get-ambassador-company: No entity_id in token metadata');
      return new Response(
        JSON.stringify({ error: 'No entity_id found in token' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🎯 get-ambassador-company: Found entity_id:', entityId);

    // Get ambassador's company_id using service role
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('company_id')
      .eq('id', entityId)
      .single();

    if (ambassadorError || !ambassadorData) {
      console.error('❌ get-ambassador-company: Ambassador not found:', ambassadorError);
      return new Response(
        JSON.stringify({ error: 'Ambassador not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🏢 get-ambassador-company: Found company_id:', ambassadorData.company_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        company_id: ambassadorData.company_id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 get-ambassador-company: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);