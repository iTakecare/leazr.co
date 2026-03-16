import { createClient } from 'npm:@supabase/supabase-js@2'
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS'
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

    // Rate limiting: 100 requests per hour per IP - Use more reliable IP detection
    const clientIp = req.headers.get('cf-connecting-ip') ||
                     req.headers.get('x-real-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0] ||
                     'rate-limited';
    
    const rateLimit = await checkRateLimit(
      supabaseAdmin,
      clientIp,
      'catalog-api',
      { maxRequests: 100, windowSeconds: 3600 }
    );

    if (!rateLimit.allowed) {
      console.log(`[catalog-api] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(JSON.stringify({
        error: 'Trop de requêtes. Veuillez réessayer plus tard.',
        retryAfter: 3600
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        }
      });
    }

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
          JSON.stringify({ error: 'Invalid API path format' }), 
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
          JSON.stringify({ error: 'Invalid API path format' }), 
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
    console.log('🔍 VALIDATING API KEY for company:', companyId)
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
    console.log('🎯 HANDLING ENDPOINT:', { endpoint, companyId, method: req.method })
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
          } else if (subPaths[1] === 'upsells') {
            const limit = parseInt(url.searchParams.get('limit') || '10')
            data = await getProductUpsells(supabaseAdmin, companyId, productId, keyData.permissions, limit)
          } else if (subPaths[1] === 'suppliers') {
            // GET /products/{id}/suppliers - Prix par fournisseur
            if (!keyData.permissions.products && !keyData.permissions.suppliers) {
              return new Response(
                JSON.stringify({ error: 'Permission denied: products or suppliers required' }), 
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            data = await getProductSuppliers(supabaseAdmin, companyId, productId)
          } else if (subPaths[1] === 'purchase-price' && req.method === 'PATCH') {
            // PATCH /products/{id}/purchase-price - Mise à jour prix d'achat
            if (!keyData.permissions.products_write) {
              return new Response(
                JSON.stringify({ error: 'Permission denied: products_write required' }), 
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            const body = await req.json()
            data = await updateProductPurchasePrice(supabaseAdmin, companyId, productId, body)
          } else {
            data = await getProduct(supabaseAdmin, companyId, productId, keyData.permissions)
          }
        } else {
          data = await getProducts(supabaseAdmin, companyId, keyData.permissions, url.searchParams)
        }
        break

      case 'variants':
        // PATCH /variants/{id}/purchase-price - Mise à jour prix d'achat variant
        if (subPaths.length > 0 && subPaths[1] === 'purchase-price' && req.method === 'PATCH') {
          if (!keyData.permissions.products_write) {
            return new Response(
              JSON.stringify({ error: 'Permission denied: products_write required' }), 
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          const variantId = subPaths[0]
          const body = await req.json()
          data = await updateVariantPurchasePrice(supabaseAdmin, companyId, variantId, body)
        } else {
          return new Response(
            JSON.stringify({ error: 'Endpoint not found' }), 
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      case 'suppliers':
        // Vérifier permission suppliers
        if (!keyData.permissions.suppliers) {
          return new Response(
            JSON.stringify({ error: 'Permission denied: suppliers required' }), 
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (subPaths.length > 0) {
          // GET /suppliers/{id}
          data = await getSupplier(supabaseAdmin, companyId, subPaths[0])
        } else {
          // GET /suppliers
          data = await getSuppliers(supabaseAdmin, companyId, url.searchParams)
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

      case 'partners':
        if (subPaths.length > 0) {
          const partnerIdOrSlug = subPaths[0]
          if (subPaths[1] === 'next-reference' && req.method === 'POST') {
            // POST /partners/{slug}/next-reference - Générer le prochain numéro de dossier
            const { data: refNumber, error: refError } = await supabaseAdmin.rpc('get_next_dossier_number')
            if (refError) {
              console.error('❌ Error generating next reference:', refError)
              return new Response(
                JSON.stringify({ error: 'Failed to generate reference number' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            data = { reference_number: refNumber }
          } else if (subPaths[1] === 'packs') {
            // GET /partners/{id}/packs - Packs liés au partenaire avec options
            data = await getPartnerPacks(supabaseAdmin, companyId, partnerIdOrSlug)
          } else if (subPaths[1] === 'providers') {
            // GET /partners/{id}/providers - Prestataires liés au partenaire
            data = await getPartnerProviders(supabaseAdmin, companyId, partnerIdOrSlug)
          } else {
            // GET /partners/{id_or_slug} - Détail d'un partenaire
            data = await getPartner(supabaseAdmin, companyId, partnerIdOrSlug)
          }
        } else {
          // GET /partners - Liste des partenaires actifs
          data = await getPartners(supabaseAdmin, companyId)
        }
        break

      case 'providers':
        if (subPaths.length > 0) {
          if (subPaths[1] === 'products') {
            // GET /providers/{id}/products
            data = await getProviderProducts(supabaseAdmin, companyId, subPaths[0])
          } else {
            // GET /providers/{id}
            data = await getProvider(supabaseAdmin, companyId, subPaths[0])
          }
        } else {
          // GET /providers - Liste des prestataires externes actifs
          data = await getProviders(supabaseAdmin, companyId)
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

      // ============================================
      // MDM ENDPOINTS
      // ============================================

      case 'devices': {
        if (!keyData.permissions.mdm && !keyData.permissions.mdm_write) {
          return new Response(
            JSON.stringify({ error: 'Permission denied: mdm required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (subPaths.length > 0) {
          const deviceId = subPaths[0]
          if (subPaths[1] === 'software') {
            data = await getDeviceSoftware(supabaseAdmin, companyId, deviceId)
          } else if (subPaths[1] === 'history') {
            data = await getDeviceHistory(supabaseAdmin, companyId, deviceId)
          } else if (subPaths[1] === 'deploy' && req.method === 'POST') {
            if (!keyData.permissions.mdm_write) {
              return new Response(
                JSON.stringify({ error: 'Permission denied: mdm_write required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            const body = await req.json()
            data = await deploySoftwareToDevice(supabaseAdmin, companyId, deviceId, body)
          } else if (subPaths[1] === 'assign-profile' && req.method === 'POST') {
            if (!keyData.permissions.mdm_write) {
              return new Response(
                JSON.stringify({ error: 'Permission denied: mdm_write required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            const body = await req.json()
            data = await assignProfileToDevice(supabaseAdmin, companyId, deviceId, body)
          } else if (subPaths[1] === 'profiles' && subPaths[2] && req.method === 'DELETE') {
            if (!keyData.permissions.mdm_write) {
              return new Response(
                JSON.stringify({ error: 'Permission denied: mdm_write required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            data = await removeProfileFromDevice(supabaseAdmin, companyId, deviceId, subPaths[2])
          } else if (subPaths[1] === 'command' && req.method === 'POST') {
            if (!keyData.permissions.mdm_write) {
              return new Response(
                JSON.stringify({ error: 'Permission denied: mdm_write required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            const body = await req.json()
            data = await sendDeviceCommand(supabaseAdmin, companyId, deviceId, body)
          } else if (subPaths[1] === 'status') {
            data = await getDeviceStatus(supabaseAdmin, companyId, deviceId)
          } else if (req.method === 'PATCH') {
            if (!keyData.permissions.mdm_write) {
              return new Response(
                JSON.stringify({ error: 'Permission denied: mdm_write required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
            const body = await req.json()
            data = await updateDevice(supabaseAdmin, companyId, deviceId, body)
          } else {
            data = await getDevice(supabaseAdmin, companyId, deviceId)
          }
        } else {
          data = await getDevices(supabaseAdmin, companyId, url.searchParams)
        }
        break
      }

      case 'software': {
        if (!keyData.permissions.mdm && !keyData.permissions.mdm_write) {
          return new Response(
            JSON.stringify({ error: 'Permission denied: mdm required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (subPaths.length > 0) {
          data = await getSoftwareDetail(supabaseAdmin, companyId, subPaths[0])
        } else {
          data = await getSoftwareCatalog(supabaseAdmin, companyId, url.searchParams)
        }
        break
      }

      case 'deployments': {
        if (!keyData.permissions.mdm && !keyData.permissions.mdm_write) {
          return new Response(
            JSON.stringify({ error: 'Permission denied: mdm required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (subPaths.length > 0) {
          if (req.method === 'PATCH') {
            // Webhook callback: MDM updates deployment status
            const body = await req.json()
            data = await updateDeploymentStatus(supabaseAdmin, companyId, subPaths[0], body)
          } else {
            data = await getDeploymentDetail(supabaseAdmin, companyId, subPaths[0])
          }
        } else {
          data = await getDeployments(supabaseAdmin, companyId, url.searchParams)
        }
        break
      }

      case 'mdm-profiles': {
        if (!keyData.permissions.mdm && !keyData.permissions.mdm_write) {
          return new Response(
            JSON.stringify({ error: 'Permission denied: mdm required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (req.method === 'POST') {
          if (!keyData.permissions.mdm_write) {
            return new Response(
              JSON.stringify({ error: 'Permission denied: mdm_write required' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          const body = await req.json()
          data = await createMdmProfile(supabaseAdmin, companyId, body)
        } else if (subPaths.length > 0) {
          data = await getMdmProfile(supabaseAdmin, companyId, subPaths[0])
        } else {
          data = await getMdmProfiles(supabaseAdmin, companyId, url.searchParams)
        }
        break
      }

      case 'enrollment': {
        if (!keyData.permissions.mdm_write) {
          return new Response(
            JSON.stringify({ error: 'Permission denied: mdm_write required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (subPaths[0] === 'token' && req.method === 'POST') {
          const body = await req.json()
          data = await createEnrollmentToken(supabaseAdmin, companyId, body)
        } else if (subPaths[0] === 'register' && req.method === 'POST') {
          const body = await req.json()
          data = await registerEnrolledDevice(supabaseAdmin, companyId, body)
        } else if (subPaths[0] === 'pending') {
          data = await getPendingEnrollments(supabaseAdmin, companyId)
        } else {
          return new Response(
            JSON.stringify({ error: 'Endpoint not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      case 'commands': {
        if (!keyData.permissions.mdm && !keyData.permissions.mdm_write) {
          return new Response(
            JSON.stringify({ error: 'Permission denied: mdm required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (subPaths.length > 0) {
          if (req.method === 'PATCH') {
            const body = await req.json()
            data = await updateCommandStatus(supabaseAdmin, companyId, subPaths[0], body)
          } else {
            data = await getCommandDetail(supabaseAdmin, companyId, subPaths[0])
          }
        } else {
          data = await getCommands(supabaseAdmin, companyId, url.searchParams)
        }
        break
      }

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
    return createErrorResponse(error, corsHeaders)
  }
})

// ============================================
// HELPERS
// ============================================

/**
 * Flatten joined brands/categories into top-level brand/category strings.
 * Ensures API consumers always get consistent string fields.
 */
function flattenProductBrandCategory(product: any) {
  if (!product) return product
  return {
    ...product,
    brand: product.brands?.name || product.brand_name || product.brand || '',
    category: product.categories?.translation || product.categories?.name || product.category_name || product.category || '',
  }
}

// ============================================
// READ ENDPOINTS
// ============================================

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

  // Flatten brand/category from joined tables into top-level fields
  const normalizedProducts = (products || []).map(flattenProductBrandCategory)

  return { products: normalizedProducts, pagination: { page, limit, total: normalizedProducts.length } }
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

  return { product: product ? flattenProductBrandCategory(product) : null }
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

  return { products: (relatedProducts || []).map(flattenProductBrandCategory) }
}

async function getProductCO2(supabase: any, companyId: string, productId: string, permissions: any) {
  console.log('🌿 GET PRODUCT CO2 - Starting with productId:', productId, 'companyId:', companyId)
  
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

async function getProductUpsells(
  supabase: any, 
  companyId: string, 
  productId: string, 
  permissions: any,
  limit: number = 10
) {
  console.log('🎯 GET PRODUCT UPSELLS - Starting with productId:', productId, 'limit:', limit)
  
  const { data: sourceProduct, error: productError } = await supabase
    .from('products')
    .select(`
      id, 
      name, 
      category_id,
      categories!inner(id, name, translation)
    `)
    .eq('id', productId)
    .eq('company_id', companyId)
    .single()

  if (productError || !sourceProduct) {
    console.log('❌ Product not found:', productError?.message)
    return { upsells: [], total: 0, manual_count: 0, auto_count: 0 }
  }

  console.log('✅ Source product:', sourceProduct.name, 'category:', sourceProduct.categories?.translation || sourceProduct.categories?.name)

  const { data: manualUpsells, error: manualError } = await supabase
    .from('product_upsells')
    .select(`
      upsell_product_id,
      priority,
      source,
      products!product_upsells_upsell_product_id_fkey(
        id,
        name,
        slug,
        price,
        monthly_price,
        image_url,
        brand_id,
        category_id,
        short_description,
        brands(name, translation),
        categories(name, translation)
      )
    `)
    .eq('product_id', productId)
    .order('priority', { ascending: true })

  console.log('📋 Manual upsells found:', manualUpsells?.length || 0)

  const manualProductIds = new Set(
    manualUpsells?.map((u: any) => u.products?.id).filter(Boolean) || []
  )

  const manualUpsellsList = (manualUpsells || [])
    .filter((u: any) => u.products)
    .map((u: any) => ({
      id: u.products.id,
      name: u.products.name,
      slug: u.products.slug,
      price: u.products.price,
      monthly_price: u.products.monthly_price,
      image_url: u.products.image_url,
      brand: u.products.brands?.name,
      category: u.products.categories?.translation || u.products.categories?.name,
      short_description: u.products.short_description,
      source: 'manual' as const,
      priority: u.priority,
      upsell_reason: 'Sélectionné manuellement par l\'administrateur'
    }))

  let fallbackUpsells: any[] = []
  const remainingSlots = limit - manualUpsellsList.length

  if (remainingSlots > 0) {
    console.log('🔄 Adding fallback similar products, remaining slots:', remainingSlots)
    
    const { data: similarProducts } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        price,
        monthly_price,
        image_url,
        brand_id,
        category_id,
        short_description,
        brands(name, translation),
        categories(name, translation)
      `)
      .eq('company_id', companyId)
      .eq('category_id', sourceProduct.category_id)
      .neq('id', productId)
      .eq('active', true)
      .or("admin_only.is.null,admin_only.eq.false")
      .limit(remainingSlots)

    fallbackUpsells = (similarProducts || [])
      .filter((p: any) => !manualProductIds.has(p.id))
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        monthly_price: p.monthly_price,
        image_url: p.image_url,
        brand: p.brands?.name,
        category: p.categories?.translation || p.categories?.name,
        short_description: p.short_description,
        source: 'compatibility' as const,
        priority: 999,
        upsell_reason: 'Produits similaires'
      }))

    console.log('🔄 Fallback products added:', fallbackUpsells.length)
  }

  const finalUpsells = [...manualUpsellsList, ...fallbackUpsells].slice(0, limit)

  console.log('✅ Final upsells:', {
    total: finalUpsells.length,
    manual: manualUpsellsList.length,
    fallback: fallbackUpsells.length
  })

  return {
    upsells: finalUpsells,
    total: finalUpsells.length,
    manual_count: manualUpsellsList.length,
    auto_count: fallbackUpsells.length
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
    categories: categories?.slice(0, 2)
  })

  const enrichedCategories = categories?.map((category: any) => ({
    id: category.id,
    name: category.name,
    translation: category.translation,
    description: category.description,
    co2_savings_kg: category.category_environmental_data?.[0]?.co2_savings_kg || 0,
    environmental_impact: category.category_environmental_data?.[0] ? {
      co2_savings_kg: category.category_environmental_data[0].co2_savings_kg,
      carbon_footprint_reduction_percentage: category.category_environmental_data[0].carbon_footprint_reduction_percentage,
      energy_savings_kwh: category.category_environmental_data[0].energy_savings_kwh,
      water_savings_liters: category.category_environmental_data[0].water_savings_liters,
      waste_reduction_kg: category.category_environmental_data[0].waste_reduction_kg,
      source_url: category.category_environmental_data[0].source_url,
      last_updated: category.category_environmental_data[0].last_updated
    } : null
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
  // Get pack IDs assigned to partners (these should be hidden from the public catalog)
  const { data: partnerPackRows } = await supabase
    .from('partner_packs')
    .select('pack_id, partner:partners!inner(company_id)')
    .eq('partner.company_id', companyId)

  const partnerPackIds = new Set((partnerPackRows || []).map((pp: any) => pp.pack_id))

  const { data: packs, error } = await supabase
    .from('product_packs')
    .select(`
      *,
      items:product_pack_items(
        id,
        product_id,
        variant_price_id,
        quantity,
        unit_monthly_price,
        position,
        product:products(
          id,
          name,
          slug,
          image_url,
          brand_name,
          category_name
        )
      )
    `)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw error

  // Filter out packs assigned to partners
  const publicPacks = (packs || []).filter((p: any) => !partnerPackIds.has(p.id))
  return { packs: publicPacks }
}

async function getPack(supabase: any, companyId: string, packId: string, permissions: any) {
  const { data: pack, error } = await supabase
    .from('product_packs')
    .select(`
      *,
      items:product_pack_items(
        id,
        product_id,
        variant_price_id,
        quantity,
        unit_purchase_price,
        unit_monthly_price,
        margin_percentage,
        position,
        product:products(
          id,
          name,
          slug,
          description,
          short_description,
          image_url,
          brand_name,
          category_name,
          specifications
        ),
        variant_price:product_variant_prices(
          id,
          attributes,
          price,
          monthly_price
        )
      )
    `)
    .eq('company_id', companyId)
    .eq('id', packId)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Pack not found')
    }
    throw error
  }
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
    data: environmentalData?.slice(0, 2)
  })

  const enrichedData = environmentalData?.map((item: any) => ({
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

// ============================================
// SUPPLIERS ENDPOINTS (NEW)
// ============================================

async function getSuppliers(supabase: any, companyId: string, searchParams: URLSearchParams) {
  console.log('🏭 GET SUPPLIERS - Starting for company:', companyId)
  
  let query = supabase
    .from('suppliers')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true })

  // Filter by active status
  const activeOnly = searchParams.get('active')
  if (activeOnly === 'true') {
    query = query.eq('is_active', true)
  }

  // Search by name or code
  const search = searchParams.get('search')
  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
  }

  const { data: suppliers, error } = await query

  if (error) {
    console.error('❌ Error fetching suppliers:', error)
    throw error
  }

  console.log('🏭 GET SUPPLIERS - Found:', suppliers?.length || 0)
  return { suppliers: suppliers || [] }
}

async function getSupplier(supabase: any, companyId: string, supplierId: string) {
  console.log('🏭 GET SUPPLIER - Fetching supplier:', supplierId)
  
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .eq('company_id', companyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Supplier not found')
    }
    throw error
  }

  return { supplier }
}

async function getProductSuppliers(supabase: any, companyId: string, productId: string) {
  console.log('🏭 GET PRODUCT SUPPLIERS - Fetching for product:', productId)
  
  // Verify product belongs to company
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, sku, purchase_price')
    .eq('id', productId)
    .eq('company_id', companyId)
    .single()

  if (productError || !product) {
    throw new Error('Product not found')
  }

  // Get supplier prices for this product
  const { data: supplierPrices, error } = await supabase
    .from('product_supplier_prices')
    .select(`
      id,
      sku,
      purchase_price,
      currency,
      last_price_update,
      is_preferred,
      notes,
      variant_price_id,
      suppliers (
        id,
        name,
        code,
        email,
        phone,
        website,
        is_active
      )
    `)
    .eq('product_id', productId)
    .order('is_preferred', { ascending: false })
    .order('purchase_price', { ascending: true })

  if (error) {
    console.error('❌ Error fetching product suppliers:', error)
    throw error
  }

  console.log('🏭 GET PRODUCT SUPPLIERS - Found:', supplierPrices?.length || 0)

  return { 
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      purchase_price: product.purchase_price
    },
    supplier_prices: (supplierPrices || []).map((sp: any) => ({
      id: sp.id,
      supplier: sp.suppliers,
      sku: sp.sku,
      purchase_price: sp.purchase_price,
      currency: sp.currency,
      last_price_update: sp.last_price_update,
      is_preferred: sp.is_preferred,
      notes: sp.notes,
      variant_price_id: sp.variant_price_id
    }))
  }
}

// ============================================
// WRITE ENDPOINTS (NEW - PATCH)
// ============================================

interface UpdatePurchasePriceBody {
  purchase_price: number
  supplier_id?: string
  sku?: string
  is_preferred?: boolean
  notes?: string
}

async function updateProductPurchasePrice(
  supabase: any, 
  companyId: string, 
  productId: string, 
  body: UpdatePurchasePriceBody
) {
  console.log('✏️ UPDATE PRODUCT PURCHASE PRICE - Starting:', { productId, body })
  
  const { purchase_price, supplier_id, sku, is_preferred, notes } = body

  // Validate required field
  if (purchase_price === undefined || purchase_price === null) {
    throw new Error('purchase_price is required')
  }

  // Verify product belongs to company
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, sku, purchase_price')
    .eq('id', productId)
    .eq('company_id', companyId)
    .single()

  if (productError || !product) {
    console.error('❌ Product not found:', productError)
    throw new Error('Product not found or access denied')
  }

  // Update main product purchase_price
  const updateData: any = {
    purchase_price,
    updated_at: new Date().toISOString()
  }
  
  // Update SKU if provided and no supplier (direct product SKU)
  if (sku && !supplier_id) {
    updateData.sku = sku
  }

  const { error: updateError } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId)

  if (updateError) {
    console.error('❌ Error updating product:', updateError)
    throw updateError
  }

  console.log('✅ Product purchase_price updated:', purchase_price)

  // If supplier_id is provided, also create/update product_supplier_prices
  if (supplier_id) {
    // Verify supplier belongs to company
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('id', supplier_id)
      .eq('company_id', companyId)
      .single()

    if (supplierError || !supplier) {
      throw new Error('Supplier not found or access denied')
    }

    // If is_preferred is true, unset other preferred suppliers for this product
    if (is_preferred) {
      await supabase
        .from('product_supplier_prices')
        .update({ is_preferred: false })
        .eq('product_id', productId)
        .is('variant_price_id', null)
    }

    // Upsert supplier price
    const { error: upsertError } = await supabase
      .from('product_supplier_prices')
      .upsert({
        product_id: productId,
        supplier_id,
        variant_price_id: null,
        sku: sku || null,
        purchase_price,
        is_preferred: is_preferred || false,
        notes: notes || null,
        last_price_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'product_id,supplier_id,variant_price_id'
      })

    if (upsertError) {
      console.error('❌ Error upserting supplier price:', upsertError)
      throw upsertError
    }

    console.log('✅ Supplier price recorded for supplier:', supplier.name)
  }

  return {
    success: true,
    product_id: productId,
    purchase_price,
    sku: sku || product.sku,
    supplier_id: supplier_id || null,
    updated_at: new Date().toISOString()
  }
}

async function updateVariantPurchasePrice(
  supabase: any, 
  companyId: string, 
  variantId: string, 
  body: UpdatePurchasePriceBody
) {
  console.log('✏️ UPDATE VARIANT PURCHASE PRICE - Starting:', { variantId, body })
  
  const { purchase_price, supplier_id, sku, is_preferred, notes } = body

  // Validate required field
  if (purchase_price === undefined || purchase_price === null) {
    throw new Error('purchase_price is required')
  }

  // Verify variant belongs to a product of this company
  const { data: variant, error: variantError } = await supabase
    .from('product_variant_prices')
    .select(`
      id,
      product_id,
      attributes,
      purchase_price,
      products!inner (
        id,
        company_id
      )
    `)
    .eq('id', variantId)
    .single()

  if (variantError || !variant) {
    console.error('❌ Variant not found:', variantError)
    throw new Error('Variant not found')
  }

  if (variant.products?.company_id !== companyId) {
    throw new Error('Access denied: variant belongs to different company')
  }

  // Update variant purchase_price
  const { error: updateError } = await supabase
    .from('product_variant_prices')
    .update({
      purchase_price,
      updated_at: new Date().toISOString()
    })
    .eq('id', variantId)

  if (updateError) {
    console.error('❌ Error updating variant:', updateError)
    throw updateError
  }

  console.log('✅ Variant purchase_price updated:', purchase_price)

  // If supplier_id is provided, also create/update product_supplier_prices
  if (supplier_id) {
    // Verify supplier belongs to company
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('id', supplier_id)
      .eq('company_id', companyId)
      .single()

    if (supplierError || !supplier) {
      throw new Error('Supplier not found or access denied')
    }

    // If is_preferred is true, unset other preferred suppliers for this variant
    if (is_preferred) {
      await supabase
        .from('product_supplier_prices')
        .update({ is_preferred: false })
        .eq('product_id', variant.product_id)
        .eq('variant_price_id', variantId)
    }

    // Upsert supplier price for this variant
    const { error: upsertError } = await supabase
      .from('product_supplier_prices')
      .upsert({
        product_id: variant.product_id,
        variant_price_id: variantId,
        supplier_id,
        supplier_price: purchase_price,
        is_preferred: is_preferred || false,
        notes: notes || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'product_id,variant_price_id,supplier_id'
      })

    if (upsertError) {
      console.error('❌ Error upserting variant supplier price:', upsertError)
    }
  }

  return {
    success: true,
    variant_id: variantId,
    purchase_price,
    updated_at: new Date().toISOString()
  }
}

// ============================================
// PARTNERS ENDPOINTS
// ============================================

async function getPartners(supabase: any, companyId: string) {
  console.log('🤝 GET PARTNERS - Starting for company:', companyId)
  
  const { data: partners, error } = await supabase
    .from('partners')
    .select('id, name, slug, description, logo_url, hero_image_url, website_url, is_active, created_at')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return { partners: partners || [] }
}

async function getPartner(supabase: any, companyId: string, partnerIdOrSlug: string) {
  console.log('🤝 GET PARTNER - Fetching:', partnerIdOrSlug)
  
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partnerIdOrSlug)
  
  let query = supabase
    .from('partners')
    .select('id, name, slug, description, logo_url, hero_image_url, website_url, is_active, created_at, updated_at')
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (isUuid) {
    query = query.eq('id', partnerIdOrSlug)
  } else {
    query = query.eq('slug', partnerIdOrSlug)
  }

  const { data: partner, error } = await query.single()

  if (error) {
    if (error.code === 'PGRST116') throw new Error('Partner not found')
    throw error
  }

  return { partner }
}

async function getPartnerPacks(supabase: any, companyId: string, partnerIdOrSlug: string) {
  console.log('🤝 GET PARTNER PACKS - Fetching for partner:', partnerIdOrSlug)
  
  // Resolve partner ID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partnerIdOrSlug)
  let partnerId = partnerIdOrSlug
  
  if (!isUuid) {
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select('id')
      .eq('company_id', companyId)
      .eq('slug', partnerIdOrSlug)
      .eq('is_active', true)
      .single()
    if (pErr || !partner) throw new Error('Partner not found')
    partnerId = partner.id
  }

  // Get partner packs with full pack details and items
  const { data: partnerPacks, error } = await supabase
    .from('partner_packs')
    .select(`
      id,
      position,
      is_customizable,
      pack:product_packs(
        id,
        name,
        description,
        image_url,
        is_active,
        is_featured,
        total_monthly_price,
        pack_monthly_price,
        pack_promo_price,
        promo_active,
        items:product_pack_items(
          id,
          product_id,
          variant_price_id,
          quantity,
          unit_monthly_price,
          position,
          product:products(
            id,
            name,
            slug,
            image_url,
            brand_name,
            category_name,
            short_description
          ),
          variant_price:product_variant_prices(
            id,
            attributes,
            price,
            monthly_price
          )
        )
      )
    `)
    .eq('partner_id', partnerId)
    .order('position')

  if (error) throw error

  // Get options for customizable packs
  const packIds = (partnerPacks || []).filter((pp: any) => pp.is_customizable).map((pp: any) => pp.id)
  
  let optionsMap: Record<string, any[]> = {}
  if (packIds.length > 0) {
    const { data: options } = await supabase
      .from('partner_pack_options')
      .select('id, partner_pack_id, category_name, is_required, max_quantity, position, allowed_product_ids')
      .in('partner_pack_id', packIds)
      .order('position')

    for (const opt of (options || [])) {
      if (!optionsMap[opt.partner_pack_id]) optionsMap[opt.partner_pack_id] = []
      
      // Fetch allowed products details
      // allowed_product_ids contains a mix of product IDs and variant price IDs
      let allowedProducts: any[] = []
      if (opt.allowed_product_ids && opt.allowed_product_ids.length > 0) {
        const allowedIds: string[] = opt.allowed_product_ids

        // Step 1: Look up which IDs are variant price IDs
        const { data: variantPrices } = await supabase
          .from('product_variant_prices')
          .select('id, product_id')
          .in('id', allowedIds)

        const variantPriceIds = new Set((variantPrices || []).map((vp: any) => vp.id))
        const parentProductIds = [...new Set((variantPrices || []).map((vp: any) => vp.product_id))]

        // Step 2: IDs not found in variant_prices are direct product IDs
        const directProductIds = allowedIds.filter((id: string) => !variantPriceIds.has(id))

        // Step 3: Union of all product IDs to fetch
        const allProductIds = [...new Set([...parentProductIds, ...directProductIds])]

        if (allProductIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select(`
              id, name, slug, image_url, price, monthly_price, brand_name, category_name, short_description,
              product_variant_prices(id, attributes, price, monthly_price)
            `)
            .in('id', allProductIds)
            .eq('active', true)
            .or("admin_only.is.null,admin_only.eq.false")

          // Step 4: Filter variants to only those selected, exclude products with 0 selected variants
          for (const product of (products || [])) {
            if (product.product_variant_prices && product.product_variant_prices.length > 0) {
              // Variable product: include ONLY if at least one variant is selected
              const filteredVariants = product.product_variant_prices.filter(
                (vp: any) => variantPriceIds.has(vp.id)
              )
              if (filteredVariants.length > 0) {
                allowedProducts.push({ ...product, product_variant_prices: filteredVariants })
              }
              // 0 selected variants → always skip, even if parent product ID is in allowed list
            } else if (directProductIds.includes(product.id)) {
              // Simple product (no variants) — include only if explicitly selected
              allowedProducts.push(product)
            }
          }
        }
      }
      
      optionsMap[opt.partner_pack_id].push({
        ...opt,
        allowed_products: allowedProducts
      })
    }
  }

  // Merge options into packs
  const enrichedPacks = (partnerPacks || []).map((pp: any) => ({
    ...pp,
    options: optionsMap[pp.id] || []
  }))

  return { partner_packs: enrichedPacks }
}

async function getPartnerProviders(supabase: any, companyId: string, partnerIdOrSlug: string) {
  console.log('🤝 GET PARTNER PROVIDERS - Fetching for partner:', partnerIdOrSlug)
  
  // Resolve partner ID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partnerIdOrSlug)
  let partnerId = partnerIdOrSlug
  
  if (!isUuid) {
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .select('id')
      .eq('company_id', companyId)
      .eq('slug', partnerIdOrSlug)
      .eq('is_active', true)
      .single()
    if (pErr || !partner) throw new Error('Partner not found')
    partnerId = partner.id
  }

  // Get partner provider links with provider details
  const { data: links, error } = await supabase
    .from('partner_provider_links')
    .select(`
      id,
      position,
      card_title,
      selected_product_ids,
      provider:external_providers(
        id,
        name,
        logo_url,
        website_url,
        description,
        is_active
      )
    `)
    .eq('partner_id', partnerId)
    .order('position')

  if (error) throw error

  // For each link, fetch the selected products
  const enrichedLinks = await Promise.all(
    (links || []).map(async (link: any) => {
      let products: any[] = []
      if (link.selected_product_ids && link.selected_product_ids.length > 0) {
        const { data: prods } = await supabase
          .from('external_provider_products')
          .select('id, name, description, price_htva, billing_period, is_active, position')
          .in('id', link.selected_product_ids)
          .eq('is_active', true)
          .order('position')
        products = prods || []
      } else {
        // If no specific selection, fetch all active products from this provider
        const { data: prods } = await supabase
          .from('external_provider_products')
          .select('id, name, description, price_htva, billing_period, is_active, position')
          .eq('provider_id', link.provider.id)
          .eq('is_active', true)
          .order('position')
        products = prods || []
      }
      
      return {
        id: link.id,
        card_title: link.card_title,
        position: link.position,
        provider: link.provider,
        products
      }
    })
  )

  return { provider_cards: enrichedLinks }
}

// ============================================
// EXTERNAL PROVIDERS ENDPOINTS
// ============================================

async function getProviders(supabase: any, companyId: string) {
  console.log('🏢 GET PROVIDERS - Starting for company:', companyId)
  
  const { data: providers, error } = await supabase
    .from('external_providers')
    .select('id, name, logo_url, website_url, description, is_active, created_at')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return { providers: providers || [] }
}

async function getProvider(supabase: any, companyId: string, providerId: string) {
  const { data: provider, error } = await supabase
    .from('external_providers')
    .select('id, name, logo_url, website_url, description, is_active, created_at')
    .eq('id', providerId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw new Error('Provider not found')
    throw error
  }
  return { provider }
}

async function getProviderProducts(supabase: any, companyId: string, providerId: string) {
  // Verify provider belongs to company
  const { data: provider, error: pErr } = await supabase
    .from('external_providers')
    .select('id')
    .eq('id', providerId)
    .eq('company_id', companyId)
    .single()

  if (pErr || !provider) throw new Error('Provider not found')

  const { data: products, error } = await supabase
    .from('external_provider_products')
    .select('id, name, description, price_htva, billing_period, is_active, position, created_at')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .order('position')

  if (error) throw error
  return { products: products || [] }
}

// ============================================
// MDM ENDPOINTS - Devices
// ============================================

// Helper: get all contract IDs belonging to a company
async function getCompanyContractIds(supabase: any, companyId: string) {
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('id')
    .eq('company_id', companyId)
  if (error) throw error
  return (contracts || []).map((c: any) => c.id)
}

async function getDevices(supabase: any, companyId: string, searchParams: URLSearchParams) {
  const contractIds = await getCompanyContractIds(supabase, companyId)
  if (contractIds.length === 0) return { devices: [], pagination: { page: 1, limit: 50 } }

  let query = supabase
    .from('contract_equipment')
    .select('id, title, serial_number, individual_serial_number, order_status, quantity, purchase_price, monthly_payment, created_at, updated_at, contract_id, collaborator_id, supplier_id, is_individual')
    .in('contract_id', contractIds)

  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  if (status) query = query.eq('order_status', status)
  if (type) query = query.ilike('title', `%${type}%`)

  query = query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error

  const devices = (data || []).map((d: any) => ({
    id: d.id,
    equipment_description: d.title,
    serial_number: d.serial_number || d.individual_serial_number,
    status: d.order_status || 'unknown',
    quantity: d.quantity,
    purchase_price: d.purchase_price,
    monthly_payment: d.monthly_payment,
    contract_id: d.contract_id,
    collaborator_id: d.collaborator_id,
    supplier_id: d.supplier_id,
    is_individual: d.is_individual,
    created_at: d.created_at,
    updated_at: d.updated_at,
  }))

  return { devices, pagination: { page, limit } }
}

async function getDevice(supabase: any, companyId: string, deviceId: string) {
  const contractIds = await getCompanyContractIds(supabase, companyId)
  if (contractIds.length === 0) throw new Error('Device not found')

  const { data, error } = await supabase
    .from('contract_equipment')
    .select('*, collaborators(name, email, department)')
    .in('contract_id', contractIds)
    .eq('id', deviceId)
    .single()

  if (error) throw error
  return { device: { ...data, equipment_description: data.title, status: data.order_status || 'unknown' } }
}

async function updateDevice(supabase: any, companyId: string, deviceId: string, body: any) {
  const contractIds = await getCompanyContractIds(supabase, companyId)
  if (contractIds.length === 0) throw new Error('Device not found')

  const { data: existing } = await supabase
    .from('contract_equipment')
    .select('id')
    .in('contract_id', contractIds)
    .eq('id', deviceId)
    .single()
  if (!existing) throw new Error('Device not found')

  const allowedFields: Record<string, any> = {}
  if (body.serial_number !== undefined) allowedFields.serial_number = body.serial_number
  if (body.individual_serial_number !== undefined) allowedFields.individual_serial_number = body.individual_serial_number
  if (body.order_status !== undefined) allowedFields.order_status = body.order_status
  if (body.purchase_notes !== undefined) allowedFields.purchase_notes = body.purchase_notes
  if (body.order_reference !== undefined) allowedFields.order_reference = body.order_reference
  allowedFields.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('contract_equipment')
    .update(allowedFields)
    .eq('id', deviceId)
    .select()
    .single()

  if (error) throw error
  return { device: { ...data, equipment_description: data.title, status: data.order_status } }
}

async function getDeviceSoftware(supabase: any, companyId: string, deviceId: string) {
  const { data, error } = await supabase
    .from('software_deployments')
    .select('id, software_id, status, initiated_at, completed_at, error_message, software_catalog(id, name, version, platform, category)')
    .eq('company_id', companyId)
    .eq('equipment_id', deviceId)
    .order('initiated_at', { ascending: false })

  if (error) throw error
  return { deployments: data || [] }
}

async function getDeviceHistory(supabase: any, companyId: string, deviceId: string) {
  const { data, error } = await supabase
    .from('equipment_tracking')
    .select('*')
    .eq('equipment_id', deviceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return { history: data || [] }
}

async function getDeviceStatus(supabase: any, companyId: string, deviceId: string) {
  const { data: device } = await supabase
    .from('contract_equipment')
    .select('id, equipment_description, serial_number, status, notes, updated_at')
    .eq('company_id', companyId)
    .eq('id', deviceId)
    .single()

  const { data: lastCommand } = await supabase
    .from('mdm_commands')
    .select('*')
    .eq('company_id', companyId)
    .eq('equipment_id', deviceId)
    .eq('command_type', 'inventory')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: profiles } = await supabase
    .from('mdm_device_profiles')
    .select('id, profile_id, status, applied_at, mdm_profiles(name, profile_type)')
    .eq('company_id', companyId)
    .eq('equipment_id', deviceId)

  return {
    device: device || null,
    last_inventory: lastCommand?.result || null,
    last_inventory_at: lastCommand?.completed_at || null,
    profiles_applied: (profiles || []).filter((p: any) => p.status === 'applied').length,
    profiles: profiles || []
  }
}

// ============================================
// MDM ENDPOINTS - Software Catalog
// ============================================

async function getSoftwareCatalog(supabase: any, companyId: string, searchParams: URLSearchParams) {
  let query = supabase
    .from('software_catalog')
    .select('id, name, version, platform, category, description, silent_install_command, is_active, created_at')
    .eq('company_id', companyId)
    .eq('is_active', true)

  const platform = searchParams.get('platform')
  const category = searchParams.get('category')
  if (platform) query = query.eq('platform', platform)
  if (category) query = query.eq('category', category)

  query = query.order('name')
  const { data, error } = await query
  if (error) throw error
  return { software: data || [] }
}

async function getSoftwareDetail(supabase: any, companyId: string, softwareId: string) {
  const { data, error } = await supabase
    .from('software_catalog')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', softwareId)
    .single()

  if (error) throw error
  return { software: data }
}

// ============================================
// MDM ENDPOINTS - Deployments
// ============================================

async function deploySoftwareToDevice(supabase: any, companyId: string, deviceId: string, body: any) {
  const { software_ids, initiated_by } = body
  if (!software_ids?.length) throw new Error('software_ids required')

  const deployments = software_ids.map((swId: string) => ({
    company_id: companyId,
    equipment_id: deviceId,
    software_id: swId,
    status: 'pending',
    initiated_by: initiated_by || null,
    initiated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('software_deployments')
    .insert(deployments)
    .select()

  if (error) throw error
  return { deployments: data }
}

async function getDeployments(supabase: any, companyId: string, searchParams: URLSearchParams) {
  let query = supabase
    .from('software_deployments')
    .select('id, equipment_id, software_id, status, initiated_by, initiated_at, completed_at, error_message, software_catalog(name, version)')
    .eq('company_id', companyId)

  const status = searchParams.get('status')
  const equipmentId = searchParams.get('equipment_id')
  if (status) query = query.eq('status', status)
  if (equipmentId) query = query.eq('equipment_id', equipmentId)

  query = query.order('initiated_at', { ascending: false }).limit(100)
  const { data, error } = await query
  if (error) throw error
  return { deployments: data || [] }
}

async function getDeploymentDetail(supabase: any, companyId: string, deploymentId: string) {
  const { data, error } = await supabase
    .from('software_deployments')
    .select('*, software_catalog(name, version, platform)')
    .eq('company_id', companyId)
    .eq('id', deploymentId)
    .single()

  if (error) throw error
  return { deployment: data }
}

async function updateDeploymentStatus(supabase: any, companyId: string, deploymentId: string, body: any) {
  const allowedFields: Record<string, any> = {}
  if (body.status) allowedFields.status = body.status
  if (body.error_message !== undefined) allowedFields.error_message = body.error_message
  if (['success', 'failed'].includes(body.status)) {
    allowedFields.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('software_deployments')
    .update(allowedFields)
    .eq('company_id', companyId)
    .eq('id', deploymentId)
    .select()
    .single()

  if (error) throw error
  return { deployment: data }
}

// ============================================
// MDM ENDPOINTS - Profiles
// ============================================

async function getMdmProfiles(supabase: any, companyId: string, searchParams: URLSearchParams) {
  let query = supabase
    .from('mdm_profiles')
    .select('id, name, description, profile_type, platform, is_active, created_at, updated_at')
    .eq('company_id', companyId)

  const profileType = searchParams.get('type')
  const platform = searchParams.get('platform')
  if (profileType) query = query.eq('profile_type', profileType)
  if (platform) query = query.eq('platform', platform)

  query = query.order('name')
  const { data, error } = await query
  if (error) throw error
  return { profiles: data || [] }
}

async function getMdmProfile(supabase: any, companyId: string, profileId: string) {
  const { data, error } = await supabase
    .from('mdm_profiles')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', profileId)
    .single()

  if (error) throw error
  return { profile: data }
}

async function createMdmProfile(supabase: any, companyId: string, body: any) {
  const { name, description, profile_type, payload, platform, is_active } = body
  if (!name || !profile_type) throw new Error('name and profile_type required')

  const { data, error } = await supabase
    .from('mdm_profiles')
    .insert({
      company_id: companyId,
      name,
      description: description || null,
      profile_type,
      payload: payload || {},
      platform: platform || 'all',
      is_active: is_active !== false,
    })
    .select()
    .single()

  if (error) throw error
  return { profile: data }
}

async function assignProfileToDevice(supabase: any, companyId: string, deviceId: string, body: any) {
  const { profile_id } = body
  if (!profile_id) throw new Error('profile_id required')

  const { data, error } = await supabase
    .from('mdm_device_profiles')
    .insert({
      company_id: companyId,
      equipment_id: deviceId,
      profile_id,
      status: 'pending',
    })
    .select('*, mdm_profiles(name, profile_type)')
    .single()

  if (error) throw error
  return { assignment: data }
}

async function removeProfileFromDevice(supabase: any, companyId: string, deviceId: string, profileId: string) {
  const { data, error } = await supabase
    .from('mdm_device_profiles')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('equipment_id', deviceId)
    .eq('profile_id', profileId)
    .select()
    .single()

  if (error) throw error
  return { removed: true, assignment: data }
}

// ============================================
// MDM ENDPOINTS - Enrollment
// ============================================

async function createEnrollmentToken(supabase: any, companyId: string, body: any) {
  const { equipment_id, description, expires_in_days } = body

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 7))

  const { data, error } = await supabase
    .from('mdm_enrollment_tokens')
    .insert({
      company_id: companyId,
      equipment_id: equipment_id || null,
      description: description || null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return { token: data }
}

async function registerEnrolledDevice(supabase: any, companyId: string, body: any) {
  const { token, device_info } = body
  if (!token) throw new Error('token required')

  const { data: tokenData, error: tokenError } = await supabase
    .from('mdm_enrollment_tokens')
    .select('*')
    .eq('company_id', companyId)
    .eq('token', token)
    .eq('is_used', false)
    .single()

  if (tokenError || !tokenData) throw new Error('Invalid or expired enrollment token')
  if (new Date(tokenData.expires_at) < new Date()) throw new Error('Enrollment token expired')

  await supabase
    .from('mdm_enrollment_tokens')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('id', tokenData.id)

  if (tokenData.equipment_id && device_info) {
    const updateFields: Record<string, any> = { updated_at: new Date().toISOString() }
    if (device_info.serial_number) updateFields.serial_number = device_info.serial_number
    if (device_info.notes) updateFields.notes = device_info.notes

    await supabase
      .from('contract_equipment')
      .update(updateFields)
      .eq('id', tokenData.equipment_id)
      .eq('company_id', companyId)
  }

  return {
    enrolled: true,
    equipment_id: tokenData.equipment_id,
    device_info: device_info || null,
  }
}

async function getPendingEnrollments(supabase: any, companyId: string) {
  const { data, error } = await supabase
    .from('mdm_enrollment_tokens')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return { pending_tokens: data || [] }
}

// ============================================
// MDM ENDPOINTS - Commands
// ============================================

async function sendDeviceCommand(supabase: any, companyId: string, deviceId: string, body: any) {
  const { command_type, payload, initiated_by } = body
  if (!command_type) throw new Error('command_type required')

  const { data, error } = await supabase
    .from('mdm_commands')
    .insert({
      company_id: companyId,
      equipment_id: deviceId,
      command_type,
      payload: payload || {},
      status: 'pending',
      initiated_by: initiated_by || null,
    })
    .select()
    .single()

  if (error) throw error
  return { command: data }
}

async function getCommands(supabase: any, companyId: string, searchParams: URLSearchParams) {
  let query = supabase
    .from('mdm_commands')
    .select('*')
    .eq('company_id', companyId)

  const status = searchParams.get('status')
  const equipmentId = searchParams.get('equipment_id')
  const commandType = searchParams.get('type')
  if (status) query = query.eq('status', status)
  if (equipmentId) query = query.eq('equipment_id', equipmentId)
  if (commandType) query = query.eq('command_type', commandType)

  query = query.order('created_at', { ascending: false }).limit(100)
  const { data, error } = await query
  if (error) throw error
  return { commands: data || [] }
}

async function getCommandDetail(supabase: any, companyId: string, commandId: string) {
  const { data, error } = await supabase
    .from('mdm_commands')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', commandId)
    .single()

  if (error) throw error
  return { command: data }
}

async function updateCommandStatus(supabase: any, companyId: string, commandId: string, body: any) {
  const allowedFields: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.status) allowedFields.status = body.status
  if (body.result !== undefined) allowedFields.result = body.result
  if (body.error_message !== undefined) allowedFields.error_message = body.error_message
  if (body.status === 'sent') allowedFields.sent_at = new Date().toISOString()
  if (['completed', 'failed'].includes(body.status)) allowedFields.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('mdm_commands')
    .update(allowedFields)
    .eq('company_id', companyId)
    .eq('id', commandId)
    .select()
    .single()

  if (error) throw error
  return { command: data }
}
