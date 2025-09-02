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