
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getClientIp, requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
    });

    if (!access.ok) {
      return access.response;
    }

    const supabase = access.context.supabaseAdmin;

    const body = await req.json().catch(() => ({}));
    const bucket_name = String(body?.bucket_name ?? body?.bucketName ?? "").trim();

    if (!bucket_name) {
      return new Response(
        JSON.stringify({ success: false, message: "bucket_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^[a-z0-9-]{3,63}$/.test(bucket_name)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid bucket_name format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit bucket creation attempts (also applies to service_role JWTs).
    const clientIp = getClientIp(req);
    const rl = await checkRateLimit(
      supabase,
      `create-storage-bucket:${access.context.userId || clientIp}`,
      "create-storage-bucket",
      { maxRequests: 10, windowSeconds: 60 }
    );

    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests" }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": rl.remaining.toString(),
          },
        }
      );
    }

    console.log(`Creating bucket: ${bucket_name}`);

    // Créer le bucket s'il n'existe pas
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucket_name);

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(bucket_name, {
        public: false, // Les documents d'offres ne sont pas publics par défaut
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError && !createError.message.includes('already exists')) {
        throw createError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bucket ${bucket_name} created or already exists`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error) {
    console.error("Error creating bucket:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
