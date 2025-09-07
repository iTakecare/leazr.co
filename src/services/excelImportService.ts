import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { createOffer } from "./offers";
import { OfferData, OfferWorkflowStatus } from "./offers/types";
import { toast } from "sonner";

export interface ExcelRowData {
  'Client': string;
  'Email': string;
  'Demandeur': string;
  'Equipement': string;
  'Montant HT': number;
  'Coefficient': number;
  'Mensualité HT': number;
  'Commission': number;
  'Statut': string;
  'N° dossier': string;
  'Date dossier': string;
  'Date facture': string;
  'Date paiement': string;
  'Source': string;
}

// Mapping des statuts Excel vers les statuts de workflow
const STATUS_MAPPING: Record<string, OfferWorkflowStatus> = {
  'Brouillon': OfferWorkflowStatus.DRAFT,
  'Envoyé': OfferWorkflowStatus.SENT,
  'Info demandée': OfferWorkflowStatus.REQUESTED_INFO,
  'Client en attente': OfferWorkflowStatus.CLIENT_WAITING,
  'Signé': OfferWorkflowStatus.SIGNED,
  'Archivé': OfferWorkflowStatus.ARCHIVED,
  'Rejeté': OfferWorkflowStatus.REJECTED
};

export interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string }>;
  duplicates: number;
}

export class ExcelImportService {
  /**
   * Parse le fichier Excel et retourne les données
   */
  static parseExcelFile(file: File): Promise<ExcelRowData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir en JSON avec headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: ''
          }) as any[];
          
          if (jsonData.length < 2) {
            throw new Error("Le fichier Excel doit contenir au moins une ligne d'en-tête et une ligne de données");
          }
          
          // Première ligne = headers
          const headers = jsonData[0];
          const rows = jsonData.slice(1);
          
          // Mapper les données
          const mappedData: ExcelRowData[] = rows.map((row, index) => {
            const rowData: any = {};
            headers.forEach((header: string, colIndex: number) => {
              rowData[header] = row[colIndex] || '';
            });
            
            // Validation des types numériques
            return {
              'Client': rowData['Client'] || '',
              'Email': rowData['Email'] || '',
              'Demandeur': rowData['Demandeur'] || '',
              'Equipement': rowData['Equipement'] || '',
              'Montant HT': parseFloat(rowData['Montant HT']) || 0,
              'Coefficient': parseFloat(rowData['Coefficient']) || 0,
              'Mensualité HT': parseFloat(rowData['Mensualité HT']) || 0,
              'Commission': parseFloat(rowData['Commission']) || 0,
              'Statut': rowData['Statut'] || 'Brouillon',
              'N° dossier': rowData['N° dossier'] || '',
              'Date dossier': rowData['Date dossier'] || '',
              'Date facture': rowData['Date facture'] || '',
              'Date paiement': rowData['Date paiement'] || '',
              'Source': rowData['Source'] || ''
            };
          });
          
          resolve(mappedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Trouve un client existant par nom exact
   */
  static async findClientByName(clientName: string, companyId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('name', clientName.trim())
        .eq('company_id', companyId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data.id;
    } catch (error) {
      console.error("Erreur lors de la recherche du client:", error);
      return null;
    }
  }

  /**
   * Crée un nouveau client
   */
  static async createClient(clientName: string, email: string, companyId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: clientName.trim(),
          email: email.trim() || null,
          company_id: companyId,
          status: 'active'
        })
        .select('id')
        .single();
      
      if (error || !data) {
        console.error("Erreur lors de la création du client:", error);
        return null;
      }
      
      return data.id;
    } catch (error) {
      console.error("Exception lors de la création du client:", error);
      return null;
    }
  }

  /**
   * Génère un nouvel ID d'offre au format ITC-YYYY-OFF-XXXX
   */
  static async generateOfferId(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('generate_offer_id');
      
      if (error || !data) {
        console.error("Erreur lors de la génération de l'ID d'offre:", error);
        // Fallback: générer un ID temporaire
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-4);
        return `ITC-${year}-OFF-${timestamp}`;
      }
      
      return data;
    } catch (error) {
      console.error("Exception lors de la génération de l'ID d'offre:", error);
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      return `ITC-${year}-OFF-${timestamp}`;
    }
  }

  /**
   * Importe les données Excel vers les offres
   */
  static async importOffers(
    excelData: ExcelRowData[], 
    companyId: string, 
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      errors: [],
      duplicates: 0
    };

    console.log(`🚀 Début de l'import de ${excelData.length} lignes`);

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const rowNumber = i + 2; // +2 car Excel commence à 1 et on skip les headers
      
      try {
        // Validation des données obligatoires
        if (!row['Client'] || !row['Montant HT']) {
          result.errors.push({
            row: rowNumber,
            error: "Nom du client et montant HT sont obligatoires"
          });
          continue;
        }

        // Recherche ou création du client
        let clientId = await this.findClientByName(row['Client'], companyId);
        
        if (!clientId) {
          clientId = await this.createClient(row['Client'], row['Email'], companyId);
          if (!clientId) {
            result.errors.push({
              row: rowNumber,
              error: "Impossible de créer le client"
            });
            continue;
          }
        }

        // Génération de l'ID d'offre
        const offerId = await this.generateOfferId();

        // Mapping du statut
        const workflowStatus = STATUS_MAPPING[row['Statut']] || OfferWorkflowStatus.DRAFT;

        // Création de l'offre
        const offerData: OfferData = {
          id: offerId,
          client_id: clientId,
          client_name: row['Client'],
          client_email: row['Email'] || undefined,
          equipment_description: row['Equipement'] || undefined,
          amount: row['Montant HT'],
          coefficient: row['Coefficient'],
          monthly_payment: row['Mensualité HT'],
          commission: row['Commission'] || 0,
          workflow_status: workflowStatus,
          status: workflowStatus === OfferWorkflowStatus.SIGNED ? 'accepted' : 'pending',
          dossier_number: row['N° dossier'] || undefined,
          source: row['Source'] || undefined,
          company_id: companyId,
          user_id: userId,
          type: 'admin_offer'
        };

        console.log(`📝 Création de l'offre pour ${row['Client']} (ligne ${rowNumber})`);
        
        const { data, error } = await createOffer(offerData);
        
        if (error) {
          result.errors.push({
            row: rowNumber,
            error: `Erreur lors de la création de l'offre: ${error.message || 'Erreur inconnue'}`
          });
          continue;
        }

        result.success++;
        console.log(`✅ Offre créée avec succès: ${offerId}`);
        
      } catch (error: any) {
        console.error(`❌ Erreur ligne ${rowNumber}:`, error);
        result.errors.push({
          row: rowNumber,
          error: error.message || 'Erreur inconnue'
        });
      }
    }

    console.log(`📊 Import terminé: ${result.success} succès, ${result.errors.length} erreurs`);
    return result;
  }

  /**
   * Valide le format du fichier Excel
   */
  static validateExcelFormat(headers: string[]): string[] {
    const requiredHeaders = ['Client', 'Montant HT'];
    const optionalHeaders = [
      'Email', 'Demandeur', 'Equipement', 'Coefficient', 
      'Mensualité HT', 'Commission', 'Statut', 'N° dossier', 
      'Date dossier', 'Date facture', 'Date paiement', 'Source'
    ];
    
    const allExpectedHeaders = [...requiredHeaders, ...optionalHeaders];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    return missingHeaders;
  }
}