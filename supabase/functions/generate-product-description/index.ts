
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
  includeSpecifications?: boolean;
  variants?: Array<{
    attributes: Record<string, string>;
    price: number;
    monthly_price?: number;
  }>;
  existingSpecifications?: Record<string, string>;
}

interface GenerationResponse {
  description: string;
  shortDescription: string;
  minPrice?: number;
  specifications?: Record<string, string>;
  success: boolean;
  usedPerplexity: boolean;
  model: string;
  language: string;
  type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      productName, 
      brand, 
      category, 
      includeSpecifications = false,
      variants = [],
      existingSpecifications = {}
    }: RequestBody = await req.json();

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

    console.log(`Generating ${includeSpecifications ? 'description + specifications' : 'description'} for: ${productName} ${brand ? `by ${brand}` : ''}`);

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

    // Calculate minimum pricing from variants
    let minPrice: number | undefined;
    let minMonthlyPrice: number | undefined;
    
    if (variants.length > 0) {
      const monthlyPrices = variants
        .map(v => v.monthly_price)
        .filter(price => price !== null && price !== undefined && price > 0) as number[];
      
      if (monthlyPrices.length > 0) {
        minMonthlyPrice = Math.min(...monthlyPrices);
        minPrice = minMonthlyPrice;
      }
    }

    // Prepare variant context for OpenAI
    let variantContext = '';
    if (variants.length > 0) {
      variantContext = `\n\nVariantes disponibles :\n${variants.map(v => 
        `- Configuration: ${Object.entries(v.attributes).map(([k,v]) => `${k}: ${v}`).join(', ')} - Prix: ${v.price}€ - Mensualité: ${v.monthly_price || 'N/A'}€/mois`
      ).join('\n')}`;
      
      if (minMonthlyPrice) {
        variantContext += `\n\nPrix minimum mensuel: ${minMonthlyPrice}€/mois`;
      }
    }

    // Step 2: Generate description and optionally specifications using OpenAI
    const responseData: GenerationResponse = {
      description: '',
      shortDescription: '',
      minPrice: minPrice,
      success: false,
      usedPerplexity: !!productInfo,
      model: productInfo ? 'Perplexity + OpenAI' : 'OpenAI only',
      language: 'fr',
      type: 'leasing_reconditionne'
    };

    // Generate description
    const priceText = minMonthlyPrice ? `à partir de ${minMonthlyPrice}€/mois` : 'à partir de...';
    
    const descriptionPrompt = productInfo 
      ? `Crée une description produit optimisée SEO pour du leasing de matériel informatique reconditionné :

Produit : ${productName}
${brand ? `Marque : ${brand}` : ''}
${category ? `Catégorie : ${category}` : ''}

Informations produit :
${productInfo}${variantContext}

INSTRUCTIONS IMPORTANTES :
- Évite les spécifications techniques précises (processeur exact, RAM exacte) car le client propose des variantes
- Focus sur l'usage et les bénéfices généraux du produit
- Mentionne que c'est du matériel reconditionné (bon pour la planète, économique)
- Intègre le concept de leasing mensuel avec "${priceText}" (utilise ce prix exact)
- Mentionne la garantie de 3 ans incluse dans le contrat de leasing
- Utilise un vocabulaire SEO français pour le leasing informatique et optimisé pour les moteurs de recherche IA
- Met en avant l'aspect écologique et économique du reconditionné
- 150-300 mots en français pour un site e-commerce de leasing`
      : `Crée une description produit optimisée SEO pour du leasing de matériel informatique reconditionné :

Produit : ${productName}
${brand ? `Marque : ${brand}` : ''}
${category ? `Catégorie : ${category}` : ''}${variantContext}

INSTRUCTIONS IMPORTANTES :
- Évite les spécifications techniques précises (processeur exact, RAM exacte) car le client propose des variantes
- Focus sur l'usage et les bénéfices généraux typiques de ce type de produit
- Mentionne que c'est du matériel reconditionné (bon pour la planète, économique)
- Intègre le concept de leasing mensuel avec "${priceText}" (utilise ce prix exact)
- Mentionne la garantie de 3 ans incluse dans le contrat de leasing
- Utilise un vocabulaire SEO français pour le leasing informatique et optimisé pour les moteurs de recherche IA
- Met en avant l'aspect écologique et économique du reconditionné
- 150-300 mots en français pour un site e-commerce de leasing`;

    console.log('Generating SEO-optimized leasing description with OpenAI...');

    const descriptionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: descriptionPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!descriptionResponse.ok) {
      const errorText = await descriptionResponse.text();
      console.error(`OpenAI API error for description: ${descriptionResponse.status} - ${errorText}`);
      throw new Error(`Failed to generate description: ${errorText}`);
    }

    const descriptionData = await descriptionResponse.json();
    responseData.description = descriptionData.choices[0]?.message?.content?.trim() || '';

    // Generate short description for SEO and AI search engines
    console.log('Generating SEO-optimized short description for AI search engines...');
    
    const shortDescriptionPrompt = `Crée une description courte (50-150 caractères) optimisée pour les moteurs de recherche IA à partir de cette description complète :

Produit : ${productName}
${brand ? `Marque : ${brand}` : ''}
${category ? `Catégorie : ${category}` : ''}
Prix : ${priceText}

Description complète : ${responseData.description}

INSTRUCTIONS POUR DESCRIPTION COURTE :
- 50-150 caractères maximum
- Inclus le nom du produit et la marque
- Mentionne "reconditionné" et "leasing"
- Inclus le prix si disponible
- Optimisé pour les moteurs de recherche IA (entités nommées, vocabulaire sémantique)
- Format concis et informatif
- Français naturel et professionnel

Exemple : "Lenovo V14 G4 reconditionné en leasing à partir de 45€/mois - Écologique et économique"`;

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
            content: 'Tu es un expert en référencement et optimisation pour moteurs de recherche IA. Crée des descriptions courtes très concises et optimisées pour le SEO et les moteurs de recherche IA comme Perplexity. Réponds uniquement avec la description courte, sans guillemets ni formatage.'
          },
          {
            role: 'user',
            content: shortDescriptionPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (shortDescriptionResponse.ok) {
      const shortDescriptionData = await shortDescriptionResponse.json();
      responseData.shortDescription = shortDescriptionData.choices[0]?.message?.content?.trim() || '';
      console.log('Short description generated successfully');
    } else {
      // Fallback short description
      responseData.shortDescription = `${productName} ${brand ? `${brand} ` : ''}reconditionné en leasing ${priceText}`;
      console.log('Failed to generate short description, using fallback');
    }

    // Generate specifications if requested
    if (includeSpecifications) {
      console.log('Generating technical specifications...');
      
      const specificationPrompt = `Génère des spécifications techniques génériques et professionnelles pour ce produit de leasing reconditionné :

Produit : ${productName}
${brand ? `Marque : ${brand}` : ''}
${category ? `Catégorie : ${category}` : ''}

${productInfo ? `Informations produit :\n${productInfo}` : ''}${variantContext}

${Object.keys(existingSpecifications).length > 0 ? `\nSpécifications existantes à enrichir :\n${Object.entries(existingSpecifications).map(([k,v]) => `${k}: ${v}`).join('\n')}` : ''}

INSTRUCTIONS :
- Crée des spécifications génériques adaptées au reconditionné
- Évite les détails techniques trop précis (CPU exact, RAM exacte)
- Focus sur les caractéristiques générales et certifications
- Inclus des mentions sur le reconditionnement et la garantie
- Utilise des termes professionnels en français
- Format : objet JSON avec clé-valeur
- Maximum 10-15 spécifications pertinentes

Retourne UNIQUEMENT un objet JSON valide sans markdown, exemple :
{"Type": "Ordinateur portable professionnel", "Etat": "Reconditionné Grade A", "Garantie": "12 mois", "Connectivité": "Wi-Fi, Bluetooth, USB", "Écran": "LED antireflet", "Clavier": "AZERTY français", "Système": "Compatible Windows/Linux", "Certification": "Reconditionné professionnel", "Livraison": "Express incluse", "Support": "Technique dédié"}`;

      const specificationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'Tu es un expert en spécifications techniques pour matériel informatique reconditionné. Tu génères des spécifications professionnelles génériques adaptées au marché du leasing. Réponds UNIQUEMENT en JSON valide.'
            },
            {
              role: 'user',
              content: specificationPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });

      if (specificationResponse.ok) {
        const specificationData = await specificationResponse.json();
        const specContent = specificationData.choices[0]?.message?.content?.trim() || '';
        
        try {
          // Parse JSON response
          const parsedSpecs = JSON.parse(specContent);
          responseData.specifications = parsedSpecs;
          console.log('Technical specifications generated successfully');
        } catch (parseError) {
          console.log('Failed to parse specifications JSON, using fallback');
          // Fallback to basic specifications
          responseData.specifications = {
            "Type": `${category || 'Matériel informatique'} professionnel`,
            "État": "Reconditionné Grade A",
            "Garantie": "12 mois",
            "Livraison": "Express incluse",
            "Support": "Technique dédié"
          };
        }
      } else {
        console.log('Failed to generate specifications, using fallback');
        responseData.specifications = {
          "Type": `${category || 'Matériel informatique'} professionnel`,
          "État": "Reconditionné Grade A", 
          "Garantie": "12 mois",
          "Livraison": "Express incluse",
          "Support": "Technique dédié"
        };
      }
    }

    if (!responseData.description) {
      throw new Error('No description generated by OpenAI');
    }

    responseData.success = true;
    console.log(`${includeSpecifications ? 'Description and specifications' : 'Description'} generated successfully in French`);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating product content:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate content',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
