import ExcelJS from 'exceljs';
import { supabase } from "@/integrations/supabase/client";
import { createOffer } from "./offers";
import { OfferData, OfferWorkflowStatus } from "./offers/types";
import { toast } from "sonner";

export interface ExcelRowData {
  'N° du dossier': string;
  'Client': string; // Sera mappé depuis une colonne client du fichier
  'Email': string;
  'Localisation': string;
  'Pays Source': string;
  'Leaser': string;
  'Date dossier': string;
  'Date contrat': string;
  'Facture leaser': string;
  'Achat de vente': string;
  'Marge en €': number; // Le montant réel
  'E confirmés': number;
  'E manquants': number;
  'Taux de marge': number; // Pourrait servir de coefficient
  'Mensualité client offres': number; // La vraie mensualité
  'Mensualité': number;
  'Statut': string;
  'Relations': string;
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

export interface ColumnMapping {
  detected: string | null;
  required: boolean;
  field: string;
  label: string;
}

export interface ColumnDetectionResult {
  mappings: Record<string, ColumnMapping>;
  detectedHeaders: string[];
  missingRequired: string[];
  isValid: boolean;
}

export interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string }>;
  duplicates: number;
}

export class ExcelImportService {
  /**
   * Parse une valeur numérique depuis Excel en gérant les formats français et anglais
   */
  static parseNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (!value || value === '') return 0;
    
    // Convertir en string et nettoyer
    const str = String(value).trim();
    if (str === '') return 0;
    
    console.log(`🔢 Parsing numeric value: "${str}"`);
    
    // Supprimer les espaces, symboles monétaires, etc.
    let cleaned = str
      .replace(/[€$£¥\s]/g, '') // Supprimer les symboles monétaires et espaces
      .replace(/\s+/g, ''); // Supprimer tous les espaces
    
    // Gérer les formats avec virgule comme séparateur décimal (format français)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.');
    }
    // Gérer les formats avec virgule pour les milliers et point pour les décimales
    else if (cleaned.includes(',') && cleaned.includes('.')) {
      // Si le dernier '.' est après la dernière ',', alors ',' = milliers et '.' = décimales
      const lastCommaIndex = cleaned.lastIndexOf(',');
      const lastDotIndex = cleaned.lastIndexOf('.');
      if (lastDotIndex > lastCommaIndex) {
        cleaned = cleaned.replace(/,/g, ''); // Supprimer les virgules (milliers)
      } else {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.'); // Point = milliers, virgule = décimales
      }
    }
    
    const result = parseFloat(cleaned) || 0;
    console.log(`🔢 Parsed "${str}" -> ${result}`);
    return result;
  }

  /**
   * Normalise un nom de colonne pour le matching flexible
   */
  static normalizeColumnName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9]/g, '') // Garder seulement lettres et chiffres
      .trim();
  }

  /**
   * Trouve la correspondance d'une colonne dans les headers Excel
   */
  static findColumnMatch(targetColumn: string, headers: string[]): string | null {
    const normalizedTarget = this.normalizeColumnName(targetColumn);
    
    // Mapping des colonnes attendues vers leurs variantes possibles
    const columnMappings: Record<string, string[]> = {
      'margeen': ['marge en €', 'marge en euros', 'marge', 'montant', 'amount'],
      'tauxdemarge': ['taux de marge', 'taux marge', 'coefficient', 'coeff', 'coef'],
      'mensualiteclientoffres': ['mensualité client offres', 'mensualite client offres', 'mensualité offres', 'mensualité', 'monthly'],
      'mensualite': ['mensualité', 'mensualite', 'monthly payment'],
      'client': ['client', 'nom client', 'name', 'customer'],  
      'leaser': ['leaser', 'nom leaser', 'fournisseur'],
      'email': ['email', 'mail'],
      'localisation': ['localisation', 'location', 'lieu'],
      'statut': ['statut', 'status', 'etat', 'state'],
      'nodossier': ['n° du dossier', 'numero dossier', 'dossier', 'file number', 'n du dossier'],
      'payssource': ['pays source', 'source', 'pays', 'country'],
      'datedossier': ['date dossier', 'date creation', 'creation date'],
      'datecontrat': ['date contrat', 'contract date'],
      'relations': ['relations', 'relation', 'type relation'],
      'econfirmes': ['e confirmés', 'e confirmes', 'confirmes'],
      'emanquants': ['e manquants', 'e manquant', 'manquants']
    };

    // Chercher d'abord une correspondance exacte
    for (const header of headers) {
      if (this.normalizeColumnName(header) === normalizedTarget) {
        return header;
      }
    }

    // Chercher dans les mappings
    const possibleNames = columnMappings[normalizedTarget] || [];
    for (const possibleName of possibleNames) {
      for (const header of headers) {
        if (this.normalizeColumnName(header) === this.normalizeColumnName(possibleName)) {
          return header;
        }
      }
    }

    return null;
  }

  /**
   * Détecte et mappe les colonnes du fichier Excel
   */
  static detectColumns(headers: string[]): ColumnDetectionResult {
    console.log(`🔍 Détection des colonnes pour: ${headers.join(', ')}`);
    
    const requiredFields = {
      'client': { label: 'Client', required: true },
      'amount': { label: 'Montant/Marge', required: true },
      'monthly_payment': { label: 'Mensualité', required: false },
      'coefficient': { label: 'Coefficient/Taux', required: false },
      'email': { label: 'Email', required: false },
      'dossier_number': { label: 'N° Dossier', required: false },
      'status': { label: 'Statut', required: false }
    };

    const mappings: Record<string, ColumnMapping> = {};
    
    // Map each required field
    for (const [field, config] of Object.entries(requiredFields)) {
      let detected: string | null = null;
      
      if (field === 'client') {
        detected = this.findColumnMatch('client', headers) || this.findColumnMatch('leaser', headers);
      } else if (field === 'amount') {
        detected = this.findColumnMatch('margeen', headers) || this.findColumnMatch('montant', headers);
      } else if (field === 'monthly_payment') {
        detected = this.findColumnMatch('mensualiteclientoffres', headers) || this.findColumnMatch('mensualite', headers);
      } else if (field === 'coefficient') {
        detected = this.findColumnMatch('tauxdemarge', headers) || this.findColumnMatch('coefficient', headers);
      } else if (field === 'email') {
        detected = this.findColumnMatch('email', headers);
      } else if (field === 'dossier_number') {
        detected = this.findColumnMatch('nodossier', headers);
      } else if (field === 'status') {
        detected = this.findColumnMatch('statut', headers);
      }
      
      mappings[field] = {
        detected,
        required: config.required,
        field,
        label: config.label
      };
    }

    const missingRequired = Object.entries(mappings)
      .filter(([_, mapping]) => mapping.required && !mapping.detected)
      .map(([_, mapping]) => mapping.label);

    console.log('🗺️ Mapping détecté:', mappings);
    console.log('❌ Champs requis manquants:', missingRequired);

    return {
      mappings,
      detectedHeaders: headers,
      missingRequired,
      isValid: missingRequired.length === 0
    };
  }

  /**
   * Parse le fichier Excel et retourne les données avec détection des colonnes
   */
  static async parseExcelFile(file: File): Promise<{ data: ExcelRowData[], columnDetection: ColumnDetectionResult }> {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    
    if (!worksheet || worksheet.rowCount < 2) {
      throw new Error("Le fichier Excel doit contenir au moins une ligne d'en-tête et une ligne de données");
    }

    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || '').trim();
    });
    
    console.log(`📋 Headers détectés: ${headers.join(', ')}`);
    
    // Detect column mappings
    const columnDetection = this.detectColumns(headers);
    
    if (!columnDetection.isValid) {
      return {
        data: [],
        columnDetection
      };
    }

    // Map data using detected columns
    const mappedData: ExcelRowData[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      
      const rowValues: any[] = [];
      row.eachCell((cell, colNumber) => {
        rowValues[colNumber - 1] = cell.value;
      });

      const getValue = (field: string): any => {
        const mapping = columnDetection.mappings[field];
        if (!mapping || !mapping.detected) return '';
        const colIndex = headers.indexOf(mapping.detected);
        return colIndex >= 0 ? (rowValues[colIndex] || '') : '';
      };

      const clientValue = getValue('client');
      const amountValue = getValue('amount');
      const monthlyValue = getValue('monthly_payment');
      const coeffValue = getValue('coefficient');
      
      console.log(`📝 Ligne ${rowNumber} - Valeurs brutes:`, { clientValue, amountValue, monthlyValue, coeffValue });
      
      const parsedData: ExcelRowData = {
        'N° du dossier': String(getValue('dossier_number')).trim() || '',
        'Client': String(clientValue).trim() || '',
        'Email': String(getValue('email')).trim() || '',
        'Localisation': '',
        'Pays Source': '',
        'Leaser': String(clientValue).trim() || '',
        'Date dossier': '',
        'Date contrat': '',
        'Facture leaser': '',
        'Achat de vente': '',
        'Marge en €': this.parseNumericValue(amountValue),
        'E confirmés': 0,
        'E manquants': 0,
        'Taux de marge': this.parseNumericValue(coeffValue) || 1,
        'Mensualité client offres': this.parseNumericValue(monthlyValue),
        'Mensualité': this.parseNumericValue(monthlyValue),
        'Statut': String(getValue('status')).trim() || 'Brouillon',
        'Relations': ''
      };

      console.log(`✅ Ligne ${rowNumber} - Données parsées:`, parsedData);
      mappedData.push(parsedData);
    });
    
    console.log(`📊 ${mappedData.length} lignes de données détectées`);

    return {
      data: mappedData,
      columnDetection
    };
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
      // Générer directement un ID sans appel RPC
      const year = new Date().getFullYear();
      const randomNumber = Math.floor(Math.random() * 9000) + 1000; // Entre 1000 et 9999
      return `ITC-${year}-OFF-${randomNumber}`;
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
        // Validation et nettoyage des données obligatoires avec les nouvelles colonnes
        const clientName = String(row['Client'] || row['Leaser'] || '').trim();
        const montantHT = row['Marge en €']; // Utiliser "Marge en €" comme montant
        let coefficient = row['Taux de marge'] || 1; // Utiliser "Taux de marge" comme coefficient
        let monthlyPayment = row['Mensualité client offres'] || row['Mensualité']; // Priorité à "Mensualité client offres"
        
        console.log(`🔍 Validation ligne ${rowNumber}: Client="${clientName}", Marge=${montantHT}, Taux de marge=${coefficient}, Mensualité=${monthlyPayment}`);
        
        // Validation du nom client (obligatoire)
        if (!clientName) {
          result.errors.push({
            row: rowNumber,
            error: "Le nom du client (Client ou Leaser) est obligatoire"
          });
          continue;
        }

        // Validation du montant HT (obligatoire) - utiliser "Marge en €"
        if (montantHT === undefined || montantHT === null || isNaN(Number(montantHT))) {
          result.errors.push({
            row: rowNumber,
            error: `Marge en € obligatoire et doit être un nombre valide. Valeur reçue: "${montantHT}"`
          });
          continue;
        }

        // Validation et valeur par défaut pour le coefficient (obligatoire)
        if (coefficient === undefined || coefficient === null || isNaN(Number(coefficient)) || coefficient === 0) {
          console.log(`⚠️ Taux de marge manquant ou invalide pour la ligne ${rowNumber}, utilisation de la valeur par défaut 1`);
          coefficient = 1; // Valeur par défaut
        }

        // Validation et calcul automatique pour la mensualité (obligatoire)
        if (monthlyPayment === undefined || monthlyPayment === null || isNaN(Number(monthlyPayment))) {
          console.log(`⚠️ Mensualité manquante pour la ligne ${rowNumber}, calcul automatique`);
          // Si le montant est 0, accepter une mensualité à 0
          if (Number(montantHT) === 0) {
            monthlyPayment = 0;
          } else {
            // Calcul simple: montant / coefficient / 12 (exemple de calcul basique)
            monthlyPayment = Math.round((Number(montantHT) / Number(coefficient) / 12) * 100) / 100;
          }
        }
        
        // Pour les cas où monthlyPayment était 0 dans l'Excel mais le montant n'est pas 0
        if (Number(monthlyPayment) === 0 && Number(montantHT) > 0) {
          console.log(`⚠️ Mensualité à 0 mais montant > 0 pour la ligne ${rowNumber}, calcul automatique`);
          monthlyPayment = Math.round((Number(montantHT) / Number(coefficient) / 12) * 100) / 100;
        }

        // Recherche ou création du client
        let clientId = await this.findClientByName(clientName, companyId);
        
        if (!clientId) {
          clientId = await this.createClient(clientName, row['Email'], companyId);
          if (!clientId) {
            result.errors.push({
              row: rowNumber,
              error: "Impossible de créer le client"
            });
            continue;
          }
        }

        // Générer l'ID d'offre
        const offerId = await this.generateOfferId();
        
        // Déterminer le statut
        const status = this.mapStatus(row['Statut']);

        // Créer l'offre
        const offerData: Partial<OfferData> = {
          client_id: clientId,
          amount: Number(montantHT),
          coefficient: Number(coefficient),
          monthly_payment: Number(monthlyPayment),
          workflow_status: status,
          type: 'admin_offer',
          user_id: userId
        };

        const createdOffer = await createOffer(offerData as any);
        
        if (createdOffer) {
          result.success++;
          console.log(`✅ Offre créée avec succès pour la ligne ${rowNumber}`);
        } else {
          result.errors.push({
            row: rowNumber,
            error: "Échec de la création de l'offre"
          });
        }

      } catch (error: any) {
        console.error(`❌ Erreur ligne ${rowNumber}:`, error);
        result.errors.push({
          row: rowNumber,
          error: error.message || "Erreur inconnue"
        });
      }
    }

    console.log(`📊 Import terminé: ${result.success} succès, ${result.errors.length} erreurs, ${result.duplicates} doublons`);
    return result;
  }

  /**
   * Map le statut Excel vers le statut workflow
   */
  static mapStatus(excelStatus: string): OfferWorkflowStatus {
    const normalized = (excelStatus || '').trim();
    return STATUS_MAPPING[normalized] || OfferWorkflowStatus.DRAFT;
  }
}

// Export pour compatibilité
export const parseExcelFile = ExcelImportService.parseExcelFile.bind(ExcelImportService);
export const importOffers = ExcelImportService.importOffers.bind(ExcelImportService);
