import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  monthly_price?: number;
  imageUrl?: string;
  specifications?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is not configured');
    }

    console.log('Starting iTakecare catalog analysis...');

    // Configuration améliorée pour extraire plus de contenu
    const scrapeConfig = {
      url: 'https://www.itakecare.be/catalogue/',
      formats: ['markdown', 'html'],
      onlyMainContent: false, // Récupérer plus de contenu
      includeTags: ['img', 'h1', 'h2', 'h3', 'h4', 'p', 'div', 'span', 'a', 'ul', 'li', 'article', 'section'],
      excludeTags: ['nav', 'footer', 'aside', 'script', 'style', 'meta'],
      waitFor: 5000, // Attendre le chargement JavaScript
    };

    console.log('Making Firecrawl request with config:', JSON.stringify(scrapeConfig));

    const crawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scrapeConfig),
    });

    console.log('Firecrawl response status:', crawlResponse.status, crawlResponse.statusText);

    if (!crawlResponse.ok) {
      const errorText = await crawlResponse.text();
      console.error('Firecrawl API error details:', errorText);
      throw new Error(`Firecrawl API error: ${crawlResponse.status} ${crawlResponse.statusText} - ${errorText}`);
    }

    const crawlData = await crawlResponse.json();
    console.log('Firecrawl response received, processing...');
    
    // Debug: Afficher des extraits du contenu pour analyse
    console.log('HTML excerpt (first 1000 chars):', crawlData.data.html?.substring(0, 1000));
    console.log('Markdown excerpt (first 1000 chars):', crawlData.data.markdown?.substring(0, 1000));
    
    // Extraire les produits du contenu markdown/html (prioriser HTML pour WooCommerce)
    const products = extractProductsFromContent(crawlData.data.markdown || '', crawlData.data.html || '');
    
    console.log(`Extracted ${products.length} products from catalog`);

    return new Response(JSON.stringify({
      success: true,
      products,
      totalFound: products.length,
      rawData: {
        markdownSample: crawlData.data.markdown?.substring(0, 500) + '...',
        htmlSample: crawlData.data.html?.substring(0, 500) + '...'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error analyzing iTakecare catalog:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractProductsFromContent(markdown: string, html: string): Product[] {
  const products: Product[] = [];
  
  try {
    console.log('Starting product extraction...');
    
    // Prioriser l'extraction HTML pour WooCommerce
    const htmlProducts = extractProductsFromHTML(html);
    console.log(`Found ${htmlProducts.length} products from HTML`);
    products.push(...htmlProducts);
    
    // Si peu de produits trouvés avec HTML, essayer markdown en fallback
    if (products.length < 3) {
      console.log('Fallback to markdown extraction...');
      const markdownProducts = extractProductsFromMarkdown(markdown);
      console.log(`Found ${markdownProducts.length} products from markdown`);
      products.push(...markdownProducts);
    }
    
  } catch (error) {
    console.error('Error extracting products:', error);
  }
  
  // Filtrage plus souple - accepter les produits même sans prix
  const filteredProducts = products.filter(p => p.name && p.name.length >= 5);
  console.log(`Final product count after filtering: ${filteredProducts.length}`);
  return filteredProducts;
}

function extractProductsFromMarkdown(markdown: string): Product[] {
  const products: Product[] = [];
  
  try {
    const lines = markdown.split('\n');
    let currentProduct: Partial<Product> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Détecter les titres de produits (MacBook, PC, etc.)
      if (line.match(/^#{1,3}\s*(MacBook|iPad|PC|Laptop|Desktop|iMac|Monitor|Écran|ThinkPad|Pavilion|EliteBook)/i)) {
        // Sauvegarder le produit précédent s'il existe
        if (currentProduct.name) {
          products.push(createProduct(currentProduct));
        }
        
        currentProduct = {
          name: line.replace(/^#{1,3}\s*/, '').trim(),
          brand: extractBrand(line),
          category: extractCategory(line),
          specifications: {}
        };
      }
      
      // Extraire les prix (€/jour, €/mois, € simple)
      const priceMatch = line.match(/(\d+(?:[,.]?\d{1,2})?)\s*€(?:\/(?:jour|mois|day|month))?/i);
      if (priceMatch && currentProduct.name) {
        const price = parseFloat(priceMatch[1].replace(',', '.'));
        if (line.includes('/mois') || line.includes('/month')) {
          currentProduct.monthly_price = price;
          currentProduct.price = price * 12; // Prix annuel estimé
        } else if (line.includes('/jour') || line.includes('/day')) {
          currentProduct.monthly_price = price * 30; // Prix mensuel estimé
          currentProduct.price = price * 365; // Prix annuel estimé
        } else {
          currentProduct.price = price;
        }
      }
      
      // Extraire les descriptions
      if (line.length > 50 && !line.startsWith('#') && currentProduct.name) {
        if (!currentProduct.description) {
          currentProduct.description = line;
        } else {
          currentProduct.description += ' ' + line;
        }
      }
      
      // Extraire les spécifications techniques
      if (line.match(/(RAM|SSD|Processeur|Écran|Intel|AMD|M1|M2|M3|i3|i5|i7|i9)/i) && currentProduct.name) {
        const specs = extractSpecs(line);
        currentProduct.specifications = { ...currentProduct.specifications, ...specs };
      }
    }
    
    // Ajouter le dernier produit
    if (currentProduct.name) {
      products.push(createProduct(currentProduct));
    }
    
  } catch (error) {
    console.error('Error extracting products from markdown:', error);
  }
  
  return products;
}

function extractProductsFromHTML(html: string): Product[] {
  const products: Product[] = [];
  
  try {
    console.log('Starting product extraction...');
    
    // Afficher des échantillons du HTML pour debug
    console.log('HTML excerpt (first 1000 chars):', html.substring(0, 1000));
    
    // D'après les logs, iTakecare utilise un thème Divi WordPress avec WooCommerce
    // Analysons la vraie structure HTML pour adapter nos sélecteurs
    
    // 1. Essayer d'identifier tous les éléments qui pourraient contenir des produits
    console.log('Extracting products from HTML...');
    
    // Patterns améliorés basés sur l'analyse des logs HTML
    const broadProductSelectors = [
      // Images de produits (souvent les premiers indicateurs)
      /<img[^>]*class="[^"]*(?:attachment-woocommerce_thumbnail|product|shop)[^"]*"[^>]*>/gi,
      // Conteneurs Divi avec produits
      /<div[^>]*class="[^"]*et_pb[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      // Liens WooCommerce
      /<a[^>]*class="[^"]*(?:woocommerce|product)[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
      // Conteneurs génériques avec mots-clés produits
      /<[^>]*class="[^"]*(?:product|shop|item|catalog|woocommerce)[^"]*"[^>]*>[\s\S]*?<\/[^>]*>/gi
    ];

    let allMatches: string[] = [];
    
    broadProductSelectors.forEach((pattern, index) => {
      try {
        const matches = html.match(pattern) || [];
        console.log(`Found ${matches.length} matches with selector pattern`);
        allMatches = allMatches.concat(matches);
      } catch (error) {
        console.log(`Error with pattern ${index}:`, error);
      }
    });
    
    console.log(`Total HTML product matches found: ${allMatches.length}`);

    // 2. Si pas assez de matches, essayer une approche text-mining plus large
    if (allMatches.length < 10) {
      console.log('Few matches found, trying broader text extraction...');
      
      // Chercher directement des patterns de noms de produits + prix dans le HTML brut
      const textProductPatterns = [
        // Pattern pour MacBook, iPad, etc. avec prix
        /([A-Za-z][\w\s-]{5,80}(?:MacBook|iPad|PC|Laptop|Desktop|iMac|Monitor|ThinkPad|Pavilion|EliteBook|Surface|Dell|HP|Lenovo)[\w\s-]{0,50})[^<>]*?(\d+[.,]\d+)\s*€/gi,
        // Pattern pour produits avec prix de leasing
        /([A-Za-z][\w\s-]{10,100})[^<>]*?(\d+[.,]\d+)\s*€(?:\/(?:jour|mois))?/gi,
        // Pattern pour éléments avec des images de produits
        /alt="([^"]{10,100})"[^>]*>[^<]*(\d+[.,]\d+)\s*€/gi
      ];
      
      textProductPatterns.forEach((pattern, index) => {
        const matches = [...html.matchAll(pattern)];
        console.log(`Text pattern ${index + 1} found ${matches.length} potential products`);
        
        matches.forEach(match => {
          // Créer un pseudo-élément HTML pour le traitement uniforme
          const pseudoElement = `<div class="extracted-product" data-name="${match[1]}" data-price="${match[2]}">
            <span class="product-name">${match[1]}</span>
            <span class="product-price">${match[2]}€</span>
          </div>`;
          allMatches.push(pseudoElement);
        });
      });
    }

    // 3. Traiter tous les matches trouvés avec des patterns plus flexibles
    const processedNames = new Set(); // Éviter les doublons
    
    allMatches.forEach((match, index) => {
      try {
        // Extraire le nom avec patterns très larges
        let name = '';
        const namePatterns = [
          // Attributs alt des images (souvent très descriptifs)
          /alt="([^"]{5,200})"/i,
          // Titres de produits dans les balises H
          /<h[1-6][^>]*>([^<]{5,200})<\/h[1-6]>/i,
          // Liens avec texte descriptif
          /<a[^>]*>([^<]{5,200})<\/a>/i,
          // Spans avec noms de produits
          /<span[^>]*class="[^"]*(?:name|title|product)[^"]*"[^>]*>([^<]{5,200})<\/span>/i,
          // Divs avec noms de produits
          /<div[^>]*class="[^"]*(?:name|title|product)[^"]*"[^>]*>([^<]{5,200})<\/div>/i,
          // Données extraites des patterns text-mining
          /data-name="([^"]{5,200})"/i,
          // Extraction directe du texte visible
          />([^<>]{10,200}(?:MacBook|iPad|PC|Laptop|Desktop|iMac|Monitor|ThinkPad|Pavilion|EliteBook|Surface|Dell|HP|Lenovo)[^<>]{0,50})</i
        ];
        
        for (const pattern of namePatterns) {
          const nameMatch = match.match(pattern);
          if (nameMatch && nameMatch[1]) {
            let candidateName = nameMatch[1].trim()
              .replace(/\s+/g, ' ')
              .replace(/^(img|image|alt|title|href|class|src)$/i, '') // Éviter les attributs HTML
              .substring(0, 200);
            
            // Validation du nom - doit contenir des mots significatifs
            if (candidateName.length >= 8 && 
                candidateName.match(/[a-zA-Z]{3,}/) && 
                !candidateName.match(/^(div|span|img|href|class|src|alt|title)$/i) &&
                candidateName.split(' ').length >= 2) {
              name = candidateName;
              break;
            }
          }
        }

        // Extraire le prix avec patterns très flexibles
        let price = 0;
        let monthlyPrice: number | undefined;
        
        const pricePatterns = [
          // Prix avec données extraites
          /data-price="(\d+[.,]?\d*)"/i,
          // Prix standards avec €
          /(\d+[.,]\d+)\s*€\s*(?:\/\s*(?:jour|day|j))?/i,
          /(\d+[.,]\d+)\s*€\s*(?:\/\s*(?:mois|month|m))?/i,
          /€\s*(\d+[.,]?\d*)/i,
          /(\d+)\s*€/i,
          // Prix dans du texte
          /(?:prix|tarif|coût|price)[^0-9]{0,20}(\d+[.,]?\d*)/i,
          // Prix de leasing spécifiques
          /(\d+[.,]?\d*)\s*€\s*(?:HTVA|HT)?(?:\/(?:jour|day|j))?/i
        ];
        
        for (const pattern of pricePatterns) {
          const priceMatch = match.match(pattern);
          if (priceMatch && priceMatch[1]) {
            const priceStr = priceMatch[1].replace(',', '.');
            const numericPrice = parseFloat(priceStr);
            
            if (!isNaN(numericPrice) && numericPrice > 0) {
              // Détecter le type de prix selon le pattern
              if (pattern.source.includes('jour') || pattern.source.includes('day') || pattern.source.includes('j')) {
                monthlyPrice = numericPrice * 30;
                price = numericPrice * 365;
              } else if (pattern.source.includes('mois') || pattern.source.includes('month') || pattern.source.includes('m')) {
                monthlyPrice = numericPrice;
                price = numericPrice * 12;
              } else {
                price = numericPrice;
              }
              break;
            }
          }
        }

        // Extraire l'image avec patterns améliorés
        let imageUrl: string | undefined;
        const imagePatterns = [
          /src="([^"]*\.(jpg|jpeg|png|webp|gif)[^"]*)"/i,
          /data-src="([^"]*\.(jpg|jpeg|png|webp|gif)[^"]*)"/i,
          /srcset="([^"]*\.(jpg|jpeg|png|webp|gif)[^"]*?)(?:\s|")/i
        ];
        
        for (const pattern of imagePatterns) {
          const imageMatch = match.match(pattern);
          if (imageMatch && imageMatch[1]) {
            imageUrl = imageMatch[1];
            break;
          }
        }

        // Validation et ajout du produit avec conditions plus souples
        if (name && 
            name.length >= 8 && 
            !processedNames.has(name.toLowerCase()) && 
            !name.match(/^(undefined|null|error|loading|image|alt|title)$/i)) {
          
          processedNames.add(name.toLowerCase());
          
          const product = createProduct({
            name: name.substring(0, 255),
            price: price,
            monthly_price: monthlyPrice,
            brand: extractBrand(name),
            category: extractCategory(name),
            description: `Produit de leasing professionnel ${name}`,
            imageUrl: imageUrl,
            specifications: extractSpecs(name)
          });
          
          products.push(product);
          console.log(`Found product: ${product.name} - ${product.price}€`);
        }
        
      } catch (error) {
        console.log(`Error processing product ${index}:`, error);
      }
    });

    console.log(`Successfully extracted ${products.length} products from HTML`);
  } catch (error) {
    console.error('Error extracting from HTML:', error);
  }
  
  return products;
}

function createProduct(data: Partial<Product>): Product {
  return {
    name: data.name || 'Produit inconnu',
    brand: data.brand || 'Autre',
    category: data.category || 'Informatique',
    description: data.description || `Produit de leasing professionnel ${data.name}`,
    price: data.price || 0,
    monthly_price: data.monthly_price,
    imageUrl: data.imageUrl,
    specifications: data.specifications || {}
  };
}

function extractBrand(text: string): string {
  const brands = ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Samsung', 'LG', 'Microsoft'];
  for (const brand of brands) {
    if (text.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  if (text.toLowerCase().includes('macbook') || text.toLowerCase().includes('ipad') || text.toLowerCase().includes('imac')) {
    return 'Apple';
  }
  
  return 'Autre';
}

function extractCategory(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('macbook') || lowerText.includes('laptop') || lowerText.includes('portable')) {
    return 'Laptop';
  }
  if (lowerText.includes('desktop') || lowerText.includes('pc') || lowerText.includes('tour')) {
    return 'Desktop';
  }
  if (lowerText.includes('ipad') || lowerText.includes('tablette')) {
    return 'Tablette';
  }
  if (lowerText.includes('écran') || lowerText.includes('monitor') || lowerText.includes('moniteur')) {
    return 'Moniteur';
  }
  if (lowerText.includes('imac') || lowerText.includes('all-in-one')) {
    return 'All-in-One';
  }
  
  return 'Informatique';
}

function extractSpecs(text: string): Record<string, any> {
  const specs: Record<string, any> = {};
  
  // RAM
  const ramMatch = text.match(/(\d+)\s*GB?\s*RAM/i);
  if (ramMatch) {
    specs.ram = `${ramMatch[1]}GB`;
  }
  
  // Stockage
  const storageMatch = text.match(/(\d+)\s*GB?\s*SSD/i);
  if (storageMatch) {
    specs.storage = `${storageMatch[1]}GB SSD`;
  }
  
  // Processeur
  const cpuMatch = text.match(/(Intel|AMD|M\d+|Core i\d+)/i);
  if (cpuMatch) {
    specs.processor = cpuMatch[1];
  }
  
  return specs;
}