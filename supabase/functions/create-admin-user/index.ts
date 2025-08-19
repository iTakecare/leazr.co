import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 ULTRA-SIMPLE create-admin-user starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration manquante')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { email, password, first_name, last_name, role, company_id } = await req.json()
    
    console.log(`📧 Creating: ${email}`);
    
    if (!email || !password) {
      throw new Error('Email et mot de passe requis')
    }

    let finalCompanyId = company_id;
    
    if (company_id) {
      // Verify the specific company exists
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('id', company_id)
        .single()

      if (!company) {
        throw new Error('Entreprise non trouvée')
      }
      finalCompanyId = company_id;
    } else {
      // Default to iTakecare if no company_id specified
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('name', 'iTakecare')
        .single()

      if (!company) {
        throw new Error('Société iTakecare non trouvée')
      }
      finalCompanyId = company.id;
    }

    // Create user directly with Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: first_name || 'Admin',
        last_name: last_name || 'Leazr'
      }
    })

    if (userError) {
      console.error('User creation failed:', userError);
      throw new Error(`Création utilisateur échoué: ${userError.message}`)
    }

    console.log(`✅ User created: ${userData.user?.id}`);

    // Create profile simply
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userData.user!.id,
        first_name: first_name || 'Admin',
        last_name: last_name || 'Leazr',
        role: role || 'admin',
        company_id: finalCompanyId
      })

    if (profileError) {
      console.error('Profile creation failed:', profileError);
      // Don't throw error here - user is created, profile failure is not critical
    }

    console.log(`✅ SUCCESS - Admin user created`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userData.user!.id,
        email: userData.user!.email,
        message: 'Utilisateur administrateur créé avec succès'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('💥 FUNCTION ERROR:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})