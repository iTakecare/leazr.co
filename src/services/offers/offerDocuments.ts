
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export interface OfferDocument {
  id: string;
  offer_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OfferUploadLink {
  id: string;
  offer_id: string;
  token: string;
  requested_documents: string[];
  custom_message?: string;
  expires_at: string;
  used_at?: string;
  created_by?: string;
  created_at: string;
}

export const DOCUMENT_TYPES = {
  balance_sheet: "Bilan financier",
  tax_notice: "Avertissement extrait de rôle",
  id_card: "Carte d'identité",
  company_register: "Extrait de registre d'entreprise",
  vat_certificate: "Attestation TVA",
  bank_statement: "Relevé bancaire",
  provisional_balance: "Bilan financier provisoire",
  tax_return: "Liasse fiscale",
  custom: "Autre document"
};

// Fonction pour détecter le type MIME correct avec plus de précision
const detectMimeType = (file: File): string => {
  console.log('=== DÉTECTION TYPE MIME ===');
  console.log('File.type original:', file.type);
  console.log('File.name:', file.name);
  
  // Détecter d'abord basé sur l'extension du fichier (plus fiable)
  const fileName = file.name.toLowerCase();
  let detectedType = '';
  
  if (fileName.endsWith('.pdf')) {
    detectedType = 'application/pdf';
  } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
    detectedType = 'image/jpeg';
  } else if (fileName.endsWith('.png')) {
    detectedType = 'image/png';
  } else if (fileName.endsWith('.gif')) {
    detectedType = 'image/gif';
  } else if (fileName.endsWith('.webp')) {
    detectedType = 'image/webp';
  } else if (fileName.endsWith('.doc')) {
    detectedType = 'application/msword';
  } else if (fileName.endsWith('.docx')) {
    detectedType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else if (fileName.endsWith('.xls')) {
    detectedType = 'application/vnd.ms-excel';
  } else if (fileName.endsWith('.xlsx')) {
    detectedType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else {
    // Si pas d'extension reconnue, utiliser le type du fichier s'il semble valide
    if (file.type && file.type !== 'application/octet-stream' && !file.type.includes('json')) {
      detectedType = file.type;
    } else {
      detectedType = 'application/octet-stream';
    }
  }
  
  console.log('Type MIME détecté final:', detectedType);
  return detectedType;
};

// Fonction pour créer un blob avec le bon type MIME et forcer l'en-tête
const createCorrectBlob = (file: File, mimeType: string): Blob => {
  console.log('=== CRÉATION BLOB ===');
  console.log('Type MIME à appliquer:', mimeType);
  
  // Créer un nouveau blob avec le type MIME correct
  const blob = new Blob([file], { type: mimeType });
  console.log('Blob créé - Type:', blob.type, 'Taille:', blob.size);
  
  return blob;
};

// Fonction pour tester le téléchargement et vérifier les headers HTTP réels
export const testDocumentDownload = async (filePath: string): Promise<{
  success: boolean;
  actualContentType: string | null;
  error?: string;
}> => {
  try {
    console.log('=== TEST TÉLÉCHARGEMENT DOCUMENT ===');
    console.log('Chemin fichier:', filePath);
    
    // Créer une URL signée
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('offer-documents')
      .createSignedUrl(filePath, 60);
    
    if (urlError || !signedUrlData?.signedUrl) {
      console.error('Erreur création URL signée:', urlError);
      return { success: false, actualContentType: null, error: 'Impossible de créer URL signée' };
    }
    
    console.log('URL signée créée:', signedUrlData.signedUrl);
    
    // Faire une requête HEAD pour vérifier les headers sans télécharger le contenu
    const response = await fetch(signedUrlData.signedUrl, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    
    console.log('=== HEADERS HTTP REÇUS ===');
    console.log('Content-Type:', contentType);
    console.log('Content-Length:', response.headers.get('content-length'));
    console.log('Cache-Control:', response.headers.get('cache-control'));
    console.log('Status:', response.status);
    console.log('Toutes les headers:', Object.fromEntries(response.headers.entries()));
    
    return {
      success: true,
      actualContentType: contentType
    };
  } catch (error: any) {
    console.error('Erreur lors du test de téléchargement:', error);
    return { 
      success: false, 
      actualContentType: null, 
      error: error.message 
    };
  }
};

// Fonction pour corriger les métadonnées d'un fichier dans Storage
export const correctFileMetadata = async (filePath: string, correctMimeType: string): Promise<boolean> => {
  try {
    console.log('=== CORRECTION MÉTADONNÉES ===');
    console.log('Fichier:', filePath);
    console.log('MIME type correct:', correctMimeType);
    
    // D'abord, télécharger le fichier
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('offer-documents')
      .download(filePath);
    
    if (downloadError || !downloadData) {
      console.error('Erreur téléchargement pour correction:', downloadError);
      return false;
    }
    
    console.log('Fichier téléchargé, taille:', downloadData.size);
    
    // Créer un nouveau blob avec le type MIME correct
    const correctedBlob = new Blob([downloadData], { type: correctMimeType });
    console.log('Blob corrigé créé, type:', correctedBlob.type);
    
    // Re-uploader avec le bon type MIME (en écrasant)
    const { error: uploadError } = await supabase.storage
      .from('offer-documents')
      .upload(filePath, correctedBlob, {
        cacheControl: '3600',
        upsert: true, // Écraser le fichier existant
        contentType: correctMimeType
      });
    
    if (uploadError) {
      console.error('Erreur lors de la re-upload:', uploadError);
      return false;
    }
    
    console.log('✅ Métadonnées corrigées avec succès');
    
    // Attendre un peu puis tester
    await new Promise(resolve => setTimeout(resolve, 2000));
    const testResult = await testDocumentDownload(filePath);
    console.log('Test après correction:', testResult);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la correction des métadonnées:', error);
    return false;
  }
};

// Fonction pour analyser et corriger tous les documents d'une offre
export const debugOfferDocuments = async (offerId: string): Promise<{
  totalDocuments: number;
  correctDocuments: number;
  correctedDocuments: number;
  failedCorrections: number;
  details: Array<{
    fileName: string;
    filePath: string;
    storedMimeType: string;
    actualMimeType: string | null;
    correctionNeeded: boolean;
    correctionSuccess?: boolean;
  }>;
}> => {
  try {
    console.log('=== DEBUG DOCUMENTS OFFRE ===');
    console.log('Offre ID:', offerId);
    
    // Récupérer tous les documents de l'offre
    const documents = await getOfferDocuments(offerId);
    console.log('Documents trouvés:', documents.length);
    
    const results = {
      totalDocuments: documents.length,
      correctDocuments: 0,
      correctedDocuments: 0,
      failedCorrections: 0,
      details: [] as any[]
    };
    
    for (const doc of documents) {
      console.log(`\n--- Analyse document: ${doc.file_name} ---`);
      
      // Tester le téléchargement pour voir le vrai Content-Type
      const downloadTest = await testDocumentDownload(doc.file_path);
      
      const detail = {
        fileName: doc.file_name,
        filePath: doc.file_path,
        storedMimeType: doc.mime_type,
        actualMimeType: downloadTest.actualContentType,
        correctionNeeded: false,
        correctionSuccess: undefined as boolean | undefined
      };
      
      // Vérifier si une correction est nécessaire
      if (downloadTest.actualContentType && 
          downloadTest.actualContentType.includes('json') && 
          !doc.mime_type.includes('json')) {
        detail.correctionNeeded = true;
        console.log('⚠️ Correction nécessaire pour:', doc.file_name);
        
        // Tenter la correction
        const correctionSuccess = await correctFileMetadata(doc.file_path, doc.mime_type);
        detail.correctionSuccess = correctionSuccess;
        
        if (correctionSuccess) {
          results.correctedDocuments++;
          console.log('✅ Correction réussie pour:', doc.file_name);
        } else {
          results.failedCorrections++;
          console.log('❌ Correction échouée pour:', doc.file_name);
        }
      } else {
        results.correctDocuments++;
        console.log('✅ Document correct:', doc.file_name);
      }
      
      results.details.push(detail);
    }
    
    console.log('=== RÉSUMÉ DEBUG ===');
    console.log('Total documents:', results.totalDocuments);
    console.log('Documents corrects:', results.correctDocuments);
    console.log('Documents corrigés:', results.correctedDocuments);
    console.log('Corrections échouées:', results.failedCorrections);
    
    return results;
  } catch (error) {
    console.error('Erreur lors du debug des documents:', error);
    throw error;
  }
};

// Fonction pour valider le type MIME après upload avec vérification HTTP renforcée
const validateUploadedFileMimeType = async (bucketName: string, filePath: string): Promise<void> => {
  try {
    console.log('=== VALIDATION POST-UPLOAD RENFORCÉE ===');
    console.log('Vérification pour:', filePath);
    
    // Attendre un peu pour que Supabase traite le fichier
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test de téléchargement avec notre nouvelle fonction
    const testResult = await testDocumentDownload(filePath);
    
    if (testResult.success && testResult.actualContentType) {
      if (testResult.actualContentType.includes('json')) {
        console.error('🚨 PROBLÈME CONFIRMÉ: Le fichier est servi comme JSON!');
        console.error('Content-Type reçu:', testResult.actualContentType);
        console.error('Une correction sera nécessaire.');
      } else {
        console.log('✅ Type MIME correct confirmé via HTTP:', testResult.actualContentType);
      }
    } else {
      console.warn('Impossible de valider via HTTP:', testResult.error);
    }
    
    // Vérifier aussi via l'API de listing pour comparaison
    const folderPath = filePath.split('/').slice(0, -1).join('/');
    const fileName = filePath.split('/').pop();
    
    const { data: listData, error: listError } = await supabase.storage
      .from(bucketName)
      .list(folderPath, {
        search: fileName
      });
    
    if (!listError && listData) {
      const fileInfo = listData.find(f => f.name === fileName);
      if (fileInfo) {
        console.log('=== MÉTADONNÉES SUPABASE (COMPARAISON) ===');
        console.log('Nom fichier:', fileInfo.name);
        console.log('Taille:', fileInfo.metadata?.size);
        console.log('Type MIME Supabase:', fileInfo.metadata?.mimetype);
        console.log('Dernière modification:', fileInfo.updated_at);
      }
    }
    
  } catch (error) {
    console.error('Exception lors de la validation renforcée:', error);
  }
};

// S'assurer que le bucket existe
const ensureOfferDocumentsBucket = async (): Promise<boolean> => {
  try {
    // Vérifier si le bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Erreur lors de la vérification des buckets:', listError);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'offer-documents');
    
    if (!bucketExists) {
      console.log('Création du bucket offer-documents...');
      
      // Essayer de créer le bucket via l'edge function
      try {
        const { data, error } = await supabase.functions.invoke('create-storage-bucket', {
          body: { bucket_name: 'offer-documents' }
        });
        
        if (error) {
          console.error('Erreur lors de la création du bucket via edge function:', error);
          return false;
        }
        
        if (data?.success) {
          console.log('Bucket offer-documents créé avec succès');
          return true;
        }
      } catch (functionError) {
        console.error('Erreur lors de l\'appel à l\'edge function:', functionError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur générale lors de la vérification du bucket:', error);
    return false;
  }
};

// Créer un lien d'upload sécurisé
export const createUploadLink = async (
  offerId: string,
  requestedDocuments: string[],
  customMessage?: string
): Promise<string | null> => {
  try {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('offer_upload_links')
      .insert({
        offer_id: offerId,
        token,
        requested_documents: requestedDocuments,
        custom_message: customMessage,
        expires_at: expiresAt.toISOString(),
        created_by: user?.id
      });

    if (error) {
      console.error('Erreur lors de la création du lien d\'upload:', error);
      return null;
    }

    return token;
  } catch (error) {
    console.error('Erreur lors de la création du lien d\'upload:', error);
    return null;
  }
};

// Vérifier la validité d'un token (maintenant accessible publiquement grâce à la politique RLS)
export const validateUploadToken = async (token: string): Promise<OfferUploadLink | null> => {
  try {
    console.log('Validation du token:', token);
    
    const { data, error } = await supabase
      .from('offer_upload_links')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (error) {
      console.error('Erreur lors de la validation du token:', error);
      return null;
    }

    if (!data) {
      console.error('Token non trouvé ou invalide');
      return null;
    }

    console.log('Token validé avec succès:', data);
    return data as OfferUploadLink;
  } catch (error) {
    console.error('Erreur lors de la validation du token:', error);
    return null;
  }
};

// Uploader un document avec contrôle renforcé du type MIME
export const uploadDocument = async (
  token: string,
  documentType: string,
  file: File,
  uploaderEmail?: string
): Promise<boolean> => {
  try {
    console.log('=== DÉBUT UPLOAD DOCUMENT (VERSION RENFORCÉE) ===');
    console.log('Token:', token);
    console.log('Type de document:', documentType);
    console.log('Fichier original:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    // Valider le token
    const uploadLink = await validateUploadToken(token);
    if (!uploadLink) {
      console.error('Token invalide ou expiré');
      throw new Error('Token invalide ou expiré');
    }

    console.log('Token validé, offer_id:', uploadLink.offer_id);

    // S'assurer que le bucket existe
    const bucketReady = await ensureOfferDocumentsBucket();
    if (!bucketReady) {
      console.error('Impossible de préparer le stockage des documents');
      throw new Error('Impossible de préparer le stockage des documents');
    }

    // Détecter le type MIME correct avec logging renforcé
    const correctMimeType = detectMimeType(file);
    console.log('=== TYPE MIME FINAL ===');
    console.log('Type MIME choisi:', correctMimeType);

    // Créer le chemin du fichier avec le token pour la sécurité
    const fileExtension = file.name.split('.').pop();
    const fileName = `${token}/${documentType}_${Date.now()}.${fileExtension}`;

    console.log('=== PARAMÈTRES UPLOAD ===');
    console.log('Chemin de destination:', fileName);
    console.log('Bucket:', 'offer-documents');

    // Créer un blob avec le type MIME correct et logging détaillé
    const correctBlob = createCorrectBlob(file, correctMimeType);
    console.log('Blob créé:', {
      size: correctBlob.size,
      type: correctBlob.type
    });

    // Uploader le fichier vers Supabase Storage avec options renforcées
    console.log('=== TENTATIVE UPLOAD VERS SUPABASE STORAGE ===');
    const uploadOptions = {
      cacheControl: '3600',
      upsert: false,
      contentType: correctMimeType
    };
    
    console.log('Options d\'upload:', uploadOptions);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('offer-documents')
      .upload(fileName, correctBlob, uploadOptions);

    if (uploadError) {
      console.error('=== ERREUR UPLOAD STORAGE ===');
      console.error('Erreur:', uploadError);
      throw new Error(`Erreur upload storage: ${uploadError.message}`);
    }

    console.log('=== UPLOAD RÉUSSI ===');
    console.log('Données retournées par l\'upload:', uploadData);

    // Attendre un peu pour que Storage soit à jour puis faire la validation renforcée
    await new Promise(resolve => setTimeout(resolve, 2000));
    await validateUploadedFileMimeType('offer-documents', fileName);

    console.log('=== ENREGISTREMENT MÉTADONNÉES DB ===');
    
    // Enregistrer les métadonnées du document avec le type MIME correct
    const documentData = {
      offer_id: uploadLink.offer_id,
      document_type: documentType,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      mime_type: correctMimeType,
      uploaded_by: uploaderEmail || null,
      status: 'pending' as const
    };

    console.log('Données du document à insérer:', documentData);

    const { error: insertError, data: insertedData } = await supabase
      .from('offer_documents')
      .insert(documentData)
      .select();

    if (insertError) {
      console.error('=== ERREUR INSERTION DB ===');
      console.error('Erreur:', insertError);
      
      // Supprimer le fichier uploadé en cas d'erreur
      console.log('Suppression du fichier uploadé suite à l\'erreur...');
      await supabase.storage
        .from('offer-documents')
        .remove([fileName]);
      
      throw new Error(`Erreur métadonnées: ${insertError.message}`);
    }

    console.log('=== SUCCÈS COMPLET ===');
    console.log('Document enregistré:', insertedData);
    
    // Test final pour vérifier le résultat
    console.log('=== TEST FINAL POST-UPLOAD ===');
    const finalTest = await testDocumentDownload(fileName);
    console.log('Résultat test final:', finalTest);
    
    return true;
  } catch (error) {
    console.error('=== ERREUR GÉNÉRALE UPLOAD ===');
    console.error('Erreur complète:', error);
    return false;
  }
};

// Récupérer les documents d'une offre
export const getOfferDocuments = async (offerId: string): Promise<OfferDocument[]> => {
  try {
    const { data, error } = await supabase
      .from('offer_documents')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des documents:', error);
      return [];
    }

    return data as OfferDocument[];
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    return [];
  }
};

export const updateDocumentStatus = async (
  documentId: string,
  status: 'approved' | 'rejected',
  adminNotes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offer_documents')
      .update({
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    return false;
  }
};

export const downloadDocument = async (filePath: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('offer-documents')
      .createSignedUrl(filePath, 3600); // Valide 1 heure

    if (error) {
      console.error('Erreur lors de la création du lien de téléchargement:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Erreur lors de la création du lien de téléchargement:', error);
    return null;
  }
};

export const markLinkAsUsed = async (token: string): Promise<void> => {
  try {
    await supabase
      .from('offer_upload_links')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);
  } catch (error) {
    console.error('Erreur lors du marquage du lien comme utilisé:', error);
  }
};
