import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { number } = await req.json();
    
    if (!number) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Company number is required' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🇧🇪 Enhanced Belgium Lookup: ${number}`);
    
    // Clean and format the number
    const cleanNumber = number.replace(/\D/g, '');
    const formattedNumber = cleanNumber.padStart(10, '0');
    const displayNumber = `${formattedNumber.slice(0, 4)}.${formattedNumber.slice(4, 7)}.${formattedNumber.slice(7)}`;
    console.log(`📋 Formatted number: ${displayNumber}`);

    let result = null;

    // Method 1: Try VIES first (most reliable for basic validation)
    console.log('🔍 Step 1: Trying VIES validation');
    try {
      const viesUrl = `https://ec.europa.eu/taxation_customs/vies/services/checkVatService`;
      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soap:Header>
  </soap:Header>
  <soap:Body>
    <tns1:checkVat>
      <tns1:countryCode>BE</tns1:countryCode>
      <tns1:vatNumber>${formattedNumber}</tns1:vatNumber>
    </tns1:checkVat>
  </soap:Body>
</soap:Envelope>`;

      const viesResponse = await fetch(viesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        body: soapBody
      });

      if (viesResponse.ok) {
        const xmlText = await viesResponse.text();
        console.log(`📊 VIES XML Response: ${xmlText.substring(0, 500)}...`);
        
        // Parse VIES response
        const validMatch = xmlText.match(/<ns2:valid>([^<]+)<\/ns2:valid>/);
        const nameMatch = xmlText.match(/<ns2:name>([^<]+)<\/ns2:name>/);
        const addressMatch = xmlText.match(/<ns2:address>([^<]+)<\/ns2:address>/);
        
        if (validMatch && validMatch[1] === 'true') {
          console.log(`✅ VIES validation successful`);
          
          const viesName = nameMatch ? nameMatch[1].trim() : null;
          const viesAddress = addressMatch ? addressMatch[1].trim() : null;
          
          // Parse address to extract postal code and city
          let postalCode = '';
          let city = '';
          let cleanAddress = viesAddress;
          
          if (viesAddress) {
            // Belgian postal code pattern: 4 digits followed by city
            const postalMatch = viesAddress.match(/(\d{4})\s+([A-Za-z][A-Za-z\s\-']+)/);
            if (postalMatch) {
              postalCode = postalMatch[1];
              city = postalMatch[2].trim();
              // Remove postal code and city from address
              cleanAddress = viesAddress.replace(/\d{4}\s+[A-Za-z][A-Za-z\s\-']+.*$/, '').trim();
            }
          }
          
          result = {
            companyName: viesName || "Nom non disponible",
            address: cleanAddress || "Adresse à compléter",
            postalCode: postalCode,
            city: city,
            status: "Actif (VIES validé)",
            vat_number: `BE${formattedNumber}`,
            company_number: displayNumber
          };
        }
      }
    } catch (error) {
      console.error('❌ VIES lookup failed:', error);
    }

    // Method 2: Try Company-web.be for enrichment
    if (!result || result.companyName === "Nom non disponible") {
      console.log('🔍 Step 2: Trying Company-web.be');
      try {
        const companyWebUrl = `https://www.companyweb.be/fr/company/${formattedNumber}`;
        const response = await fetch(companyWebUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-BE,fr;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        if (response.ok) {
          const html = await response.text();
          console.log(`📄 Company-web HTML length: ${html.length}`);
          
          // Extract company name
          const namePatterns = [
            /<h1[^>]*class="[^"]*company-title[^"]*"[^>]*>(.*?)<\/h1>/i,
            /<h1[^>]*>(.*?)<\/h1>/i,
            /<title>([^|]+)/i
          ];
          
          let companyName = null;
          for (const pattern of namePatterns) {
            const match = html.match(pattern);
            if (match) {
              companyName = match[1].trim().replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
              if (companyName && !companyName.includes('404') && !companyName.includes('Error')) {
                console.log(`✅ Company-web name found: ${companyName}`);
                break;
              }
            }
          }
          
          // Extract address
          const addressPatterns = [
            /<div[^>]*class="[^"]*address[^"]*"[^>]*>(.*?)<\/div>/is,
            /<span[^>]*class="[^"]*address[^"]*"[^>]*>(.*?)<\/span>/is,
            /Adresse\s*:?\s*<[^>]*>(.*?)<\/[^>]*>/is
          ];
          
          let address = null;
          let postalCode = '';
          let city = '';
          
          for (const pattern of addressPatterns) {
            const match = html.match(pattern);
            if (match) {
              const rawAddress = match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              
              // Extract postal code and city
              const postalMatch = rawAddress.match(/(\d{4})\s+([A-Za-z][A-Za-z\s\-']+)/);
              if (postalMatch) {
                postalCode = postalMatch[1];
                city = postalMatch[2].trim();
                address = rawAddress.replace(/\d{4}\s+[A-Za-z][A-Za-z\s\-']+.*$/, '').trim();
              } else {
                address = rawAddress;
              }
              
              if (address) {
                console.log(`✅ Company-web address found: ${address}`);
                break;
              }
            }
          }
          
          if (companyName) {
            result = {
              companyName: companyName,
              address: address || result?.address || "Adresse à compléter",
              postalCode: postalCode || result?.postalCode || '',
              city: city || result?.city || '',
              status: "Actif",
              vat_number: `BE${formattedNumber}`,
              company_number: displayNumber
            };
          }
        }
      } catch (error) {
        console.error('❌ Company-web lookup failed:', error);
      }
    }

    // Method 3: Try CBE Open Data Portal
    if (!result) {
      console.log('🔍 Step 3: Trying CBE Open Data Portal');
      try {
        const cbeUrl = `https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${formattedNumber}&actionLu=Rechercher`;
        const cbeResponse = await fetch(cbeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-BE,fr;q=0.9,en;q=0.8,nl;q=0.7',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        if (cbeResponse.ok) {
          const html = await cbeResponse.text();
          console.log(`📄 CBE HTML length: ${html.length}`);
          
          // More robust patterns for CBE
          const namePatterns = [
            /<title>([^|<]+)/i,
            /<h1[^>]*>(.*?)<\/h1>/i,
            /<div[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/div>/i
          ];
          
          let companyName = null;
          for (const pattern of namePatterns) {
            const match = html.match(pattern);
            if (match) {
              const name = match[1].trim().replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
              if (name && !name.includes('KBO') && !name.includes('Search') && name.length > 3) {
                companyName = name;
                console.log(`✅ CBE name found: ${companyName}`);
                break;
              }
            }
          }
          
          if (companyName && companyName !== "Gegevens van de geregistreerde entiteit") {
            result = {
              companyName: companyName,
              address: "Adresse à compléter",
              postalCode: "",
              city: "",
              status: "Actif",
              vat_number: `BE${formattedNumber}`,
              company_number: displayNumber
            };
          }
        }
      } catch (error) {
        console.error('❌ CBE lookup failed:', error);
      }
    }

    // Method 4: Try alternative Belgian sources
    if (!result) {
      console.log('🔍 Step 4: Trying alternative sources');
      try {
        // Try Pages d'Or Belgium
        const pagesOrUrl = `https://www.pagesdor.be/search?what=${formattedNumber}`;
        const pagesOrResponse = await fetch(pagesOrUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        if (pagesOrResponse.ok) {
          const html = await pagesOrResponse.text();
          
          const namePatterns = [
            /<h1[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/h1>/i,
            /<h2[^>]*class="[^"]*name[^"]*"[^>]*>(.*?)<\/h2>/i,
            /<div[^>]*class="[^"]*business-name[^"]*"[^>]*>(.*?)<\/div>/i
          ];
          
          for (const pattern of namePatterns) {
            const match = html.match(pattern);
            if (match) {
              const name = match[1].trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
              if (name && name.length > 3) {
                result = {
                  companyName: name,
                  address: "Adresse à compléter",
                  postalCode: "",
                  city: "",
                  status: "Actif",
                  vat_number: `BE${formattedNumber}`,
                  company_number: displayNumber
                };
                console.log(`✅ Pages d'Or name found: ${name}`);
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Alternative sources lookup failed:', error);
      }
    }

    if (result) {
      console.log(`🎯 Belgium Enhanced Result: ${JSON.stringify({
        success: true,
        data: result
      })}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: result
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`❌ No data found for ${displayNumber} in any source`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Company not found in available free sources',
          searched_number: displayNumber,
          sources_tried: ['VIES', 'Company-web.be', 'CBE Open Data', 'Pages d\'Or Belgium']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('🚨 Belgium Enhanced Lookup Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});