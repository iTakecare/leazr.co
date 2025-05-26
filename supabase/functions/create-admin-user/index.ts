
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
    
    // Now handle company creation and profile creation with proper error handling
    let companyId: string | null = null;
    
    try {
      // Check if iTakecare company exists
      console.log('Checking for iTakecare company...');
      const { data: existingCompany, error: companyFetchError } = await supabaseAdmin
        .from('companies')
        .select('id')
        .ilike('name', 'itakecare')
        .limit(1)
        .maybeSingle();
      
      if (existingCompany) {
        companyId = existingCompany.id;
        console.log('iTakecare company found:', companyId);
      } else {
        // Try to create iTakecare company using a database function approach
        console.log('Creating iTakecare company...');
        
        // Insert company directly with service role
        const { data: newCompany, error: companyCreateError } = await supabaseAdmin
          .from('companies')
          .insert({
            name: 'iTakecare',
            plan: 'business',
            is_active: true,
            subscription_ends_at: '2030-12-31T00:00:00.000Z'
          })
          .select('id')
          .single();
        
        if (companyCreateError) {
          console.error('Company creation failed:', companyCreateError);
          // If company creation fails, we'll create the profile without company_id
          console.log('Proceeding without company association');
        } else {
          companyId = newCompany.id;
          console.log('iTakecare company created successfully:', companyId);
        }
      }
    } catch (companyError) {
      console.error('Company handling error:', companyError);
      console.log('Proceeding without company association');
    }
    
    // Create profile with or without company_id
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
      
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData);
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        
        // If profile creation fails and we don't have a company, try creating a default company first
        if (!companyId) {
          console.log('Attempting to create default company for profile...');
          try {
            const { data: defaultCompany } = await supabaseAdmin
              .from('companies')
              .insert({
                name: 'Default Company',
                plan: 'starter',
                is_active: true
              })
              .select('id')
              .single();
            
            if (defaultCompany) {
              profileData.company_id = defaultCompany.id;
              const { error: retryProfileError } = await supabaseAdmin
                .from('profiles')
                .insert(profileData);
              
              if (retryProfileError) {
                console.error('Retry profile creation failed:', retryProfileError);
              } else {
                console.log('Profile created successfully with default company');
              }
            }
          } catch (defaultCompanyError) {
            console.error('Default company creation failed:', defaultCompanyError);
          }
        }
        
        if (profileError) {
          // Don't delete the user if profile creation fails, just warn
          console.warn('Profile creation failed but user was created successfully');
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
      } else {
        console.log('Profile created successfully');
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
