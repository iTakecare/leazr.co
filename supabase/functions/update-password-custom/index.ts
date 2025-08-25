import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  console.log("🚀 update-password-custom function started");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: 'Configuration manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { token, password, email }: UpdatePasswordRequest = await req.json();

    console.log(`📧 Mise à jour du mot de passe pour: ${email}`);
    console.log(`🔑 Token reçu: ${token.substring(0, 8)}...`);

    // 1. Vérifier le token
    const { data: tokenData, error: tokenError } = await supabase
      .from('custom_auth_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.error("❌ Token invalide:", tokenError);
      return new Response(
        JSON.stringify({ error: 'Token invalide ou expiré' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`✅ Token valide trouvé, type: ${tokenData.token_type}`);

    // 2. Trouver l'utilisateur par email
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !usersData.users) {
      console.error("❌ Erreur utilisateurs:", userError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des utilisateurs' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const user = usersData.users.find(u => u.email === email);
    if (!user) {
      console.error(`❌ Utilisateur non trouvé: ${email}`);
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`👤 Utilisateur trouvé: ${user.id}`);

    // 3. Mettre à jour le mot de passe
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: password,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error("❌ Erreur mise à jour mot de passe:", updateError.message);
      
      if (updateError.message?.includes('weak') || updateError.message?.includes('pwned')) {
        return new Response(
          JSON.stringify({ 
            error: 'Le mot de passe est trop faible. Utilisez au moins 8 caractères avec majuscules, minuscules, chiffres et caractères spéciaux.',
            code: 'weak_password'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la mise à jour du mot de passe: ' + updateError.message
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log("✅ Mot de passe mis à jour avec succès");

    // 4. Marquer le token comme utilisé
    const { error: tokenUpdateError } = await supabase
      .from('custom_auth_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (tokenUpdateError) {
      console.error("⚠️ Erreur mise à jour token:", tokenUpdateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mot de passe défini avec succès. Vous pouvez maintenant vous connecter.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('💥 Erreur inattendue:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur: ' + error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);