import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  productName: string;
  brand?: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, brand, category }: RequestBody = await req.json();

    if (!productName) {
      return new Response(
        JSON.stringify({ error: 'Product name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!perplexityApiKey || !openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating description for: ${productName} ${brand ? `by ${brand}` : ''}`);

    // Step 1: Search for product information using Perplexity
    const searchQuery = `${productName} ${brand || ''} ${category || ''} specifications features benefits review`.trim();
    
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a product research assistant. Provide accurate, factual information about products including specifications, features, and benefits. Focus on current and reliable information.'
          },
          {
            role: 'user',
            content: `Find detailed information about this product: ${searchQuery}. Include specifications, key features, benefits, and any notable characteristics.`
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        return_related_questions: false,
        search_recency_filter: 'month',
      }),
    });

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
    }

    const perplexityData = await perplexityResponse.json();
    const productInfo = perplexityData.choices[0]?.message?.content || '';

    console.log('Product information gathered from Perplexity');

    // Step 2: Generate SEO-optimized description using OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert e-commerce copywriter specializing in SEO-optimized product descriptions. Create compelling, accurate descriptions that:
- Use natural keyword integration for SEO
- Highlight key benefits and features
- Are scannable with clear structure
- Include emotional triggers and value propositions
- Are 150-300 words long
- Use persuasive but honest language
- Focus on customer benefits over features`
          },
          {
            role: 'user',
            content: `Create an SEO-optimized product description for:
Product: ${productName}
${brand ? `Brand: ${brand}` : ''}
${category ? `Category: ${category}` : ''}

Product Information:
${productInfo}

Write a compelling description that will rank well in search engines and convert visitors into customers.`
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const description = openaiData.choices[0]?.message?.content || '';

    console.log('SEO-optimized description generated successfully');

    return new Response(
      JSON.stringify({ 
        description: description.trim(),
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating product description:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate description',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});