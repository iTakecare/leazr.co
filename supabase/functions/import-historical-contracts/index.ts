import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EquipmentItem {
  title: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
}

interface ContractData {
  client_name: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  client_vat?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
  client_country?: string;
  dossier_number: string;
  contract_number?: string;
  invoice_number?: string;
  monthly_payment: string;
  leaser_name?: string;
  status?: string;
  dossier_date?: string;
  invoice_date?: string;
  payment_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_duration?: string;
  financed_amount?: string;
  billing_entity_name?: string;
  billingEntityId?: string;
  equipments: EquipmentItem[];
}

interface ImportRequest {
  contracts: ContractData[];
  defaultBillingEntityId: string;
  companyId: string;
  year: string;
  updateMode?: boolean;
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
  let cleaned = value.replace(/[\s€]/g, '');
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

// Calculate end date from start date and duration
function calculateEndDate(startDate: string | null, durationMonths: number): string | null {
  if (!startDate) return null;
  
  try {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + durationMonths);
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
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

    // Extraire l'utilisateur authentifié
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer un client temporaire pour vérifier l'utilisateur
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Import initiated by user: ${userId}`);

    const { contracts, defaultBillingEntityId, companyId, year, updateMode }: ImportRequest = await req.json();

    console.log(`Starting import for ${contracts.length} contracts, year ${year}, company ${companyId}, updateMode: ${updateMode}`);

    const report = {
      success: true,
      totalRows: contracts.length,
      clientsCreated: 0,
      clientsLinked: 0,
      offersCreated: 0,
      contractsCreated: 0,
      contractsUpdated: 0,
      equipmentsCreated: 0,
      invoicesCreated: 0,
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

    // Process each contract
    for (let i = 0; i < contracts.length; i++) {
      const contract = contracts[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields - accept client_name OR client_company
        const clientIdentifier = contract.client_name || contract.client_company;
        if (!clientIdentifier) {
          report.errors.push({ row: rowNumber, message: 'Nom client ou entreprise requis' });
          continue;
        }
        if (!contract.dossier_number) {
          report.errors.push({ row: rowNumber, message: 'Numéro de dossier requis' });
          continue;
        }

        // STEP 1: Find or create client
        let clientId: string | null = null;

        // Try matching by VAT first
        if (contract.client_vat) {
          const normalizedVat = normalizeVat(contract.client_vat);
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
          const searchName = canonicalizeName(contract.client_company || contract.client_name);
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
            name: contract.client_name || contract.client_company,
            company: contract.client_company || null,
            email: contract.client_email || null,
            phone: contract.client_phone || null,
            vat_number: contract.client_vat || null,
            address: contract.client_address || null,
            city: contract.client_city || null,
            postal_code: contract.client_postal_code || null,
            country: contract.client_country || 'BE',
            status: 'active'
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
          report.clientsCreated++;
          console.log(`Row ${rowNumber}: Created new client: ${clientIdentifier}`);
          
          // Add to existing clients for subsequent matching
          existingClients?.push({
            id: clientId,
            name: contract.client_name,
            company: contract.client_company || null,
            vat_number: contract.client_vat || null,
            email: contract.client_email || null
          });
        } else {
          report.clientsLinked++;
        }

        // STEP 2: Find leaser
        let leaserId: string | null = null;
        if (contract.leaser_name) {
          leaserId = leaserMap.get(canonicalizeName(contract.leaser_name)) || null;
          if (!leaserId) {
            console.log(`Row ${rowNumber}: Leaser not found: ${contract.leaser_name}`);
          }
        }

        // STEP 3: Parse dates and amounts
        const monthlyPayment = parseNumber(contract.monthly_payment || '0');
        const financedAmount = parseNumber(contract.financed_amount || '0') || monthlyPayment * 48;
        const duration = parseInt(contract.contract_duration || '36', 10);
        const contractStartDate = parseDate(contract.contract_start_date) || parseDate(contract.dossier_date) || `${year}-01-01`;
        
        // Contract end date: use provided or calculate from start + duration
        let contractEndDate = parseDate(contract.contract_end_date);
        if (!contractEndDate && contractStartDate) {
          contractEndDate = calculateEndDate(contractStartDate, duration);
        }

        // Calculate total equipment cost
        const totalEquipmentCost = contract.equipments.reduce(
          (sum, eq) => sum + (eq.purchase_price * eq.quantity), 
          0
        );

        // STEP 4: Check if contract already exists (by dossier_number)
        const { data: existingContract } = await supabase
          .from('contracts')
          .select('id, offer_id')
          .eq('dossier_number', contract.dossier_number)
          .eq('company_id', companyId)
          .maybeSingle();

        if (existingContract && updateMode) {
          // UPDATE MODE: Update existing contract
          console.log(`Row ${rowNumber}: Updating existing contract ${contract.dossier_number}`);
          
          // Update contract
          const { error: updateError } = await supabase
            .from('contracts')
            .update({
              leaser_id: leaserId,
              leaser_name: contract.leaser_name || null,
              leaser_contract_number: contract.contract_number || null,
              monthly_payment: monthlyPayment,
              status: contract.status || 'active',
              leasing_duration: duration,
              contract_start_date: contractStartDate,
              contract_end_date: contractEndDate,
            })
            .eq('id', existingContract.id);

          if (updateError) {
            report.errors.push({ row: rowNumber, message: `Erreur MAJ contrat: ${updateError.message}` });
            continue;
          }

          // Update offer if exists
          if (existingContract.offer_id) {
            await supabase
              .from('offers')
              .update({
                leaser_id: leaserId,
                amount: financedAmount || totalEquipmentCost,
                financed_amount: financedAmount || totalEquipmentCost,
                monthly_payment: monthlyPayment,
              })
              .eq('id', existingContract.offer_id);

            // Delete old equipment and recreate
            await supabase
              .from('offer_equipment')
              .delete()
              .eq('offer_id', existingContract.offer_id);

            if (contract.equipments.length > 0) {
              const equipmentEntries = contract.equipments.map(eq => {
                const margin = eq.selling_price - eq.purchase_price;
                return {
                  offer_id: existingContract.offer_id,
                  title: eq.title,
                  purchase_price: eq.purchase_price,
                  selling_price: eq.selling_price,
                  quantity: eq.quantity,
                  margin: margin
                };
              });

              const { error: eqError } = await supabase
                .from('offer_equipment')
                .insert(equipmentEntries);

              if (!eqError) {
                report.equipmentsCreated += contract.equipments.length;
              }
            }
          }

          report.contractsUpdated++;
          console.log(`Row ${rowNumber}: Updated contract ${contract.dossier_number} with ${contract.equipments.length} equipment(s)`);
          continue;

        } else if (existingContract && !updateMode) {
          // Contract exists but update mode is off -> error
          report.errors.push({ 
            row: rowNumber, 
            message: `Contrat ${contract.dossier_number} existe déjà (activez le mode mise à jour)` 
          });
          continue;
        }

        // STEP 5: Create new offer (contract doesn't exist)
        // Use per-contract billing entity or fallback to default
        const contractBillingEntityId = contract.billingEntityId || defaultBillingEntityId;
        
        const offerData = {
          client_id: clientId,
          client_name: contract.client_name || contract.client_company,
          client_email: contract.client_email || null,
          company_id: companyId,
          billing_entity_id: contractBillingEntityId,
          leaser_id: leaserId,
          amount: financedAmount || totalEquipmentCost,
          financed_amount: financedAmount || totalEquipmentCost,
          monthly_payment: monthlyPayment,
          type: 'internal_offer',
          workflow_status: 'accepted',
          status: 'accepted',
          converted_to_contract: true,
          created_at: parseDate(contract.dossier_date) || `${year}-01-01`,
          dossier_number: contract.dossier_number
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

        // STEP 6: Create equipment entries
        if (contract.equipments.length > 0) {
          const equipmentEntries = contract.equipments.map(eq => {
            const margin = eq.selling_price - eq.purchase_price;
            return {
              offer_id: createdOffer.id,
              title: eq.title,
              purchase_price: eq.purchase_price,
              selling_price: eq.selling_price,
              quantity: eq.quantity,
              margin: margin
            };
          });

          const { error: equipmentError } = await supabase
            .from('offer_equipment')
            .insert(equipmentEntries);

          if (equipmentError) {
            console.error(`Row ${rowNumber}: Equipment insert error:`, equipmentError);
          } else {
            report.equipmentsCreated += contract.equipments.length;
          }
        }

        // STEP 7: Create contract
        // Calculate status based on end date
        let calculatedStatus = contract.status || 'active';
        if (contractEndDate) {
          const endDate = new Date(contractEndDate);
          const today = new Date();
          if (endDate < today) {
            calculatedStatus = 'completed';
            console.log(`Row ${rowNumber}: Contract end date ${contractEndDate} is in the past, setting status to 'completed'`);
          }
        }

        const contractDbData = {
          offer_id: createdOffer.id,
          client_id: clientId,
          client_name: contract.client_name || contract.client_company,
          client_email: contract.client_email || null,
          company_id: companyId,
          billing_entity_id: contractBillingEntityId,
          leaser_id: leaserId,
          leaser_name: contract.leaser_name || null,
          contract_number: contract.dossier_number || contract.contract_number,
          monthly_payment: monthlyPayment,
          status: calculatedStatus,
          contract_duration: duration,
          contract_start_date: contractStartDate,
          contract_end_date: contractEndDate,
          user_id: userId,
          created_at: parseDate(contract.dossier_date) || `${year}-01-01`
        };

        const { data: createdContract, error: contractError } = await supabase
          .from('contracts')
          .insert(contractDbData)
          .select('id')
          .single();

        if (contractError) {
          report.errors.push({ row: rowNumber, message: `Erreur création contrat: ${contractError.message}` });
          continue;
        }

        report.contractsCreated++;
        console.log(`Row ${rowNumber}: Created contract with ${contract.equipments.length} equipment(s) for ${contract.client_name}`);

        // STEP 7bis: Create contract equipment (for display on contract detail page)
        if (contract.equipments && contract.equipments.length > 0) {
          const contractEquipmentEntries = contract.equipments.map(eq => ({
            contract_id: createdContract.id,
            title: eq.title,
            quantity: eq.quantity,
            purchase_price: eq.purchase_price,
            margin: (eq.selling_price || 0) - (eq.purchase_price || 0),
            monthly_payment: null,
            serial_number: null
          }));

          const { error: contractEquipmentError } = await supabase
            .from('contract_equipment')
            .insert(contractEquipmentEntries);

          if (contractEquipmentError) {
            console.error(`Row ${rowNumber}: Contract equipment insert error:`, contractEquipmentError);
          } else {
            console.log(`Row ${rowNumber}: Created ${contractEquipmentEntries.length} contract equipment entries`);
          }
        }

        // STEP 8: Create invoice if invoice_number is provided
        if (contract.invoice_number?.trim()) {
          const invoiceDate = parseDate(contract.invoice_date) || contractStartDate;
          const paymentDate = parseDate(contract.payment_date);
          
          // Determine invoice status based on payment_date
          const invoiceStatus = paymentDate ? 'paid' : 'sent';
          
          // Build equipment data for billing_data
          const equipmentData = contract.equipments.map(eq => ({
            title: eq.title,
            quantity: eq.quantity,
            purchase_price: eq.purchase_price,
            selling_price_excl_vat: eq.selling_price
          }));
          
          // Get client data
          const { data: clientData } = await supabase
            .from('clients')
            .select('name, company, email, phone, address, city, postal_code, country, vat_number')
            .eq('id', clientId)
            .single();
          
          // Get leaser data
          let leaserData = null;
          if (leaserId) {
            const { data: leaser } = await supabase
              .from('leasers')
              .select('name, company_name, address, city, postal_code, country, vat_number, email, phone')
              .eq('id', leaserId)
              .single();
            leaserData = leaser;
          }
          
          const invoiceData = {
            contract_id: createdContract.id,
            offer_id: createdOffer.id,
            company_id: companyId,
            leaser_name: leaserData?.company_name || leaserData?.name || contract.leaser_name || '',
            invoice_number: contract.invoice_number,
            invoice_type: 'leasing',
            amount: financedAmount || totalEquipmentCost,
            status: invoiceStatus,
            integration_type: 'local',
            invoice_date: invoiceDate,
            due_date: invoiceDate,
            paid_at: paymentDate,
            billing_data: {
              contract_data: {
                id: createdContract.id,
                client_name: contract.client_name,
                monthly_payment: monthlyPayment
              },
              client_data: clientData || { name: contract.client_name },
              equipment_data: equipmentData,
              leaser_data: leaserData ? {
                name: leaserData.company_name || leaserData.name,
                address: leaserData.address,
                city: leaserData.city,
                postal_code: leaserData.postal_code,
                country: leaserData.country || 'Belgique',
                vat_number: leaserData.vat_number
              } : null,
              invoice_totals: {
                total_excl_vat: financedAmount || totalEquipmentCost,
                vat_amount: (financedAmount || totalEquipmentCost) * 0.21,
                total_incl_vat: (financedAmount || totalEquipmentCost) * 1.21
              },
              imported_from_csv: true,
              created_at: new Date().toISOString()
            }
          };

          const { data: createdInvoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert(invoiceData)
            .select('id')
            .single();

          if (invoiceError) {
            console.error(`Row ${rowNumber}: Invoice creation error:`, invoiceError);
          } else {
            report.invoicesCreated++;
            console.log(`Row ${rowNumber}: Created invoice ${contract.invoice_number} with status ${invoiceStatus}`);
            
            // Update contract to mark invoice as generated
            await supabase
              .from('contracts')
              .update({ 
                invoice_generated: true,
                invoice_id: createdInvoice.id 
              })
              .eq('id', createdContract.id);
          }
        }

      } catch (rowError) {
        console.error(`Error processing row ${rowNumber}:`, rowError);
        report.errors.push({ row: rowNumber, message: `Erreur inattendue: ${rowError.message}` });
      }
    }

    report.success = report.errors.length === 0;

    console.log(`Import completed: ${report.contractsCreated} created, ${report.contractsUpdated} updated, ${report.equipmentsCreated} equipments, ${report.invoicesCreated} invoices, ${report.errors.length} errors`);

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
