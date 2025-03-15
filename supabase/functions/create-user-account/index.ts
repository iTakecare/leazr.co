
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.22.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  name: string;
  role: string;
  userType: "partner" | "ambassador";
  entityId: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Get the request data
  let requestData: CreateUserRequest;
  try {
    requestData = await req.json();
  } catch (error) {
    console.error("Error parsing request body:", error);
    return new Response(
      JSON.stringify({ error: "Invalid request format" }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
  
  const { email, name, role, userType, entityId } = requestData;
  
  if (!email || !role || !userType || !entityId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  // Create a Supabase client with the service role key
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  
  try {
    console.log(`Creating user account for ${email} as ${role}`);
    
    // Generate a random password (they'll reset it via email)
    const tempPassword = Math.random().toString(36).slice(-10);
    
    // Check if the user already exists - checking auth.users directly
    const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
      
    if (checkError) {
      console.error("Error checking existing user:", checkError);
      throw checkError;
    }
    
    if (existingUsers && existingUsers.users.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "User already exists", 
          userExists: true 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create the user account
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        [userType === "partner" ? "partner_id" : "ambassador_id"]: entityId
      }
    });
    
    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }
    
    console.log("User created successfully:", userData.user.id);
    
    // Update the partner or ambassador in the database to link the user account
    const tableName = userType === "partner" ? "partners" : "ambassadors";
    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({
        has_user_account: true,
        user_account_created_at: new Date().toISOString(),
        user_id: userData.user.id
      })
      .eq('id', entityId);
      
    if (updateError) {
      console.error(`Error updating ${userType}:`, updateError);
      throw updateError;
    }
    
    // Send the password reset email
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    
    if (resetError) {
      console.error("Error sending reset password email:", resetError);
      throw resetError;
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User account created and reset password email sent" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Error in create-user-account function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
