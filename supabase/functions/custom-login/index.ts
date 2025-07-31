import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { email, password }: LoginRequest = await req.json();

    console.log(`Tentative de connexion pour ${email}`);

    // 1. Récupérer l'utilisateur par email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
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
      console.error('Erreur récupération profil:', profileError);
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
    console.error('Erreur dans custom-login:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);