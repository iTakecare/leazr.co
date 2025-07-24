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

    // Analyser le catalogue iTakecare avec Firecrawl
    const crawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.itakecare.be/catalogue/',
        formats: ['markdown', 'html'],
        includeTags: ['img', 'h1', 'h2', 'h3', 'p', 'div'],
        onlyMainContent: true,
      }),
    });

    if (!crawlResponse.ok) {
      throw new Error(`Firecrawl API error: ${crawlResponse.statusText}`);
    }

    const crawlData = await crawlResponse.json();
    console.log('Firecrawl response received, processing...');

    // Extraire les produits du contenu markdown/html
    const products = extractProductsFromContent(crawlData.data.markdown, crawlData.data.html);
    
    console.log(`Extracted ${products.length} products from catalog`);

    return new Response(JSON.stringify({
      success: true,
      products,
      totalFound: products.length,
      rawData: crawlData.data.markdown.substring(0, 500) + '...' // Premier aperçu
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
    // Extraire les produits à partir du contenu markdown
    // Rechercher des patterns typiques pour les produits de leasing
    const lines = markdown.split('\n');
    let currentProduct: Partial<Product> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Détecter les titres de produits (MacBook, PC, etc.)
      if (line.match(/^#{1,3}\s*(MacBook|iPad|PC|Laptop|Desktop|iMac|Monitor|Écran)/i)) {
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
      
      // Extraire les prix (€/jour, €/mois)
      const priceMatch = line.match(/(\d+(?:,\d{2})?)\s*€\/(?:jour|mois)/i);
      if (priceMatch && currentProduct.name) {
        const price = parseFloat(priceMatch[1].replace(',', '.'));
        if (line.includes('/mois')) {
          currentProduct.monthly_price = price;
          currentProduct.price = price * 12; // Prix annuel estimé
        } else if (line.includes('/jour')) {
          currentProduct.monthly_price = price * 30; // Prix mensuel estimé
          currentProduct.price = price * 365; // Prix annuel estimé
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
      if (line.match(/(RAM|SSD|Processeur|Écran|Intel|AMD|M1|M2|M3)/i) && currentProduct.name) {
        const specs = extractSpecs(line);
        currentProduct.specifications = { ...currentProduct.specifications, ...specs };
      }
    }
    
    // Ajouter le dernier produit
    if (currentProduct.name) {
      products.push(createProduct(currentProduct));
    }
    
    // Si peu de produits trouvés avec la méthode markdown, essayer avec HTML
    if (products.length < 5) {
      const htmlProducts = extractProductsFromHTML(html);
      products.push(...htmlProducts);
    }
    
  } catch (error) {
    console.error('Error extracting products:', error);
  }
  
  return products.filter(p => p.name && p.price > 0);
}

function extractProductsFromHTML(html: string): Product[] {
  const products: Product[] = [];
  
  try {
    // Patterns pour extraire les produits depuis le HTML
    const productMatches = html.match(/<div[^>]*class[^>]*product[^>]*>.*?<\/div>/gis) || [];
    
    for (const match of productMatches) {
      const nameMatch = match.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
      const priceMatch = match.match(/(\d+(?:,\d{2})?)\s*€/);
      
      if (nameMatch && priceMatch) {
        const name = nameMatch[1].replace(/<[^>]*>/g, '').trim();
        const price = parseFloat(priceMatch[1].replace(',', '.'));
        
        products.push(createProduct({
          name,
          price,
          brand: extractBrand(name),
          category: extractCategory(name),
          description: `Produit de leasing professionnel ${name}`
        }));
      }
    }
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