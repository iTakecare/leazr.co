
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { updateUserPasswordRequestSchema, createValidationErrorResponse } from '../_shared/validationSchemas.ts';
import { requireElevatedAccess } from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'super_admin'],
      rateLimit: {
        endpoint: 'update-user-password',
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: 'update-user-password',
      },
    });

    if (!access.ok) {
      return access.response;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Initialize the Supabase client with the service role key for admin privileges
    const supabaseAdmin = access.context.supabaseAdmin || createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse et valide les données avec Zod
    const body = await req.json();
    
    let validatedData;
    try {
      validatedData = updateUserPasswordRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createValidationErrorResponse(error, corsHeaders);
      }
      throw error;
    }
    
    const { user_id, new_password } = validatedData;

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user_id)
      .maybeSingle();

    if (
      !access.context.isServiceRole &&
      access.context.role !== 'super_admin' &&
      (!targetProfile?.company_id || access.context.companyId !== targetProfile.company_id)
    ) {
      return new Response(
        JSON.stringify({ error: 'Cross-company user update is forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    
    // Update the user's password with admin supabase client
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, user: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
