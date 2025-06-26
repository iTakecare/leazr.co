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

// Fonction de détection MIME type robuste avec validation du contenu
const getMimeTypeFromFile = async (file: File): Promise<string> => {
  console.log('=== DÉTECTION MIME TYPE ROBUSTE ===');
  console.log('Fichier:', {
    name: file.name,
    size: file.size,
    browserType: file.type,
    lastModified: file.lastModified
  });

  const fileName = file.name.toLowerCase();
  
  // Détection primaire par extension (plus fiable que le navigateur)
  let detectedMimeType = 'application/octet-stream';
  
  if (fileName.endsWith('.pdf')) {
    detectedMimeType = 'application/pdf';
  } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
    detectedMimeType = 'image/jpeg';
  } else if (fileName.endsWith('.png')) {
    detectedMimeType = 'image/png';
  } else if (fileName.endsWith('.gif')) {
    detectedMimeType = 'image/gif';
  } else if (fileName.endsWith('.webp')) {
    detectedMimeType = 'image/webp';
  } else if (fileName.endsWith('.bmp')) {
    detectedMimeType = 'image/bmp';
  } else if (fileName.endsWith('.tiff') || fileName.endsWith('.tif')) {
    detectedMimeType = 'image/tiff';
  } else if (fileName.endsWith('.doc')) {
    detectedMimeType = 'application/msword';
  } else if (fileName.endsWith('.docx')) {
    detectedMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  } else if (fileName.endsWith('.xls')) {
    detectedMimeType = 'application/vnd.ms-excel';
  } else if (fileName.endsWith('.xlsx')) {
    detectedMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  // Validation du contenu pour les types courants (magic numbers)
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    if (uint8Array.length >= 4) {
      // PDF: %PDF
      if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
        detectedMimeType = 'application/pdf';
      }
      // JPEG: FF D8 FF
      else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
        detectedMimeType = 'image/jpeg';
      }
      // PNG: 89 50 4E 47
      else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
        detectedMimeType = 'image/png';
      }
    }
  } catch (error) {
    console.warn('Impossible de lire le contenu du fichier pour validation:', error);
  }

  console.log('MIME type détecté:', detectedMimeType);
  return detectedMimeType;
};

// Créer un Blob avec le bon MIME type pour forcer Supabase
const createTypedBlob = async (file: File, mimeType: string): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  return new Blob([arrayBuffer], { type: mimeType });
};

// Vérifier le Content-Type servi par Supabase après upload
const verifyUploadedFileType = async (filePath: string): Promise<string | null> => {
  try {
    console.log('=== VÉRIFICATION POST-UPLOAD ===');
    console.log('Vérification du fichier:', filePath);
    
    const { data, error } = await supabase.storage
      .from('offer-documents')
      .createSignedUrl(filePath, 60); // URL valide 1 minute pour le test

    if (error || !data?.signedUrl) {
      console.error('Erreur création URL signée:', error);
      return null;
    }

    // Faire une requête HEAD pour obtenir les headers sans télécharger le contenu
    const response = await fetch(data.signedUrl, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    
    console.log('Content-Type servi par Supabase:', contentType);
    return contentType;
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    return null;
  }
};

// S'assurer que le bucket existe
const ensureOfferDocumentsBucket = async (): Promise<boolean> => {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Erreur lors de la vérification des buckets:', listError);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'offer-documents');
    
    if (!bucketExists) {
      console.log('Création du bucket offer-documents...');
      
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

// Vérifier la validité d'un token
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

// Uploader un document avec approche robuste et vérification
export const uploadDocument = async (
  token: string,
  documentType: string,
  file: File,
  uploaderEmail?: string
): Promise<boolean> => {
  try {
    console.log('=== DÉBUT UPLOAD DOCUMENT ROBUSTE ===');
    console.log('Token:', token);
    console.log('Type de document:', documentType);
    console.log('Fichier original:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    // Étape 1: Valider le token
    const uploadLink = await validateUploadToken(token);
    if (!uploadLink) {
      console.error('Token invalide ou expiré');
      throw new Error('Token invalide ou expiré');
    }

    console.log('✓ Token validé, offer_id:', uploadLink.offer_id);

    // Étape 2: S'assurer que le bucket existe
    const bucketReady = await ensureOfferDocumentsBucket();
    if (!bucketReady) {
      console.error('Impossible de préparer le stockage des documents');
      throw new Error('Impossible de préparer le stockage des documents');
    }

    console.log('✓ Bucket prêt');

    // Étape 3: Détection MIME type robuste
    const detectedMimeType = await getMimeTypeFromFile(file);
    console.log('✓ MIME type détecté:', detectedMimeType);

    // Étape 4: Créer le chemin du fichier unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop() || 'bin';
    let fileName = `${token}/${documentType}_${timestamp}_${randomId}.${fileExtension}`;

    console.log('✓ Chemin de destination:', fileName);

    // Étape 5: Créer un Blob typé pour forcer le MIME type
    const typedBlob = await createTypedBlob(file, detectedMimeType);
    console.log('✓ Blob typé créé avec MIME:', detectedMimeType);

    // Étape 6: Upload vers Supabase Storage
    console.log('=== UPLOAD VERS SUPABASE STORAGE ===');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('offer-documents')
      .upload(fileName, typedBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: detectedMimeType // Forcer le Content-Type
      });

    if (uploadError) {
      console.error('❌ Erreur upload storage:', uploadError);
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    console.log('✓ Upload réussi:', uploadData);

    // Étape 7: Vérification post-upload
    console.log('=== VÉRIFICATION POST-UPLOAD ===');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
    
    const actualContentType = await verifyUploadedFileType(fileName);
    console.log('Content-Type réel après upload:', actualContentType);

    // Étape 8: Correction automatique si nécessaire
    if (actualContentType && actualContentType.includes('application/json')) {
      console.log('⚠️ Détection de application/json - Correction automatique...');
      
      // Supprimer le fichier défaillant
      await supabase.storage
        .from('offer-documents')
        .remove([fileName]);
      
      // Recréer le fichier avec une stratégie différente
      const correctedFileName = `${fileName}_corrected`;
      
      const { data: correctedUpload, error: correctedError } = await supabase.storage
        .from('offer-documents')
        .upload(correctedFileName, file, { // Utiliser le File original cette fois
          cacheControl: '3600',
          upsert: false,
          contentType: detectedMimeType
        });

      if (correctedError) {
        console.error('❌ Échec de la correction automatique:', correctedError);
        throw new Error(`Erreur correction: ${correctedError.message}`);
      }

      console.log('✓ Correction automatique réussie');
      // Utiliser le nom corrigé pour la suite
      fileName = correctedFileName;
    }

    // Étape 9: Enregistrer les métadonnées en base de données
    const documentData = {
      offer_id: uploadLink.offer_id,
      document_type: documentType,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      mime_type: detectedMimeType,
      uploaded_by: uploaderEmail || null,
      status: 'pending' as const
    };

    console.log('=== ENREGISTREMENT EN BASE ===');
    console.log('Données à insérer:', documentData);

    const { error: insertError, data: insertedData } = await supabase
      .from('offer_documents')
      .insert(documentData)
      .select();

    if (insertError) {
      console.error('❌ Erreur insertion DB:', insertError);
      
      // Supprimer le fichier uploadé en cas d'erreur
      await supabase.storage
        .from('offer-documents')
        .remove([fileName]);
      
      throw new Error(`Erreur base de données: ${insertError.message}`);
    }

    console.log('=== ✅ SUCCÈS COMPLET ===');
    console.log('Document enregistré:', insertedData);
    console.log('MIME type final:', detectedMimeType);
    console.log('Chemin final:', fileName);
    
    return true;
  } catch (error) {
    console.error('=== ❌ ERREUR GÉNÉRALE UPLOAD ===');
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
