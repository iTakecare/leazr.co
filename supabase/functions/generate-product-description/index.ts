
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

serve(async (req) => {
  console.log('Received request to generate product description');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, brand, category, includeSpecifications, variants, minMonthlyPrice } = await req.json();
    
    console.log('Generating description for:', productName);
    
    let productInfo = '';
    let usedPerplexity = false;
    
    // Essayer d'abord avec Perplexity pour obtenir des informations détaillées
    if (perplexityApiKey) {
      try {
        console.log('Attempting to fetch product info from Perplexity...');
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              {
                role: 'system',
                content: 'You are a product research assistant. Provide detailed, accurate technical information about products in French.'
              },
              {
                role: 'user',
                content: `Recherche des informations détaillées sur le produit "${productName}" de la marque "${brand}" dans la catégorie "${category}". Inclus les spécifications techniques, les caractéristiques principales, et les avantages du produit. Réponds en français uniquement.`
              }
            ],
            temperature: 0.2,
            max_tokens: 1000,
            top_p: 0.9,
            search_domain_filter: ['perplexity.ai'],
            return_images: false,
            return_related_questions: false,
            search_recency_filter: 'month',
            frequency_penalty: 1,
            presence_penalty: 0
          }),
        });

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          productInfo = perplexityData.choices[0].message.content;
          usedPerplexity = true;
          console.log('Successfully retrieved product information from Perplexity using sonar-pro');
        }
      } catch (perplexityError) {
        console.error('Error with Perplexity API:', perplexityError);
      }
    }
    
    // Générer la description avec OpenAI
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    console.log('Generating SEO-optimized leasing description with OpenAI...');
    
    // Calculer la mensualité minimum des variantes
    const monthlyPriceText = minMonthlyPrice > 0 
      ? `La mensualité à partir de ${minMonthlyPrice.toFixed(2)}€/mois`
      : 'Mensualité disponible selon configuration';
    
    const descriptionPrompt = `
Tu es un expert en rédaction de fiches produits pour une plateforme de leasing professionnel.

Produit: ${productName}
Marque: ${brand}
Catégorie: ${category}
${monthlyPriceText}

${productInfo ? `Informations détaillées du produit:\n${productInfo}` : ''}

Génère une description produit optimisée pour le leasing professionnel qui comprend:

1. Une accroche attractive mentionnant le leasing
2. Les caractéristiques principales du produit
3. Les avantages du leasing (flexibilité, mise à jour technologique, etc.)
4. Un appel à l'action pour demander un devis

Ton style doit être:
- Professionnel mais accessible
- Orienté B2B
- Optimisé pour le SEO
- En français
- Entre 150-250 mots

Mets l'accent sur les bénéfices pour l'entreprise et la solution de leasing.
`;

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
            content: 'Tu es un expert en rédaction commerciale spécialisé dans le leasing professionnel. Tu écris des descriptions de produits optimisées pour convaincre les entreprises de choisir le leasing.'
          },
          {
            role: 'user',
            content: descriptionPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const description = openaiData.choices[0].message.content;
    
    console.log('Description generated successfully in French');
    
    // Générer la description courte
    console.log('Generating SEO-optimized short description for AI search engines...');
    
    const shortDescriptionPrompt = `
À partir de cette description produit, crée une description courte de 50-80 mots maximum qui:

1. Résume les points clés du produit
2. Mentionne brièvement le leasing
3. Inclut des mots-clés pertinents
4. Reste accrocheuse et professionnelle

Description complète:
${description}

Génère uniquement la description courte, sans introduction ni explication.
`;

    const shortDescriptionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Tu es un expert en rédaction de résumés produits pour le web. Tu crées des descriptions courtes, percutantes et optimisées SEO.'
          },
          {
            role: 'user',
            content: shortDescriptionPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 150,
      }),
    });

    if (!shortDescriptionResponse.ok) {
      throw new Error(`OpenAI API error for short description: ${shortDescriptionResponse.status}`);
    }

    const shortDescriptionData = await shortDescriptionResponse.json();
    const shortDescription = shortDescriptionData.choices[0].message.content;
    
    console.log('Short description generated successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        description: description,
        shortDescription: shortDescription,
        model: 'gpt-4o-mini',
        usedPerplexity: usedPerplexity,
        minMonthlyPrice: minMonthlyPrice
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('Error in generate-product-description function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
