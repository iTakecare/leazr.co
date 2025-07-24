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
  
  const filteredProducts = products.filter(p => p.name && p.price > 0);
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
    console.log('Extracting products from HTML...');
    
    // WooCommerce product patterns - try multiple selectors
    const wooCommerceSelectors = [
      // Standard WooCommerce product containers
      /<(?:li|div)[^>]*class[^>]*(?:product|woocommerce-loop-product)[^>]*>.*?<\/(?:li|div)>/gis,
      // Product cards with various classes
      /<div[^>]*class[^>]*(?:product-item|item-product|product-card)[^>]*>.*?<\/div>/gis,
      // Shop items
      /<(?:article|div)[^>]*class[^>]*(?:shop-item|catalog-item)[^>]*>.*?<\/(?:article|div)>/gis
    ];
    
    let allMatches: string[] = [];
    for (const selector of wooCommerceSelectors) {
      const matches = html.match(selector) || [];
      allMatches = allMatches.concat(matches);
      console.log(`Found ${matches.length} matches with selector pattern`);
    }
    
    console.log(`Total HTML product matches found: ${allMatches.length}`);
    
    for (const match of allMatches) {
      try {
        // Extract product name - try multiple patterns
        let name = '';
        const namePatterns = [
          /<h[1-6][^>]*class[^>]*(?:product-title|woocommerce-loop-product__title|entry-title)[^>]*>(.*?)<\/h[1-6]>/i,
          /<h[1-6][^>]*>(.*?)<\/h[1-6]>/i,
          /<a[^>]*class[^>]*(?:product-title|title)[^>]*[^>]*>(.*?)<\/a>/i,
          /<(?:span|div)[^>]*class[^>]*(?:product-name|title)[^>]*>(.*?)<\/(?:span|div)>/i
        ];
        
        for (const pattern of namePatterns) {
          const nameMatch = match.match(pattern);
          if (nameMatch) {
            name = nameMatch[1].replace(/<[^>]*>/g, '').trim();
            if (name.length > 3) break; // Use first meaningful match
          }
        }
        
        // Extract price - try multiple WooCommerce price patterns
        let price = 0;
        let monthlyPrice: number | undefined;
        const pricePatterns = [
          // WooCommerce price with classes
          /<span[^>]*class[^>]*(?:woocommerce-Price-amount|amount|price)[^>]*>.*?(\d+(?:[,.]?\d{1,2})?)\s*€/i,
          // Generic price patterns
          /(\d+(?:[,.]?\d{1,2})?)\s*€\s*\/\s*(?:jour|day)/i,
          /(\d+(?:[,.]?\d{1,2})?)\s*€\s*\/\s*(?:mois|month)/i,
          /(\d+(?:[,.]?\d{1,2})?)\s*€(?!\s*\/)/i
        ];
        
        for (const pattern of pricePatterns) {
          const priceMatch = match.match(pattern);
          if (priceMatch) {
            const extractedPrice = parseFloat(priceMatch[1].replace(',', '.'));
            if (pattern.source.includes('jour') || pattern.source.includes('day')) {
              monthlyPrice = extractedPrice * 30;
              price = extractedPrice * 365;
            } else if (pattern.source.includes('mois') || pattern.source.includes('month')) {
              monthlyPrice = extractedPrice;
              price = extractedPrice * 12;
            } else {
              price = extractedPrice;
            }
            break;
          }
        }
        
        // Extract image URL
        let imageUrl: string | undefined;
        const imgMatch = match.match(/<img[^>]*src="([^"]*)"[^>]*>/i);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
        
        // Extract description from content
        let description = '';
        const descPatterns = [
          /<(?:p|div)[^>]*class[^>]*(?:excerpt|description|summary)[^>]*>(.*?)<\/(?:p|div)>/i,
          /<p[^>]*>(.*?)<\/p>/i
        ];
        
        for (const pattern of descPatterns) {
          const descMatch = match.match(pattern);
          if (descMatch) {
            description = descMatch[1].replace(/<[^>]*>/g, '').trim();
            if (description.length > 20) break;
          }
        }
        
        if (name && price > 0) {
          console.log(`Found product: ${name} - ${price}€`);
          products.push(createProduct({
            name,
            price,
            monthly_price: monthlyPrice,
            brand: extractBrand(name),
            category: extractCategory(name),
            description: description || `Produit de leasing professionnel ${name}`,
            imageUrl,
            specifications: extractSpecs(name + ' ' + description)
          }));
        }
      } catch (error) {
        console.error('Error processing individual product match:', error);
      }
    }
    
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