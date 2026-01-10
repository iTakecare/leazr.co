import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  client_name: string;
  client_first_name?: string;
  client_last_name?: string;
  client_contact_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  client_vat?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
  client_country?: string;
  client_billing_address?: string;
  client_billing_city?: string;
  client_billing_postal_code?: string;
  client_billing_country?: string;
  client_delivery_address?: string;
  client_delivery_city?: string;
  client_delivery_postal_code?: string;
  client_delivery_country?: string;
  client_delivery_same_as_billing?: string;
  client_notes?: string;
  client_status?: string;
  client_business_sector?: string;
  dossier_number?: string;
  leaser?: string;
  type?: string;
  duration?: string;
  source?: string;
  dossier_date?: string;
  invoice_date?: string;
  payment_date?: string;
  financed_amount?: string;
  equipment_cost?: string;
  margin?: string;
  margin_rate?: string;
  coefficient?: string;
  monthly_payment?: string;
  computers?: string;
  smartphones?: string;
  tablets?: string;
  remarks?: string;
}

interface ImportRequest {
  rows: ImportRow[];
  billingEntityId: string;
  companyId: string;
  year: string;
}

// Normalize VAT number for comparison
function normalizeVat(vat: string): string {
  return vat.replace(/[\s\.\-]/g, '').toUpperCase();
}

// Canonicalize name for fuzzy matching
function canonicalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Parse European number format (1.234,56 or 1234.56)
function parseNumber(value: string): number {
  if (!value) return 0;
  // Remove spaces and € symbol
  let cleaned = value.replace(/[\s€]/g, '');
  // If contains comma as decimal separator
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  return parseFloat(cleaned) || 0;
}

// Parse date in various formats
function parseDate(value: string): string | null {
  if (!value) return null;
  
  // Try DD/MM/YYYY
  const dmyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  
  // Try YYYY-MM-DD
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return value;
  }
  
  // Try French month names
  const frenchMonths: Record<string, string> = {
    'janv': '01', 'janvier': '01',
    'févr': '02', 'février': '02', 'fevr': '02', 'fevrier': '02',
    'mars': '03',
    'avr': '04', 'avril': '04',
    'mai': '05',
    'juin': '06',
    'juil': '07', 'juillet': '07',
    'août': '08', 'aout': '08',
    'sept': '09', 'septembre': '09',
    'oct': '10', 'octobre': '10',
    'nov': '11', 'novembre': '11',
    'déc': '12', 'décembre': '12', 'dec': '12', 'decembre': '12'
  };
  
  const frenchMatch = value.toLowerCase().match(/^([a-zéû]+)\.?\s*(\d{4})$/);
  if (frenchMatch && frenchMonths[frenchMatch[1]]) {
    return `${frenchMatch[2]}-${frenchMonths[frenchMatch[1]]}-01`;
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { rows, billingEntityId, companyId, year }: ImportRequest = await req.json();

    console.log(`Starting import for ${rows.length} rows, year ${year}, company ${companyId}`);

    const report = {
      success: true,
      totalRows: rows.length,
      clientsCreated: 0,
      clientsLinked: 0,
      offersCreated: 0,
      contractsCreated: 0,
      errors: [] as Array<{ row: number; message: string }>
    };

    // Fetch all existing clients for matching
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, name, company, vat_number, email')
      .eq('company_id', companyId);

    // Fetch leaser mapping
    const { data: leasers } = await supabase
      .from('leasers')
      .select('id, name')
      .eq('company_id', companyId);

    const leaserMap = new Map<string, string>();
    leasers?.forEach(l => {
      leaserMap.set(canonicalizeName(l.name), l.id);
    });

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!row.client_name) {
          report.errors.push({ row: rowNumber, message: 'Nom client requis' });
          continue;
        }
        if (!row.financed_amount) {
          report.errors.push({ row: rowNumber, message: 'Montant financé requis' });
          continue;
        }
        if (!row.monthly_payment) {
          report.errors.push({ row: rowNumber, message: 'Mensualité requise' });
          continue;
        }

        // STEP 1: Find or create client
        let clientId: string | null = null;
        let clientCreated = false;

        // Try matching by VAT first
        if (row.client_vat) {
          const normalizedVat = normalizeVat(row.client_vat);
          const matchByVat = existingClients?.find(c => 
            c.vat_number && normalizeVat(c.vat_number) === normalizedVat
          );
          if (matchByVat) {
            clientId = matchByVat.id;
            console.log(`Row ${rowNumber}: Matched client by VAT: ${matchByVat.name}`);
          }
        }

        // Try matching by name if no VAT match
        if (!clientId) {
          const searchName = canonicalizeName(row.client_company || row.client_name);
          const matchByName = existingClients?.find(c => 
            canonicalizeName(c.company || c.name) === searchName ||
            canonicalizeName(c.name) === searchName
          );
          if (matchByName) {
            clientId = matchByName.id;
            console.log(`Row ${rowNumber}: Matched client by name: ${matchByName.name}`);
          }
        }

        // Create new client if not found
        if (!clientId) {
          const newClient = {
            company_id: companyId,
            name: row.client_name,
            first_name: row.client_first_name || null,
            last_name: row.client_last_name || null,
            contact_name: row.client_contact_name || null,
            company: row.client_company || null,
            email: row.client_email || null,
            phone: row.client_phone || null,
            vat_number: row.client_vat || null,
            address: row.client_address || null,
            city: row.client_city || null,
            postal_code: row.client_postal_code || null,
            country: row.client_country || 'BE',
            billing_address: row.client_billing_address || null,
            billing_city: row.client_billing_city || null,
            billing_postal_code: row.client_billing_postal_code || null,
            billing_country: row.client_billing_country || null,
            delivery_address: row.client_delivery_address || null,
            delivery_city: row.client_delivery_city || null,
            delivery_postal_code: row.client_delivery_postal_code || null,
            delivery_country: row.client_delivery_country || null,
            delivery_same_as_billing: row.client_delivery_same_as_billing === 'true',
            notes: row.client_notes || null,
            status: row.client_status || 'active',
            business_sector: row.client_business_sector || null
          };

          const { data: createdClient, error: clientError } = await supabase
            .from('clients')
            .insert(newClient)
            .select('id')
            .single();

          if (clientError) {
            report.errors.push({ row: rowNumber, message: `Erreur création client: ${clientError.message}` });
            continue;
          }

          clientId = createdClient.id;
          clientCreated = true;
          report.clientsCreated++;
          console.log(`Row ${rowNumber}: Created new client: ${row.client_name}`);
          
          // Add to existing clients for subsequent matching
          existingClients?.push({
            id: clientId,
            name: row.client_name,
            company: row.client_company || null,
            vat_number: row.client_vat || null,
            email: row.client_email || null
          });
        } else {
          report.clientsLinked++;
          
          // Optionally update client with missing info (enrichment)
          const existingClient = existingClients?.find(c => c.id === clientId);
          const updates: Record<string, any> = {};
          
          if (!existingClient?.email && row.client_email) updates.email = row.client_email;
          // Add more enrichment fields as needed
          
          if (Object.keys(updates).length > 0) {
            await supabase.from('clients').update(updates).eq('id', clientId);
          }
        }

        // STEP 2: Find leaser
        let leaserId: string | null = null;
        if (row.leaser) {
          leaserId = leaserMap.get(canonicalizeName(row.leaser)) || null;
          if (!leaserId) {
            console.log(`Row ${rowNumber}: Leaser not found: ${row.leaser}`);
          }
        }

        // STEP 3: Create offer
        const financedAmount = parseNumber(row.financed_amount || '0');
        const monthlyPayment = parseNumber(row.monthly_payment || '0');
        const equipmentCost = parseNumber(row.equipment_cost || '0');
        const margin = parseNumber(row.margin || '0');
        const coefficient = parseNumber(row.coefficient || '0');
        const duration = parseInt(row.duration || '36', 10);

        const offerData = {
          client_id: clientId,
          client_name: row.client_name,
          client_email: row.client_email || null,
          company_id: companyId,
          billing_entity_id: billingEntityId,
          leaser_id: leaserId,
          amount: financedAmount,
          financed_amount: financedAmount,
          monthly_payment: monthlyPayment,
          coefficient: coefficient || null,
          commission: margin,
          type: row.type === 'self_leasing' ? 'self_leasing' : 'leasing',
          workflow_status: 'accepted',
          status: 'accepted',
          converted_to_contract: true,
          remarks: row.remarks || null,
          created_at: parseDate(row.dossier_date) || `${year}-01-01`,
          dossier_number: row.dossier_number || null,
          // Equipment summary
          equipment_description: JSON.stringify({
            computers: parseInt(row.computers || '0', 10),
            smartphones: parseInt(row.smartphones || '0', 10),
            tablets: parseInt(row.tablets || '0', 10),
            total_cost: equipmentCost
          })
        };

        const { data: createdOffer, error: offerError } = await supabase
          .from('offers')
          .insert(offerData)
          .select('id')
          .single();

        if (offerError) {
          report.errors.push({ row: rowNumber, message: `Erreur création offre: ${offerError.message}` });
          continue;
        }

        report.offersCreated++;

        // STEP 4: Create contract
        const contractData = {
          offer_id: createdOffer.id,
          client_id: clientId,
          client_name: row.client_name,
          client_email: row.client_email || null,
          company_id: companyId,
          billing_entity_id: billingEntityId,
          leaser_id: leaserId,
          leaser_name: row.leaser || null,
          monthly_payment: monthlyPayment,
          status: 'active',
          tracking_status: 'delivered',
          type: row.type === 'self_leasing' ? 'self_leasing' : 'leasing',
          leasing_duration: duration,
          created_at: parseDate(row.dossier_date) || `${year}-01-01`,
          dossier_number: row.dossier_number || null
        };

        const { error: contractError } = await supabase
          .from('contracts')
          .insert(contractData);

        if (contractError) {
          report.errors.push({ row: rowNumber, message: `Erreur création contrat: ${contractError.message}` });
          continue;
        }

        report.contractsCreated++;
        console.log(`Row ${rowNumber}: Created offer and contract for ${row.client_name}`);

      } catch (rowError) {
        console.error(`Error processing row ${rowNumber}:`, rowError);
        report.errors.push({ row: rowNumber, message: `Erreur inattendue: ${rowError.message}` });
      }
    }

    report.success = report.errors.length === 0;

    console.log(`Import completed: ${report.offersCreated} offers, ${report.contractsCreated} contracts, ${report.errors.length} errors`);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
