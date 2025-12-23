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
    
    // Search by product name (fuzzy match)
    const searchTerms = productName.split(' ').filter(t => t.length > 2);
    let searchQuery = searchTerms.join(' & ');
    
    // Try to find product
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, price, monthly_price')
      .eq('company_id', companyId)
      .eq('active', true)
      .or(searchTerms.map(t => `name.ilike.%${t}%`).join(','))
      .limit(10);
    
    if (prodError) {
      console.error('[META IMPORT] Product search error:', prodError);
      result.allMatched = false;
      continue;
    }
    
    // Score each product by how many search terms match
    let bestMatch: any = null;
    let bestScore = 0;
    
    for (const product of products || []) {
      const productNameLower = product.name.toLowerCase();
      let score = 0;
      
      for (const term of searchTerms) {
        if (productNameLower.includes(term.toLowerCase())) {
          score++;
        }
      }
      
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

        // Find matching products in catalog
        const matchedProducts = await findMultipleProducts(supabase, parsedPack.formattedProducts, company.id);

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

${matchedProducts.products.length > 0 ? `✅ CORRESPONDANCE CATALOGUE:
${matchedProducts.products.map(p => `• ${p.name}: ${p.monthly_price.toFixed(2)}€/mois`).join('\n')}
📊 Total catalogue: ${matchedProducts.totalMonthly.toFixed(2)}€/mois` : '⚠️ Produits non trouvés dans le catalogue'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        // Calculate monthly payment: use catalog total if found, otherwise Meta price
        const monthlyPayment = matchedProducts.totalMonthly > 0 
          ? matchedProducts.totalMonthly 
          : (parsedPack.priceFromMeta || 0);

        const purchaseAmount = matchedProducts.totalPurchase > 0 
          ? matchedProducts.totalPurchase 
          : 0;

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
          products_to_be_determined: matchedProducts.products.length === 0,
          amount: purchaseAmount,
          monthly_payment: monthlyPayment,
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

        console.log(`[META IMPORT] Offer created: ${offer.id}`);

        // Create equipment entries for each matched product
        if (matchedProducts.products.length > 0) {
          for (const product of matchedProducts.products) {
            const margin = product.monthly_price && product.purchase_price
              ? ((product.monthly_price - product.purchase_price) / product.purchase_price) * 100
              : 0;

            const { error: equipError } = await supabase
              .from('offer_equipment')
              .insert({
                offer_id: offer.id,
                title: product.name,
                product_id: product.product_id,
                purchase_price: product.purchase_price,
                monthly_payment: product.monthly_price,
                quantity: 1,
                margin: margin
              });

            if (equipError) {
              console.error('[META IMPORT] Equipment creation error:', equipError);
            } else {
              console.log(`[META IMPORT] Equipment created: ${product.name} for offer ${offer.id}`);
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
          products_matched: matchedProducts.products.length,
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
