import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface MetaLead {
  meta_lead_id: string;
  created_time: string;
  platform: string;
  pack_interest: string;
  vat_number?: string;
  email: string;
  full_name: string;
  phone?: string;
  company_name?: string;
}

interface PackCharacteristics {
  model?: string;
  cpu?: string;
  memory?: string;
  storage?: string;
  color?: string;
  keyboard?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads, api_key } = await req.json();

    // Validate API key
    const expectedKey = Deno.env.get('META_LEADS_API_KEY');
    if (!api_key || api_key !== expectedKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No leads provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const results = {
      success: true,
      created: 0,
      duplicates: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const lead of leads as MetaLead[]) {
      try {
        console.log(`[META IMPORT] Processing lead: ${lead.email}`);

        // Check if client already exists
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('email', lead.email)
          .single();

        if (existingClient) {
          console.log(`[META IMPORT] Duplicate: ${lead.email}`);
          results.duplicates++;
          results.details.push({ email: lead.email, status: 'duplicate' });
          continue;
        }

        // Get company_id (assuming first active company for now - you may want to make this configurable)
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!company) {
          console.error('[META IMPORT] No active company found');
          results.errors++;
          continue;
        }

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

        // Parse pack interest for display
        const packDisplay = parsePackForDisplay(lead.pack_interest);

        // Build enriched notes
        const notes = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 SOURCE: META ADS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔹 Plateforme: ${lead.platform === 'fb' ? 'Facebook' : 'Instagram'}
🔹 Date du lead: ${formattedDate}
🔹 Meta Lead ID: ${lead.meta_lead_id}

📦 PACK INTÉRESSÉ:
${packDisplay}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Importé automatiquement le ${new Date().toLocaleDateString('fr-BE')}`;

        // Create client
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .insert({
            company_id: company.id,
            name: lead.full_name,
            first_name: firstName,
            last_name: lastName,
            email: lead.email,
            phone: lead.phone,
            company: lead.company_name,
            vat_number: lead.vat_number,
            status: 'lead',
            notes: notes
          })
          .select()
          .single();

        if (clientError || !client) {
          console.error('[META IMPORT] Client creation error:', clientError);
          results.errors++;
          results.details.push({ email: lead.email, status: 'error', error: clientError?.message });
          continue;
        }

        console.log(`[META IMPORT] Client created: ${client.id}`);

        // Parse pack and try to match product
        const packChars = parsePackCharacteristics(lead.pack_interest);
        const matchedProduct = await findMatchingProduct(supabase, packChars, company.id);

        // Get default leaser (Grenke)
        const { data: leaser } = await supabase
          .from('leasers')
          .select('id')
          .ilike('name', '%grenke%')
          .limit(1)
          .single();

        const leaserId = leaser?.id || null;

        // Create offer
        const offerData: any = {
          company_id: company.id,
          client_id: client.id,
          client_name: lead.full_name,
          client_email: lead.email,
          client_phone: lead.phone,
          client_company: lead.company_name,
          equipment_description: packDisplay,
          type: 'client_request',
          source: 'meta_ads',
          workflow_status: 'draft',
          status: 'pending',
          remarks: `Lead Meta Ads - ${lead.platform === 'fb' ? 'Facebook' : 'Instagram'}\nPack demandé: ${lead.pack_interest}`,
          leaser_id: leaserId,
          duration: 36,
          products_to_be_determined: !matchedProduct,
          amount: matchedProduct?.price || 0,
          monthly_payment: matchedProduct?.monthly_price || 0,
          financed_amount: matchedProduct?.monthly_price ? (matchedProduct.monthly_price * 100) / 3.53 : 0,
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
            client_id: client.id,
            error: offerError?.message 
          });
          continue;
        }

        console.log(`[META IMPORT] Offer created: ${offer.id}`);

        // Create equipment if product matched
        if (matchedProduct) {
          const margin = matchedProduct.monthly_price && matchedProduct.price
            ? ((matchedProduct.monthly_price - matchedProduct.price) / matchedProduct.price) * 100
            : 0;

          const { error: equipError } = await supabase
            .from('offer_equipment')
            .insert({
              offer_id: offer.id,
              title: matchedProduct.name,
              product_id: matchedProduct.product_id,
              variant_id: matchedProduct.variant_id,
              purchase_price: matchedProduct.price,
              monthly_payment: matchedProduct.monthly_price,
              quantity: 1,
              margin: margin
            });

          if (equipError) {
            console.error('[META IMPORT] Equipment creation error:', equipError);
          } else {
            console.log(`[META IMPORT] Equipment created for offer ${offer.id}`);
          }
        }

        results.created++;
        results.details.push({ 
          email: lead.email, 
          status: 'success', 
          client_id: client.id,
          offer_id: offer.id,
          product_matched: !!matchedProduct
        });

      } catch (err: any) {
        console.error('[META IMPORT] Error processing lead:', err);
        results.errors++;
        results.details.push({ email: lead.email, status: 'error', error: err.message });
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

// Helper functions

function parsePackCharacteristics(packName: string): PackCharacteristics {
  const normalized = packName.toLowerCase().replace(/_/g, ' ');
  
  const chars: PackCharacteristics = {};
  
  // Extract memory (18go, 16go, etc.)
  const memMatch = normalized.match(/(\d+)go(?!\s*ssd)/i);
  if (memMatch) chars.memory = memMatch[1] + 'Go';
  
  // Extract storage (512go, 1to, etc.)
  const storageMatch = normalized.match(/(\d+)(go|to)(?=\s|$)/i);
  if (storageMatch) {
    chars.storage = storageMatch[1] + (storageMatch[2].toLowerCase() === 'to' ? 'To' : 'Go');
  }
  
  // Extract CPU (m3 pro, m4, etc.)
  if (normalized.includes('m3 pro')) chars.cpu = 'M3 Pro';
  else if (normalized.includes('m3')) chars.cpu = 'M3';
  else if (normalized.includes('m4')) chars.cpu = 'M4';
  else if (normalized.includes('m2')) chars.cpu = 'M2';
  
  // Extract model
  if (normalized.includes('macbook pro 14')) chars.model = 'MacBook Pro 14';
  else if (normalized.includes('macbook pro 16')) chars.model = 'MacBook Pro 16';
  else if (normalized.includes('macbook air')) chars.model = 'MacBook Air';
  
  // Extract color
  if (normalized.includes('space black')) chars.color = 'Noir sidéral';
  else if (normalized.includes('silver')) chars.color = 'Argent';
  else if (normalized.includes('space gray')) chars.color = 'Gris sidéral';
  
  console.log('[META IMPORT] Parsed characteristics:', chars);
  return chars;
}

function parsePackForDisplay(packName: string): string {
  const chars = parsePackCharacteristics(packName);
  const parts: string[] = [];
  
  if (chars.model) parts.push(chars.model);
  if (chars.cpu) parts.push(chars.cpu);
  if (chars.memory || chars.storage) {
    const specs: string[] = [];
    if (chars.memory) specs.push(chars.memory + ' RAM');
    if (chars.storage) specs.push(chars.storage + ' SSD');
    parts.push(specs.join(', '));
  }
  
  return parts.length > 0 ? parts.join(' - ') : packName;
}

async function findMatchingProduct(
  supabase: any,
  chars: PackCharacteristics,
  companyId: string
): Promise<{ product_id: string; variant_id: string; name: string; price: number; monthly_price: number } | null> {
  try {
    console.log('[META IMPORT] Searching for product with chars:', chars);

    // Build search query for product name
    let nameSearch = '';
    if (chars.model) nameSearch += chars.model;
    if (chars.cpu) nameSearch += ' ' + chars.cpu;
    
    if (!nameSearch) {
      console.log('[META IMPORT] No model/CPU to search');
      return null;
    }

    // Find products matching the model/CPU
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name')
      .eq('company_id', companyId)
      .ilike('name', `%${nameSearch}%`)
      .limit(10);

    if (prodError || !products || products.length === 0) {
      console.log('[META IMPORT] No products found for:', nameSearch);
      return null;
    }

    console.log(`[META IMPORT] Found ${products.length} candidate products`);

    // Search variants with matching attributes
    for (const product of products) {
      const { data: variants, error: varError } = await supabase
        .from('product_variant_prices')
        .select('id, variant_name, attributes, purchase_price, monthly_price')
        .eq('product_id', product.id);

      if (varError || !variants) continue;

      console.log(`[META IMPORT] Checking ${variants.length} variants for product ${product.name}`);

      for (const variant of variants) {
        const attrs = variant.attributes || {};
        let match = true;

        // Check memory
        if (chars.memory) {
          const varMem = attrs.Mémoire || attrs.RAM || '';
          if (!varMem.includes(chars.memory)) {
            match = false;
          }
        }

        // Check storage
        if (chars.storage && match) {
          const varStorage = attrs.Disque || attrs.Stockage || attrs.Storage || '';
          if (!varStorage.includes(chars.storage)) {
            match = false;
          }
        }

        if (match) {
          console.log('[META IMPORT] Match found:', {
            product: product.name,
            variant: variant.variant_name,
            price: variant.purchase_price,
            monthly: variant.monthly_price
          });

          return {
            product_id: product.id,
            variant_id: variant.id,
            name: `${product.name} - ${variant.variant_name}`,
            price: variant.purchase_price || 0,
            monthly_price: variant.monthly_price || 0
          };
        }
      }
    }

    console.log('[META IMPORT] No matching variant found');
    return null;

  } catch (error: any) {
    console.error('[META IMPORT] Error in product matching:', error);
    return null;
  }
}
