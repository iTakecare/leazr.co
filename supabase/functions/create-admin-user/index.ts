
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
      // Try to find existing iTakecare company
      const { data: existingCompany } = await supabaseAdmin
        .from('companies')
        .select('id')
        .ilike('name', 'itakecare')
        .single();
      
      if (existingCompany) {
        companyId = existingCompany.id;
        console.log('Found existing iTakecare company:', companyId);
      }
    } catch (error) {
      console.log('iTakecare company not found, will create one');
    }
    
    // If no company found, create one using service role directly
    if (!companyId) {
      try {
        console.log('Creating iTakecare company...');
        
        // Temporarily disable RLS for this operation by using admin client
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
          // Try a simpler approach - create minimal company
          const { data: minimalCompany, error: minimalError } = await supabaseAdmin
            .from('companies')
            .insert({
              name: 'Default Admin Company',
              plan: 'business'
            })
            .select('id')
            .single();
          
          if (minimalError) {
            console.error('Error creating minimal company:', minimalError);
            throw new Error('Failed to create company');
          }
          
          companyId = minimalCompany.id;
          console.log('Created minimal company:', companyId);
        } else {
          companyId = newCompany.id;
          console.log('Created iTakecare company:', companyId);
        }
      } catch (error) {
        console.error('Failed to create any company:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create company for admin user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Now create the user with admin supabase client
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
    
    // Create profile with the company_id
    if (userData.user && companyId) {
      console.log('Creating profile with company_id:', companyId);
      
      const profileData = {
        id: userData.user.id,
        first_name: first_name || 'Admin',
        last_name: last_name || 'Leazr',
        role: role || 'admin',
        company_id: companyId
      };
      
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData);
      
      if (profileError) {
        console.error('Profile creation failed:', profileError);
        // Don't delete the user, just report the issue
        return new Response(
          JSON.stringify({ 
            success: true, 
            user: userData,
            company_id: companyId,
            warning: 'Utilisateur créé mais le profil n\'a pas pu être associé',
            message: 'Utilisateur administrateur créé avec succès (profil à configurer manuellement)'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      console.log('Profile created successfully');
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
