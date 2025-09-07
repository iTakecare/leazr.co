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
      'montantht': ['montant ht', 'montantht', 'montant', 'amount', 'prix', 'price'],
      'coefficient': ['coefficient', 'coeff', 'coef'],
      'mensualiteht': ['mensualite ht', 'mensualiteht', 'mensualite', 'monthly'],
      'commission': ['commission', 'comm'],
      'client': ['client', 'nom', 'name', 'customer'],
      'email': ['email', 'mail'],
      'demandeur': ['demandeur', 'requester'],
      'equipement': ['equipement', 'equipment', 'produit', 'product'],
      'statut': ['statut', 'status', 'etat', 'state'],
      'nodossier': ['n dossier', 'numero dossier', 'dossier', 'file number'],
      'source': ['source', 'origine', 'origin'],
      'datedossier': ['date dossier', 'date creation', 'creation date'],
      'datefacture': ['date facture', 'facture date', 'invoice date'],
      'datepaiement': ['date paiement', 'payment date', 'paiement']
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
          
          console.log(`📋 Headers détectés: ${headers.join(', ')}`);
          console.log(`📊 ${rows.length} lignes de données détectées`);
          
          // Créer un mapping des colonnes flexibles
          const columnMapping: Record<string, string | null> = {
            'Client': this.findColumnMatch('client', headers),
            'Email': this.findColumnMatch('email', headers),
            'Demandeur': this.findColumnMatch('demandeur', headers),
            'Equipement': this.findColumnMatch('equipement', headers),
            'Montant HT': this.findColumnMatch('montantht', headers),
            'Coefficient': this.findColumnMatch('coefficient', headers),
            'Mensualité HT': this.findColumnMatch('mensualiteht', headers),
            'Commission': this.findColumnMatch('commission', headers),
            'Statut': this.findColumnMatch('statut', headers),
            'N° dossier': this.findColumnMatch('nodossier', headers),
            'Date dossier': this.findColumnMatch('datedossier', headers),
            'Date facture': this.findColumnMatch('datefacture', headers),
            'Date paiement': this.findColumnMatch('datepaiement', headers),
            'Source': this.findColumnMatch('source', headers)
          };

          console.log('🔗 Mapping des colonnes:', columnMapping);
          
          // Mapper les données avec le nouveau système flexible
          const mappedData: ExcelRowData[] = rows.map((row, index) => {
            // Créer un objet avec les valeurs mappées
            const getValue = (mappedColumn: string | null): any => {
              if (!mappedColumn) return '';
              const colIndex = headers.indexOf(mappedColumn);
              return colIndex >= 0 ? (row[colIndex] || '') : '';
            };

            const rawData = {
              'Client': getValue(columnMapping['Client']),
              'Email': getValue(columnMapping['Email']),
              'Demandeur': getValue(columnMapping['Demandeur']),
              'Equipement': getValue(columnMapping['Equipement']),
              'Montant HT': getValue(columnMapping['Montant HT']),
              'Coefficient': getValue(columnMapping['Coefficient']),
              'Mensualité HT': getValue(columnMapping['Mensualité HT']),
              'Commission': getValue(columnMapping['Commission']),
              'Statut': getValue(columnMapping['Statut']),
              'N° dossier': getValue(columnMapping['N° dossier']),
              'Date dossier': getValue(columnMapping['Date dossier']),
              'Date facture': getValue(columnMapping['Date facture']),
              'Date paiement': getValue(columnMapping['Date paiement']),
              'Source': getValue(columnMapping['Source'])
            };

            console.log(`📝 Ligne ${index + 1} - Données brutes:`, rawData);
            
            // Parser les valeurs numériques avec la nouvelle fonction
            const parsedData: ExcelRowData = {
              'Client': String(rawData['Client']).trim() || '',
              'Email': String(rawData['Email']).trim() || '',
              'Demandeur': String(rawData['Demandeur']).trim() || '',
              'Equipement': String(rawData['Equipement']).trim() || '',
              'Montant HT': this.parseNumericValue(rawData['Montant HT']),
              'Coefficient': this.parseNumericValue(rawData['Coefficient']),
              'Mensualité HT': this.parseNumericValue(rawData['Mensualité HT']),
              'Commission': this.parseNumericValue(rawData['Commission']),
              'Statut': String(rawData['Statut']).trim() || 'Brouillon',
              'N° dossier': String(rawData['N° dossier']).trim() || '',
              'Date dossier': String(rawData['Date dossier']).trim() || '',
              'Date facture': String(rawData['Date facture']).trim() || '',
              'Date paiement': String(rawData['Date paiement']).trim() || '',
              'Source': String(rawData['Source']).trim() || ''
            };

            console.log(`✅ Ligne ${index + 1} - Données parsées:`, parsedData);
            return parsedData;
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
      // Générer directement un ID sans appel RPC
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
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
        // Validation et nettoyage des données obligatoires
        const clientName = String(row['Client'] || '').trim();
        const montantHT = row['Montant HT'];
        let coefficient = row['Coefficient'];
        let monthlyPayment = row['Mensualité HT'];
        
        console.log(`🔍 Validation ligne ${rowNumber}: Client="${clientName}", Montant HT=${montantHT}, Coefficient=${coefficient}, Mensualité=${monthlyPayment}`);
        
        // Validation du nom client (obligatoire)
        if (!clientName) {
          result.errors.push({
            row: rowNumber,
            error: "Le nom du client est obligatoire"
          });
          continue;
        }

        // Validation du montant HT (obligatoire)
        if (montantHT === undefined || montantHT === null || isNaN(Number(montantHT))) {
          result.errors.push({
            row: rowNumber,
            error: `Montant HT obligatoire et doit être un nombre valide. Valeur reçue: "${montantHT}"`
          });
          continue;
        }

        // Validation et valeur par défaut pour le coefficient (obligatoire)
        if (coefficient === undefined || coefficient === null || isNaN(Number(coefficient)) || coefficient === 0) {
          console.log(`⚠️ Coefficient manquant ou invalide pour la ligne ${rowNumber}, utilisation de la valeur par défaut 1`);
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

        // Création de l'offre avec les valeurs validées et nettoyées
        const offerData: OfferData = {
          client_id: clientId,
          client_name: clientName, // Utiliser la valeur nettoyée
          client_email: row['Email'] || undefined,
          equipment_description: row['Equipement'] || undefined,
          amount: Number(montantHT), // S'assurer que c'est un nombre
          coefficient: Number(coefficient), // Utiliser la valeur validée
          monthly_payment: Number(monthlyPayment), // Utiliser la valeur validée/calculée
          commission: row['Commission'] || 0,
          workflow_status: workflowStatus,
          status: workflowStatus === OfferWorkflowStatus.SIGNED ? 'accepted' : 'pending',
          dossier_number: offerId, // Utilisation de l'ID généré comme numéro de dossier
          source: row['Source'] || undefined,
          company_id: companyId,
          user_id: userId,
          type: 'admin_offer'
        };

        console.log(`📝 Création de l'offre pour ${clientName} (ligne ${rowNumber}):`, {
          dossier_number: offerId, // L'ID personnalisé va dans dossier_number, PAS dans id
          clientName: clientName,
          amount: Number(montantHT),
          coefficient: Number(coefficient),
          monthlyPayment: Number(monthlyPayment),
          workflowStatus
        });

        console.log("🚨 DEBUG: offerData envoyé à createOffer:", JSON.stringify(offerData, null, 2));
        
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
   * Valide le format du fichier Excel avec matching flexible
   */
  static validateExcelFormat(headers: string[]): string[] {
    const requiredColumns = ['client', 'montantht']; // Version normalisée
    const missingHeaders: string[] = [];
    
    console.log(`🔍 Validation des headers: ${headers.join(', ')}`);
    
    for (const requiredCol of requiredColumns) {
      const found = this.findColumnMatch(requiredCol, headers);
      if (!found) {
        // Retourner le nom lisible pour l'utilisateur
        const readableName = requiredCol === 'client' ? 'Client' : 'Montant HT';
        missingHeaders.push(readableName);
      }
    }
    
    console.log(`❌ Headers manquants: ${missingHeaders.join(', ')}`);
    return missingHeaders;
  }
}