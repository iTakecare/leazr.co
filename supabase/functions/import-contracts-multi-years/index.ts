import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedContract {
  clientName: string;
  firstName: string | null;
  lastName: string | null;
  company: string;
  dossierNumber: string;
  sector: string;
  city: string;
  country: string;
  source: string;
  leaser: string;
  dossierDate: string;
  invoiceDate: string;
  paymentDate: string | null;
  equipmentCost: number;
  margin: number;
  monthlyPayment: number;
  computers: number;
  smartphones: number;
  tablets: number;
}

interface YearData {
  year: number;
  contracts: ParsedContract[];
}

// Parse client name: "Prénom Nom - Entreprise" or just "Entreprise"
function parseClientName(clientField: string) {
  const parts = clientField.split(' - ');
  
  if (parts.length === 1) {
    return {
      firstName: null,
      lastName: null,
      name: parts[0].trim(),
      company: parts[0].trim()
    };
  }
  
  const fullName = parts[0].trim();
  const company = parts[1]?.trim() || fullName;
  const nameParts = fullName.split(' ');
  
  return {
    firstName: nameParts[0] || null,
    lastName: nameParts.slice(1).join(' ') || null,
    name: fullName,
    company: company
  };
}

// Parse French dates: "janv. 2022", "mai 25", etc.
function parseDateFr(dateStr: string, defaultYear: number): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const monthMapping: { [key: string]: string } = {
    'janv.': '01', 'janv': '01',
    'févr.': '02', 'févr': '02', 'fevr.': '02', 'fevr': '02',
    'mars': '03',
    'avr.': '04', 'avr': '04',
    'mai': '05',
    'juin': '06',
    'juil.': '07', 'juil': '07',
    'aout': '08', 'août': '08',
    'sept.': '09', 'sept': '09',
    'oct.': '10', 'oct': '10',
    'nov.': '11', 'nov': '11',
    'déc.': '12', 'dec.': '12', 'dec': '12', 'déc': '12'
  };

  // Format: "mai 25" or "juin 25"
  const shortMatch = dateStr.match(/([a-zéûà.]+)\s*(\d{2})/i);
  if (shortMatch) {
    const month = monthMapping[shortMatch[1].toLowerCase()];
    const shortYear = parseInt(shortMatch[2]);
    const fullYear = shortYear > 50 ? 1900 + shortYear : 2000 + shortYear;
    return `${fullYear}-${month}-01`;
  }

  // Format: "janv. 2022"
  const longMatch = dateStr.match(/([a-zéûà.]+)\s*(\d{4})/i);
  if (longMatch) {
    const month = monthMapping[longMatch[1].toLowerCase()];
    return `${longMatch[2]}-${month}-01`;
  }

  console.warn(`Could not parse date: ${dateStr}, using default year ${defaultYear}`);
  return `${defaultYear}-01-01`;
}

// Calculate contract start date (payment date + 1 month)
function calculateContractStartDate(paymentDateStr: string | null, year: number): string | null {
  if (!paymentDateStr) return null;

  const paymentDate = new Date(parseDateFr(paymentDateStr, year) || '');
  if (isNaN(paymentDate.getTime())) return null;
  
  paymentDate.setMonth(paymentDate.getMonth() + 1);
  paymentDate.setDate(1);
  
  return paymentDate.toISOString().split('T')[0];
}

// Map leaser names
function getLeaserId(leaserName: string): string | null {
  const mapping: { [key: string]: string } = {
    'Grenke': 'd60b86d7-a129-4a17-a877-e8e5caa66949',
    'Atlance': '7dc97e91-2404-43b1-8bbc-c182628ac333',
  };
  return mapping[leaserName] || null;
}

function getLeaserName(leaserName: string): string {
  const mapping: { [key: string]: string } = {
    'Grenke': '1. Grenke Lease',
    'Atlance': 'Atlance',
    'Olinn': 'Olinn'
  };
  return mapping[leaserName] || leaserName;
}

// Map sources
function mapSource(csvSource: string): string {
  const mapping: { [key: string]: string } = {
    'Google': 'google',
    'Meta': 'meta',
    'Facebook': 'meta',
    'Recommandation': 'recommendation',
    'Client existant': 'existing_client',
    'Partenaire': 'other'
  };
  return mapping[csvSource] || 'other';
}

// Build equipment description
function buildEquipmentDescription(computers: number, smartphones: number, tablets: number): string {
  const parts = [];
  if (computers > 0) parts.push(`${computers} ordinateur${computers > 1 ? 's' : ''}`);
  if (smartphones > 0) parts.push(`${smartphones} smartphone${smartphones > 1 ? 's' : ''}`);
  if (tablets > 0) parts.push(`${tablets} tablette${tablets > 1 ? 's' : ''}`);
  return parts.join(', ') || 'Équipement non spécifié';
}

// Parse CSV line
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Parse CSV by year
function parseCSVByYear(csvContent: string, year: number): ParsedContract[] {
  const lines = csvContent.split('\n').filter(l => l.trim());
  let startLine = 1;

  if (year === 2022) startLine = 2;
  if (year === 2025) startLine = 2;

  const contracts: ParsedContract[] = [];

  for (let i = startLine + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 10) continue;

    const clientParsed = parseClientName(fields[0]);
    
    contracts.push({
      clientName: clientParsed.name,
      firstName: clientParsed.firstName,
      lastName: clientParsed.lastName,
      company: clientParsed.company,
      dossierNumber: fields[1]?.trim() || '',
      sector: fields[2]?.trim() || '',
      city: fields[3]?.trim() || '',
      country: fields[4]?.trim() || 'Belgique',
      source: fields[5]?.trim() || '',
      leaser: fields[6]?.trim() || '',
      dossierDate: fields[7]?.trim() || '',
      invoiceDate: fields[8]?.trim() || '',
      paymentDate: fields[9]?.trim() || null,
      equipmentCost: parseFloat(fields[10]?.replace(',', '.') || '0'),
      margin: parseFloat(fields[11]?.replace(',', '.') || '0'),
      monthlyPayment: parseFloat(fields[12]?.replace(',', '.') || '0'),
      computers: parseInt(fields[13] || '0'),
      smartphones: parseInt(fields[14] || '0'),
      tablets: parseInt(fields[15] || '0')
    });
  }

  return contracts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('User company not found');
    }

    const companyId = profile.company_id;

    // Load CSV files
    const csv2022 = await Deno.readTextFile('./data/2022-Tableau_1.csv');
    const csv2023 = await Deno.readTextFile('./data/2023-Tableau_1.csv');
    const csv2024 = await Deno.readTextFile('./data/2024-Tableau_1.csv');
    const csv2025 = await Deno.readTextFile('./data/2025-Tableau_1.csv');

    const yearsData: YearData[] = [
      { year: 2022, contracts: parseCSVByYear(csv2022, 2022) },
      { year: 2023, contracts: parseCSVByYear(csv2023, 2023) },
      { year: 2024, contracts: parseCSVByYear(csv2024, 2024) },
      { year: 2025, contracts: parseCSVByYear(csv2025, 2025) }
    ];

    const report = {
      success: true,
      byYear: {} as any,
      globalStats: {
        totalProcessed: 0,
        clientsCreated: 0,
        clientsEnriched: 0,
        offersCreated: 0,
        offersUpdated: 0,
        contractsCreated: 0
      },
      conflicts: [] as any[],
      enrichments: [] as any[]
    };

    // Process each year chronologically
    for (const yearData of yearsData.sort((a, b) => a.year - b.year)) {
      console.log(`Processing year ${yearData.year} with ${yearData.contracts.length} contracts`);
      
      const yearStats = {
        processed: 0,
        clientsCreated: 0,
        clientsEnriched: 0,
        offersCreated: 0,
        offersUpdated: 0,
        contractsCreated: 0
      };

      for (const contract of yearData.contracts) {
        if (!contract.dossierNumber) continue;

        try {
          // 1. Find or create client
          const { data: existingClients } = await supabase
            .from('clients')
            .select('id, name, company, city, business_sector')
            .ilike('name', `%${contract.clientName}%`)
            .eq('company_id', companyId)
            .limit(1);

          let clientId;

          if (existingClients && existingClients.length > 0) {
            const existingClient = existingClients[0];
            clientId = existingClient.id;

            // Enrich only empty fields
            const updates: any = {};
            
            if (!existingClient.city && contract.city) {
              updates.city = contract.city;
            }
            
            if (!existingClient.business_sector && contract.sector) {
              updates.business_sector = contract.sector;
            }

            if (Object.keys(updates).length > 0) {
              await supabase
                .from('clients')
                .update(updates)
                .eq('id', clientId);

              yearStats.clientsEnriched++;
              report.globalStats.clientsEnriched++;
              
              report.enrichments.push({
                client: contract.clientName,
                year: yearData.year,
                fields: Object.keys(updates)
              });
            }
          } else {
            // Create new client
            const { data: newClient } = await supabase
              .from('clients')
              .insert({
                name: contract.clientName,
                first_name: contract.firstName,
                last_name: contract.lastName,
                company: contract.company,
                city: contract.city,
                country: contract.country,
                business_sector: contract.sector,
                company_id: companyId,
                status: 'active'
              })
              .select()
              .single();

            clientId = newClient.id;
            yearStats.clientsCreated++;
            report.globalStats.clientsCreated++;
          }

          // 2. Find or create offer
          const { data: existingOffers } = await supabase
            .from('offers')
            .select('id, workflow_status, monthly_payment, margin')
            .eq('dossier_number', contract.dossierNumber)
            .eq('company_id', companyId)
            .limit(1);

          let offerId;

          if (existingOffers && existingOffers.length > 0) {
            const existingOffer = existingOffers[0];
            offerId = existingOffer.id;

            // Update existing offer
            await supabase
              .from('offers')
              .update({
                monthly_payment: contract.monthlyPayment,
                margin: contract.margin,
                workflow_status: 'accepted',
                converted_to_contract: true,
                client_id: clientId
              })
              .eq('id', offerId);

            yearStats.offersUpdated++;
            report.globalStats.offersUpdated++;

            report.conflicts.push({
              type: 'offer_updated',
              dossier_number: contract.dossierNumber,
              year: yearData.year
            });
          } else {
            // Create new offer
            const equipmentDescription = buildEquipmentDescription(
              contract.computers,
              contract.smartphones,
              contract.tablets
            );

            const { data: newOffer } = await supabase
              .from('offers')
              .insert({
                dossier_number: contract.dossierNumber,
                client_id: clientId,
                client_name: contract.clientName,
                client_company: contract.company,
                monthly_payment: contract.monthlyPayment,
                margin: contract.margin,
                source: mapSource(contract.source),
                workflow_status: 'accepted',
                status: 'approved',
                converted_to_contract: true,
                equipment_description: equipmentDescription,
                company_id: companyId,
                created_at: parseDateFr(contract.dossierDate, yearData.year),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            offerId = newOffer.id;
            yearStats.offersCreated++;
            report.globalStats.offersCreated++;
          }

          // 3. Create contract
          const contractStartDate = calculateContractStartDate(
            contract.paymentDate,
            yearData.year
          );
          
          const contractStatus = contract.paymentDate ? 'active' : 'equipment_ordered';

          await supabase
            .from('contracts')
            .insert({
              offer_id: offerId,
              client_id: clientId,
              client_name: contract.clientName,
              monthly_payment: contract.monthlyPayment,
              equipment_description: buildEquipmentDescription(
                contract.computers,
                contract.smartphones,
                contract.tablets
              ),
              status: contractStatus,
              leaser_name: getLeaserName(contract.leaser),
              leaser_id: getLeaserId(contract.leaser),
              contract_number: null,
              dossier_date: parseDateFr(contract.dossierDate, yearData.year),
              invoice_date: parseDateFr(contract.invoiceDate, yearData.year),
              payment_date: contract.paymentDate 
                ? parseDateFr(contract.paymentDate, yearData.year) 
                : null,
              contract_start_date: contractStartDate,
              company_id: companyId,
              user_id: user.id,
              invoice_generated: false,
              created_at: parseDateFr(contract.dossierDate, yearData.year),
              updated_at: new Date().toISOString()
            });

          yearStats.contractsCreated++;
          report.globalStats.contractsCreated++;
          yearStats.processed++;
          report.globalStats.totalProcessed++;

        } catch (err) {
          console.error(`Error processing contract ${contract.dossierNumber}:`, err);
          report.conflicts.push({
            type: 'error',
            dossier_number: contract.dossierNumber,
            year: yearData.year,
            error: err.message
          });
        }
      }

      report.byYear[yearData.year] = yearStats;
    }

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
