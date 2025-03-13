
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Define test users
    const testUsers = [
      {
        email: "admin@test.com",
        password: "admintest123",
        userData: {
          first_name: "Admin",
          last_name: "User",
          role: "admin",
          company: "iTakeCare Admin"
        }
      },
      {
        email: "partner@test.com",
        password: "partnertest123",
        userData: {
          first_name: "Partner",
          last_name: "User",
          role: "partner",
          company: "iTakeCare Partner"
        }
      },
      {
        email: "client@test.com",
        password: "clienttest123",
        userData: {
          first_name: "Client",
          last_name: "User",
          role: "client",
          company: "iTakeCare Client"
        }
      }
    ];

    const results = [];

    // Create each test user
    for (const user of testUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabase
        .from("profiles")
        .select("id")
        .eq("first_name", user.userData.first_name)
        .eq("last_name", user.userData.last_name)
        .eq("role", user.userData.role);

      if (existingUsers && existingUsers.length > 0) {
        results.push({
          email: user.email,
          status: "exists",
          message: "User already exists"
        });
        continue;
      }

      // Create the user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.userData
      });

      if (authError) {
        results.push({
          email: user.email,
          status: "error",
          message: authError.message
        });
      } else {
        results.push({
          email: user.email,
          status: "created",
          password: user.password,
          role: user.userData.role
        });
      }
    }

    // Return results
    return new Response(JSON.stringify({ success: true, users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating test users:", error);
    
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
