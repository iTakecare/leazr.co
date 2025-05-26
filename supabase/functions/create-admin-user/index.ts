
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
    
    // Step 1: Find or create iTakecare company
    let companyId: string | null = null;
    
    console.log('Looking for iTakecare company...');
    const { data: companies, error: companyFindError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .ilike('name', '%itakecare%')
      .limit(1);
    
    if (!companyFindError && companies && companies.length > 0) {
      companyId = companies[0].id;
      console.log('Found existing iTakecare company:', companyId);
    } else {
      console.log('Creating iTakecare company...');
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: 'iTakecare',
          plan: 'business',
          is_active: true,
          subscription_ends_at: '2030-12-31T00:00:00.000Z'
        })
        .select('id')
        .single();
      
      if (companyError) {
        console.error('Error creating company:', companyError);
        return new Response(
          JSON.stringify({ error: 'Failed to create company for admin user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      companyId = newCompany.id;
      console.log('Created iTakecare company:', companyId);
    }
    
    if (!companyId) {
      console.error('No company ID available');
      return new Response(
        JSON.stringify({ error: 'No company available for admin user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Step 2: Temporarily drop the trigger to avoid conflicts
    console.log('Temporarily disabling trigger...');
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;'
      });
      console.log('Trigger disabled successfully');
    } catch (error) {
      console.log('Could not disable trigger:', error);
    }
    
    // Step 3: Create the user
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
      
      // Re-enable trigger before returning error
      try {
        await supabaseAdmin.rpc('execute_sql', {
          sql: `
            CREATE TRIGGER on_auth_user_created
              AFTER INSERT ON auth.users
              FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
          `
        });
      } catch (triggerError) {
        console.log('Could not re-enable trigger:', triggerError);
      }
      
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création: ${userError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('User created successfully:', userData.user?.id);
    
    // Step 4: Manually create the profile with company_id
    if (userData.user && companyId) {
      console.log('Creating profile with company_id:', companyId);
      
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userData.user.id,
          first_name: first_name || 'Admin',
          last_name: last_name || 'Leazr',
          role: role || 'admin',
          company_id: companyId
        });
      
      if (profileError) {
        console.error('Profile creation failed:', profileError);
        // Don't fail the entire operation, just warn
        console.log('Continuing despite profile creation error...');
      } else {
        console.log('Profile created successfully');
      }
    }
    
    // Step 5: Re-enable the trigger
    console.log('Re-enabling trigger...');
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: `
          CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        `
      });
      console.log('Trigger re-enabled successfully');
    } catch (error) {
      console.log('Could not re-enable trigger:', error);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData,
        company_id: companyId,
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
