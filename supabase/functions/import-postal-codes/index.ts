import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PostalCodeEntry {
  country_code: string
  postal_code: string
  place_name: string
  admin_name1: string
  admin_code1: string
  admin_name2: string
  admin_code2: string
  admin_name3: string
  admin_code3: string
  latitude: number
  longitude: number
  accuracy: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { country } = await req.json()
    
    if (!country || !['BE', 'FR', 'LU'].includes(country)) {
      return new Response(
        JSON.stringify({ error: 'Country must be BE, FR, or LU' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Starting import for country: ${country}`)

    // Download and parse postal codes from GeoNames
    const geonamesUrl = `http://download.geonames.org/export/zip/${country}.zip`
    
    console.log(`Downloading from: ${geonamesUrl}`)
    
    const response = await fetch(geonamesUrl)
    if (!response.ok) {
      throw new Error(`Failed to download postal codes: ${response.statusText}`)
    }

    // For this implementation, we'll use a direct TSV file since ZIP extraction in Deno requires additional setup
    // Using the .txt version instead which is the uncompressed version
    const txtUrl = `http://download.geonames.org/export/zip/${country}.txt`
    const txtResponse = await fetch(txtUrl)
    
    if (!txtResponse.ok) {
      throw new Error(`Failed to download postal codes: ${txtResponse.statusText}`)
    }

    const content = await txtResponse.text()
    const lines = content.split('\n').filter(line => line.trim())
    
    console.log(`Processing ${lines.length} postal code entries`)

    // Clear existing data for this country
    await supabase
      .from('postal_codes')
      .delete()
      .eq('country_code', country)

    console.log(`Cleared existing data for ${country}`)

    // Process in batches to avoid memory issues
    const batchSize = 1000
    let processed = 0
    let errors = 0

    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize)
      const postalCodes = []

      for (const line of batch) {
        try {
          const fields = line.split('\t')
          
          // GeoNames postal code format:
          // country code, postal code, place name, admin name1, admin code1, admin name2, admin code2, admin name3, admin code3, latitude, longitude, accuracy
          if (fields.length >= 12 && fields[1]) {
            postalCodes.push({
              code: fields[1],
              city: fields[2] || '',
              region: fields[3] || fields[5] || '', // Use admin name1 or admin name2
              lat: parseFloat(fields[9]) || 0,
              lng: parseFloat(fields[10]) || 0
            })
          }
        } catch (error) {
          console.error(`Error parsing line: ${line}`, error)
          errors++
        }
      }

      if (postalCodes.length > 0) {
        try {
          const { error } = await supabase.rpc('insert_postal_codes_bulk', {
            p_country_code: country,
            p_postal_codes: postalCodes
          })

          if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
            errors += postalCodes.length
          } else {
            processed += postalCodes.length
            console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(lines.length / batchSize)} - ${processed} total`)
          }
        } catch (error) {
          console.error(`Error in batch insert:`, error)
          errors += postalCodes.length
        }
      }
    }

    console.log(`Import completed for ${country}: ${processed} processed, ${errors} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        country,
        processed,
        errors,
        total: lines.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Import error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})