import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanySearchRequest {
  query: string;
  country: string;
  searchType: 'name' | 'vat' | 'siren' | 'siret';
  limit?: number;
}

interface CompanyResult {
  name: string;
  country?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  vat_number?: string;
  siren?: string;
  siret?: string;
  sector?: string;
  legal_form?: string;
  creation_date?: string;
  employee_count?: string;
  source: string;
  confidence: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, country, searchType, limit = 10 }: CompanySearchRequest = await req.json();

    console.log(`[company-search] Recherche : "${query}" (${searchType}) dans ${country}`);

    // Vérifier le cache d'abord
    const cacheKey = `${query.toLowerCase().trim()}_${searchType}_${country}`;
    const { data: cachedData } = await supabase
      .from('company_enrichment_cache')
      .select('*')
      .eq('search_key', cacheKey)
      .eq('search_type', searchType)
      .eq('country_code', country)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedData) {
      console.log('[company-search] Résultat trouvé en cache');
      return new Response(JSON.stringify({
        success: true,
        results: cachedData.company_data.results || [cachedData.company_data],
        source: 'cache',
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let results: CompanyResult[] = [];

    // Recherche par nom via OpenCorporates API
    if (searchType === 'name') {
      results = await searchByName(query, country, limit);
    } else {
      // Recherche par identifiant via les endpoints existants
      results = await searchByIdentifier(query, country, searchType, supabase);
    }

    // Mettre en cache le résultat si trouvé
    if (results.length > 0) {
      try {
        await supabase
          .from('company_enrichment_cache')
          .insert({
            search_key: cacheKey,
            search_type: searchType,
            country_code: country,
            company_data: { results },
            source: results[0]?.source || 'opencorporates',
            confidence_score: results[0]?.confidence || 0.8
          });
        console.log('[company-search] Résultat mis en cache');
      } catch (cacheError) {
        console.log('[company-search] Erreur cache (ignorée):', cacheError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      source: 'api',
      cached: false,
      count: results.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[company-search] Erreur:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erreur lors de la recherche d\'entreprise',
      results: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function searchByName(query: string, country: string, limit: number): Promise<CompanyResult[]> {
  console.log(`[company-search] Recherche gratuite pour "${query}" dans ${country}`);
  
  // Use only free sources - return empty array to force using identifier search
  // This will redirect to the specific country functions that use free APIs
  console.log(`[company-search] Redirection vers la recherche par identifiant pour des sources gratuites`);
  return [];
}

async function searchByIdentifier(query: string, country: string, searchType: string, supabase: any): Promise<CompanyResult[]> {
  try {
    let functionName = '';
    let params: any = {};

    switch (true) {
      case country === 'FR' && (searchType === 'siren' || searchType === 'siret'):
        functionName = 'france-company-lookup';
        params = { number: query, type: searchType };
        break;
      case country === 'BE' && (searchType === 'siren' || searchType === 'vat'):
        // Rediriger les numéros belges vers la fonction améliorée
        functionName = 'belgium-company-lookup-enhanced';
        params = { number: query.replace(/^BE/, '') }; // Enlever le préfixe BE si présent
        break;
      case country === 'LU':
        functionName = 'luxembourg-company-lookup';
        params = { number: query };
        break;
      case searchType === 'vat':
        // Pour les autres numéros TVA (non belges), utiliser VIES
        return await searchVATNumber(query, country);
      default:
        throw new Error(`Recherche non supportée: ${searchType} pour ${country}`);
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: params
    });

    if (error) {
      throw error;
    }

    if (data && data.success && data.data) {
      const companyInfo = data.data;
      return [{
        name: companyInfo.companyName || companyInfo.name,
        country: country,
        address: companyInfo.address,
        city: companyInfo.city,
        postal_code: companyInfo.postalCode || companyInfo.postal_code,
        vat_number: companyInfo.vat_number || companyInfo.company_number,
        siren: companyInfo.siren,
        siret: companyInfo.siret,
        sector: companyInfo.sector || companyInfo.activity,
        legal_form: companyInfo.legal_form,
        creation_date: companyInfo.creation_date,
        source: functionName,
        confidence: 0.9
      }];
    } else if (data && data.name) {
      // Format pour les anciennes fonctions
      return [{
        name: data.name,
        country: country,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        vat_number: data.vat_number || data.company_number,
        siren: data.siren,
        siret: data.siret,
        sector: data.sector || data.activity,
        legal_form: data.legal_form,
        creation_date: data.creation_date,
        source: functionName,
        confidence: 0.9
      }];
    }

    return [];

  } catch (error) {
    console.error('[company-search] Erreur recherche identifiant:', error);
    return [];
  }
}

async function searchVATNumber(vatNumber: string, country: string): Promise<CompanyResult[]> {
  console.log(`[company-search] Recherche VAT via VIES: ${vatNumber} (${country})`);
  
  try {
    // Use VIES service for VAT validation (free EU service)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const viesResponse = await supabase.functions.invoke('vies-verify', {
      body: { vatNumber, country }
    });

    if (viesResponse.error) {
      console.log(`[company-search] Erreur VIES: ${viesResponse.error.message}`);
      return [];
    }

    const viesData = viesResponse.data;
    
    if (viesData?.valid && viesData.companyName) {
      return [{
        name: viesData.companyName,
        country: country.toUpperCase(),
        address: viesData.address || '',
        city: '',
        postal_code: '',
        vat_number: `${country.toUpperCase()}${vatNumber}`,
        source: 'VIES',
        confidence: 0.95
      }];
    }
    
    return [];
  } catch (error) {
    console.log(`[company-search] Erreur VIES: ${error.message}`);
    return [];
  }
}

function calculateConfidence(query: string, companyName: string): number {
  const queryLower = query.toLowerCase().trim();
  const nameLower = companyName.toLowerCase().trim();
  
  if (nameLower === queryLower) return 1.0;
  if (nameLower.includes(queryLower)) return 0.9;
  if (queryLower.includes(nameLower)) return 0.8;
  
  // Calcul basique de similarité
  const words1 = queryLower.split(/\s+/);
  const words2 = nameLower.split(/\s+/);
  const commonWords = words1.filter(word => words2.includes(word));
  
  return Math.max(0.3, commonWords.length / Math.max(words1.length, words2.length));
}