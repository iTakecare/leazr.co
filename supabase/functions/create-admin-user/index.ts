
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
    console.log('=== STARTING ADMIN USER CREATION ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Initialize the Supabase client with admin privileges
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Parse request body
    const { email, password, first_name, last_name, role } = await req.json();
    
    console.log('Request data received:', { email, first_name, last_name, role });
    
    // Validate input
    if (!email || !password) {
      console.error('Missing required fields: email or password');
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Check if user already exists
    console.log('1. Checking if user already exists...');
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError);
      return new Response(
        JSON.stringify({ error: `Error checking users: ${listError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const userExists = existingUsers.users?.some(user => user.email === email);
    if (userExists) {
      console.log('User already exists with email:', email);
      return new Response(
        JSON.stringify({ error: 'Un utilisateur avec cet email existe déjà' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Find or create iTakecare company using native Supabase methods
    console.log('2. Looking for iTakecare company...');
    let companyId: string | null = null;
    
    // Try to find existing iTakecare company
    const { data: existingCompanies, error: companyFindError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .ilike('name', '%itakecare%')
      .limit(1);
    
    if (companyFindError) {
      console.error('Error finding company:', companyFindError);
      return new Response(
        JSON.stringify({ error: 'Error finding iTakecare company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (existingCompanies && existingCompanies.length > 0) {
      companyId = existingCompanies[0].id;
      console.log('Found existing iTakecare company:', companyId, existingCompanies[0].name);
    } else {
      // Create iTakecare company using native upsert
      console.log('Creating new iTakecare company...');
      const { data: newCompany, error: createCompanyError } = await supabaseAdmin
        .from('companies')
        .upsert({
          name: 'iTakecare',
          plan: 'business',
          is_active: true,
          modules_enabled: ['dashboard', 'clients', 'offers', 'contracts', 'ambassadors']
        })
        .select('id')
        .single();
      
      if (createCompanyError) {
        console.error('Error creating iTakecare company:', createCompanyError);
        return new Response(
          JSON.stringify({ error: 'Failed to create iTakecare company' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      companyId = newCompany.id;
      console.log('Created new iTakecare company with ID:', companyId);
    }
    
    if (!companyId) {
      console.error('No company ID available after company setup');
      return new Response(
        JSON.stringify({ error: 'Failed to setup company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Create the admin user using Supabase Auth
    console.log('3. Creating admin user...');
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
        JSON.stringify({ error: `Failed to create user: ${userError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('User created successfully with ID:', userData.user?.id);
    
    // Create/update the user profile using native upsert
    if (userData.user) {
      console.log('4. Creating user profile...');
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userData.user.id,
          company_id: companyId,
          first_name: first_name || 'Admin',
          last_name: last_name || 'Leazr',
          role: role || 'admin'
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Try to clean up the created user
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        return new Response(
          JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      console.log('Profile created successfully');
    }
    
    console.log('=== ADMIN USER CREATION COMPLETED SUCCESSFULLY ===');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: userData.user?.id,
          email: userData.user?.email
        },
        company_id: companyId,
        message: 'Utilisateur administrateur Leazr créé avec succès'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('=== UNEXPECTED ERROR IN ADMIN USER CREATION ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ error: `Erreur inattendue: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
