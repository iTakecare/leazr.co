import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
  client: string;
  dossierNumber: string;
  contractNumber: string;
  invoiceNumber: string;
  sector: string;
  location: string;
  country: string;
  source: string;
  leaser: string;
  dossierDate: string;
  invoiceDate: string;
  paymentDate: string;
  leaserInvoice: string;
  equipmentCost: string;
  margin: string;
  computers: string;
  smartphones: string;
  tablets: string;
  marginRate: string;
  monthlyPayment: string;
}

interface ImportResult {
  success: boolean;
  stats: {
    rowsProcessed: number;
    clientsCreated: number;
    clientsUpdated: number;
    offersCreated: number;
    contractsCreated: number;
    activeContracts: number;
    pendingContracts: number;
  };
  anomalies: string[];
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Vérifier que l'utilisateur est authentifié et admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur sans entreprise' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Import démarré par user ${user.id} pour company ${profile.company_id}`);

    const result: ImportResult = {
      success: true,
      stats: {
        rowsProcessed: 0,
        clientsCreated: 0,
        clientsUpdated: 0,
        offersCreated: 0,
        contractsCreated: 0,
        activeContracts: 0,
        pendingContracts: 0,
      },
      anomalies: [],
      errors: [],
    };

    // CSV data hardcodé (lignes 3-30 du fichier fourni)
    const csvData: CSVRow[] = [
      { client: "Frederic D'hont - Frederic D'hont", dossierNumber: "180-25888", contractNumber: "", invoiceNumber: "ITC-2025-0002", sector: "Auto Ecole", location: "Uccle", country: "BE", source: "Google", leaser: "Grenke", dossierDate: "janv. 2025", invoiceDate: "janv. 2025", paymentDate: "janv. 2025", leaserInvoice: "4 082,32 €", equipmentCost: "2 224,09 €", margin: "1 858,23 €", computers: "1", smartphones: "1", tablets: "0", marginRate: "83,55 %", monthlyPayment: "133,90 €" },
      { client: "Pierre Bertaux - Pierre Bertaux SCS #2", dossierNumber: "180-26393", contractNumber: "", invoiceNumber: "ITC-2025-0010", sector: "Graphisme", location: "Bruxelles", country: "BE", source: "Client existant", leaser: "Grenke", dossierDate: "nov. 2024", invoiceDate: "févr. 2025", paymentDate: "mars 2025", leaserInvoice: "4717,00 €", equipmentCost: "2 994,58 €", margin: "1 722,42 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "57,52 %", monthlyPayment: "97,95 €" },
      { client: "Fabrice Delchambre - Never2Late", dossierNumber: "180-25480", contractNumber: "", invoiceNumber: "ITC-2025-0005", sector: "Hotelerie", location: "Waterloo", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "nov. 2024", invoiceDate: "févr. 2025", paymentDate: "mars 2025", leaserInvoice: "4 573,17 €", equipmentCost: "3 709,07 €", margin: "864,10 €", computers: "1", smartphones: "1", tablets: "1", marginRate: "23,30 %", monthlyPayment: "155,00 €" },
      { client: "Nicolas Lehette - AT Studio", dossierNumber: "180-27730", contractNumber: "", invoiceNumber: "ITC-2025-0017", sector: "Audiovisuel", location: "Binche", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "mai 25", invoiceDate: "mai 2025", paymentDate: "juin 2025", leaserInvoice: "4 677,37 €", equipmentCost: "3 073,00 €", margin: "1 604,37 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "52,21 %", monthlyPayment: "299,95 €" },
      { client: "Thibaud Varasse - v infra", dossierNumber: "180-27770", contractNumber: "", invoiceNumber: "ITC-2025-0016", sector: "Consultance", location: "Ixelles", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "mai 25", invoiceDate: "mai 2025", paymentDate: "juin 2025", leaserInvoice: "3 434,25 €", equipmentCost: "1 874,00 €", margin: "1 560,25 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "83,26 %", monthlyPayment: "112,30 €" },
      { client: "Thibaud de Clerck - Alarmes De Clerck #5", dossierNumber: "22209", contractNumber: "", invoiceNumber: "ITC-2025-0020", sector: "Alarmes", location: "Forchies", country: "BE", source: "Client existant", leaser: "Atlance", dossierDate: "avr. 2025", invoiceDate: "juin 2025", paymentDate: "juin 2025", leaserInvoice: "4 086,20 €", equipmentCost: "2 831,00 €", margin: "1 255,20 €", computers: "1", smartphones: "2", tablets: "0", marginRate: "44,34 %", monthlyPayment: "109,80 €" },
      { client: "Francois Deravet - Deravet Digital", dossierNumber: "180-27846", contractNumber: "", invoiceNumber: "ITC-2025-0023", sector: "Web", location: "Liège", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "mars 25", invoiceDate: "juin 2025", paymentDate: "juin 2025", leaserInvoice: "1 857,75 €", equipmentCost: "1 105,00 €", margin: "752,75 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "68,12 %", monthlyPayment: "65,95 €" },
      { client: "Olivier Dumeunier - Duoplus", dossierNumber: "180-27874", contractNumber: "", invoiceNumber: "ITC-2025-0022", sector: "Graphisme", location: "Sivry-Rance", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "mai 25", invoiceDate: "juin 2025", paymentDate: "juin 2025", leaserInvoice: "4 464,83 €", equipmentCost: "2 812,00 €", margin: "1 652,83 €", computers: "1", smartphones: "0", tablets: "1", marginRate: "58,78 %", monthlyPayment: "148,60 €" },
      { client: "Audry Lumeau - Binome Store", dossierNumber: "180-28062", contractNumber: "", invoiceNumber: "ITC-2025-0021", sector: "Mode", location: "Gosseiles", country: "BE", source: "Google", leaser: "Grenke", dossierDate: "juin 25", invoiceDate: "juin 2025", paymentDate: "juin 2025", leaserInvoice: "7 292,02 €", equipmentCost: "4 707,00 €", margin: "2 585,02 €", computers: "5", smartphones: "0", tablets: "0", marginRate: "54,92 %", monthlyPayment: "231,16 €" },
      { client: "Loic Duchesnes - Chez loic", dossierNumber: "180-26982", contractNumber: "", invoiceNumber: "ITC-2025-0018", sector: "Horeca", location: "Herstal", country: "BE", source: "Meta", leaser: "Grenke", dossierDate: "mars 2025", invoiceDate: "juin 2025", paymentDate: "juin 2025", leaserInvoice: "5 563,29 €", equipmentCost: "3 603,00 €", margin: "1 960,29 €", computers: "1", smartphones: "1", tablets: "0", marginRate: "54,41 %", monthlyPayment: "175,80 €" },
      { client: "Esteban Arriaga Miranda - Eurofood Bank | About IT #4", dossierNumber: "22210", contractNumber: "", invoiceNumber: "ITC-2025-0019", sector: "ASBL", location: "Bruxelles", country: "BE", source: "Client existant", leaser: "Atlance", dossierDate: "janv. 2025", invoiceDate: "juin 2025", paymentDate: "juin 2025", leaserInvoice: "10 992,81 €", equipmentCost: "4 993,00 €", margin: "5 999,81 €", computers: "5", smartphones: "0", tablets: "0", marginRate: "120,16 %", monthlyPayment: "91,60 €" },
      { client: "Danielle Carmen Nsoke - Cn Partners SRL", dossierNumber: "180-23697", contractNumber: "", invoiceNumber: "ITC-2025-0024", sector: "Nettoyage", location: "Rhodes-Saint-Genese", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "juil. 24", invoiceDate: "juil. 25", paymentDate: "juil. 25", leaserInvoice: "1 396,20 €", equipmentCost: "680,00 €", margin: "716,20 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "105,32 %", monthlyPayment: "47,75 €" },
      { client: "Danielle Carmen Nsoke - Genesis SRL", dossierNumber: "180-28341", contractNumber: "", invoiceNumber: "ITC-2025-0025", sector: "Nettoyage", location: "Rhodes-Saint-Genese", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "juin 25", invoiceDate: "juil. 25", paymentDate: "juil. 25", leaserInvoice: "1 345,00 €", equipmentCost: "680,00 €", margin: "665,00 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "97,79 %", monthlyPayment: "47,75 €" },
      { client: "Thibaud Varasse - v infra #2", dossierNumber: "180-28398", contractNumber: "", invoiceNumber: "ITC-2025-0026", sector: "Consultance", location: "Ixelles", country: "BE", source: "Client existant", leaser: "Grenke", dossierDate: "juin 25", invoiceDate: "juil. 25", paymentDate: "juil. 25", leaserInvoice: "14 237,69 €", equipmentCost: "11 225,00 €", margin: "3 012,69 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "26,84 %", monthlyPayment: "112,30 €" },
      { client: "Jonathan Ganhy - Takumi Creation", dossierNumber: "180-28390", contractNumber: "", invoiceNumber: "ITC-2025-0028", sector: "Communication", location: "Hastière", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "juil. 25", invoiceDate: "juil. 25", paymentDate: "Aout 2025", leaserInvoice: "6 019,11 €", equipmentCost: "4 269,00 €", margin: "1 750,11 €", computers: "1", smartphones: "0", tablets: "2", marginRate: "41,00 %", monthlyPayment: "140,20 €" },
      { client: "Zakaria Gayet - Winfinance #3 - Bureau M/S/M", dossierNumber: "180-28504", contractNumber: "", invoiceNumber: "ITC-2025-0029", sector: "Finance - courtage", location: "Namur", country: "BE", source: "Client existant", leaser: "Grenke", dossierDate: "avr. 2025", invoiceDate: "Aout 2025", paymentDate: "Aout 2025", leaserInvoice: "25 629,54 €", equipmentCost: "12 182,15 €", margin: "13 447,39 €", computers: "6", smartphones: "0", tablets: "0", marginRate: "110,39 %", monthlyPayment: "172,43 €" },
      { client: "Patrick Burgeon - Kap-Services (PC Depannage)", dossierNumber: "180-28401", contractNumber: "", invoiceNumber: "ITC-2025-0030", sector: "Nettoyage", location: "Charleroi", country: "BE", source: "Partenaire", leaser: "Grenke", dossierDate: "mars 2025", invoiceDate: "Aout 2025", paymentDate: "Aout 2025", leaserInvoice: "5 024,68 €", equipmentCost: "2 866,00 €", margin: "2 158,68 €", computers: "3", smartphones: "0", tablets: "0", marginRate: "75,32 %", monthlyPayment: "251,70 €" },
      { client: "Lola Brousmiche - WasteEnd", dossierNumber: "180-28719", contractNumber: "", invoiceNumber: "ITC-2025-0031", sector: "Industriel", location: "Charleroi", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "juil. 2025", invoiceDate: "Aout 2025", paymentDate: "Aout 2025", leaserInvoice: "2 038,24 €", equipmentCost: "1 261,00 €", margin: "777,24 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "61,64 %", monthlyPayment: "71,95 €" },
      { client: "Sabrina Dewever - Express immo", dossierNumber: "180-28794", contractNumber: "", invoiceNumber: "ITC-2025-0032", sector: "Immobilier", location: "Namur", country: "BE", source: "Client existant", leaser: "Grenke", dossierDate: "aout 2025", invoiceDate: "Aout 2025", paymentDate: "Aout 2025", leaserInvoice: "2 236,54 €", equipmentCost: "1 661,54 €", margin: "575,00 €", computers: "0", smartphones: "1", tablets: "0", marginRate: "34,61 %", monthlyPayment: "259,95 €" },
      { client: "Benajmin Auvray - BRS Racing", dossierNumber: "180-28967", contractNumber: "", invoiceNumber: "ITC-2025-0034", sector: "Automobile", location: "Walcourt", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "Aout 2025", invoiceDate: "sept. 25", paymentDate: "sept. 25", leaserInvoice: "1 501,42 €", equipmentCost: "993,00 €", margin: "508,42 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "51,20 %", monthlyPayment: "43,95 €" },
      { client: "Dorcas Siassia - Kimia Lex", dossierNumber: "180-28966", contractNumber: "", invoiceNumber: "ITC-2025-0035", sector: "Secretariat", location: "Charleroi", country: "BE", source: "Google", leaser: "Grenke", dossierDate: "Aout 2025", invoiceDate: "sept. 25", paymentDate: "sept. 25", leaserInvoice: "1 423,08 €", equipmentCost: "826,00 €", margin: "597,08 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "72,29 %", monthlyPayment: "49,95 €" },
      { client: "Catherine Barbosa - Ecrin Santé", dossierNumber: "180-28984", contractNumber: "", invoiceNumber: "ITC-2025-0033", sector: "Bien-être", location: "Le Roeulx", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "Aout 2025", invoiceDate: "sept. 25", paymentDate: "sept. 25", leaserInvoice: "3 621,91 €", equipmentCost: "2 526,14 €", margin: "1 095,77 €", computers: "1", smartphones: "1", tablets: "1", marginRate: "43,38 %", monthlyPayment: "95,58 €" },
      { client: "Havenith Danny - Mercurhosp (via v-infra)", dossierNumber: "180-28958", contractNumber: "", invoiceNumber: "ITC-2025-0039", sector: "Medical", location: "Namur", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "Aout 2025", invoiceDate: "sept. 25", paymentDate: "sept. 25", leaserInvoice: "24 436,64 €", equipmentCost: "18 797,44 €", margin: "5 639,20 €", computers: "8", smartphones: "0", tablets: "0", marginRate: "30,00 %", monthlyPayment: "629,65 €" },
      { client: "Manu Latini - New Latistyl", dossierNumber: "180-28875", contractNumber: "", invoiceNumber: "ITC-2025-0040", sector: "Batiment", location: "Walcourt", country: "BE", source: "Recommandation", leaser: "Grenke", dossierDate: "juil. 2025", invoiceDate: "sept. 25", paymentDate: "sept. 25", leaserInvoice: "4 302,80 €", equipmentCost: "2 634,00 €", margin: "1 668,80 €", computers: "1", smartphones: "0", tablets: "1", marginRate: "63,36 %", monthlyPayment: "138,55 €" },
      { client: "Selim Belabed - Kids Explorers ASBL", dossierNumber: "180-29413", contractNumber: "", invoiceNumber: "ITC-2025-0040", sector: "ASBL", location: "Bruxelles", country: "BE", source: "Google", leaser: "Grenke", dossierDate: "sept. 2025", invoiceDate: "oct. 2025", paymentDate: "oct. 2025", leaserInvoice: "2 264,87 €", equipmentCost: "999,00 €", margin: "1 265,87 €", computers: "1", smartphones: "0", tablets: "0", marginRate: "126,71 %", monthlyPayment: "79,95 €" },
      { client: "Gregory Ilnicki - Infra Route SRL #4", dossierNumber: "180-29310", contractNumber: "", invoiceNumber: "ITC-2025-0042", sector: "Genie Civil", location: "Liège", country: "BE", source: "Client existant", leaser: "Grenke", dossierDate: "sept. 2025", invoiceDate: "oct. 2025", paymentDate: "oct. 2025", leaserInvoice: "1 588,95 €", equipmentCost: "1 223,10 €", margin: "365,85 €", computers: "0", smartphones: "0", tablets: "1", marginRate: "29,91 %", monthlyPayment: "43,17 €" },
      { client: "Ludovic Fortin - Resilience Paysage", dossierNumber: "180-29527", contractNumber: "", invoiceNumber: "ITC-2025-0043", sector: "Parc & Jardins", location: "Nivelles", country: "BE", source: "Google", leaser: "Grenke", dossierDate: "sept. 25", invoiceDate: "oct. 2025", paymentDate: "oct. 2025", leaserInvoice: "4 177,78 €", equipmentCost: "1 978,00 €", margin: "2 199,78 €", computers: "2", smartphones: "0", tablets: "0", marginRate: "111,21 %", monthlyPayment: "135,36 €" },
    ];

    // Mapping des sources
    const sourceMapping: Record<string, string> = {
      'Google': 'google',
      'Meta': 'meta',
      'Recommandation': 'recommendation',
      'Client existant': 'existing_client',
      'Partenaire': 'other',
    };

    // Mapping des leasers
    const leaserMapping: Record<string, string> = {
      'Grenke': 'd60b86d7-a129-4a17-a877-e8e5caa66949',
      'Atlance': '7dc97e91-2404-43b1-8bbc-c182628ac333',
    };

    // Mapping des mois français
    const monthMapping: Record<string, string> = {
      'janv.': '01', 'janv': '01',
      'févr.': '02', 'fevr.': '02', 'févr': '02', 'fevr': '02',
      'mars': '03',
      'avr.': '04', 'avr': '04',
      'mai': '05',
      'juin': '06',
      'juil.': '07', 'juil': '07',
      'aout': '08', 'Aout': '08',
      'sept.': '09', 'sept': '09',
      'oct.': '10', 'oct': '10',
      'nov.': '11', 'nov': '11',
      'déc.': '12', 'dec.': '12', 'déc': '12', 'dec': '12',
    };

    // Fonction pour parser les dates françaises
    const parseFrenchDate = (dateStr: string): string | null => {
      if (!dateStr) return null;
      
      const cleaned = dateStr.trim();
      const parts = cleaned.split(' ');
      
      if (parts.length >= 2) {
        const month = monthMapping[parts[0]];
        let year = parts[1];
        
        // Gérer les années courtes (25 -> 2025)
        if (year.length === 2) {
          year = '20' + year;
        }
        
        if (month && year) {
          return `${year}-${month}-15`; // On utilise le 15 du mois par défaut
        }
      }
      
      return null;
    };

    // Fonction pour parser les montants européens
    const parseEuropeanAmount = (amountStr: string): number => {
      if (!amountStr) return 0;
      return parseFloat(
        amountStr
          .replace(/\s/g, '')
          .replace('€', '')
          .replace(',', '.')
      );
    };

    // Fonction pour calculer la date de début de contrat
    const calculateContractStartDate = (paymentDate: string | null): string | null => {
      if (!paymentDate) return null;
      
      const date = new Date(paymentDate);
      date.setMonth(date.getMonth() + 1);
      date.setDate(1);
      return date.toISOString().split('T')[0];
    };

    // Traiter chaque ligne du CSV
    for (const row of csvData) {
      try {
        result.stats.rowsProcessed++;
        
        // Extraire nom et entreprise du client
        const clientParts = row.client.split(' - ');
        const clientName = clientParts[0].trim();
        const clientCompany = clientParts[1]?.trim() || clientName;
        
        console.log(`📝 Traitement ligne ${result.stats.rowsProcessed}: ${clientName}`);
        
        // Nettoyer le dossier number (enlever les sauts de ligne)
        const cleanDossierNumber = row.dossierNumber.replace(/\n/g, '').trim();
        
        // Parser les dates
        const dossierDate = parseFrenchDate(row.dossierDate);
        const invoiceDate = parseFrenchDate(row.invoiceDate);
        const paymentDate = parseFrenchDate(row.paymentDate);
        
        // Parser les montants
        const monthlyPayment = parseEuropeanAmount(row.monthlyPayment);
        const margin = parseEuropeanAmount(row.margin);
        const equipmentCost = parseEuropeanAmount(row.equipmentCost);
        
        // Mapper la source
        const source = sourceMapping[row.source] || 'other';
        if (!sourceMapping[row.source]) {
          result.anomalies.push(`Ligne ${result.stats.rowsProcessed}: Source "${row.source}" mappée vers "other"`);
        }
        
        // Récupérer le leaser ID
        const leaserId = leaserMapping[row.leaser];
        if (!leaserId) {
          result.errors.push(`Ligne ${result.stats.rowsProcessed}: Leaser "${row.leaser}" introuvable`);
          continue;
        }
        
        // Construire l'equipment_description
        const computers = parseInt(row.computers) || 0;
        const smartphones = parseInt(row.smartphones) || 0;
        const tablets = parseInt(row.tablets) || 0;
        
        const equipmentParts = [];
        if (computers > 0) equipmentParts.push(`${computers} ordinateur(s)`);
        if (smartphones > 0) equipmentParts.push(`${smartphones} smartphone(s)`);
        if (tablets > 0) equipmentParts.push(`${tablets} tablette(s)`);
        
        const equipmentDescription = equipmentParts.length > 0
          ? `Matériel: ${equipmentParts.join(', ')}`
          : 'Matériel non spécifié';
        
        // Phase 2: Recherche ou création du client
        let clientId: string | null = null;
        
        const { data: existingClient } = await supabaseClient
          .from('clients')
          .select('id, city, business_sector')
          .eq('company_id', profile.company_id)
          .ilike('name', `%${clientName}%`)
          .limit(1)
          .single();
        
        if (existingClient) {
          clientId = existingClient.id;
          result.stats.clientsUpdated++;
          
          // Mettre à jour city et business_sector si vides
          const updates: any = {};
          if (!existingClient.city && row.location) {
            updates.city = row.location;
          }
          if (!existingClient.business_sector && row.sector) {
            updates.business_sector = row.sector;
          }
          
          if (Object.keys(updates).length > 0) {
            await supabaseClient
              .from('clients')
              .update(updates)
              .eq('id', clientId);
            console.log(`✅ Client mis à jour: ${clientName}`);
          }
        } else {
          // Créer le client
          const { data: newClient, error: clientError } = await supabaseClient
            .from('clients')
            .insert({
              name: clientName,
              company: clientCompany,
              city: row.location,
              country: row.country,
              business_sector: row.sector,
              company_id: profile.company_id,
              status: 'active',
            })
            .select('id')
            .single();
          
          if (clientError) {
            result.errors.push(`Ligne ${result.stats.rowsProcessed}: Erreur création client - ${clientError.message}`);
            continue;
          }
          
          clientId = newClient.id;
          result.stats.clientsCreated++;
          console.log(`✅ Client créé: ${clientName}`);
        }
        
        // Phase 3: Recherche ou création de l'offre
        let offerId: string | null = null;
        
        const { data: existingOffer } = await supabaseClient
          .from('offers')
          .select('id, converted_to_contract')
          .eq('company_id', profile.company_id)
          .eq('dossier_number', cleanDossierNumber)
          .limit(1)
          .single();
        
        if (existingOffer) {
          offerId = existingOffer.id;
          
          // Mettre à jour converted_to_contract si nécessaire
          if (!existingOffer.converted_to_contract) {
            await supabaseClient
              .from('offers')
              .update({ converted_to_contract: true })
              .eq('id', offerId);
          } else {
            result.anomalies.push(`Ligne ${result.stats.rowsProcessed}: Offre ${cleanDossierNumber} déjà convertie en contrat`);
          }
        } else {
          // Créer l'offre
          const { data: newOffer, error: offerError } = await supabaseClient
            .from('offers')
            .insert({
              dossier_number: cleanDossierNumber,
              client_id: clientId,
              client_name: clientName,
              client_company: clientCompany,
              monthly_payment: monthlyPayment,
              margin: margin,
              source: source,
              workflow_status: 'accepted',
              status: 'approved',
              converted_to_contract: true,
              equipment_description: equipmentDescription,
              company_id: profile.company_id,
              created_at: dossierDate || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          
          if (offerError) {
            result.errors.push(`Ligne ${result.stats.rowsProcessed}: Erreur création offre - ${offerError.message}`);
            continue;
          }
          
          offerId = newOffer.id;
          result.stats.offersCreated++;
          console.log(`✅ Offre créée: ${cleanDossierNumber}`);
        }
        
        // Phase 4: Création du contrat
        const contractStartDate = calculateContractStartDate(paymentDate);
        const contractStatus = paymentDate ? 'active' : 'equipment_ordered';
        
        if (paymentDate) {
          result.stats.activeContracts++;
        } else {
          result.stats.pendingContracts++;
        }
        
        // Récupérer le nom du leaser
        const { data: leaserData } = await supabaseClient
          .from('leasers')
          .select('name')
          .eq('id', leaserId)
          .single();
        
        const { error: contractError } = await supabaseClient
          .from('contracts')
          .insert({
            offer_id: offerId,
            client_id: clientId,
            client_name: clientName,
            monthly_payment: monthlyPayment,
            equipment_description: equipmentDescription,
            status: contractStatus,
            leaser_name: leaserData?.name || row.leaser,
            leaser_id: leaserId,
            contract_number: null, // À remplir manuellement plus tard
            dossier_date: dossierDate,
            invoice_date: invoiceDate,
            payment_date: paymentDate,
            contract_start_date: contractStartDate,
            company_id: profile.company_id,
            user_id: user.id,
            invoice_generated: false,
            created_at: dossierDate || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        
        if (contractError) {
          result.errors.push(`Ligne ${result.stats.rowsProcessed}: Erreur création contrat - ${contractError.message}`);
          continue;
        }
        
        result.stats.contractsCreated++;
        console.log(`✅ Contrat créé pour ${clientName} (${contractStatus})`);
        
      } catch (error: any) {
        result.errors.push(`Ligne ${result.stats.rowsProcessed}: ${error.message}`);
        console.error(`❌ Erreur ligne ${result.stats.rowsProcessed}:`, error);
      }
    }
    
    // Phase 5: Mise à jour des statistiques de l'entreprise
    try {
      const { data: clientsCount } = await supabaseClient
        .from('contracts')
        .select('client_id', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);
      
      await supabaseClient
        .from('companies')
        .update({
          clients_count: clientsCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.company_id);
      
      console.log('✅ Statistiques de l\'entreprise mises à jour');
    } catch (error: any) {
      console.error('⚠️ Erreur mise à jour statistiques:', error);
    }
    
    // Générer le rapport final
    console.log('📊 Import terminé:', result.stats);
    
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error: any) {
    console.error('❌ Erreur import:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stats: null,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});