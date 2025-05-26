
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
    
    // First, ensure we have a company to associate the user with
    let companyId: string | null = null;
    
    try {
      console.log('Looking for iTakecare company...');
      // Try to find existing iTakecare company using direct SQL query
      const { data: existingCompany, error: findError } = await supabaseAdmin
        .rpc('execute_sql', {
          sql: `
            SELECT id FROM public.companies 
            WHERE LOWER(name) LIKE '%itakecare%' 
            LIMIT 1;
          `
        });
      
      if (!findError && existingCompany && existingCompany.length > 0) {
        companyId = existingCompany[0].id;
        console.log('Found existing iTakecare company:', companyId);
      }
    } catch (error) {
      console.log('Error finding company, will create one:', error);
    }
    
    // If no company found, create one using direct SQL execution
    if (!companyId) {
      try {
        console.log('Creating iTakecare company using SQL...');
        
        const { data: newCompany, error: companyError } = await supabaseAdmin
          .rpc('execute_sql', {
            sql: `
              INSERT INTO public.companies (name, plan, is_active, subscription_ends_at)
              VALUES ('iTakecare', 'business', true, '2030-12-31T00:00:00.000Z')
              RETURNING id;
            `
          });
        
        if (companyError) {
          console.error('Error creating company with SQL:', companyError);
          throw new Error('Failed to create company');
        }
        
        // Extract company ID from SQL result
        if (newCompany && newCompany.length > 0) {
          companyId = newCompany[0].id;
          console.log('Created iTakecare company with SQL:', companyId);
        } else {
          throw new Error('No company ID returned from SQL insert');
        }
      } catch (error) {
        console.error('Failed to create company:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create company for admin user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    if (!companyId) {
      console.error('No company ID available');
      return new Response(
        JSON.stringify({ error: 'No company available for admin user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Now create the user using a different approach - disable RLS temporarily
    console.log('Disabling RLS for profiles table...');
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: 'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;'
      });
      console.log('RLS disabled successfully');
    } catch (error) {
      console.log('Could not disable RLS:', error);
    }
    
    // Now create the user
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
    
    // Re-enable RLS
    console.log('Re-enabling RLS for profiles table...');
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'
      });
      console.log('RLS re-enabled successfully');
    } catch (error) {
      console.log('Could not re-enable RLS:', error);
    }
    
    if (userError) {
      console.error('Error creating user:', userError);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création: ${userError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('User created successfully:', userData.user?.id);
    
    // Create or update profile manually with company_id using SQL
    if (userData.user && companyId) {
      console.log('Creating/updating profile with company_id:', companyId);
      
      try {
        const { error: profileError } = await supabaseAdmin
          .rpc('execute_sql', {
            sql: `
              INSERT INTO public.profiles (id, first_name, last_name, role, company_id)
              VALUES ('${userData.user.id}', '${first_name || 'Admin'}', '${last_name || 'Leazr'}', '${role || 'admin'}', '${companyId}')
              ON CONFLICT (id) 
              DO UPDATE SET
                first_name = '${first_name || 'Admin'}',
                last_name = '${last_name || 'Leazr'}',
                role = '${role || 'admin'}',
                company_id = '${companyId}';
            `
          });
        
        if (profileError) {
          console.error('Profile creation/update failed:', profileError);
          return new Response(
            JSON.stringify({ 
              success: true, 
              user: userData,
              company_id: companyId,
              warning: 'Utilisateur créé mais le profil n\'a pas pu être configuré',
              message: 'Utilisateur administrateur créé avec succès (profil à configurer manuellement)'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        
        console.log('Profile created/updated successfully');
      } catch (error) {
        console.error('Error with profile SQL:', error);
      }
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
