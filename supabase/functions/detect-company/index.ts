
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DetectCompanyRequest {
  origin: string;
  companyParam?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { origin, companyParam }: DetectCompanyRequest = await req.json()
    
    console.log('🔍 Detect company request:', { origin, companyParam })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let companyId: string | null = null
    let company: any = null
    let detectionMethod: 'subdomain' | 'param' | 'default' = 'default'

    // Extract subdomain from origin
    const url = new URL(origin)
    const hostname = url.hostname
    const parts = hostname.split('.')
    
    // Check if it's a subdomain (not www or main domain)
    let subdomain: string | null = null
    if (parts.length > 2 && parts[0] !== 'www' && hostname !== 'leazr.co') {
      subdomain = parts[0]
    }

    console.log('🔍 Extracted subdomain:', subdomain)

    // 1. Try to detect by subdomain first
    if (subdomain) {
      const { data: domainData, error: domainError } = await supabase
        .from('company_domains')
        .select(`
          company_id,
          companies (
            id,
            name,
            logo_url,
            primary_color,
            secondary_color,
            accent_color
          )
        `)
        .eq('subdomain', subdomain)
        .eq('is_active', true)
        .single()

      if (!domainError && domainData) {
        companyId = domainData.company_id
        company = domainData.companies
        detectionMethod = 'subdomain'
        console.log('✅ Company found by subdomain:', company?.name)
      }
    }

    // 2. If not found by subdomain, try by company parameter
    if (!companyId && companyParam) {
      // First try to find by company ID
      let { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, logo_url, primary_color, secondary_color, accent_color')
        .eq('id', companyParam)
        .single()

      // If not found by ID, try by name (case insensitive)
      if (companyError) {
        const { data: companyByName, error: nameError } = await supabase
          .from('companies')
          .select('id, name, logo_url, primary_color, secondary_color, accent_color')
          .ilike('name', companyParam)
          .single()

        if (!nameError && companyByName) {
          companyData = companyByName
          companyError = null
        }
      }

      if (!companyError && companyData) {
        companyId = companyData.id
        company = companyData
        detectionMethod = 'param'
        console.log('✅ Company found by parameter:', company.name)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        companyId,
        company,
        detectionMethod,
        subdomain
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Error in detect-company function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
