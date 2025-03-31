
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// Set up Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    
    // Parse request
    const { type, email, redirectTo } = await req.json();
    
    if (!type || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: type and email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    if (type !== "signup" && type !== "recovery") {
      return new Response(
        JSON.stringify({ error: "Type must be either 'signup' or 'recovery'" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Create Supabase client with admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // For password reset
    if (type === "recovery") {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${new URL(req.url).origin}/update-password`,
      });
      
      if (error) {
        console.error("Error generating recovery link:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Password reset email sent successfully",
          data
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // For signup
    if (type === "signup") {
      // For signup, we'll use a different approach since admin.generateLink seems to have issues
      // First, check if the user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers({
        filters: { email },
      });
      
      let userId;
      
      // If user doesn't exist, create one with a random password
      if (!existingUser?.users || existingUser.users.length === 0) {
        const tempPassword = Math.random().toString(36).slice(-12);
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: false, // The user will need to verify their email
        });
        
        if (createError) {
          console.error("Error creating user:", createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
        
        userId = newUser.user.id;
      } else {
        userId = existingUser.users[0].id;
      }
      
      // Generate a password reset link which can be used to set the initial password
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: redirectTo || `${new URL(req.url).origin}/auth/callback`,
        }
      });
      
      if (error) {
        console.error("Error generating signup link:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      const link = data?.properties?.action_link;
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Signup link generated successfully",
          link,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // This should not be reached due to type validation above
    return new Response(
      JSON.stringify({ error: "Invalid request type" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error) {
    console.error("Error handling request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
