import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

interface ApiKeyRecord {
  id: string
  company_id: string
  permissions: any
  is_active: boolean
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 CATALOG API REQUEST:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    
    console.log('📝 URL PARSING:', {
      pathname: url.pathname,
      pathParts: pathParts,
      searchParams: Object.fromEntries(url.searchParams.entries())
    })
    
    // Expected format: /functions/v1/catalog-api/v1/{companyId}/{endpoint} or /catalog-api/v1/{companyId}/{endpoint}
    let version, companyIdOrSlug, endpoint, subPaths
    
    console.log('🔍 PATH ANALYSIS:', { pathParts })
    
    // Check if called via /functions/v1/catalog-api/...
    if (pathParts[0] === 'functions' && pathParts[1] === 'v1' && pathParts[2] === 'catalog-api') {
      // Format: /functions/v1/catalog-api/v1/{companyId}/{endpoint}
      console.log('📡 USING FUNCTIONS PATH FORMAT')
      if (pathParts.length < 6) {
        console.error('❌ INVALID PATH LENGTH FOR FUNCTIONS FORMAT:', pathParts.length)
        return new Response(
          JSON.stringify({ error: 'Invalid API path', expected: '/functions/v1/catalog-api/v1/{companyId}/{endpoint}', received: pathParts }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      [, , , version, companyIdOrSlug, endpoint, ...subPaths] = pathParts
    } else {
      // Direct format: /catalog-api/v1/{companyId}/{endpoint}
      console.log('📡 USING DIRECT PATH FORMAT')
      if (pathParts.length < 4) {
        console.error('❌ INVALID PATH LENGTH FOR DIRECT FORMAT:', pathParts.length)
        return new Response(
          JSON.stringify({ error: 'Invalid API path', expected: '/catalog-api/v1/{companyId}/{endpoint}', received: pathParts }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      [, version, companyIdOrSlug, endpoint, ...subPaths] = pathParts
    }
    
    console.log('✅ PARSED PARAMETERS:', { version, companyIdOrSlug, endpoint, subPaths })
    
    if (version !== 'v1') {
      return new Response(
        JSON.stringify({ error: 'Unsupported API version' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Resolve company ID from slug if needed
    let companyId = companyIdOrSlug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyIdOrSlug)
    
    if (!isUuid) {
      // It's a slug, resolve to company ID
      console.log('🔍 Resolving company slug:', companyIdOrSlug)
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('slug', companyIdOrSlug)
        .single()

      if (companyError || !company) {
        console.error('❌ Company not found for slug:', companyIdOrSlug, companyError)
        return new Response(
          JSON.stringify({ error: 'Company not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      companyId = company.id
      console.log('✅ Resolved slug', companyIdOrSlug, 'to company ID:', companyId)
    }

    // Verify API key
    const apiKey = req.headers.get('x-api-key')
    console.log('🔑 API KEY CHECK:', { 
      hasApiKey: !!apiKey, 
      apiKeyLength: apiKey?.length,
      apiKeyPrefix: apiKey?.substring(0, 8) + '...',
      companyId 
    })
    
    if (!apiKey) {
      console.error('❌ NO API KEY PROVIDED')
      return new Response(
        JSON.stringify({ error: 'API key required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate API key and get permissions
    console.log('🔍 VALIDATING API KEY:', { apiKey: apiKey.substring(0, 8) + '...', companyId })
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, company_id, permissions, is_active')
      .eq('api_key', apiKey)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single() as { data: ApiKeyRecord | null, error: any }

    console.log('🔐 API KEY VALIDATION RESULT:', { 
      hasData: !!keyData, 
      error: keyError?.message,
      keyData: keyData ? { id: keyData.id, company_id: keyData.company_id, is_active: keyData.is_active } : null
    })

    if (keyError || !keyData) {
      console.error('❌ INVALID API KEY:', { keyError, keyData })
      return new Response(
        JSON.stringify({ error: 'Invalid API key', details: keyError?.message }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last_used_at
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)

    // Handle different endpoints
    console.log('🎯 HANDLING ENDPOINT:', { endpoint, companyId })
    let data: any
    let error: any

    switch (endpoint) {
      case 'company':
        data = await getCompanyInfo(supabaseAdmin, companyId, keyData.permissions)
        break
      
      case 'products':
        if (subPaths.length > 0) {
          const productId = subPaths[0]
          if (subPaths[1] === 'variants') {
            data = await getProductVariants(supabaseAdmin, companyId, productId, keyData.permissions)
          } else if (subPaths[1] === 'related') {
            data = await getRelatedProducts(supabaseAdmin, companyId, productId, keyData.permissions)
          } else if (subPaths[1] === 'co2') {
            data = await getProductCO2(supabaseAdmin, companyId, productId, keyData.permissions)
          } else {
            data = await getProduct(supabaseAdmin, companyId, productId, keyData.permissions)
          }
        } else {
          data = await getProducts(supabaseAdmin, companyId, keyData.permissions, url.searchParams)
        }
        break

      case 'categories':
        console.log('📂 FETCHING CATEGORIES for company:', companyId)
        data = await getCategories(supabaseAdmin, companyId, keyData.permissions)
        console.log('📂 CATEGORIES RESULT:', data)
        break

      case 'brands':
        data = await getBrands(supabaseAdmin, companyId, keyData.permissions)
        break

      case 'packs':
        if (subPaths.length > 0) {
          data = await getPack(supabaseAdmin, companyId, subPaths[0], keyData.permissions)
        } else {
          data = await getPacks(supabaseAdmin, companyId, keyData.permissions)
        }
        break

      case 'search':
        data = await searchCatalog(supabaseAdmin, companyId, keyData.permissions, url.searchParams)
        break

      case 'environmental':
        if (subPaths.length > 0 && subPaths[0] === 'categories') {
          console.log('🌿 FETCHING ENVIRONMENTAL CATEGORIES for company:', companyId)
          data = await getEnvironmentalCategories(supabaseAdmin, companyId, keyData.permissions)
        } else {
          data = await getEnvironmentalData(supabaseAdmin, companyId, keyData.permissions)
        }
        break

      case 'settings':
        data = await getCatalogSettings(supabaseAdmin, companyId, keyData.permissions)
        break

      case 'customizations':
        data = await getCustomizations(supabaseAdmin, companyId, keyData.permissions)
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (error) {
      console.error('API Error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(data), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Catalog API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// API endpoint functions
async function getCompanyInfo(supabase: any, companyId: string, permissions: any) {
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color')
    .eq('id', companyId)
    .single()

  const { data: customizations } = await supabase
    .from('company_customizations')
    .select('*')
    .eq('company_id', companyId)
    .single()

  return { company, customizations }
}

async function getProducts(supabase: any, companyId: string, permissions: any, searchParams: URLSearchParams) {
  let query = supabase
    .from('products')
    .select(`
      *,
      brands!inner(name, translation),
      categories!inner(name, translation),
      product_variant_prices(*)
    `)
    .eq('company_id', companyId)
    .eq('active', true)
    .or("admin_only.is.null,admin_only.eq.false")

  // Apply filters
  const category = searchParams.get('category')
  const brand = searchParams.get('brand')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  if (category) {
    query = query.eq('categories.name', category)
  }
  if (brand) {
    query = query.eq('brands.name', brand)
  }

  // Pagination
  query = query.range((page - 1) * limit, page * limit - 1)

  const { data: products } = await query

  return { products, pagination: { page, limit, total: products?.length || 0 } }
}

async function getProduct(supabase: any, companyId: string, productId: string, permissions: any) {
  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      brands!inner(name, translation),
      categories!inner(name, translation),
      product_variant_prices(*)
    `)
    .eq('company_id', companyId)
    .eq('id', productId)
    .eq('active', true)
    .or("admin_only.is.null,admin_only.eq.false")
    .single()

  return { product }
}

async function getProductVariants(supabase: any, companyId: string, productId: string, permissions: any) {
  const { data: variants } = await supabase
    .from('product_variant_prices')
    .select('*')
    .eq('product_id', productId)

  return { variants }
}

async function getRelatedProducts(supabase: any, companyId: string, productId: string, permissions: any) {
  // Get products from same category
  const { data: product } = await supabase
    .from('products')
    .select('category_id')
    .eq('id', productId)
    .single()

  if (!product) return { products: [] }

  const { data: relatedProducts } = await supabase
    .from('products')
    .select(`
      *,
      brands(name, translation),
      categories(name, translation)
    `)
    .eq('company_id', companyId)
    .eq('category_id', product.category_id)
    .neq('id', productId)
    .eq('active', true)
    .or("admin_only.is.null,admin_only.eq.false")
    .limit(6)

  return { products: relatedProducts }
}

async function getProductCO2(supabase: any, companyId: string, productId: string, permissions: any) {
  console.log('🌿 GET PRODUCT CO2 - Starting with productId:', productId, 'companyId:', companyId)
  
  // Get product with category information
  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      category_id,
      categories!inner (
        id,
        name,
        translation,
        category_environmental_data (
          co2_savings_kg,
          carbon_footprint_reduction_percentage,
          energy_savings_kwh,
          source_url
        )
      )
    `)
    .eq('id', productId)
    .eq('company_id', companyId)
    .single()

  if (productError || !product) {
    console.log('❌ Product not found or error:', productError?.message)
    return { co2_impact: { value: 0, unit: 'kg CO2eq', calculation_date: new Date().toISOString(), error: 'Product not found' } }
  }

  const environmentalData = product.categories?.category_environmental_data?.[0]
  const co2Value = environmentalData?.co2_savings_kg || 0

  console.log('🌿 GET PRODUCT CO2 - Environmental data found:', { 
    productName: product.name, 
    categoryName: product.categories?.name,
    co2Value,
    hasEnvironmentalData: !!environmentalData 
  })

  return { 
    co2_impact: { 
      value: co2Value, 
      unit: 'kg CO2eq', 
      calculation_date: new Date().toISOString(),
      category: {
        name: product.categories?.name,
        translation: product.categories?.translation
      },
      carbon_footprint_reduction_percentage: environmentalData?.carbon_footprint_reduction_percentage || 0,
      energy_savings_kwh: environmentalData?.energy_savings_kwh || 0,
      source_url: environmentalData?.source_url || 'https://impactco2.fr'
    } 
  }
}

async function getCategories(supabase: any, companyId: string, permissions: any) {
  console.log('📂 GET CATEGORIES - Starting with companyId:', companyId)
  
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select(`
      *,
      category_environmental_data (
        co2_savings_kg,
        carbon_footprint_reduction_percentage,
        energy_savings_kwh,
        water_savings_liters,
        waste_reduction_kg,
        source_url,
        last_updated
      )
    `)
    .eq('company_id', companyId)

  console.log('📂 GET CATEGORIES - Query result:', { 
    categoriesCount: categories?.length, 
    error: categoriesError?.message,
    categories: categories?.slice(0, 2) // First 2 categories for debugging
  })

  // Enrich categories with environmental impact data
  const enrichedCategories = categories?.map(category => ({
    ...category,
    co2_savings_kg: category.category_environmental_data?.[0]?.co2_savings_kg || 0,
    environmental_impact: category.category_environmental_data?.[0] ? {
      co2_savings_kg: category.category_environmental_data[0].co2_savings_kg,
      carbon_footprint_reduction_percentage: category.category_environmental_data[0].carbon_footprint_reduction_percentage,
      energy_savings_kwh: category.category_environmental_data[0].energy_savings_kwh,
      water_savings_liters: category.category_environmental_data[0].water_savings_liters,
      waste_reduction_kg: category.category_environmental_data[0].waste_reduction_kg,
      source_url: category.category_environmental_data[0].source_url,
      last_updated: category.category_environmental_data[0].last_updated
    } : null,
    category_environmental_data: undefined // Remove raw data from response
  }))

  return { categories: enrichedCategories }
}

async function getBrands(supabase: any, companyId: string, permissions: any) {
  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .eq('company_id', companyId)

  return { brands }
}

async function getPacks(supabase: any, companyId: string, permissions: any) {
  const { data: packs } = await supabase
    .from('product_packs')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)

  return { packs }
}

async function getPack(supabase: any, companyId: string, packId: string, permissions: any) {
  const { data: pack } = await supabase
    .from('product_packs')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', packId)
    .eq('is_active', true)
    .single()

  return { pack }
}

async function searchCatalog(supabase: any, companyId: string, permissions: any, searchParams: URLSearchParams) {
  const query = searchParams.get('q')
  if (!query) return { products: [] }

  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      brands(name, translation),
      categories(name, translation)
    `)
    .eq('company_id', companyId)
    .eq('active', true)
    .or("admin_only.is.null,admin_only.eq.false")
    .or(`name.ilike.%${query}%, description.ilike.%${query}%`)
    .limit(20)

  return { products }
}

async function getEnvironmentalData(supabase: any, companyId: string, permissions: any) {
  console.log('🌿 GET ENVIRONMENTAL DATA - Starting for company:', companyId)
  
  const { data: company } = await supabase
    .from('companies')
    .select('co2_saved, devices_count')
    .eq('id', companyId)
    .single()

  console.log('🌿 GET ENVIRONMENTAL DATA - Company data:', company)
  return { environmental: company }
}

async function getEnvironmentalCategories(supabase: any, companyId: string, permissions: any) {
  console.log('🌿 GET ENVIRONMENTAL CATEGORIES - Starting for company:', companyId)
  
  const { data: environmentalData, error } = await supabase
    .from('category_environmental_data')
    .select(`
      *,
      categories!inner (
        id,
        name,
        translation,
        company_id
      )
    `)
    .eq('categories.company_id', companyId)

  if (error) {
    console.error('❌ Error fetching environmental categories:', error)
    return { environmental_categories: [] }
  }

  console.log('🌿 GET ENVIRONMENTAL CATEGORIES - Found data:', { 
    count: environmentalData?.length,
    data: environmentalData?.slice(0, 2) // First 2 for debugging
  })

  const enrichedData = environmentalData?.map(item => ({
    id: item.id,
    category: {
      id: item.categories.id,
      name: item.categories.name,
      translation: item.categories.translation
    },
    co2_savings_kg: item.co2_savings_kg,
    carbon_footprint_reduction_percentage: item.carbon_footprint_reduction_percentage,
    energy_savings_kwh: item.energy_savings_kwh,
    water_savings_liters: item.water_savings_liters,
    waste_reduction_kg: item.waste_reduction_kg,
    source_url: item.source_url,
    last_updated: item.last_updated,
    created_at: item.created_at,
    updated_at: item.updated_at
  }))

  return { environmental_categories: enrichedData }
}

async function getCatalogSettings(supabase: any, companyId: string, permissions: any) {
  const { data: settings } = await supabase
    .from('company_customizations')
    .select('header_enabled, header_title, header_description, header_background_type, header_background_config')
    .eq('company_id', companyId)
    .single()

  return { settings }
}

async function getCustomizations(supabase: any, companyId: string, permissions: any) {
  const { data: customizations } = await supabase
    .from('company_customizations')
    .select('*')
    .eq('company_id', companyId)
    .single()

  return { customizations }
}