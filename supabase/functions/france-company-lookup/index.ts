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

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
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

    const { number, type } = await req.json();
    
    if (!number || !type) {
      return new Response(
        JSON.stringify({ error: 'Number and type are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🇫🇷 France Lookup: ${type} ${number}`);

    let apiUrl: string;
    let searchField: string;

    // Determine API endpoint based on type
    if (type === 'siren') {
      apiUrl = `https://api.insee.fr/entreprises/sirene/V3/siret`;
      searchField = 'siren';
    } else if (type === 'siret') {
      apiUrl = `https://api.insee.fr/entreprises/sirene/V3/siret`;
      searchField = 'siret';
    } else {
      throw new Error('Invalid type. Must be siren or siret');
    }

    // Call INSEE Sirene API (public, no authentication required for basic queries)
    const response = await fetch(`${apiUrl}?q=${searchField}:${number}&nombre=1`);
    
    if (!response.ok) {
      console.log('INSEE API Error:', response.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Company not found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    
    if (!data.etablissements || data.etablissements.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No company found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const etablissement = data.etablissements[0];
    const uniteLegale = etablissement.uniteLegale;

    // Extract company information
    let companyName = '';
    if (uniteLegale?.denominationUniteLegale) {
      companyName = uniteLegale.denominationUniteLegale;
    } else if (uniteLegale?.prenom1UniteLegale && uniteLegale?.nomUniteLegale) {
      companyName = `${uniteLegale.prenom1UniteLegale} ${uniteLegale.nomUniteLegale}`;
    } else {
      companyName = etablissement.adresseEtablissement?.denominationUsuelleEtablissement || 'Nom non disponible';
    }

    // Extract address information
    const adresse = etablissement.adresseEtablissement;
    let fullAddress = '';
    
    if (adresse) {
      const addressParts = [];
      if (adresse.numeroVoieEtablissement) addressParts.push(adresse.numeroVoieEtablissement);
      if (adresse.typeVoieEtablissement) addressParts.push(adresse.typeVoieEtablissement);
      if (adresse.libelleVoieEtablissement) addressParts.push(adresse.libelleVoieEtablissement);
      if (adresse.complementAdresseEtablissement) addressParts.push(adresse.complementAdresseEtablissement);
      
      fullAddress = addressParts.join(' ');
    }

    const result = {
      success: true,
      data: {
        companyName: companyName,
        address: fullAddress,
        postalCode: adresse?.codePostalEtablissement,
        city: adresse?.libelleCommuneEtablissement
      }
    };

    console.log('🎯 France Result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('France lookup error:', error);
    return createErrorResponse(error, corsHeaders);
  }
});