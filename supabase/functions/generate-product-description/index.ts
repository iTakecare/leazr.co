
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

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating description for: ${productName} ${brand ? `by ${brand}` : ''}`);

    let productInfo = '';

    // Step 1: Try to get product information using Perplexity (with fallback)
    if (perplexityApiKey) {
      try {
        console.log('Attempting to fetch product info from Perplexity...');
        
        const searchQuery = `${productName} ${brand || ''} ${category || ''} specifications features`.trim();
        
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
                role: 'user',
                content: `Find key information about this product: ${searchQuery}. Provide specifications, features, and benefits in a concise format.`
              }
            ],
            temperature: 0.2,
            max_tokens: 800,
          }),
        });

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          productInfo = perplexityData.choices[0]?.message?.content || '';
          console.log('Successfully retrieved product information from Perplexity');
        } else {
          const errorText = await perplexityResponse.text();
          console.log(`Perplexity API failed with status ${perplexityResponse.status}: ${errorText}`);
          console.log('Continuing with OpenAI-only approach...');
        }
      } catch (perplexityError) {
        console.log('Perplexity API error:', perplexityError);
        console.log('Continuing with OpenAI-only approach...');
      }
    } else {
      console.log('Perplexity API key not configured, using OpenAI only');
    }

    // Step 2: Generate description using OpenAI (works with or without Perplexity data)
    const openaiPrompt = productInfo 
      ? `Create an SEO-optimized product description for:
Product: ${productName}
${brand ? `Brand: ${brand}` : ''}
${category ? `Category: ${category}` : ''}

Product Information:
${productInfo}

Write a compelling 150-300 word description that highlights key benefits and features for e-commerce.`
      : `Create an SEO-optimized product description for:
Product: ${productName}
${brand ? `Brand: ${brand}` : ''}
${category ? `Category: ${category}` : ''}

Write a compelling 150-300 word description that highlights typical benefits and features for this type of product. Focus on what customers would want to know when considering this purchase.`;

    console.log('Generating SEO-optimized description with OpenAI...');

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
            content: `You are an expert e-commerce copywriter. Create compelling, SEO-optimized product descriptions that:
- Use natural keyword integration
- Highlight key benefits and features
- Are scannable with clear structure
- Include emotional triggers and value propositions
- Are 150-300 words long
- Use persuasive but honest language
- Focus on customer benefits`
          },
          {
            role: 'user',
            content: openaiPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const description = openaiData.choices[0]?.message?.content || '';

    if (!description) {
      throw new Error('No description generated by OpenAI');
    }

    console.log('SEO-optimized description generated successfully');

    return new Response(
      JSON.stringify({ 
        description: description.trim(),
        success: true,
        usedPerplexity: !!productInfo
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
