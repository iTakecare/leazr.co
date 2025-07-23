
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  maxResults?: number;
}

interface ImageResult {
  url: string;
  title: string;
  snippet: string;
  thumbnail: string;
  width: number;
  height: number;
  source: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 20 }: SearchRequest = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔍 Searching images for: ${query}`);

    // Try multiple search approaches
    const searchResults: ImageResult[] = [];

    // 1. Try Unsplash API (free tier available)
    try {
      const unsplashResults = await searchUnsplash(query);
      searchResults.push(...unsplashResults);
      console.log(`📸 Found ${unsplashResults.length} images from Unsplash`);
    } catch (error) {
      console.log('Unsplash search failed:', error.message);
    }

    // 2. Try Pixabay API (free tier available)
    try {
      const pixabayResults = await searchPixabay(query);
      searchResults.push(...pixabayResults);
      console.log(`📸 Found ${pixabayResults.length} images from Pixabay`);
    } catch (error) {
      console.log('Pixabay search failed:', error.message);
    }

    // 3. Try Pexels API (free tier available)
    try {
      const pexelsResults = await searchPexels(query);
      searchResults.push(...pexelsResults);
      console.log(`📸 Found ${pexelsResults.length} images from Pexels`);
    } catch (error) {
      console.log('Pexels search failed:', error.message);
    }

    // Filter and limit results
    const filteredResults = searchResults
      .filter(result => result.width >= 300 && result.height >= 300) // Minimum size
      .slice(0, maxResults);

    console.log(`✅ Returning ${filteredResults.length} filtered results`);

    return new Response(
      JSON.stringify({ 
        images: filteredResults,
        total: filteredResults.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in search-product-images function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function searchUnsplash(query: string): Promise<ImageResult[]> {
  const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!unsplashKey) {
    throw new Error('UNSPLASH_ACCESS_KEY not configured');
  }

  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=squarish`,
    {
      headers: {
        'Authorization': `Client-ID ${unsplashKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status}`);
  }

  const data = await response.json();
  
  return (data.results || []).map((photo: any): ImageResult => ({
    url: photo.urls.regular,
    title: photo.alt_description || photo.description || 'Unsplash Image',
    snippet: photo.description || photo.alt_description || '',
    thumbnail: photo.urls.thumb,
    width: photo.width,
    height: photo.height,
    source: 'unsplash'
  }));
}

async function searchPixabay(query: string): Promise<ImageResult[]> {
  const pixabayKey = Deno.env.get('PIXABAY_API_KEY');
  if (!pixabayKey) {
    throw new Error('PIXABAY_API_KEY not configured');
  }

  const response = await fetch(
    `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=all&min_width=300&min_height=300&per_page=10`
  );

  if (!response.ok) {
    throw new Error(`Pixabay API error: ${response.status}`);
  }

  const data = await response.json();
  
  return (data.hits || []).map((hit: any): ImageResult => ({
    url: hit.webformatURL,
    title: hit.tags,
    snippet: hit.tags,
    thumbnail: hit.previewURL,
    width: hit.imageWidth,
    height: hit.imageHeight,
    source: 'pixabay'
  }));
}

async function searchPexels(query: string): Promise<ImageResult[]> {
  const pexelsKey = Deno.env.get('PEXELS_API_KEY');
  if (!pexelsKey) {
    throw new Error('PEXELS_API_KEY not configured');
  }

  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=square`,
    {
      headers: {
        'Authorization': pexelsKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status}`);
  }

  const data = await response.json();
  
  return (data.photos || []).map((photo: any): ImageResult => ({
    url: photo.src.large,
    title: photo.alt || 'Pexels Image',
    snippet: photo.alt || '',
    thumbnail: photo.src.tiny,
    width: photo.width,
    height: photo.height,
    source: 'pexels'
  }));
}
