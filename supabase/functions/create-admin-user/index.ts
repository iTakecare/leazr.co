
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

    // Step 1: Temporarily make company_id nullable
    console.log('Making company_id nullable temporarily...');
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: 'ALTER TABLE public.profiles ALTER COLUMN company_id DROP NOT NULL;'
      });
      console.log('Successfully made company_id nullable');
    } catch (error) {
      console.log('Note: Could not alter company_id constraint, continuing...');
    }
    
    // Step 2: Find or create iTakecare company
    let companyId: string | null = null;
    
    console.log('Looking for iTakecare company...');
    try {
      // First try to find existing company
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
        
        // Generate a new UUID for the company
        companyId = crypto.randomUUID();
        
        // Use direct SQL to create the company
        const { error: createError } = await supabaseAdmin.rpc('execute_sql', {
          sql: `
            INSERT INTO public.companies (id, name, plan, is_active, created_at, updated_at)
            VALUES ('${companyId}', 'iTakecare', 'business', true, NOW(), NOW());
          `
        });
        
        if (createError) {
          console.error('Error creating company:', createError);
          throw new Error('Failed to create iTakecare company');
        }
        
        console.log('Created iTakecare company with ID:', companyId);
      }
    } catch (error) {
      console.error('Error handling company creation:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to setup company for admin user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!companyId) {
      console.error('No company ID available');
      return new Response(
        JSON.stringify({ error: 'No company available for admin user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
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
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création: ${userError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('User created successfully:', userData.user?.id);
    
    // Step 4: Update the profile with the correct company_id
    if (userData.user && companyId) {
      console.log('Updating profile with company_id:', companyId);
      
      try {
        const { error: profileUpdateError } = await supabaseAdmin.rpc('execute_sql', {
          sql: `
            UPDATE public.profiles 
            SET 
              company_id = '${companyId}',
              first_name = '${(first_name || 'Admin').replace(/'/g, "''")}',
              last_name = '${(last_name || 'Leazr').replace(/'/g, "''")}',
              role = '${role || 'admin'}',
              updated_at = NOW()
            WHERE id = '${userData.user.id}';
          `
        });
        
        if (profileUpdateError) {
          console.error('Profile update failed:', profileUpdateError);
        } else {
          console.log('Profile updated successfully');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    }

    // Step 5: Restore company_id constraint
    console.log('Restoring company_id NOT NULL constraint...');
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: 'ALTER TABLE public.profiles ALTER COLUMN company_id SET NOT NULL;'
      });
      console.log('Successfully restored company_id constraint');
    } catch (error) {
      console.log('Note: Could not restore company_id constraint, but user was created successfully');
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
