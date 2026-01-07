import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface MetaLead {
  meta_lead_id: string;
  created_time: string;
  platform: string;
  pack_interest: string;
  vat_number?: string;
  email?: string;
  full_name: string;
  phone?: string;
  company_name?: string;
}

interface ParsedPack {
  rawProducts: string[];
  formattedProducts: string[];
  displayName: string;
  equipmentDescription: string;
  priceFromMeta: number | null;
}

interface MatchedProduct {
  product_id: string;
  name: string;
  monthly_price: number;
  purchase_price: number;
}

interface MultiProductMatch {
  products: MatchedProduct[];
  totalMonthly: number;
  totalPurchase: number;
  allMatched: boolean;
}

interface MatchedPackItem {
  product_id: string;
  product_name: string;
  variant_price_id: string | null;
  quantity: number;
  unit_purchase_price: number;
  unit_monthly_price: number;
  margin_percentage: number;
}

interface MatchedPack {
  pack: {
    id: string;
    name: string;
    pack_monthly_price: number | null;
    pack_promo_price: number | null;
    promo_active: boolean;
    total_purchase_price: number;
    total_monthly_price: number;
    total_margin: number;
  };
  items: MatchedPackItem[];
  effectiveMonthlyPrice: number;
}

// Brand capitalization dictionary
const brandCapitalization: Record<string, string> = {
  'hp': 'HP',
  'probook': 'ProBook',
  'elitebook': 'EliteBook',
  'zbook': 'ZBook',
  'iphone': 'iPhone',
  'ipad': 'iPad',
  'macbook': 'MacBook',
  'imac': 'iMac',
  'dell': 'Dell',
  'lenovo': 'Lenovo',
  'thinkpad': 'ThinkPad',
  'latitude': 'Latitude',
  'pro': 'Pro',
  'max': 'Max',
  'plus': 'Plus',
  'air': 'Air',
  'mini': 'Mini',
  'g10': 'G10',
  'g9': 'G9',
  'g8': 'G8',
  'g7': 'G7',
  '450': '450',
  '650': '650',
  '840': '840',
  '850': '850',
  '14s': '14s',
  '15s': '15s',
  '16': '16',
  '15': '15',
  '14': '14',
  '13': '13'
};

// Email validation regex
function isValidEmail(email: string | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Phone validation - must contain at least some digits
function isValidPhone(phone: string | undefined): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 8;
}

// Clean and validate phone number
function cleanPhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.trim();
  if (!isValidPhone(cleaned)) return null;
  return cleaned;
}

// Clean and validate email
function cleanEmail(email: string | undefined): string | null {
  if (!email) return null;
  const cleaned = email.trim().toLowerCase();
  if (!isValidEmail(cleaned)) return null;
  return cleaned;
}

// Parse pack interest from Meta format
function parsePackInterest(packInterest: string): ParsedPack {
  console.log('[META IMPORT] Parsing pack_interest:', packInterest);
  
  // Remove "pack_" prefix if present
  let cleanedPack = packInterest.toLowerCase().replace(/^pack_/, '');
  
  // Extract price from format ":_95,90€_htva/mois" or "_:_95,90€_htva/mois"
  let priceFromMeta: number | null = null;
  const priceMatch = cleanedPack.match(/_?:_?(\d+)[,.](\d+)€_htva\/mois$/i);
  if (priceMatch) {
    priceFromMeta = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
    // Remove price part from the pack name
    cleanedPack = cleanedPack.replace(/_?:_?\d+[,.]\d+€_htva\/mois$/i, '');
    console.log('[META IMPORT] Extracted price from Meta:', priceFromMeta);
  }
  
  // Split products by "_+_"
  const rawProducts = cleanedPack.split('_+_').map(p => p.trim()).filter(Boolean);
  console.log('[META IMPORT] Raw products split:', rawProducts);
  
  // Format each product name
  const formattedProducts = rawProducts.map(product => {
    // Split by underscore
    const words = product.split('_').filter(Boolean);
    
    // Apply brand capitalization
    const formattedWords = words.map(word => {
      const lowerWord = word.toLowerCase();
      if (brandCapitalization[lowerWord]) {
        return brandCapitalization[lowerWord];
      }
      // Capitalize first letter for unknown words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    
    return formattedWords.join(' ');
  });
  
  console.log('[META IMPORT] Formatted products:', formattedProducts);
  
  // Create display name: "HP ProBook 450 G10 + iPhone 16 Pro"
  const displayName = formattedProducts.join(' + ');
  
  // Create equipment description: "1 x HP ProBook 450 G10 et 1 x iPhone 16 Pro"
  const equipmentDescription = formattedProducts.map(p => `1 x ${p}`).join(' et ');
  
  return {
    rawProducts,
    formattedProducts,
    displayName,
    equipmentDescription,
    priceFromMeta
  };
}

// Helper: Calculate pack name score
function calculatePackScore(packName: string, searchTerms: string[]): number {
  const packNameLower = packName.toLowerCase();
  let score = 0;
  
  for (const term of searchTerms) {
    if (packNameLower.includes(term)) {
      if (['macbook', 'iphone', 'ipad', 'hp', 'dell', 'lenovo', 'pro', 'max', 'air'].includes(term)) {
        score += 3;
      } else if (['m1', 'm2', 'm3', 'm4', '13', '14', '15', '16', '17'].includes(term)) {
        score += 4;
      } else {
        score += 1;
      }
    }
  }
  
  return score;
}

// Helper: Count matched terms
function countMatchedTerms(packName: string, searchTerms: string[]): number {
  const packNameLower = packName.toLowerCase();
  return searchTerms.filter(term => packNameLower.includes(term)).length;
}

// Helper: Format pack result
function formatPackResult(pack: any): MatchedPack {
  const effectivePrice = pack.promo_active && pack.pack_promo_price
    ? pack.pack_promo_price
    : (pack.pack_monthly_price || pack.total_monthly_price || 0);
  
  const items: MatchedPackItem[] = (pack.items || []).map((item: any) => ({
    product_id: item.product_id,
    product_name: item.product?.name || 'Produit',
    variant_price_id: item.variant_price_id,
    quantity: item.quantity || 1,
    unit_purchase_price: item.unit_purchase_price || 0,
    unit_monthly_price: item.unit_monthly_price || 0,
    margin_percentage: item.margin_percentage || 0
  }));
  
  return {
    pack: {
      id: pack.id,
      name: pack.name,
      pack_monthly_price: pack.pack_monthly_price,
      pack_promo_price: pack.pack_promo_price,
      promo_active: pack.promo_active || false,
      total_purchase_price: pack.total_purchase_price || 0,
      total_monthly_price: pack.total_monthly_price || 0,
      total_margin: pack.total_margin || 0
    },
    items,
    effectiveMonthlyPrice: effectivePrice
  };
}

// Find matching pack in product_packs table
async function findMatchingPack(
  supabase: any,
  parsedPack: ParsedPack,
  companyId: string
): Promise<MatchedPack | null> {
  console.log('[META IMPORT] Searching for matching pack...');
  console.log('[META IMPORT] Price from Meta:', parsedPack.priceFromMeta);
  
  // Fetch active packs with their items
  const { data: packs, error } = await supabase
    .from('product_packs')
    .select(`
      id, name, pack_monthly_price, pack_promo_price, promo_active,
      total_purchase_price, total_monthly_price, total_margin,
      items:product_pack_items(
        id, product_id, variant_price_id, quantity,
        unit_purchase_price, unit_monthly_price, margin_percentage,
        product:products(id, name)
      )
    `)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .limit(50);
  
  if (error) {
    console.error('[META IMPORT] Error fetching packs:', error);
    return null;
  }
  
  if (!packs || packs.length === 0) {
    console.log('[META IMPORT] No active packs found');
    return null;
  }
  
  console.log('[META IMPORT] Found', packs.length, 'active packs to check');
  
  // Search terms from the parsed pack (main product keywords)
  const searchTerms = parsedPack.formattedProducts.map(p => {
    const words = p.split(' ').filter(w => w.length > 1);
    return words.slice(0, 3).map(w => w.toLowerCase());
  }).flat();
  
  console.log('[META IMPORT] Search terms:', searchTerms);
  
  // === STRATEGY 1: PRICE-BASED MATCHING (PRIORITY) ===
  if (parsedPack.priceFromMeta && parsedPack.priceFromMeta > 0) {
    const targetPrice = parsedPack.priceFromMeta;
    const tolerance = 0.10; // 10 centimes tolerance
    
    console.log('[META IMPORT] Using price-based matching. Target:', targetPrice, '€');
    
    // Find packs matching the price
    const priceMatchedPacks = packs.filter((pack: any) => {
      const effectivePrice = pack.promo_active && pack.pack_promo_price
        ? pack.pack_promo_price
        : (pack.pack_monthly_price || pack.total_monthly_price || 0);
      
      const priceDiff = Math.abs(effectivePrice - targetPrice);
      const matches = priceDiff <= tolerance;
      
      console.log(`[META IMPORT] Pack "${pack.name}" price: ${effectivePrice}€, diff: ${priceDiff.toFixed(2)}€, matches: ${matches}`);
      
      return matches;
    });
    
    console.log('[META IMPORT] Packs matching price:', priceMatchedPacks.length);
    
    if (priceMatchedPacks.length === 1) {
      // Perfect: exactly one pack matches the price
      const matchedPack = priceMatchedPacks[0];
      console.log('[META IMPORT] Single price match found:', matchedPack.name);
      return formatPackResult(matchedPack);
    }
    
    if (priceMatchedPacks.length > 1) {
      // Multiple packs with same price - use name scoring as tie-breaker
      console.log('[META IMPORT] Multiple price matches, using name scoring as tie-breaker');
      
      let bestMatch: any = null;
      let bestScore = 0;
      
      for (const pack of priceMatchedPacks) {
        const score = calculatePackScore(pack.name, searchTerms);
        console.log(`[META IMPORT] Pack "${pack.name}" name score: ${score}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = pack;
        }
      }
      
      if (bestMatch) {
        console.log('[META IMPORT] Best price+name match:', bestMatch.name);
        return formatPackResult(bestMatch);
      }
    }
  }
  
  // === STRATEGY 2: NAME-BASED MATCHING (FALLBACK) ===
  console.log('[META IMPORT] Falling back to name-based matching');
  
  let bestMatch: any = null;
  let bestScore = 0;
  
  for (const pack of packs) {
    const score = calculatePackScore(pack.name, searchTerms);
    const matchedTerms = countMatchedTerms(pack.name, searchTerms);
    
    console.log(`[META IMPORT] Pack "${pack.name}" score: ${score} (${matchedTerms}/${searchTerms.length} terms)`);
    
    // Require at least 50% of terms to match
    if (matchedTerms >= searchTerms.length * 0.5 && score > bestScore) {
      bestScore = score;
      bestMatch = pack;
    }
  }
  
  if (!bestMatch || bestScore < 4) {
    console.log('[META IMPORT] No pack matched with sufficient score');
    return null;
  }
  
  console.log('[META IMPORT] Best matching pack:', bestMatch.name, 'with score:', bestScore);
  return formatPackResult(bestMatch);
}

// Important short terms that should not be filtered out (model numbers, sizes, chip generations)
const importantShortTerms = ['m1', 'm2', 'm3', 'm4', '13', '14', '15', '16', '17', 'g7', 'g8', 'g9', 'g10', '450', '650', '840', '850', 'se', 'xs', 'xr'];

// Terms that are highly discriminating (sizes, chip generations, model numbers)
const modelTerms = ['m1', 'm2', 'm3', 'm4', '13', '14', '15', '16', '17', 'g7', 'g8', 'g9', 'g10'];

// Screen sizes that must match exactly
const screenSizes = ['13', '14', '15', '16'];

// Find multiple products in catalog
async function findMultipleProducts(
  supabase: any,
  productNames: string[],
  companyId: string
): Promise<MultiProductMatch> {
  const result: MultiProductMatch = {
    products: [],
    totalMonthly: 0,
    totalPurchase: 0,
    allMatched: true
  };
  
  for (const productName of productNames) {
    console.log('[META IMPORT] Searching catalog for:', productName);
    
    // Keep all terms > 2 chars OR important short terms (M4, 15, etc.)
    const searchTerms = productName.split(' ').filter(t => 
      t.length > 2 || importantShortTerms.includes(t.toLowerCase())
    );
    
    console.log('[META IMPORT] Search terms (including short important ones):', searchTerms);
    
    // Detect if search contains a screen size
    const searchedSize = screenSizes.find(size => 
      searchTerms.some(t => t.toLowerCase() === size)
    );
    
    // Detect if search contains a chip generation (M1, M2, M3, M4)
    const searchedChip = searchTerms.find(t => 
      ['m1', 'm2', 'm3', 'm4'].includes(t.toLowerCase())
    );
    
    console.log('[META IMPORT] Searched size:', searchedSize, 'Searched chip:', searchedChip);
    
    // Try to find product - use broader search
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, price, monthly_price')
      .eq('company_id', companyId)
      .eq('active', true)
      .or(searchTerms.slice(0, 3).map(t => `name.ilike.%${t}%`).join(','))
      .limit(20);
    
    if (prodError) {
      console.error('[META IMPORT] Product search error:', prodError);
      result.allMatched = false;
      continue;
    }
    
    console.log('[META IMPORT] Found', products?.length || 0, 'potential matches');
    
    // Score each product by how many search terms match
    let bestMatch: any = null;
    let bestScore = 0;
    
    for (const product of products || []) {
      const productNameLower = product.name.toLowerCase();
      let score = 0;
      let rejected = false;
      
      // STRICT CHECK: If searching for a specific screen size, product MUST contain it
      if (searchedSize) {
        if (!productNameLower.includes(searchedSize)) {
          console.log(`[META IMPORT] Rejecting "${product.name}" - missing size ${searchedSize}`);
          rejected = true;
        }
      }
      
      // STRICT CHECK: If searching for a specific chip (M4), product MUST contain it
      if (searchedChip && !rejected) {
        if (!productNameLower.includes(searchedChip.toLowerCase())) {
          console.log(`[META IMPORT] Rejecting "${product.name}" - missing chip ${searchedChip}`);
          rejected = true;
        }
      }
      
      if (rejected) continue;
      
      // Score based on matching terms
      for (const term of searchTerms) {
        const termLower = term.toLowerCase();
        if (productNameLower.includes(termLower)) {
          // Model terms (M4, 15, G10) get higher score
          if (modelTerms.includes(termLower)) {
            score += 3;
          } else {
            score += 1;
          }
        }
      }
      
      console.log(`[META IMPORT] Score for "${product.name}": ${score}`);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }
    
    if (!bestMatch || bestScore < 2) {
      console.log('[META IMPORT] No good match found for:', productName);
      result.allMatched = false;
      continue;
    }
    
    console.log('[META IMPORT] Best match:', bestMatch.name, 'with score:', bestScore);
    
    // Get minimum variant price
    const { data: variants, error: varError } = await supabase
      .from('product_variant_prices')
      .select('id, monthly_price, purchase_price')
      .eq('product_id', bestMatch.id)
      .order('monthly_price', { ascending: true })
      .limit(1);
    
    let monthlyPrice = bestMatch.monthly_price || 0;
    let purchasePrice = bestMatch.price || 0;
    
    if (!varError && variants && variants.length > 0) {
      monthlyPrice = variants[0].monthly_price || monthlyPrice;
      purchasePrice = variants[0].purchase_price || purchasePrice;
      console.log('[META IMPORT] Using minimum variant price:', monthlyPrice, '€/mois');
    }
    
    result.products.push({
      product_id: bestMatch.id,
      name: bestMatch.name,
      monthly_price: monthlyPrice,
      purchase_price: purchasePrice
    });
    
    result.totalMonthly += monthlyPrice;
    result.totalPurchase += purchasePrice;
  }
  
  console.log('[META IMPORT] Multi-product match result:', {
    matchedCount: result.products.length,
    totalMonthly: result.totalMonthly,
    allMatched: result.allMatched
  });
  
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads, api_key, company_id } = await req.json();

    // Validate API key
    const expectedKey = Deno.env.get('META_LEADS_API_KEY');
    if (!api_key || api_key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate company_id is provided
    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No leads provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .eq('is_active', true)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      success: true,
      created: 0,
      duplicates: 0,
      existing_client_new_offer: 0,
      pack_matched: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const lead of leads as MetaLead[]) {
      try {
        // Validate and clean email and phone
        const validEmail = cleanEmail(lead.email);
        const validPhone = cleanPhone(lead.phone);
        const fullName = (lead.full_name || '').trim();
        
        console.log(`[META IMPORT] Processing lead: email=${validEmail || 'INVALID'}, phone=${validPhone || 'NONE'}, name=${fullName}, meta_lead_id: ${lead.meta_lead_id}`);

        // Must have either valid email OR valid phone to proceed
        if (!validEmail && !validPhone) {
          console.warn(`[META IMPORT] Lead rejected: no valid email or phone for meta_lead_id: ${lead.meta_lead_id}`);
          results.errors++;
          results.details.push({ 
            email: lead.email, 
            meta_lead_id: lead.meta_lead_id,
            status: 'invalid_data',
            message: 'Email et téléphone invalides ou manquants'
          });
          continue;
        }

        // Must have a name
        if (!fullName || fullName.length < 2) {
          console.warn(`[META IMPORT] Lead rejected: invalid name for meta_lead_id: ${lead.meta_lead_id}`);
          results.errors++;
          results.details.push({ 
            email: lead.email, 
            meta_lead_id: lead.meta_lead_id,
            status: 'invalid_data',
            message: 'Nom invalide ou manquant'
          });
          continue;
        }

        // Check if this meta_lead_id has already been imported (idempotence)
        const { data: existingOffer } = await supabase
          .from('offers')
          .select('id')
          .ilike('remarks', `%Meta Lead ID: ${lead.meta_lead_id}%`)
          .limit(1)
          .single();

        if (existingOffer) {
          console.log(`[META IMPORT] Lead already imported (meta_lead_id: ${lead.meta_lead_id})`);
          results.duplicates++;
          results.details.push({ 
            email: validEmail || lead.email, 
            meta_lead_id: lead.meta_lead_id,
            status: 'duplicate_lead',
            message: 'Ce lead Meta a déjà été importé'
          });
          continue;
        }

        // Parse pack interest with intelligent parsing
        const parsedPack = parsePackInterest(lead.pack_interest);
        console.log('[META IMPORT] Parsed pack:', parsedPack);

        // FIRST: Try to find a matching pack in product_packs
        const matchedPack = await findMatchingPack(supabase, parsedPack, company.id);
        
        // Variables for offer creation
        let monthlyPayment = 0;
        let purchaseAmount = 0;
        let marginAmount = 0;
        let packId: string | null = null;
        let packRemarks = '';
        let equipmentToCreate: any[] = [];
        let productsMatched = 0;
        
        if (matchedPack) {
          // USE PACK DATA
          console.log('[META IMPORT] Using matched pack:', matchedPack.pack.name);
          
          monthlyPayment = matchedPack.effectiveMonthlyPrice;
          purchaseAmount = matchedPack.pack.total_purchase_price;
          marginAmount = matchedPack.pack.total_margin;
          packId = matchedPack.pack.id;
          productsMatched = matchedPack.items.length;
          
          // Calculate margin percentage
          const marginPercent = purchaseAmount > 0 
            ? ((marginAmount / purchaseAmount) * 100).toFixed(1) 
            : '0';
          
          // Build pack-specific remarks
          packRemarks = `
📦 PACK CORRESPONDANT TROUVÉ:
✅ ${matchedPack.pack.name}
💰 Prix pack: ${monthlyPayment.toFixed(2)}€/mois${matchedPack.pack.promo_active ? ' (PROMO)' : ''}
📊 Marge: ${marginAmount.toFixed(2)}€ (${marginPercent}%)
💵 Prix d'achat total: ${purchaseAmount.toFixed(2)}€

📋 ÉQUIPEMENTS DU PACK:
${matchedPack.items.map(item => `• ${item.product_name} (x${item.quantity}): ${item.unit_monthly_price.toFixed(2)}€/mois`).join('\n')}
`;
          
          // Prepare equipment entries from pack items
          equipmentToCreate = matchedPack.items.map(item => ({
            title: item.product_name,
            product_id: item.product_id,
            variant_id: item.variant_price_id,
            purchase_price: item.unit_purchase_price,
            monthly_payment: item.unit_monthly_price,
            quantity: item.quantity,
            margin: item.margin_percentage
          }));
          
          results.pack_matched++;
          
        } else {
          // FALLBACK: Find individual products
          console.log('[META IMPORT] No pack matched, falling back to product search');
          
          const matchedProducts = await findMultipleProducts(supabase, parsedPack.formattedProducts, company.id);
          
          monthlyPayment = matchedProducts.totalMonthly > 0 
            ? matchedProducts.totalMonthly 
            : (parsedPack.priceFromMeta || 0);
          
          purchaseAmount = matchedProducts.totalPurchase;
          productsMatched = matchedProducts.products.length;
          
          // Prepare equipment entries from matched products
          equipmentToCreate = matchedProducts.products.map(product => {
            const margin = product.monthly_price && product.purchase_price
              ? ((product.monthly_price - product.purchase_price) / product.purchase_price) * 100
              : 0;
            
            return {
              title: product.name,
              product_id: product.product_id,
              variant_id: null,
              purchase_price: product.purchase_price,
              monthly_payment: product.monthly_price,
              quantity: 1,
              margin: margin
            };
          });
          
          packRemarks = matchedProducts.products.length > 0 
            ? `✅ CORRESPONDANCE CATALOGUE:
${matchedProducts.products.map(p => `• ${p.name}: ${p.monthly_price.toFixed(2)}€/mois`).join('\n')}
📊 Total catalogue: ${matchedProducts.totalMonthly.toFixed(2)}€/mois`
            : '⚠️ Produits non trouvés dans le catalogue';
        }

        // Check if client already exists by email OR phone
        let existingClient = null;
        
        if (validEmail) {
          const { data: clientByEmail } = await supabase
            .from('clients')
            .select('id, name')
            .eq('email', validEmail)
            .eq('company_id', company.id)
            .single();
          existingClient = clientByEmail;
        }
        
        if (!existingClient && validPhone) {
          const { data: clientByPhone } = await supabase
            .from('clients')
            .select('id, name')
            .eq('phone', validPhone)
            .eq('company_id', company.id)
            .single();
          existingClient = clientByPhone;
        }

        let clientId: string;
        let isNewClient = false;

        if (existingClient) {
          // Reuse existing client
          clientId = existingClient.id;
          console.log(`[META IMPORT] Using existing client: ${existingClient.name} (${clientId})`);
        } else {
          // Create new client
          isNewClient = true;
          
          // Parse full name
          const nameParts = lead.full_name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Format creation date
          const leadDate = new Date(lead.created_time);
          const formattedDate = leadDate.toLocaleDateString('fr-BE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          // Build enriched notes for client
          const clientNotes = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 SOURCE: META (Facebook/Instagram)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 Plateforme: ${lead.platform === 'fb' ? 'Facebook' : 'Instagram'}
🔹 Date du lead: ${formattedDate}
🔹 Meta Lead ID: ${lead.meta_lead_id}

📦 PACK INTÉRESSÉ:
${parsedPack.displayName}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Importé automatiquement le ${new Date().toLocaleDateString('fr-BE')}`;

          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              company_id: company.id,
              name: fullName,
              first_name: firstName,
              last_name: lastName,
              email: validEmail,
              phone: validPhone,
              company: lead.company_name || null,
              vat_number: lead.vat_number || null,
              status: 'lead',
              notes: clientNotes
            })
            .select()
            .single();

          if (clientError || !newClient) {
            console.error('[META IMPORT] Client creation error:', clientError);
            results.errors++;
            results.details.push({ 
              email: lead.email, 
              status: 'error', 
              error: clientError?.message 
            });
            continue;
          }

          clientId = newClient.id;
          console.log(`[META IMPORT] Client created: ${clientId}`);
        }

        // Get default leaser (Grenke)
        const { data: leaser } = await supabase
          .from('leasers')
          .select('id')
          .ilike('name', '%grenke%')
          .limit(1)
          .single();

        const leaserId = leaser?.id || null;

        // Format creation date for remarks
        const leadDate = new Date(lead.created_time);
        const formattedDate = leadDate.toLocaleDateString('fr-BE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Build remarks with meta_lead_id for idempotence checking
        const offerRemarks = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 SOURCE: META (Facebook/Instagram)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 Plateforme: ${lead.platform === 'fb' ? 'Facebook' : 'Instagram'}
🔹 Date du lead: ${formattedDate}
🔹 Meta Lead ID: ${lead.meta_lead_id}

📦 PACK DEMANDÉ:
${parsedPack.displayName}
${parsedPack.priceFromMeta ? `💰 Prix affiché: ${parsedPack.priceFromMeta.toFixed(2)}€ HTVA/mois` : ''}

📋 ÉQUIPEMENTS:
${parsedPack.equipmentDescription}

${packRemarks}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        // Create offer with source 'meta'
        const offerData: any = {
          company_id: company.id,
          client_id: clientId,
          client_name: fullName,
          client_email: validEmail,
          equipment_description: parsedPack.equipmentDescription,
          type: 'client_request',
          source: 'meta',
          workflow_status: 'draft',
          status: 'pending',
          remarks: offerRemarks,
          leaser_id: leaserId,
          duration: 36,
          products_to_be_determined: productsMatched === 0,
          amount: purchaseAmount,
          monthly_payment: monthlyPayment,
          margin: marginAmount,
          pack_id: packId,
          financed_amount: monthlyPayment ? (monthlyPayment * 100) / 3.53 : 0,
          coefficient: 3.53
        };

        const { data: offer, error: offerError } = await supabase
          .from('offers')
          .insert(offerData)
          .select()
          .single();

        if (offerError || !offer) {
          console.error('[META IMPORT] Offer creation error:', offerError);
          results.errors++;
          results.details.push({ 
            email: lead.email, 
            status: 'client_created_offer_failed', 
            client_id: clientId,
            error: offerError?.message 
          });
          continue;
        }

        console.log(`[META IMPORT] Offer created: ${offer.id}${packId ? ' (with pack)' : ''}`);

        // Create equipment entries
        if (equipmentToCreate.length > 0) {
          for (const equipment of equipmentToCreate) {
            const { error: equipError } = await supabase
              .from('offer_equipment')
              .insert({
                offer_id: offer.id,
                title: equipment.title,
                product_id: equipment.product_id,
                variant_id: equipment.variant_id,
                purchase_price: equipment.purchase_price,
                monthly_payment: equipment.monthly_payment,
                quantity: equipment.quantity,
                margin: equipment.margin
              });

            if (equipError) {
              console.error('[META IMPORT] Equipment creation error:', equipError);
            } else {
              console.log(`[META IMPORT] Equipment created: ${equipment.title} for offer ${offer.id}`);
            }
          }
        }

        if (isNewClient) {
          results.created++;
        } else {
          results.existing_client_new_offer++;
        }

        results.details.push({ 
          email: lead.email, 
          meta_lead_id: lead.meta_lead_id,
          status: isNewClient ? 'created' : 'existing_client_new_offer', 
          message: isNewClient 
            ? '✓ Client et demande créés' 
            : '✓ Demande créée (client existant)',
          client_id: clientId,
          offer_id: offer.id,
          pack_matched: !!packId,
          pack_name: matchedPack?.pack.name || null,
          products_matched: productsMatched,
          total_monthly: monthlyPayment,
          parsed_pack: parsedPack.displayName
        });

      } catch (err: any) {
        console.error('[META IMPORT] Error processing lead:', err);
        results.errors++;
        results.details.push({ 
          email: lead.email, 
          status: 'error', 
          error: err.message 
        });
      }
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[META IMPORT] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
