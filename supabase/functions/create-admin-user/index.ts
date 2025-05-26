
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    console.log('Starting admin user creation process...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Initialize the Supabase client with the service role key for admin privileges
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Parse request body
    const { email, password, first_name, last_name, role } = await req.json();
    
    console.log('Request data:', { email, first_name, last_name, role });
    
    // Validate input
    if (!email || !password) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Check if user already exists
    console.log('Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError);
      return new Response(
        JSON.stringify({ error: `Error checking existing users: ${listError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const userExists = existingUsers.users?.some(user => user.email === email);
    if (userExists) {
      console.log('User already exists');
      return new Response(
        JSON.stringify({ error: 'Un utilisateur avec cet email existe déjà' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // First, ensure iTakecare company exists
    console.log('Checking for iTakecare company...');
    let { data: company, error: companyFetchError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('name', 'iTakecare')
      .single();
    
    if (companyFetchError && companyFetchError.code !== 'PGRST116') {
      console.error('Error fetching company:', companyFetchError);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la vérification de l'entreprise: ${companyFetchError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Create iTakecare company if it doesn't exist
    if (!company) {
      console.log('Creating iTakecare company...');
      const { data: newCompany, error: companyCreateError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: 'iTakecare',
          plan: 'business',
          is_active: true,
          subscription_ends_at: '2030-12-31T00:00:00.000Z'
        })
        .select()
        .single();
      
      if (companyCreateError) {
        console.error('Error creating company:', companyCreateError);
        return new Response(
          JSON.stringify({ error: `Erreur lors de la création de l'entreprise: ${companyCreateError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      company = newCompany;
      console.log('iTakecare company created successfully:', company.id);
    } else {
      console.log('iTakecare company already exists:', company.id);
    }
    
    // Create the user with admin supabase client
    console.log('Creating user...');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: first_name || 'Admin',
        last_name: last_name || 'Leazr',
        role: role || 'admin'
      }
    });
    
    if (userError) {
      console.error('Error creating user:', userError);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création: ${userError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('User created successfully:', userData.user?.id);
    
    // Create a profile record with the company_id
    if (userData.user && company) {
      console.log('Creating profile with company_id:', company.id);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userData.user.id,
          first_name: first_name || 'Admin',
          last_name: last_name || 'Leazr',
          role: role || 'admin',
          company_id: company.id
        });
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Try to clean up the user if profile creation fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
          console.log('User cleaned up due to profile creation failure');
        } catch (cleanupError) {
          console.error('Error cleaning up user:', cleanupError);
        }
        
        return new Response(
          JSON.stringify({ error: `Erreur lors de la création du profil: ${profileError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      } else {
        console.log('Profile created successfully');
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData,
        company: company,
        message: 'Utilisateur administrateur créé avec succès'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: `Erreur inattendue: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
