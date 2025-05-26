
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
    
    // Create the user first with admin supabase client
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
    
    // Try to find or create iTakecare company using direct SQL approach
    let companyId: string | null = null;
    
    try {
      // First disable RLS temporarily for companies table
      console.log('Attempting to find or create iTakecare company...');
      
      // Use the execute_sql function to bypass RLS
      const { data: companyResult, error: companyError } = await supabaseAdmin.rpc('execute_sql', {
        sql: `
          INSERT INTO public.companies (name, plan, is_active, subscription_ends_at)
          VALUES ('iTakecare', 'business', true, '2030-12-31T00:00:00.000Z')
          ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
          RETURNING id;
        `
      });
      
      if (!companyError) {
        console.log('iTakecare company handled successfully');
        
        // Get the company ID
        const { data: getCompanyResult } = await supabaseAdmin
          .from('companies')
          .select('id')
          .ilike('name', 'itakecare')
          .limit(1)
          .single();
        
        if (getCompanyResult) {
          companyId = getCompanyResult.id;
          console.log('Found iTakecare company ID:', companyId);
        }
      }
    } catch (sqlError) {
      console.error('SQL execution failed:', sqlError);
    }
    
    // If we still don't have a company, try creating a simple one
    if (!companyId) {
      try {
        const { data: simpleCompany } = await supabaseAdmin
          .from('companies')
          .insert({
            name: 'Default Admin Company',
            plan: 'business',
            is_active: true
          })
          .select('id')
          .single();
        
        if (simpleCompany) {
          companyId = simpleCompany.id;
          console.log('Created default company:', companyId);
        }
      } catch (defaultError) {
        console.warn('Could not create default company:', defaultError);
      }
    }
    
    // Create profile - if we have a company_id, use it, otherwise handle gracefully
    if (userData.user) {
      console.log('Creating profile...');
      
      const profileData: any = {
        id: userData.user.id,
        first_name: first_name || 'Admin',
        last_name: last_name || 'Leazr',
        role: role || 'admin'
      };
      
      // Only add company_id if we have one
      if (companyId) {
        profileData.company_id = companyId;
      }
      
      try {
        // Try to use the execute_sql function for profile creation too
        const profileSql = companyId 
          ? `INSERT INTO public.profiles (id, first_name, last_name, role, company_id) VALUES ('${userData.user.id}', '${profileData.first_name}', '${profileData.last_name}', '${profileData.role}', '${companyId}');`
          : `INSERT INTO public.profiles (id, first_name, last_name, role) VALUES ('${userData.user.id}', '${profileData.first_name}', '${profileData.last_name}', '${profileData.role}');`;
        
        const { error: profileSqlError } = await supabaseAdmin.rpc('execute_sql', {
          sql: profileSql
        });
        
        if (profileSqlError) {
          console.error('Profile creation via SQL failed:', profileSqlError);
          
          // Fallback to regular insert
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert(profileData);
          
          if (profileError) {
            console.error('Profile creation failed:', profileError);
            return new Response(
              JSON.stringify({ 
                success: true, 
                user: userData,
                warning: 'Utilisateur créé mais le profil n\'a pas pu être associé',
                message: 'Utilisateur administrateur créé avec succès (profil à configurer manuellement)'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
          }
        }
        
        console.log('Profile created successfully');
      } catch (profileCreationError) {
        console.error('Profile creation error:', profileCreationError);
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
