
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
        
        const searchQuery = `${productName} ${brand || ''} ${category || ''} caractéristiques générales usage professionnel`.trim();
        
        // Try with sonar-pro first (most performant model)
        let perplexityModel = 'sonar-pro';
        let perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: perplexityModel,
            messages: [
              {
                role: 'user',
                content: `Trouve des informations générales sur ce produit : ${searchQuery}. Fournis les caractéristiques principales, l'usage typique et les avantages SANS mentionner de spécifications techniques précises comme le processeur exact ou la RAM exacte. Focus sur l'utilisation et les bénéfices pour l'utilisateur en français.`
              }
            ],
            temperature: 0.2,
            max_tokens: 800,
          }),
        });

        // If sonar-pro fails, try with sonar as fallback
        if (!perplexityResponse.ok && perplexityResponse.status === 400) {
          console.log('sonar-pro failed, trying with sonar model...');
          perplexityModel = 'sonar';
          perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${perplexityApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: perplexityModel,
              messages: [
                {
                  role: 'user',
                  content: `Trouve des informations générales sur ce produit : ${searchQuery}. Fournis les caractéristiques principales, l'usage typique et les avantages SANS mentionner de spécifications techniques précises comme le processeur exact ou la RAM exacte. Focus sur l'utilisation et les bénéfices pour l'utilisateur en français.`
                }
              ],
              temperature: 0.2,
              max_tokens: 800,
            }),
          });
        }

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          productInfo = perplexityData.choices[0]?.message?.content || '';
          console.log(`Successfully retrieved product information from Perplexity using ${perplexityModel}`);
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
      ? `Crée une description produit optimisée SEO pour du leasing de matériel informatique reconditionné :

Produit : ${productName}
${brand ? `Marque : ${brand}` : ''}
${category ? `Catégorie : ${category}` : ''}

Informations produit :
${productInfo}

INSTRUCTIONS IMPORTANTES :
- Évite les spécifications techniques précises (processeur exact, RAM exacte) car le client propose des variantes
- Focus sur l'usage et les bénéfices généraux du produit
- Mentionne que c'est du matériel reconditionné (bon pour la planète, économique)
- Intègre le concept de leasing mensuel avec "à partir de..." (sans prix exact)
- Utilise un vocabulaire SEO français pour le leasing informatique
- Met en avant l'aspect écologique et économique du reconditionné
- 150-300 mots en français pour un site e-commerce de leasing`
      : `Crée une description produit optimisée SEO pour du leasing de matériel informatique reconditionné :

Produit : ${productName}
${brand ? `Marque : ${brand}` : ''}
${category ? `Catégorie : ${category}` : ''}

INSTRUCTIONS IMPORTANTES :
- Évite les spécifications techniques précises (processeur exact, RAM exacte) car le client propose des variantes
- Focus sur l'usage et les bénéfices généraux typiques de ce type de produit
- Mentionne que c'est du matériel reconditionné (bon pour la planète, économique)
- Intègre le concept de leasing mensuel avec "à partir de..." (sans prix exact)
- Utilise un vocabulaire SEO français pour le leasing informatique
- Met en avant l'aspect écologique et économique du reconditionné
- 150-300 mots en français pour un site e-commerce de leasing`;

    console.log('Generating SEO-optimized leasing description with OpenAI...');

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
            content: `Tu es un expert en rédaction e-commerce français spécialisé dans le leasing de matériel informatique reconditionné. Crée des descriptions produit qui :

RÈGLES IMPORTANTES :
- N'inclus JAMAIS de spécifications techniques précises (processeur exact, RAM exacte) car le client propose des variantes
- Focus sur l'usage général et les bénéfices du produit
- Intègre naturellement le vocabulaire du leasing : "location mensuelle", "leasing", "à partir de"
- Met en avant l'aspect écologique : "reconditionné", "bon pour la planète", "économie circulaire"
- Utilise un ton professionnel mais accessible
- Inclus des mots-clés SEO français pour le leasing informatique
- Structure claire avec des bénéfices utilisateur
- Mentione la flexibilité du leasing et l'aspect économique
- 150-300 mots optimisés pour le marché français
- Termine par un call-to-action orienté leasing plutôt qu'achat`
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
      console.error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
      
      // Provide specific error messages based on status
      let errorMessage = 'Failed to generate description';
      if (openaiResponse.status === 429) {
        errorMessage = 'OpenAI quota exceeded. Please check your OpenAI account and billing details.';
      } else if (openaiResponse.status === 401) {
        errorMessage = 'Invalid OpenAI API key. Please check your configuration.';
      }
      
      throw new Error(`${errorMessage}: ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const description = openaiData.choices[0]?.message?.content || '';

    if (!description) {
      throw new Error('No description generated by OpenAI');
    }

    console.log('SEO-optimized leasing description generated successfully in French');

    return new Response(
      JSON.stringify({ 
        description: description.trim(),
        success: true,
        usedPerplexity: !!productInfo,
        model: productInfo ? 'Perplexity + OpenAI' : 'OpenAI only',
        language: 'fr',
        type: 'leasing_reconditionne'
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
