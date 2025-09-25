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

    console.log(`🇧🇪 Belgium Lookup: ${number}`);

    // Clean the number (remove dots and spaces)
    const cleanNumber = number.replace(/[\s.]/g, '');
    
    // Format for CBE: add dots if not present (0000.000.000 format)
    const formattedNumber = `${cleanNumber.substring(0, 4)}.${cleanNumber.substring(4, 7)}.${cleanNumber.substring(7, 10)}`;

    // Try CBE public API (free but limited)
    const cbePublicUrl = `https://kbopub.economie.fgov.be/kbopub/zoekenondernemingform.html`;
    
    try {
      // Try scraping the public CBE website
      const response = await fetch(`https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=${cleanNumber}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Belgium Company Lookup)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Extract company information from HTML
        const nameMatch = html.match(/<h3[^>]*>([^<]+)<\/h3>/i) || 
                         html.match(/Dénomination[^:]*:\s*([^<\n]+)/i) ||
                         html.match(/Denomination[^:]*:\s*([^<\n]+)/i);
                         
        const addressMatch = html.match(/Adresse[^:]*:\s*([^<\n]+)/i) ||
                           html.match(/Adres[^:]*:\s*([^<\n]+)/i);
        
        if (nameMatch && nameMatch[1]) {
          const result = {
            success: true,
            data: {
              companyName: nameMatch[1].trim(),
              address: addressMatch?.[1]?.trim() || '',
              postalCode: '',
              city: 'Belgique'
            }
          };

          console.log('🎯 Belgium CBE Result:', result);
          
          return new Response(
            JSON.stringify(result),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    } catch (apiError) {
      console.log('CBE scraping failed, using fallback:', apiError instanceof Error ? apiError.message : 'Unknown error');
    }

    // Fallback: return basic info with formatted number
    const fallbackResult = {
      success: true,
      data: {
        companyName: `Entreprise belge ${formattedNumber}`,
        address: 'Adresse à compléter',
        postalCode: '',
        city: 'Belgique'
      }
    };

    console.log('🎯 Belgium Fallback Result:', fallbackResult);

    return new Response(
      JSON.stringify(fallbackResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Belgium lookup error:', error);
    
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