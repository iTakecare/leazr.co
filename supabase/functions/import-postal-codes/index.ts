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
    const { country, useUploadedFile } = await req.json()
    
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

    let content: string = '';
    
    // Always try to read uploaded file first (regardless of useUploadedFile flag)
    console.log(`Trying to read uploaded file for ${country}`)
    
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('postal-code-imports')
        .download(`${country}.txt`)
      
      if (downloadError) {
        console.log(`Storage download error for ${country}:`, downloadError)
        throw new Error(`Storage error: ${downloadError.message}`)
      }
      
      if (!fileData) {
        console.log(`No file data returned for ${country}`)
        throw new Error('No file data returned')
      }
      
      content = await fileData.text()
      console.log(`Successfully loaded uploaded file for ${country}, content length: ${content.length} characters`)
      
      // Count lines to verify content
      const lineCount = content.split('\n').filter(line => line.trim()).length
      console.log(`File contains ${lineCount} lines of data`)
      
    } catch (uploadError) {
      console.log(`Failed to load uploaded file: ${uploadError.message}`)
      
      // If no uploaded file, try GeoNames web service (without row limit)
      try {
        console.log(`Trying GeoNames web service for ${country} (no row limit)`)
        const webServiceUrl = `http://api.geonames.org/postalCodeSearchJSON?country=${country}&username=demo`
        
        console.log(`Fetching from: ${webServiceUrl}`)
        const webServiceResponse = await fetch(webServiceUrl)
        
        if (webServiceResponse.ok) {
          const jsonData = await webServiceResponse.json()
          console.log(`GeoNames API response status: OK, postal codes count: ${jsonData.postalCodes?.length || 0}`)
          
          if (jsonData.postalCodes && jsonData.postalCodes.length > 0) {
            // Convert JSON response to tab-separated format
            content = jsonData.postalCodes.map((pc: any) => 
              [
                country, 
                pc.postalCode || '', 
                pc.placeName || '', 
                pc.adminName1 || '', 
                pc.adminCode1 || '', 
                pc.adminName2 || '', 
                pc.adminCode2 || '', 
                pc.adminName3 || '', 
                pc.adminCode3 || '', 
                pc.lat || '', 
                pc.lng || '', 
                pc.accuracy || ''
              ].join('\t')
            ).join('\n')
            console.log(`Converted ${jsonData.postalCodes.length} postal codes from GeoNames API`)
          } else {
            throw new Error('No postal codes found in GeoNames API response')
          }
        } else {
          const errorText = await webServiceResponse.text()
          console.log(`GeoNames API failed with status ${webServiceResponse.status}: ${errorText}`)
          throw new Error(`GeoNames API failed: ${webServiceResponse.status} ${webServiceResponse.statusText}`)
        }
      } catch (webServiceError) {
        console.log(`GeoNames web service error: ${webServiceError.message}`)
        throw new Error(`No data source available for ${country}. Please upload a GeoNames file or check internet connectivity.`)
      }
    }
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