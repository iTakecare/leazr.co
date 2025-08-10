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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    
    // Expected format: /catalog-api/v1/{companyId}/{endpoint}
    if (pathParts.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid API path' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const [, version, companyId, endpoint, ...subPaths] = pathParts
    
    if (version !== 'v1') {
      return new Response(
        JSON.stringify({ error: 'Unsupported API version' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify API key
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate API key and get permissions
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, company_id, permissions, is_active')
      .eq('api_key', apiKey)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single() as { data: ApiKeyRecord | null, error: any }

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last_used_at
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)

    // Handle different endpoints
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
        data = await getCategories(supabaseAdmin, companyId, keyData.permissions)
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
        data = await getEnvironmentalData(supabaseAdmin, companyId, keyData.permissions)
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
    .limit(6)

  return { products: relatedProducts }
}

async function getProductCO2(supabase: any, companyId: string, productId: string, permissions: any) {
  // Mock CO2 calculation - implement according to your business logic
  return { co2_impact: { value: 2.5, unit: 'kg CO2eq', calculation_date: new Date().toISOString() } }
}

async function getCategories(supabase: any, companyId: string, permissions: any) {
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('company_id', companyId)

  return { categories }
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
    .or(`name.ilike.%${query}%, description.ilike.%${query}%`)
    .limit(20)

  return { products }
}

async function getEnvironmentalData(supabase: any, companyId: string, permissions: any) {
  const { data: company } = await supabase
    .from('companies')
    .select('co2_saved, devices_count')
    .eq('id', companyId)
    .single()

  return { environmental: company }
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