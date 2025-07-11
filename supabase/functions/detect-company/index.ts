import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface DetectCompanyRequest {
  origin?: string;
  email?: string;
  companyId?: string;
  companyParam?: string;
  companySlug?: string;
}

serve(async (req: Request) => {
  console.log("Detect company - Request received:", req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestData: DetectCompanyRequest = {};
    
    if (req.method === 'POST') {
      requestData = await req.json();
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let detectedCompanyId: string | null = null;
    let companyInfo: any = null;

    // Method 1: Use provided company ID
    if (requestData.companyId) {
      detectedCompanyId = requestData.companyId;
    }

    // Method 2: Detect from URL parameters (company name/slug)
    if (!detectedCompanyId && (requestData.companyParam || requestData.companySlug)) {
      const identifier = requestData.companyParam || requestData.companySlug;
      console.log("Trying to detect company from URL param:", identifier);
      
      // Try to find company by subdomain first
      const { data: domainRecord, error: domainError } = await supabase
        .from('company_domains')
        .select('company_id, companies(id, name, primary_color, secondary_color, accent_color, logo_url)')
        .eq('subdomain', identifier)
        .eq('is_active', true)
        .single();

      if (!domainError && domainRecord) {
        detectedCompanyId = domainRecord.company_id;
        companyInfo = domainRecord.companies;
        console.log("Company found via subdomain parameter:", companyInfo);
      } else {
        // Fallback: try to find by company name
        const { data: companyRecord, error: companyError } = await supabase
          .from('companies')
          .select('id, name, primary_color, secondary_color, accent_color, logo_url')
          .ilike('name', `%${identifier}%`)
          .single();
        
        if (!companyError && companyRecord) {
          detectedCompanyId = companyRecord.id;
          companyInfo = companyRecord;
          console.log("Company found via name parameter:", companyInfo);
        }
      }
    }

    // Method 3: Detect from origin/domain
    if (!detectedCompanyId) {
      const origin = requestData.origin || req.headers.get('origin') || req.headers.get('referer') || '';
      console.log("Origin for company detection:", origin);
      
      if (origin) {
        // Extract subdomain from origin
        // Ex: https://client1.leazr.co -> client1
        if (origin.includes('.leazr.co') || origin.includes('.localhost')) {
          const hostname = new URL(origin).hostname;
          const subdomain = hostname.split('.')[0];
          
          console.log("Extracted subdomain:", subdomain);
          
          // Look up company by subdomain
          const { data: domainRecord, error: domainError } = await supabase
            .from('company_domains')
            .select('company_id, companies(id, name, primary_color, secondary_color, accent_color, logo_url)')
            .eq('subdomain', subdomain)
            .eq('is_active', true)
            .single();

          if (!domainError && domainRecord) {
            detectedCompanyId = domainRecord.company_id;
            companyInfo = domainRecord.companies;
            console.log("Company found via subdomain:", companyInfo);
          }
        }
      }
    }

    // Method 3: Try to detect from email domain (for known corporate domains)
    if (!detectedCompanyId && requestData.email) {
      const emailDomain = requestData.email.split('@')[1];
      console.log("Trying to detect company from email domain:", emailDomain);
      
      // For now, we could implement a lookup table of email domains to companies
      // This is a simple example - in practice you might want a more sophisticated mapping
      if (emailDomain === 'itakecare.be') {
        const { data: companyByName } = await supabase
          .from('companies')
          .select('id, name, primary_color, secondary_color, accent_color, logo_url')
          .eq('name', 'iTakecare')
          .single();
        
        if (companyByName) {
          detectedCompanyId = companyByName.id;
          companyInfo = companyByName;
        }
      }
    }

    // Method 4: Default fallback - get first active company (for development)
    if (!detectedCompanyId) {
      console.log("No company detected, using default");
      const { data: defaultCompany } = await supabase
        .from('companies')
        .select('id, name, primary_color, secondary_color, accent_color, logo_url')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (defaultCompany) {
        detectedCompanyId = defaultCompany.id;
        companyInfo = defaultCompany;
      }
    }

    // If we have a company ID but no company info, fetch it
    if (detectedCompanyId && !companyInfo) {
      const { data: fetchedCompany } = await supabase
        .from('companies')
        .select('id, name, primary_color, secondary_color, accent_color, logo_url')
        .eq('id', detectedCompanyId)
        .single();
      
      companyInfo = fetchedCompany;
    }

    return new Response(
      JSON.stringify({
        success: true,
        companyId: detectedCompanyId,
        company: companyInfo,
        detectionMethod: detectedCompanyId === requestData.companyId ? 'provided' : 
                        companyInfo ? 'domain' : 'default'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Erreur dans detect-company:", error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});