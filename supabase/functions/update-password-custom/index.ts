import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePasswordRequest {
  token: string;
  password: string;
  email: string;
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

    const { token, password, email }: UpdatePasswordRequest = await req.json();

    console.log(`Mise à jour du mot de passe pour ${email}`);

    // 1. Vérifier que le token est valide et non utilisé
    const { data: tokenData, error: tokenError } = await supabase
      .from('custom_auth_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.error("Token invalide ou expiré:", tokenError);
      return new Response(
        JSON.stringify({ error: 'Token invalide ou expiré' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 2. Récupérer l'utilisateur par email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (userError || !userData.user) {
      console.error("Utilisateur non trouvé:", userError);
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 3. Mettre à jour le mot de passe avec l'API Admin
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.user.id,
      { password: password }
    );

    if (updateError) {
      console.error("Erreur lors de la mise à jour du mot de passe:", updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la mise à jour du mot de passe' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 4. Marquer le token comme utilisé
    const { error: tokenUpdateError } = await supabase
      .from('custom_auth_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (tokenUpdateError) {
      console.error("Erreur lors de la mise à jour du token:", tokenUpdateError);
    }

    console.log("Mot de passe mis à jour avec succès pour:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mot de passe mis à jour avec succès'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Erreur dans update-password-custom:', error);
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