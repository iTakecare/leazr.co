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

    console.log(`🇧🇪 Enhanced Belgium Lookup: ${number}`);

    // Clean the number (remove BE prefix, dots, and spaces)
    let cleanNumber = number.toString().replace(/^BE/i, '').replace(/[\s.]/g, '');
    
    // Ensure we have exactly 10 digits
    if (cleanNumber.length !== 10) {
      throw new Error(`Numéro belge invalide: ${number} (doit contenir 10 chiffres)`);
    }
    
    // Format for CBE: add dots (0000.000.000 format)
    const formattedNumber = `${cleanNumber.substring(0, 4)}.${cleanNumber.substring(4, 7)}.${cleanNumber.substring(7, 10)}`;

    console.log(`📋 Formatted number: ${formattedNumber}`);

    // Try multiple free Belgian sources
    let companyData = null;

    // 1. Try CBE Open Data Portal (free but requires proper handling)
    try {
      console.log('🔍 Trying CBE Open Data');
      const cbeUrl = `https://opendata.belgium.be/en/organization/kbo-bce`;
      
      // Note: CBE doesn't have a direct free API, but we can try scraping the public website
      const publicCbeUrl = `https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=${cleanNumber}`;
      
      const response = await fetch(publicCbeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Belgium Company Search)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        console.log(`📄 CBE HTML length: ${html.length}`);
        
        // Extract company information using regex patterns
        const patterns = {
          name: [
            /<h3[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h3>/i,
            /<div[^>]*class="[^"]*denomination[^"]*"[^>]*>([^<]+)<\/div>/i,
            /<td[^>]*>Dénomination[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
            /<strong>([A-Z][^<]{10,})<\/strong>/i
          ],
          address: [
            /<td[^>]*>Adresse[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
            /<div[^>]*class="[^"]*address[^"]*"[^>]*>([^<]+)<\/div>/i
          ],
          status: [
            /<td[^>]*>Statut[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
            /<div[^>]*class="[^"]*status[^"]*"[^>]*>([^<]+)<\/div>/i
          ]
        };
        
        let foundName = null;
        let foundAddress = null;
        let foundStatus = null;

        // Try to extract company name
        for (const pattern of patterns.name) {
          const match = html.match(pattern);
          if (match && match[1]) {
            const text = match[1].trim().replace(/\s+/g, ' ');
            if (text && 
                !text.toLowerCase().includes('aucun') && 
                !text.toLowerCase().includes('recherche') &&
                text.length > 3) {
              foundName = text;
              console.log(`✅ Found name: ${foundName}`);
              break;
            }
          }
        }

        // Try to extract address
        for (const pattern of patterns.address) {
          const match = html.match(pattern);
          if (match && match[1]) {
            foundAddress = match[1].trim().replace(/\s+/g, ' ');
            console.log(`📍 Found address: ${foundAddress}`);
            break;
          }
        }

        // Try to extract status
        for (const pattern of patterns.status) {
          const match = html.match(pattern);
          if (match && match[1]) {
            foundStatus = match[1].trim();
            console.log(`📊 Found status: ${foundStatus}`);
            break;
          }
        }

        if (foundName) {
          companyData = {
            companyName: foundName,
            address: foundAddress || '',
            postalCode: '',
            city: 'Belgique',
            status: foundStatus || 'Actif',
            vat_number: `BE${cleanNumber}`,
            company_number: formattedNumber
          };
        }
      }
    } catch (cbeError) {
      console.log('CBE lookup failed:', cbeError.message);
    }

    // 2. Try Belgian company database alternatives
    if (!companyData) {
      try {
        console.log('🔍 Trying alternative Belgian sources');
        
        // Try Trends.be database (public info)
        const trendsUrl = `https://trends.levif.be/economie/entreprises/recherche?q=${encodeURIComponent(formattedNumber)}`;
        
        const trendsResponse = await fetch(trendsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Company Search Bot)',
            'Accept': 'text/html'
          }
        });

        if (trendsResponse.ok) {
          const html = await trendsResponse.text();
          
          // Look for company information in the page
          const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                          html.match(/<title>([^<]+) - Trends/i);
          
          if (nameMatch && nameMatch[1] && !nameMatch[1].includes('Recherche')) {
            companyData = {
              companyName: nameMatch[1].trim(),
              address: 'Informations détaillées disponibles',
              postalCode: '',
              city: 'Belgique',
              vat_number: `BE${cleanNumber}`,
              company_number: formattedNumber
            };
          }
        }
      } catch (trendsError) {
        console.log('Trends lookup failed:', trendsError.message);
      }
    }

    if (companyData && companyData.companyName) {
      const result = {
        success: true,
        data: companyData
      };

      console.log('🎯 Belgium Enhanced Result:', result);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fallback: return basic info with formatted number
    const fallbackResult = {
      success: true,
      data: {
        companyName: `Entreprise belge ${formattedNumber}`,
        address: 'Adresse à compléter - Consultez kbopub.economie.fgov.be',
        postalCode: '',
        city: 'Belgique',
        vat_number: `BE${cleanNumber}`,
        company_number: formattedNumber
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
    console.error('Belgium enhanced lookup error:', error);
    
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