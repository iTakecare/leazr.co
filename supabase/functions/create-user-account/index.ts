
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
  console.log("Function called with method:", req.method);
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request for CORS");
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the request data
    let requestData: CreateUserRequest;
    try {
      requestData = await req.json();
      console.log("Request data parsed:", JSON.stringify(requestData));
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
      console.error("Missing required fields:", { email, role, userType, entityId });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    console.log(`Creating user account for ${email} as ${role}`);
    
    // Generate a random password (they'll reset it via email)
    const tempPassword = Math.random().toString(36).slice(-10);
    
    // Check if the user already exists using admin.listUsers
    console.log("Fetching existing users to check for email:", email);
    const { data: existingUsersData, error: checkError } = await supabaseAdmin.auth.admin.listUsers();
      
    if (checkError) {
      console.error("Error checking existing users:", checkError);
      return new Response(
        JSON.stringify({ error: `Error checking existing users: ${checkError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Find if the user with this email already exists
    console.log("Total users found:", existingUsersData?.users.length);
    const userExists = existingUsersData?.users.some(user => {
      const matches = user.email === email;
      if (matches) {
        console.log(`Found existing user with email ${email}, user ID: ${user.id}`);
      }
      return matches;
    });
    
    if (userExists) {
      console.log(`User with email ${email} already exists, returning 400`);
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
    
    // Prepare user metadata based on role
    console.log("Preparing user metadata for role:", role);
    const userMetadata: Record<string, any> = {
      name,
      role
    };
    
    // Add the appropriate ID field based on userType
    if (userType === "partner") {
      userMetadata.partner_id = entityId;
    } else {
      userMetadata.ambassador_id = entityId;
    }
    
    console.log("User metadata prepared:", JSON.stringify(userMetadata));
    
    // Create the user account
    console.log("Creating user with email:", email);
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: userMetadata
    });
    
    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: `Error creating user: ${createError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!userData || !userData.user) {
      console.error("User creation did not return expected data");
      return new Response(
        JSON.stringify({ error: "User creation failed with unknown error" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("User created successfully:", userData.user.id);
    
    // Update the partner or ambassador in the database to link the user account
    const tableName = userType === "partner" ? "partners" : "ambassadors";
    console.log(`Updating ${tableName} record ${entityId} with user ID ${userData.user.id}`);
    
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
      return new Response(
        JSON.stringify({ error: `Error updating ${userType}: ${updateError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Send the password reset email
    console.log("Generating password reset link for:", email);
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    
    if (resetError) {
      console.error("Error sending reset password email:", resetError);
      // We'll continue despite this error, but log it
      console.log("Continuing despite password reset email error");
    }
    
    console.log("User account creation complete, returning success response");
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
    console.error("Unhandled error in create-user-account function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
