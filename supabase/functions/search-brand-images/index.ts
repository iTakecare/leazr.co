
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchRequest {
  productName: string
  brandId?: string
  category?: string
  maxResults?: number
}

interface SearchImageResult {
  url: string
  title: string
  snippet: string
  thumbnail: string
  width: number
  height: number
  source: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { productName, brandId, category, maxResults = 10 }: SearchRequest = await req.json()
    
    console.log(`🔍 Recherche d'images pour: ${productName} (marque: ${brandId})`)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let images: SearchImageResult[] = []
    let brandInfo = null

    // Get brand information if brandId is provided
    if (brandId) {
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('name, website_url, image_search_patterns')
        .eq('id', brandId)
        .single()

      if (!brandError && brand) {
        brandInfo = brand
        console.log(`📋 Marque trouvée: ${brand.name}, URL: ${brand.website_url || 'non configurée'}`)
        
        if (brand.website_url) {
          console.log(`🌐 Recherche sur le site de la marque: ${brand.website_url}`)
          
          // Try to scrape brand website using Firecrawl
          const brandImages = await searchOnBrandWebsite(brand, productName)
          images.push(...brandImages)
        } else {
          console.log(`⚠️  URL du site web non configurée pour ${brand.name}`)
        }
      } else {
        console.log(`⚠️  Marque non trouvée pour ID: ${brandId}`)
      }
    }

    // If no images found from brand website, fallback to general search
    if (images.length === 0) {
      console.log('🔄 Fallback vers recherche générale')
      const searchQuery = buildFallbackSearchQuery(productName, brandInfo?.name, category)
      images = await fallbackImageSearch(searchQuery, maxResults)
    }

    // Limit results
    const limitedImages = images.slice(0, maxResults)

    console.log(`✅ Trouvé ${limitedImages.length} images`)

    // Add metadata about search method
    const response = {
      images: limitedImages,
      metadata: {
        searchMethod: images.length > 0 && brandInfo?.website_url ? 'brand_website' : 'general_search',
        brandConfigured: !!brandInfo?.website_url,
        brandName: brandInfo?.name,
        totalFound: limitedImages.length
      }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur lors de la recherche d\'images:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la recherche d\'images',
        details: error.message,
        images: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function searchOnBrandWebsite(brand: any, productName: string): Promise<SearchImageResult[]> {
  const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
  
  if (!firecrawlApiKey) {
    console.log('⚠️ Clé API Firecrawl manquante')
    return []
  }

  try {
    const searchPatterns = brand.image_search_patterns || {
      product_paths: ['/products/', '/catalog/', '/shop/'],
      image_selectors: ['img[src*=product]', '.product-image img', '.item-image img']
    }

    // Build search URL - try different product paths
    const baseUrl = brand.website_url.replace(/\/$/, '')
    const searchUrls = searchPatterns.product_paths.map((path: string) => `${baseUrl}${path}`)

    const allImages: SearchImageResult[] = []

    for (const searchUrl of searchUrls) {
      try {
        console.log(`🔍 Scraping: ${searchUrl}`)
        
        // Use Firecrawl to scrape the page
        const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: searchUrl,
            pageOptions: {
              onlyMainContent: true,
              includeHtml: true
            },
            extractorOptions: {
              mode: 'markdown',
              extractionPrompt: `Find images related to "${productName}". Extract image URLs, alt text, and context.`
            }
          })
        })

        if (!response.ok) {
          console.log(`⚠️ Échec scraping ${searchUrl}: ${response.status}`)
          continue
        }

        const data = await response.json()
        
        if (data.success && data.data?.html) {
          // Parse HTML to extract images
          const imageRegex = /<img[^>]+src\s*=\s*['"](.*?)['"]/gi
          const altRegex = /alt\s*=\s*['"](.*?)['"]/i
          let match

          while ((match = imageRegex.exec(data.data.html)) !== null) {
            const imgSrc = match[1]
            const fullMatch = match[0]
            const altMatch = altRegex.exec(fullMatch)
            const altText = altMatch ? altMatch[1] : ''

            // Filter images that might be related to the product
            if (imgSrc && (
              altText.toLowerCase().includes(productName.toLowerCase()) ||
              imgSrc.toLowerCase().includes('product') ||
              imgSrc.toLowerCase().includes(productName.toLowerCase().replace(/\s+/g, '-'))
            )) {
              // Resolve relative URLs
              const imageUrl = imgSrc.startsWith('http') 
                ? imgSrc 
                : `${baseUrl}${imgSrc.startsWith('/') ? '' : '/'}${imgSrc}`

              allImages.push({
                url: imageUrl,
                title: altText || productName,
                snippet: `Image officielle de ${brand.name}`,
                thumbnail: imageUrl,
                width: 800,
                height: 800,
                source: brand.website_url
              })
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ Erreur scraping ${searchUrl}:`, error.message)
      }
    }

    console.log(`📸 Trouvé ${allImages.length} images sur le site de ${brand.name}`)
    return allImages.slice(0, 5) // Limit to 5 images per brand

  } catch (error) {
    console.error('❌ Erreur lors du scraping de la marque:', error)
    return []
  }
}

function buildFallbackSearchQuery(productName: string, brandName?: string, category?: string): string {
  let query = productName
  
  if (brandName) {
    query = `${brandName} ${productName}`
  }
  
  if (category) {
    query += ` ${category}`
  }
  
  // Add keywords for better results
  query += ' product official image'
  
  return query
}

async function fallbackImageSearch(query: string, maxResults: number = 10): Promise<SearchImageResult[]> {
  const results: SearchImageResult[] = []
  
  try {
    console.log(`🔍 Recherche générale avec: "${query}"`)
    
    // Try Unsplash API
    const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY')
    if (unsplashKey) {
      console.log(`📷 Recherche Unsplash`)
      const unsplashResponse = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.min(maxResults, 20)}&orientation=portrait`,
        {
          headers: {
            'Authorization': `Client-ID ${unsplashKey}`,
          },
        }
      )

      if (unsplashResponse.ok) {
        const unsplashData = await unsplashResponse.json()
        const unsplashImages = unsplashData.results?.map((photo: any) => ({
          url: photo.urls.regular,
          title: photo.alt_description || query,
          snippet: photo.description || `Image trouvée sur Unsplash pour ${query}`,
          thumbnail: photo.urls.thumb,
          width: photo.width,
          height: photo.height,
          source: 'Unsplash'
        })) || []
        
        results.push(...unsplashImages)
        console.log(`📷 Unsplash: ${unsplashImages.length} images`)
      } else {
        console.log(`⚠️ Échec Unsplash: ${unsplashResponse.status}`)
      }
    } else {
      console.log(`⚠️ Clé API Unsplash manquante`)
    }

    // Try Pexels API
    const pexelsKey = Deno.env.get('PEXELS_API_KEY')
    if (pexelsKey && results.length < maxResults) {
      console.log(`📷 Recherche Pexels`)
      const pexelsResponse = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(maxResults - results.length, 20)}`,
        {
          headers: {
            'Authorization': pexelsKey,
          },
        }
      )

      if (pexelsResponse.ok) {
        const pexelsData = await pexelsResponse.json()
        const pexelsImages = pexelsData.photos?.map((photo: any) => ({
          url: photo.src.large,
          title: photo.alt || query,
          snippet: `Image trouvée sur Pexels pour ${query}`,
          thumbnail: photo.src.medium,
          width: photo.width,
          height: photo.height,
          source: 'Pexels'
        })) || []
        
        results.push(...pexelsImages)
        console.log(`📷 Pexels: ${pexelsImages.length} images`)
      } else {
        console.log(`⚠️ Échec Pexels: ${pexelsResponse.status}`)
      }
    } else if (!pexelsKey) {
      console.log(`⚠️ Clé API Pexels manquante`)
    }

    console.log(`🔄 Fallback: trouvé ${results.length} images au total`)
    return results.slice(0, maxResults)

  } catch (error) {
    console.error('❌ Erreur fallback search:', error)
    return []
  }
}
