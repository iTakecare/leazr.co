import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { number } = await req.json();
    
    if (!number) {
      return new Response(
        JSON.stringify({ error: 'Company number is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🇱🇺 Luxembourg Lookup: ${number}`);

    const cleanNumber = number.replace(/\s/g, '').toUpperCase();

    // Try Luxembourg Business Register API
    try {
      // Try the public Luxembourg Business Register search API
      const searchUrl = `https://www.lbr.lu/mjrcs/rcs_presentation/index.jsp`;
      
      // Attempt to use OpenCorporates as a fallback for Luxembourg data
      const openCorpUrl = `https://api.opencorporates.com/v0.4/companies/lu/${cleanNumber}`;
      
      let companyData = null;
      
      // Try OpenCorporates first (has Luxembourg data)
      try {
        console.log(`🔍 Trying OpenCorporates for ${cleanNumber}`);
        const openCorpResponse = await fetch(openCorpUrl, {
          headers: {
            'User-Agent': 'Luxembourg Company Lookup Service'
          }
        });
        
        if (openCorpResponse.ok) {
          const openCorpData = await openCorpResponse.json();
          if (openCorpData?.results?.company) {
            const company = openCorpData.results.company;
            companyData = {
              companyName: company.name || '',
              address: company.registered_address_in_full || company.address || '',
              postalCode: '',
              city: company.jurisdiction_code === 'lu' ? 'Luxembourg' : '',
              registrationNumber: company.company_number
            };
            console.log('✅ OpenCorporates data found:', companyData);
          }
        }
      } catch (openCorpError) {
        console.log('OpenCorporates not available:', openCorpError.message);
      }
      
      // If no data found, try Luxembourg Business Register website scraping
      if (!companyData) {
        try {
          console.log(`🔍 Trying Luxembourg Business Register search for ${cleanNumber}`);
          const lbrSearchUrl = `https://www.lbr.lu/mjrcs/rcs_presentation/controller/recherche_entreprise.jsp?recherche=${cleanNumber}&type=matricule`;
          
          const lbrResponse = await fetch(lbrSearchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (lbrResponse.ok) {
            const html = await lbrResponse.text();
            
            // Basic extraction from HTML (simplified approach)
            const nameMatch = html.match(/<td[^>]*>([^<]+)<\/td>/);
            
            if (nameMatch && nameMatch[1] && !nameMatch[1].includes('Aucun')) {
              companyData = {
                companyName: nameMatch[1].trim(),
                address: 'Informations complètes disponibles sur lbr.lu',
                postalCode: '',
                city: 'Luxembourg'
              };
              console.log('✅ LBR data extracted:', companyData);
            }
          }
        } catch (lbrError) {
          console.log('LBR scraping failed:', lbrError.message);
        }
      }
      
      if (companyData && companyData.companyName && companyData.companyName.trim() !== '') {
        const successResponse = {
          success: true,
          data: companyData
        };
        
        console.log('🎯 Luxembourg Result:', successResponse);
        return new Response(
          JSON.stringify(successResponse),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        // No valid data found
        console.log('❌ No valid company data found for:', cleanNumber);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Aucune entreprise trouvée avec le numéro RCS ${cleanNumber}. Veuillez vérifier le numéro ou consulter directement lbr.lu` 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

    } catch (apiError) {
      console.error('Luxembourg API error:', apiError);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Luxembourg company lookup temporarily unavailable' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Luxembourg lookup error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});