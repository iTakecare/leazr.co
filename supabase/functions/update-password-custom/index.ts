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
    console.log(`Longueur du mot de passe: ${password.length}`);
    console.log(`Token reçu: ${token.substring(0, 8)}...`);

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
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !usersData.users) {
      console.error("Erreur lors de la récupération des utilisateurs:", userError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des utilisateurs' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const user = usersData.users.find(u => u.email === email);
    if (!user) {
      console.error("Utilisateur non trouvé avec l'email:", email);
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 3. Mettre à jour le mot de passe et confirmer l'email avec l'API Admin
    console.log(`Tentative de mise à jour du mot de passe pour l'utilisateur ID: ${user.id}`);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: password,
        email_confirm: true  // Confirmer automatiquement l'email lors de la définition du mot de passe
      }
    );

    if (updateError) {
      console.error("Erreur complète lors de la mise à jour du mot de passe:", {
        message: updateError.message,
        status: updateError.status,
        code: updateError.code,
        name: updateError.name,
        reasons: updateError.reasons || 'N/A'
      });
      
      // Gestion spécifique de l'erreur de mot de passe faible
      if (updateError.message?.includes('weak') || updateError.message?.includes('pwned') || updateError.code === 'weak_password') {
        return new Response(
          JSON.stringify({ 
            error: 'Le mot de passe est trop faible ou compromis. Veuillez choisir un mot de passe plus complexe avec au moins 12 caractères, incluant majuscules, minuscules, chiffres et caractères spéciaux.',
            code: 'weak_password',
            details: updateError.reasons || ['Le mot de passe ne respecte pas les critères de sécurité']
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la mise à jour du mot de passe: ' + updateError.message,
          code: updateError.code || 'unknown_error',
          details: updateError
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log("Mot de passe mis à jour et email confirmé avec succès pour:", email);

    // 4. Marquer le token comme utilisé
    const { error: tokenUpdateError } = await supabase
      .from('custom_auth_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (tokenUpdateError) {
      console.error("Erreur lors de la mise à jour du token:", tokenUpdateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mot de passe défini et email confirmé avec succès. Vous pouvez maintenant vous connecter.',
        email_confirmed: true
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