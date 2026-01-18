import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createErrorResponse } from '../_shared/errorHandler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const loginRequestSchema = z.object({
  email: z.string().trim().email({ message: "Format d'email invalide" }).max(255),
  password: z.string().min(1, { message: "Le mot de passe est requis" }).max(255)
});

interface LoginRequest {
  email: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Créer un client Supabase avec la clé de service pour accès admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse and validate request body
    const requestBody = await req.json();
    
    let email: string, password: string;
    try {
      const validated = loginRequestSchema.parse(requestBody);
      email = validated.email;
      password = validated.password;
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.log('[INTERNAL] Validation failed:', validationError.errors);
        return new Response(
          JSON.stringify({ error: 'Email ou mot de passe invalide' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      throw validationError;
    }

    console.log(`Login attempt for user: ${email.substring(0, 3)}***`);

    // 1. Récupérer l'utilisateur par email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (userError || !userData.user) {
      // Generic error to prevent user enumeration
      return new Response(
        JSON.stringify({ error: 'Email ou mot de passe incorrect' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 2. Vérifier le mot de passe en utilisant signInWithPassword
    // On utilise un client normal pour cette vérification
    const publicSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: authData, error: authError } = await publicSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Email ou mot de passe incorrect' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 3. Récupérer les informations du profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        companies(name, slug, logo_url, primary_color, secondary_color, accent_color)
      `)
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('[INTERNAL] Profile fetch error:', profileError.message);
    }

    // 4. Enrichir les données utilisateur avec le profil
    const enrichedUser = {
      ...authData.user,
      role: profile?.role,
      company_id: profile?.company_id,
      company: profile?.companies,
      first_name: profile?.first_name,
      last_name: profile?.last_name,
    };

    // 5. Retourner les données de session complètes
    return new Response(
      JSON.stringify({
        success: true,
        user: enrichedUser,
        session: authData.session,
        message: 'Connexion réussie'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('[INTERNAL] Error in custom-login:', error);
    return createErrorResponse(error, corsHeaders);
  }
};

serve(handler);
