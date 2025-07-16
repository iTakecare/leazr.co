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

    // Step 1: Check if CLOUDFLARE_API_TOKEN secret exists
    console.log('🔍 Step 1: Checking if CLOUDFLARE_API_TOKEN secret exists...')
    const cloudflareToken = Deno.env.get('CLOUDFLARE_API_TOKEN')
    
    if (!cloudflareToken) {
      console.error('❌ CLOUDFLARE_API_TOKEN not found in environment')
      const errorMessage = 'CLOUDFLARE_API_TOKEN secret not configured in Supabase'
      
      if (testAuth) {
        return new Response(
          JSON.stringify({
            success: false,
            message: errorMessage,
            details: {
              step: 'secret_check',
              error: 'Secret not found',
              solution: 'Add CLOUDFLARE_API_TOKEN secret in Supabase dashboard'
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }
      
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
    
    console.log('✅ Step 1: CLOUDFLARE_API_TOKEN secret found')

    // Step 2: Validate token format
    console.log('🔍 Step 2: Validating token format...')
    const cleanedToken = cloudflareToken.trim().replace(/[\r\n\t]/g, '')
    
    console.log('📊 Token analysis:', {
      original_length: cloudflareToken.length,
      cleaned_length: cleanedToken.length,
      starts_with: cleanedToken.substring(0, 5) + '...',
      ends_with: '...' + cleanedToken.slice(-5),
      has_whitespace: cloudflareToken !== cleanedToken,
      first_char_code: cloudflareToken.charCodeAt(0),
      last_char_code: cloudflareToken.charCodeAt(cloudflareToken.length - 1)
    })
    
    if (cleanedToken.length !== 40) {
      const errorMessage = `Invalid token length: ${cleanedToken.length} characters (expected: 40)`
      console.error('❌ ' + errorMessage)
      
      if (testAuth) {
        return new Response(
          JSON.stringify({
            success: false,
            message: errorMessage,
            details: {
              step: 'format_validation',
              actual_length: cleanedToken.length,
              expected_length: 40,
              has_whitespace: cloudflareToken !== cleanedToken,
              solution: 'Verify token is exactly 40 characters and has no extra spaces'
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }
      
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
    
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanedToken)) {
      const errorMessage = 'Token contains invalid characters (only letters, numbers, underscore, and dash allowed)'
      console.error('❌ ' + errorMessage)
      
      if (testAuth) {
        return new Response(
          JSON.stringify({
            success: false,
            message: errorMessage,
            details: {
              step: 'format_validation',
              invalid_chars: true,
              solution: 'Token should only contain letters, numbers, underscore, and dash'
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }
      
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

    console.log('✅ Step 2: Token format validation passed')

    const zoneId = '03b2aa50169401a2a015e17c1b68ee39'
    const baseUrl = 'https://api.cloudflare.com/client/v4'

    // Test authentication if requested
    if (testAuth) {
      console.log('🔐 Step 3: Testing Cloudflare authentication and permissions...')
      const authTestResult = await testCloudflareAuthAndPermissions(baseUrl, zoneId, cleanedToken)
      
      return new Response(
        JSON.stringify({
          success: authTestResult.success,
          message: authTestResult.message,
          details: {
            ...authTestResult.details,
            steps_completed: authTestResult.success ? ['secret_check', 'format_validation', 'cloudflare_auth', 'dns_permissions'] : ['secret_check', 'format_validation'],
            token_info: {
              length: cleanedToken.length,
              format_valid: true,
              preview: cleanedToken.substring(0, 5) + '...' + cleanedToken.slice(-5)
            }
          }
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

    // Step 3: Test authentication and permissions before proceeding
    console.log('🔐 Step 3: Pre-testing Cloudflare authentication and permissions...')
    const authTest = await testCloudflareAuthAndPermissions(baseUrl, zoneId, cleanedToken)
    if (!authTest.success) {
      const errorMessage = `Authentication/Permissions failed: ${authTest.message}`
      console.error('❌ Step 3 failed - Auth/Permissions test failed:', authTest)
      await supabase.from('cloudflare_subdomain_logs').insert({
        company_id: companyId,
        subdomain: finalSubdomain,
        status: 'failed',
        error_message: errorMessage,
        retry_count: 0
      })
      throw new Error(errorMessage)
    }
    console.log('✅ Step 3: Authentication and permissions test successful')

    // Log the attempt
    await supabase.from('cloudflare_subdomain_logs').insert({
      company_id: companyId,
      subdomain: finalSubdomain,
      status: 'pending',
      error_message: null,
      retry_count: 0
    })

    // Check if subdomain already exists in Cloudflare
    const existingRecord = await checkExistingRecord(baseUrl, zoneId, cleanedToken, finalSubdomain)
    if (existingRecord) {
      console.log('⚠️ Subdomain already exists, generating alternative')
      finalSubdomain = await generateUniqueSubdomain(baseUrl, zoneId, cleanedToken, companyName)
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
        'Authorization': `Bearer ${cleanedToken}`,
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

async function testCloudflareAuthAndPermissions(baseUrl: string, zoneId: string, token: string): Promise<{
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

    // Step 1: Test Zone:Read permission
    console.log('🔐 Step 4a: Testing Zone:Read permission...')
    const zoneResponse = await fetch(`${baseUrl}/zones/${zoneId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })

    const zoneResult = await zoneResponse.json()
    
    console.log('🔍 Zone auth test response:', {
      status: zoneResponse.status,
      ok: zoneResponse.ok,
      result: zoneResult
    })

    if (!zoneResponse.ok) {
      let errorMessage = 'Zone authentication failed'
      if (zoneResult.errors && zoneResult.errors.length > 0) {
        errorMessage = zoneResult.errors[0].message
        if (zoneResult.errors[0].code) {
          errorMessage += ` (Code: ${zoneResult.errors[0].code})`
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        details: {
          step: 'zone_read_test',
          status: zoneResponse.status,
          errors: zoneResult.errors || [],
          token_preview: token.substring(0, 5) + '...',
          required_permissions: ['Zone:Read', 'Zone:Edit', 'DNS Records:Read', 'DNS Records:Edit']
        }
      }
    }

    // Verify zone details
    if (zoneResult.result && zoneResult.result.name !== 'leazr.co') {
      return {
        success: false,
        message: `Zone mismatch: expected 'leazr.co', got '${zoneResult.result.name}'`,
        details: { step: 'zone_verification', zone_result: zoneResult.result }
      }
    }

    console.log('✅ Step 4a: Zone:Read permission confirmed')

    // Step 2: Test DNS Records:Read permission
    console.log('🔐 Step 4b: Testing DNS Records:Read permission...')
    const dnsListResponse = await fetch(`${baseUrl}/zones/${zoneId}/dns_records?type=TXT&name=_test-permission-check`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!dnsListResponse.ok) {
      const dnsError = await dnsListResponse.json()
      console.error('❌ DNS Records read permission test failed:', dnsError)
      return {
        success: false,
        message: 'Missing DNS Records:Read permission',
        details: {
          step: 'dns_read_permission_test',
          status: dnsListResponse.status,
          errors: dnsError.errors || [],
          required_permissions: ['Zone:Read', 'Zone:Edit', 'DNS Records:Read', 'DNS Records:Edit']
        }
      }
    }

    console.log('✅ Step 4b: DNS Records:Read permission confirmed')

    // Step 3: Test DNS Records:Edit permission with a temporary TXT record
    console.log('🔐 Step 4c: Testing DNS Records:Edit permission...')
    const testRecordName = `_test-permission-${Date.now()}`
    const createTestResponse = await fetch(`${baseUrl}/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'TXT',
        name: testRecordName,
        content: 'permission-test',
        ttl: 1, // Automatic TTL
      }),
    })

    if (!createTestResponse.ok) {
      const createError = await createTestResponse.json()
      console.error('❌ DNS Records create permission test failed:', createError)
      return {
        success: false,
        message: 'Missing DNS Records:Edit permission - Cannot create DNS records',
        details: {
          step: 'dns_create_permission_test',
          status: createTestResponse.status,
          errors: createError.errors || [],
          required_permissions: ['Zone:Read', 'Zone:Edit', 'DNS Records:Read', 'DNS Records:Edit'],
          solution: 'The API token needs DNS Records:Edit permission to create subdomains'
        }
      }
    }

    const createTestResult = await createTestResponse.json()
    console.log('✅ Step 4c: DNS Records:Edit permission confirmed')

    // Step 4: Clean up the test record and verify delete permission
    console.log('🔐 Step 4d: Testing DNS Records:Delete permission (cleanup)...')
    const testRecordId = createTestResult.result.id
    const deleteTestResponse = await fetch(`${baseUrl}/zones/${zoneId}/dns_records/${testRecordId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (deleteTestResponse.ok) {
      console.log('✅ Step 4d: Test record cleaned up successfully')
    } else {
      console.log('⚠️  Step 4d: Test record cleanup failed (not critical for subdomain creation)')
    }

    return {
      success: true,
      message: 'Authentication and all required permissions confirmed',
      details: {
        zone_name: zoneResult.result?.name,
        zone_status: zoneResult.result?.status,
        permissions_confirmed: ['Zone:Read', 'DNS Records:Read', 'DNS Records:Edit'],
        test_record_created: true,
        test_record_cleaned: deleteTestResponse.ok
      }
    }

  } catch (error) {
    console.error('🔍 Auth/Permission test error:', error)
    return {
      success: false,
      message: `Network error: ${error.message}`,
      details: { error: error.message }
    }
  }
}