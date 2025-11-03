import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';

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
    // Rate limiting: 10 requests per minute
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting - Use more reliable IP detection
    const clientIp = req.headers.get('cf-connecting-ip') ||
                     req.headers.get('x-real-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0] ||
                     'rate-limited';
    
    const rateLimit = await checkRateLimit(
      supabase,
      clientIp,
      'company-lookup',
      { maxRequests: 10, windowSeconds: 60 }
    );

    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Trop de requêtes. Veuillez réessayer dans une minute.',
        retryAfter: 60
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        }
      });
    }

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
    
    // Try different formats for Luxembourg company numbers
    const formats = [
      cleanNumber, // Original format (e.g., B292940)
      cleanNumber.replace(/^B/, ''), // Without B prefix (e.g., 292940)
      number.trim().toUpperCase(), // With original spacing
      cleanNumber.replace(/(\w)(\d{6})/, '$1 $2'), // Add space after first letter
    ];
    
    console.log(`📋 Testing formats:`, formats);

    let companyData = null;
    
    // Skip OpenCorporates (paid service) - go directly to free sources
    console.log('🔍 Using only free Luxembourg sources');
      
    // Try Luxembourg Business Register website with enhanced scraping
    if (!companyData) {
      for (const format of formats) {
        try {
          console.log(`🔍 Trying LBR search for format: ${format}`);
          
          // Try both matricule and denomination search
          const searchTypes = ['matricule', 'denomination'];
          
          for (const searchType of searchTypes) {
            const lbrSearchUrl = `https://www.lbr.lu/mjrcs/rcs_presentation/controller/recherche_entreprise.jsp?recherche=${encodeURIComponent(format)}&type=${searchType}`;
            console.log(`🌐 LBR URL: ${lbrSearchUrl}`);
            
            const lbrResponse = await fetch(lbrSearchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
              }
            });
            
            if (lbrResponse.ok) {
              const html = await lbrResponse.text();
              console.log(`📄 HTML length: ${html.length}`);
              
              // Enhanced regex patterns for Luxembourg business register
              const patterns = [
                // Look for company name in table cells
                /<td[^>]*class="[^"]*nom[^"]*"[^>]*>([^<]+)<\/td>/i,
                /<td[^>]*>\s*([A-Z][^<]{10,})\s*<\/td>/g,
                // Look for address patterns
                /<td[^>]*class="[^"]*adresse[^"]*"[^>]*>([^<]+)<\/td>/i,
                // Generic patterns
                /<tr[^>]*>.*?<td[^>]*>([^<]{20,})<\/td>.*?<\/tr>/gi,
              ];
              
              let foundName = null;
              let foundAddress = null;
              
              // Try to extract company name
              for (const pattern of patterns) {
                const matches = html.matchAll(pattern);
                for (const match of matches) {
                  const text = match[1]?.trim();
                  if (text && 
                      !text.includes('Aucun') && 
                      !text.includes('Recherche') &&
                      !text.includes('Résultat') &&
                      text.length > 3 &&
                      /[A-Za-z]/.test(text)) {
                    foundName = text;
                    console.log(`📋 Found potential name: ${foundName}`);
                    break;
                  }
                }
                if (foundName) break;
              }
              
              // Look for "no results" indicators
              const noResultsIndicators = [
                /aucun.*résultat/i,
                /aucune.*entreprise/i,
                /pas.*trouvé/i,
                /0.*résultat/i
              ];
              
              const hasNoResults = noResultsIndicators.some(pattern => pattern.test(html));
              
              if (foundName && !hasNoResults) {
                companyData = {
                  companyName: foundName,
                  address: foundAddress || 'Informations complètes disponibles sur lbr.lu',
                  postalCode: '',
                  city: 'Luxembourg',
                  registrationNumber: format
                };
                console.log('✅ LBR data extracted:', companyData);
                break;
              } else {
                console.log(`❌ No valid data found in HTML for ${format} (type: ${searchType})`);
                if (hasNoResults) {
                  console.log('🚫 "No results" indicator found in HTML');
                }
              }
            } else {
              console.log(`❌ LBR request failed for ${format}: ${lbrResponse.status}`);
            }
          }
          
          if (companyData) break;
        } catch (lbrError) {
          console.log(`LBR scraping error for ${format}:`, lbrError.message);
        }
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