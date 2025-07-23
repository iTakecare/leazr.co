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

    // Get brand information if brandId is provided
    if (brandId) {
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('name, website_url, image_search_patterns')
        .eq('id', brandId)
        .single()

      if (!brandError && brand?.website_url) {
        console.log(`🌐 Recherche sur le site de la marque: ${brand.website_url}`)
        
        // Try to scrape brand website using Firecrawl
        const brandImages = await searchOnBrandWebsite(brand, productName)
        images.push(...brandImages)
      }
    }

    // If no images found from brand website, fallback to general search
    if (images.length === 0) {
      console.log('🔄 Fallback vers recherche générale')
      images = await fallbackImageSearch(productName, category)
    }

    // Limit results
    const limitedImages = images.slice(0, maxResults)

    console.log(`✅ Trouvé ${limitedImages.length} images`)

    return new Response(
      JSON.stringify({ images: limitedImages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur lors de la recherche d\'images:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la recherche d\'images',
        details: error.message 
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
      product_paths: ['/products/', '/catalog/'],
      image_selectors: ['img[src*=product]', '.product-image img', '.item-image img']
    }

    // Build search URL - try different product paths
    const searchUrls = searchPatterns.product_paths.map((path: string) => 
      `${brand.website_url.replace(/\/$/, '')}${path}`
    )

    const allImages: SearchImageResult[] = []

    for (const baseUrl of searchUrls) {
      try {
        console.log(`🔍 Scraping: ${baseUrl}`)
        
        // Use Firecrawl to scrape the page
        const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: baseUrl,
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
          console.log(`⚠️ Échec scraping ${baseUrl}: ${response.status}`)
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
                : `${brand.website_url.replace(/\/$/, '')}${imgSrc.startsWith('/') ? '' : '/'}${imgSrc}`

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
        console.log(`⚠️ Erreur scraping ${baseUrl}:`, error.message)
      }
    }

    console.log(`📸 Trouvé ${allImages.length} images sur le site de ${brand.name}`)
    return allImages.slice(0, 5) // Limit to 5 images per brand

  } catch (error) {
    console.error('❌ Erreur lors du scraping de la marque:', error)
    return []
  }
}

async function fallbackImageSearch(productName: string, category?: string): Promise<SearchImageResult[]> {
  // Fallback to original search methods if brand website fails
  const results: SearchImageResult[] = []
  
  try {
    // Try Unsplash API
    const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY')
    if (unsplashKey) {
      const query = `${productName} ${category || ''} product`.trim()
      const unsplashResponse = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`,
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
          title: photo.alt_description || productName,
          snippet: photo.description || '',
          thumbnail: photo.urls.thumb,
          width: photo.width,
          height: photo.height,
          source: 'Unsplash'
        })) || []
        
        results.push(...unsplashImages)
      }
    }

    console.log(`🔄 Fallback: trouvé ${results.length} images`)
    return results

  } catch (error) {
    console.error('❌ Erreur fallback search:', error)
    return []
  }
}