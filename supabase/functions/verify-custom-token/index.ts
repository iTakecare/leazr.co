import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { createErrorResponse, sanitizeError } from '../_shared/errorHandler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenVerificationRequest {
  token: string;
  type?: string;
}

interface TokenData {
  id: string;
  token: string;
  token_type: string;
  user_email: string;
  expires_at: string;
  used_at: string | null;
  metadata: any;
  company_id: string;
}

export default async function handler(req: Request) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, type }: TokenVerificationRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role for database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Verifying token:', { token: token.substring(0, 8) + '...', type });

    // Query the custom_auth_tokens table
    const { data: tokenData, error } = await supabase
      .from('custom_auth_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      console.error('[INTERNAL] Database error:', error.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token not found or expired'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!tokenData) {
      console.log('No token data found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token not found or expired' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify token type if specified
    if (type && tokenData.token_type !== type) {
      console.log('Token type mismatch:', { expected: type, actual: tokenData.token_type });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid token type' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Token verified successfully for user:', tokenData.user_email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        token_data: {
          id: tokenData.id,
          token_type: tokenData.token_type,
          user_email: tokenData.user_email,
          expires_at: tokenData.expires_at,
          metadata: tokenData.metadata,
          company_id: tokenData.company_id
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[INTERNAL] Error in verify-custom-token function:', error);
    return createErrorResponse(error, corsHeaders);
  }
}
