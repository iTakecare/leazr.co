import * as XLSX from 'xlsx';
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
          
          // Créer un mapping des colonnes flexibles basé sur le vrai fichier Excel
          const columnMapping: Record<string, string | null> = {
            'N° du dossier': this.findColumnMatch('nodossier', headers),
            'Client': this.findColumnMatch('client', headers) || this.findColumnMatch('leaser', headers),
            'Email': this.findColumnMatch('email', headers),
            'Localisation': this.findColumnMatch('localisation', headers),
            'Pays Source': this.findColumnMatch('pays', headers) || this.findColumnMatch('source', headers),
            'Leaser': this.findColumnMatch('leaser', headers),
            'Date dossier': this.findColumnMatch('datedossier', headers),
            'Date contrat': this.findColumnMatch('datecontrat', headers),
            'Facture leaser': this.findColumnMatch('factureleaser', headers),
            'Achat de vente': this.findColumnMatch('achatdevente', headers),
            'Marge en €': this.findColumnMatch('marge', headers) || this.findColumnMatch('montant', headers),
            'E confirmés': this.findColumnMatch('econfirmes', headers),
            'E manquants': this.findColumnMatch('emanquants', headers),
            'Taux de marge': this.findColumnMatch('tauxdemarge', headers) || this.findColumnMatch('coefficient', headers),
            'Mensualité client offres': this.findColumnMatch('mensualiteclientoffres', headers) || this.findColumnMatch('mensualite', headers),
            'Mensualité': this.findColumnMatch('mensualite', headers),
            'Statut': this.findColumnMatch('statut', headers),
            'Relations': this.findColumnMatch('relations', headers)
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
              'N° du dossier': getValue(columnMapping['N° du dossier']),
              'Client': getValue(columnMapping['Client']) || getValue(columnMapping['Leaser']), // Fallback sur Leaser
              'Email': getValue(columnMapping['Email']),
              'Localisation': getValue(columnMapping['Localisation']),
              'Pays Source': getValue(columnMapping['Pays Source']),
              'Leaser': getValue(columnMapping['Leaser']),
              'Date dossier': getValue(columnMapping['Date dossier']),
              'Date contrat': getValue(columnMapping['Date contrat']),
              'Facture leaser': getValue(columnMapping['Facture leaser']),
              'Achat de vente': getValue(columnMapping['Achat de vente']),
              'Marge en €': getValue(columnMapping['Marge en €']),
              'E confirmés': getValue(columnMapping['E confirmés']),
              'E manquants': getValue(columnMapping['E manquants']),
              'Taux de marge': getValue(columnMapping['Taux de marge']),
              'Mensualité client offres': getValue(columnMapping['Mensualité client offres']),
              'Mensualité': getValue(columnMapping['Mensualité']),
              'Statut': getValue(columnMapping['Statut']),
              'Relations': getValue(columnMapping['Relations'])
            };

            console.log(`📝 Ligne ${index + 1} - Données brutes:`, rawData);
            
            // Parser les valeurs numériques avec la nouvelle fonction
            const parsedData: ExcelRowData = {
              'N° du dossier': String(rawData['N° du dossier']).trim() || '',
              'Client': String(rawData['Client']).trim() || '',
              'Email': String(rawData['Email']).trim() || '',
              'Localisation': String(rawData['Localisation']).trim() || '',
              'Pays Source': String(rawData['Pays Source']).trim() || '',
              'Leaser': String(rawData['Leaser']).trim() || '',
              'Date dossier': String(rawData['Date dossier']).trim() || '',
              'Date contrat': String(rawData['Date contrat']).trim() || '',
              'Facture leaser': String(rawData['Facture leaser']).trim() || '',
              'Achat de vente': String(rawData['Achat de vente']).trim() || '',
              'Marge en €': this.parseNumericValue(rawData['Marge en €']),
              'E confirmés': this.parseNumericValue(rawData['E confirmés']),
              'E manquants': this.parseNumericValue(rawData['E manquants']),
              'Taux de marge': this.parseNumericValue(rawData['Taux de marge']),
              'Mensualité client offres': this.parseNumericValue(rawData['Mensualité client offres']),
              'Mensualité': this.parseNumericValue(rawData['Mensualité']),
              'Statut': String(rawData['Statut']).trim() || 'Brouillon',
              'Relations': String(rawData['Relations']).trim() || ''
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

        // Génération de l'ID d'offre - utiliser le N° du dossier s'il existe
        const offerId = row['N° du dossier'] || await this.generateOfferId();

        // Mapping du statut
        const workflowStatus = STATUS_MAPPING[row['Statut']] || OfferWorkflowStatus.DRAFT;

        // Création de l'offre avec les valeurs validées et nettoyées
        const offerData: OfferData = {
          client_id: clientId,
          client_name: clientName, // Utiliser la valeur nettoyée
          client_email: row['Email'] || undefined,
          equipment_description: `${row['Localisation']} - ${row['Relations']}` || undefined,
          amount: Number(montantHT), // S'assurer que c'est un nombre (Marge en €)
          coefficient: Number(coefficient), // Utiliser la valeur validée (Taux de marge)
          monthly_payment: Number(monthlyPayment), // Utiliser la valeur validée/calculée
          commission: 0, // Pas de commission dans ce fichier
          workflow_status: workflowStatus,
          status: workflowStatus === OfferWorkflowStatus.SIGNED ? 'accepted' : 'pending',
          dossier_number: offerId, // Utilisation de l'ID généré ou existant comme numéro de dossier
          source: row['Pays Source'] || undefined,
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
    const requiredColumns = ['margeen', 'client']; // Colonnes obligatoires: Marge en € et Client (ou Leaser)
    const missingHeaders: string[] = [];
    
    console.log(`🔍 Validation des headers: ${headers.join(', ')}`);
    
    for (const requiredCol of requiredColumns) {
      let found = this.findColumnMatch(requiredCol, headers);
      
      // Pour le client, essayer aussi leaser comme alternative
      if (!found && requiredCol === 'client') {
        found = this.findColumnMatch('leaser', headers);
      }
      
      if (!found) {
        // Retourner le nom lisible pour l'utilisateur
        const readableName = requiredCol === 'margeen' ? 'Marge en €' : 'Client (ou Leaser)';
        missingHeaders.push(readableName);
      }
    }
    
    console.log(`❌ Headers manquants: ${missingHeaders.join(', ')}`);
    return missingHeaders;
  }
}