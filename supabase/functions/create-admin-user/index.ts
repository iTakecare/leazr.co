
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
    
    // Step 1: Find or create iTakecare company using SQL with bypassed RLS
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
        console.log('Creating iTakecare company using SQL...');
        
        // Use direct SQL to bypass RLS policies
        const { data: sqlResult, error: sqlError } = await supabaseAdmin.rpc('execute_sql', {
          sql: `
            INSERT INTO public.companies (name, plan, is_active, subscription_ends_at, created_at, updated_at)
            VALUES ('iTakecare', 'business', true, '2030-12-31T00:00:00.000Z', NOW(), NOW())
            RETURNING id;
          `
        });
        
        if (sqlError) {
          console.error('Error creating company with SQL:', sqlError);
          // Try a different approach - create with minimal data
          const companyUuid = crypto.randomUUID();
          const { error: insertError } = await supabaseAdmin.rpc('execute_sql', {
            sql: `
              INSERT INTO public.companies (id, name, plan, is_active, created_at, updated_at)
              VALUES ('${companyUuid}', 'iTakecare', 'business', true, NOW(), NOW());
            `
          });
          
          if (insertError) {
            console.error('Failed to create company:', insertError);
            return new Response(
              JSON.stringify({ error: 'Failed to create company for admin user' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
          }
          
          companyId = companyUuid;
          console.log('Created iTakecare company with UUID:', companyId);
        } else {
          console.log('Company creation result:', sqlResult);
          // The result might be in different formats, try to extract the ID
          if (typeof sqlResult === 'string') {
            // If it's a string, it might be the UUID directly
            companyId = sqlResult;
          } else if (Array.isArray(sqlResult) && sqlResult.length > 0) {
            companyId = sqlResult[0].id || sqlResult[0];
          }
          
          if (!companyId) {
            // Fallback: generate UUID and insert directly
            companyId = crypto.randomUUID();
            await supabaseAdmin.rpc('execute_sql', {
              sql: `
                INSERT INTO public.companies (id, name, plan, is_active, created_at, updated_at)
                VALUES ('${companyId}', 'iTakecare', 'business', true, NOW(), NOW());
              `
            });
          }
          
          console.log('Created iTakecare company:', companyId);
        }
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
    
    // Step 2: Create the user
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
    
    // Step 3: Create the profile using SQL to bypass RLS
    if (userData.user && companyId) {
      console.log('Creating profile with company_id:', companyId);
      
      try {
        const { error: profileError } = await supabaseAdmin.rpc('execute_sql', {
          sql: `
            INSERT INTO public.profiles (id, first_name, last_name, role, company_id, created_at, updated_at)
            VALUES (
              '${userData.user.id}',
              '${(first_name || 'Admin').replace(/'/g, "''")}',
              '${(last_name || 'Leazr').replace(/'/g, "''")}',
              '${role || 'admin'}',
              '${companyId}',
              NOW(),
              NOW()
            );
          `
        });
        
        if (profileError) {
          console.error('Profile creation failed:', profileError);
          console.log('Continuing despite profile creation error...');
        } else {
          console.log('Profile created successfully');
        }
      } catch (error) {
        console.error('Error creating profile:', error);
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
