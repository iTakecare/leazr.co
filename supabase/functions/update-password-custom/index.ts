import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getClientIp } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePasswordRequest {
  token: string;
  password: string;
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
    const { token, password }: UpdatePasswordRequest = await req.json();

    console.log(`🔑 Token reçu: ${token.substring(0, 8)}...`);

    // Rate limit password update attempts (public endpoint).
    const clientIp = getClientIp(req);
    const ipLimit = await checkRateLimit(
      supabase,
      `update-password-custom:${clientIp}`,
      "update-password-custom-ip",
      { maxRequests: 10, windowSeconds: 60 }
    );

    if (!ipLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
            "X-RateLimit-Remaining": ipLimit.remaining.toString(),
          },
        }
      );
    }

    if (token) {
      const tokenLimit = await checkRateLimit(
        supabase,
        `update-password-custom-token:${token}`,
        "update-password-custom-token",
        { maxRequests: 10, windowSeconds: 60 }
      );

      if (!tokenLimit.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many requests" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
              "X-RateLimit-Remaining": tokenLimit.remaining.toString(),
            },
          }
        );
      }
    }

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

    // 2. Récupérer l'email depuis le token au lieu du body
    const email = tokenData.user_email;
    console.log(`📧 Email récupéré depuis le token: ${email}`);

    // 3. Trouver l'utilisateur par email
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

    // 4. Mettre à jour le mot de passe
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: password,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error("❌ Erreur mise à jour mot de passe:", updateError.message);
      
      // Check for specific known errors without exposing details
      if (updateError.message?.includes('weak') || updateError.message?.includes('pwned')) {
        return new Response(
          JSON.stringify({ 
            error: 'Le mot de passe est trop faible. Utilisez au moins 8 caractères avec majuscules, minuscules, chiffres et caractères spéciaux.',
            code: 'weak_password'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // Generic error message - don't expose internal details
      return new Response(
        JSON.stringify({ 
          error: 'Impossible de mettre à jour le mot de passe. Veuillez réessayer.',
          code: 'update_failed'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log("✅ Mot de passe mis à jour avec succès");

    // 5. Marquer le token comme utilisé
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
