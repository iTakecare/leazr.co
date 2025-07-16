import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CloudflareSubdomainRequest {
  companyId: string
  companyName: string
  subdomain?: string
  testAuth?: boolean
}

interface CloudflareDNSRecord {
  type: string
  name: string
  content: string
  ttl: number
  proxied: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { companyId, companyName, subdomain, testAuth }: CloudflareSubdomainRequest = await req.json()

    console.log('🚀 Request received:', { companyId, companyName, subdomain, testAuth })

    // Initialize Supabase client for logging
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Cloudflare API token from secrets
    const cloudflareToken = Deno.env.get('CLOUDFLARE_API_TOKEN')
    if (!cloudflareToken) {
      console.error('❌ CLOUDFLARE_API_TOKEN not configured')
      const errorMessage = 'CLOUDFLARE_API_TOKEN not configured'
      if (!testAuth) {
        await supabase.from('cloudflare_subdomain_logs').insert({
          company_id: companyId,
          subdomain: subdomain || 'unknown',
          status: 'failed',
          error_message: errorMessage,
          retry_count: 0
        })
      }
      throw new Error(errorMessage)
    }

    // Validate token format
    if (cloudflareToken.length !== 40 || !/^[a-zA-Z0-9_-]+$/.test(cloudflareToken)) {
      console.error('❌ Invalid CLOUDFLARE_API_TOKEN format:', {
        length: cloudflareToken.length,
        starts_with: cloudflareToken.substring(0, 5) + '...',
        has_special_chars: !/^[a-zA-Z0-9_-]+$/.test(cloudflareToken)
      })
      const errorMessage = `Invalid token format (length: ${cloudflareToken.length}, expected: 40)`
      if (!testAuth) {
        await supabase.from('cloudflare_subdomain_logs').insert({
          company_id: companyId,
          subdomain: subdomain || 'unknown',
          status: 'failed',
          error_message: errorMessage,
          retry_count: 0
        })
      }
      throw new Error(errorMessage)
    }

    console.log('✅ Token format validation passed:', {
      length: cloudflareToken.length,
      starts_with: cloudflareToken.substring(0, 5) + '...'
    })

    const zoneId = '03b2aa50169401a2a015e17c1b68ee39'
    const baseUrl = 'https://api.cloudflare.com/client/v4'

    // Test authentication if requested
    if (testAuth) {
      console.log('🔐 Testing Cloudflare authentication...')
      const authTestResult = await testCloudflareAuth(baseUrl, zoneId, cloudflareToken)
      
      return new Response(
        JSON.stringify({
          success: authTestResult.success,
          message: authTestResult.message,
          details: authTestResult.details
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: authTestResult.success ? 200 : 400,
        }
      )
    }

    // Generate subdomain if not provided
    let finalSubdomain = subdomain
    if (!finalSubdomain) {
      finalSubdomain = generateSubdomain(companyName)
    }

    console.log('📝 Generated subdomain:', finalSubdomain)

    // Test authentication before proceeding
    console.log('🔐 Pre-testing Cloudflare authentication...')
    const authTest = await testCloudflareAuth(baseUrl, zoneId, cloudflareToken)
    if (!authTest.success) {
      const errorMessage = `Authentication failed: ${authTest.message}`
      console.error('❌ Auth test failed:', authTest)
      await supabase.from('cloudflare_subdomain_logs').insert({
        company_id: companyId,
        subdomain: finalSubdomain,
        status: 'failed',
        error_message: errorMessage,
        retry_count: 0
      })
      throw new Error(errorMessage)
    }
    console.log('✅ Authentication test successful')

    // Log the attempt
    await supabase.from('cloudflare_subdomain_logs').insert({
      company_id: companyId,
      subdomain: finalSubdomain,
      status: 'pending',
      error_message: null,
      retry_count: 0
    })

    // Check if subdomain already exists in Cloudflare
    const existingRecord = await checkExistingRecord(baseUrl, zoneId, cloudflareToken, finalSubdomain)
    if (existingRecord) {
      console.log('⚠️ Subdomain already exists, generating alternative')
      finalSubdomain = await generateUniqueSubdomain(baseUrl, zoneId, cloudflareToken, companyName)
    }

    // Create DNS record
    const dnsRecord: CloudflareDNSRecord = {
      type: 'CNAME',
      name: finalSubdomain,
      content: 'leazr.co',
      ttl: 3600,
      proxied: true
    }

    console.log('🌐 Creating DNS record:', dnsRecord)

    const createResponse = await fetch(`${baseUrl}/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudflareToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dnsRecord)
    })

    const createResult = await createResponse.json()

    if (!createResponse.ok) {
      console.error('❌ Cloudflare API error:', {
        status: createResponse.status,
        statusText: createResponse.statusText,
        response: createResult,
        headers: Object.fromEntries(createResponse.headers.entries())
      })
      
      let errorMessage = 'Unknown error'
      if (createResult.errors && createResult.errors.length > 0) {
        errorMessage = createResult.errors[0].message
        if (createResult.errors[0].code) {
          errorMessage += ` (Code: ${createResult.errors[0].code})`
        }
      } else if (createResponse.status === 401) {
        errorMessage = 'Authentication failed - Invalid API token'
      } else if (createResponse.status === 403) {
        errorMessage = 'Permission denied - Token lacks required permissions'
      } else {
        errorMessage = `HTTP ${createResponse.status}: ${createResponse.statusText}`
      }
      
      // Log the failure
      await supabase.from('cloudflare_subdomain_logs').insert({
        company_id: companyId,
        subdomain: finalSubdomain,
        status: 'failed',
        error_message: `Cloudflare API error: ${errorMessage}`,
        retry_count: 0
      })
      throw new Error(`Cloudflare API error: ${errorMessage}`)
    }

    console.log('✅ DNS record created successfully:', createResult.result)

    // Update company_domains table
    const { error: dbError } = await supabase
      .from('company_domains')
      .upsert({
        company_id: companyId,
        domain: 'leazr.co',
        subdomain: finalSubdomain,
        is_active: true,
        is_primary: true
      }, {
        onConflict: 'company_id,subdomain'
      })

    if (dbError) {
      console.error('❌ Database error:', dbError)
      // Don't fail the whole operation if DB update fails
    } else {
      console.log('✅ Database updated successfully')
    }

    // Log success
    await supabase.from('cloudflare_subdomain_logs').insert({
      company_id: companyId,
      subdomain: finalSubdomain,
      status: 'success',
      cloudflare_record_id: createResult.result.id,
      error_message: null,
      retry_count: 0
    })

    return new Response(
      JSON.stringify({
        success: true,
        subdomain: finalSubdomain,
        fullDomain: `${finalSubdomain}.leazr.co`,
        cloudflareRecordId: createResult.result.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Error creating subdomain:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function generateSubdomain(companyName: string): string {
  // Clean company name to create a valid subdomain
  let subdomain = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .substring(0, 20) // Limit to 20 characters

  // If empty after cleaning, use default
  if (!subdomain) {
    subdomain = 'company'
  }

  return subdomain
}

async function checkExistingRecord(baseUrl: string, zoneId: string, token: string, subdomain: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/zones/${zoneId}/dns_records?name=${subdomain}.leazr.co`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })

    const result = await response.json()
    return result.result && result.result.length > 0
  } catch (error) {
    console.error('Error checking existing record:', error)
    return false
  }
}

async function generateUniqueSubdomain(baseUrl: string, zoneId: string, token: string, companyName: string): Promise<string> {
  let baseSubdomain = generateSubdomain(companyName)
  let counter = 1
  let finalSubdomain = baseSubdomain

  while (await checkExistingRecord(baseUrl, zoneId, token, finalSubdomain)) {
    finalSubdomain = `${baseSubdomain}${counter}`
    counter++
    
    // Safety limit
    if (counter > 100) {
      finalSubdomain = `${baseSubdomain}${Date.now()}`
      break
    }
  }

  return finalSubdomain
}

async function testCloudflareAuth(baseUrl: string, zoneId: string, token: string): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  try {
    console.log('🔍 Testing token:', {
      length: token.length,
      starts_with: token.substring(0, 5) + '...',
      zone_id: zoneId
    })

    // Test with zone verification endpoint
    const response = await fetch(`${baseUrl}/zones/${zoneId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })

    const result = await response.json()
    
    console.log('🔍 Auth test response:', {
      status: response.status,
      ok: response.ok,
      result: result
    })

    if (!response.ok) {
      let errorMessage = 'Authentication failed'
      if (result.errors && result.errors.length > 0) {
        errorMessage = result.errors[0].message
        if (result.errors[0].code) {
          errorMessage += ` (Code: ${result.errors[0].code})`
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        details: {
          status: response.status,
          errors: result.errors || [],
          token_preview: token.substring(0, 5) + '...'
        }
      }
    }

    // Verify zone details
    if (result.result && result.result.name !== 'leazr.co') {
      return {
        success: false,
        message: `Zone mismatch: expected 'leazr.co', got '${result.result.name}'`,
        details: result.result
      }
    }

    return {
      success: true,
      message: 'Authentication successful',
      details: {
        zone_name: result.result?.name,
        zone_status: result.result?.status,
        permissions_verified: true
      }
    }

  } catch (error) {
    console.error('🔍 Auth test error:', error)
    return {
      success: false,
      message: `Network error: ${error.message}`,
      details: { error: error.message }
    }
  }
}