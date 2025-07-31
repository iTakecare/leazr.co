import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetCompanyLogoRequest {
  company_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { company_id }: GetCompanyLogoRequest = await req.json();

    console.log(`🏢 get-company-logo: Fetching logo for company_id: ${company_id}`);

    // Récupérer les données de l'entreprise avec le service role (contourne RLS)
    const { data: companyData, error: companyError } = await supabase
      .from('company_customizations')
      .select('logo_url, company_name')
      .eq('company_id', company_id)
      .single();

    if (companyError) {
      console.error("❌ get-company-logo: Error fetching company data:", companyError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Entreprise non trouvée',
          logo_url: null,
          company_name: null
        }),
        { 
          status: 200, // Pas d'erreur 404, mais pas de données
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log(`✅ get-company-logo: Found company data:`, { 
      hasLogo: !!companyData.logo_url,
      companyName: companyData.company_name 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        logo_url: companyData.logo_url,
        company_name: companyData.company_name
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ get-company-logo: Exception:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        logo_url: null,
        company_name: null
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);