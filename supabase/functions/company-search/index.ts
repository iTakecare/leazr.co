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
  try {
    // Recherche via OpenCorporates API (gratuite avec limitations)
    const searchUrl = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(query)}&jurisdiction_code=${country.toLowerCase()}&per_page=${limit}&format=json`;
    
    console.log(`[company-search] OpenCorporates URL: ${searchUrl}`);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'iTakecare-Search/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenCorporates API error: ${response.status}`);
    }

    const data = await response.json();
    const companies = data.results?.companies || [];

    return companies.map((item: any) => {
      const company = item.company;
      return {
        name: company.name,
        country: company.jurisdiction_code?.toUpperCase(),
        address: company.registered_address_in_full,
        city: company.registered_address?.locality,
        postal_code: company.registered_address?.postal_code,
        vat_number: company.company_number,
        sector: company.company_type,
        legal_form: company.company_type,
        creation_date: company.incorporation_date,
        source: 'opencorporates',
        confidence: calculateConfidence(query, company.name)
      } as CompanyResult;
    });

  } catch (error) {
    console.error('[company-search] Erreur OpenCorporates:', error);
    return [];
  }
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
      case country === 'BE':
        functionName = 'belgium-company-lookup';
        params = { number: query };
        break;
      case country === 'LU':
        functionName = 'luxembourg-company-lookup';
        params = { number: query };
        break;
      case searchType === 'vat':
        // Pour les numéros TVA, essayer différentes sources
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

    if (data && data.name) {
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
  try {
    // Essayer d'abord avec VIES (UE)
    const viesUrl = `http://ec.europa.eu/taxation_customs/vies/services/checkVatService`;
    
    // Pour les numéros TVA, on peut aussi essayer via OpenCorporates
    const cleanVat = vatNumber.replace(/[^\w]/g, '');
    const searchUrl = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(cleanVat)}&jurisdiction_code=${country.toLowerCase()}&format=json&per_page=5`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'iTakecare-Search/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const companies = data.results?.companies || [];
      
      return companies
        .filter((item: any) => {
          const company = item.company;
          return company.company_number && company.company_number.includes(cleanVat.slice(-8));
        })
        .map((item: any) => {
          const company = item.company;
          return {
            name: company.name,
            country: company.jurisdiction_code?.toUpperCase(),
            address: company.registered_address_in_full,
            city: company.registered_address?.locality,
            postal_code: company.registered_address?.postal_code,
            vat_number: vatNumber,
            sector: company.company_type,
            legal_form: company.company_type,
            source: 'opencorporates-vat',
            confidence: 0.8
          } as CompanyResult;
        });
    }

    return [];

  } catch (error) {
    console.error('[company-search] Erreur recherche TVA:', error);
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