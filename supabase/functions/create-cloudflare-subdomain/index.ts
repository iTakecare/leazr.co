import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CloudflareSubdomainRequest {
  companyId: string
  companyName: string
  subdomain?: string
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
    const { companyId, companyName, subdomain }: CloudflareSubdomainRequest = await req.json()

    console.log('🚀 Creating Cloudflare subdomain for company:', { companyId, companyName, subdomain })

    // Get Cloudflare API token from secrets
    const cloudflareToken = Deno.env.get('CLOUDFLARE_API_TOKEN')
    if (!cloudflareToken) {
      throw new Error('CLOUDFLARE_API_TOKEN not configured')
    }

    const zoneId = '03b2aa50169401a2a015e17c1b68ee39'
    const baseUrl = 'https://api.cloudflare.com/client/v4'

    // Generate subdomain if not provided
    let finalSubdomain = subdomain
    if (!finalSubdomain) {
      finalSubdomain = generateSubdomain(companyName)
    }

    console.log('📝 Generated subdomain:', finalSubdomain)

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
      console.error('❌ Cloudflare API error:', createResult)
      throw new Error(`Cloudflare API error: ${createResult.errors?.[0]?.message || 'Unknown error'}`)
    }

    console.log('✅ DNS record created successfully:', createResult.result)

    // Update company_domains table
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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