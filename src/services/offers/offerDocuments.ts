import { supabase, getFileUploadClient } from "@/integrations/supabase/client";
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

export const DOCUMENT_TYPES: Record<string, string> = {
  balance_sheet: "Bilan financier",
  tax_notice: "Avertissement extrait de rôle",
  id_card_front: "Carte d'identité - Recto",
  id_card_back: "Carte d'identité - Verso",
  // Backward compatibility
  id_card: "Carte d'identité",
  company_register: "Extrait de registre d'entreprise",
  vat_certificate: "Attestation TVA",
  bank_statement: "Relevé bancaire",
  provisional_balance: "Bilan financier provisoire",
  tax_return: "Liasse fiscale",
  custom: "Autre document"
};

// Types de documents additionnels que le client peut uploader de son initiative
export const ADDITIONAL_DOCUMENT_TYPES: Record<string, string> = {
  other: "Autre document",
  additional_id: "Pièce d'identité supplémentaire",
  proof_of_address: "Justificatif de domicile",
  company_statutes: "Statuts de l'entreprise",
  bank_statement_additional: "Relevé bancaire supplémentaire",
  other_financial: "Autre document financier",
  quote: "Devis",
  contract: "Contrat",
  insurance: "Attestation d'assurance"
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

// S'assurer que le bucket existe
// Le bucket 'offer-documents' existe déjà en production.
// L'API listBuckets() n'est pas accessible aux utilisateurs anonymes
// qui uploadent via un lien public avec token - cela causait l'erreur d'upload.
const ensureOfferDocumentsBucket = async (): Promise<boolean> => {
  // Retourner true directement car le bucket existe en production
  // et la vérification bloquait les uploads clients (API admin-only)
  return true;
};

// Créer un lien d'upload sécurisé
export const createUploadLink = async (
  offerId: string,
  requestedDocuments: string[],
  customMessage?: string,
  requestedBy: 'internal' | 'leaser' = 'internal'
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

// Vérifier la validité d'un token via RPC sécurisé (pas d'accès direct à la table)
export const validateUploadToken = async (token: string): Promise<OfferUploadLink | null> => {
  try {
    console.log('Validation du token via RPC:', token);
    
    // Use SECURITY DEFINER RPC function to validate token without exposing table data
    const { data, error } = await supabase
      .rpc('validate_upload_token', { p_token: token });

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

// Uploader un document avec la nouvelle approche simplifiée
export const uploadDocument = async (
  token: string,
  documentType: string,
  file: File,
  uploaderEmail?: string,
  customDescription?: string
): Promise<boolean> => {
  try {
    console.log('=== DÉBUT UPLOAD DOCUMENT SIMPLIFIÉ ===');
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
    const fileName = `${token}/${documentType}_${timestamp}_${randomId}.${fileExtension}`;

    console.log('✓ Chemin de destination:', fileName);

    // Étape 5: Upload vers Supabase Storage avec le client dédié aux fichiers
    console.log('=== UPLOAD VERS SUPABASE STORAGE ===');
    const fileUploadClient = getFileUploadClient();
    
    const { data: uploadData, error: uploadError } = await fileUploadClient.storage
      .from('offer-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: detectedMimeType
      });

    if (uploadError) {
      console.error('❌ Erreur upload storage:', uploadError);
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    console.log('✓ Upload réussi:', uploadData);

    // Étape 6: Enregistrer les métadonnées en base de données
    // Pour les documents additionnels, utiliser le type préfixé et la description personnalisée
    const isAdditionalDocument = documentType.startsWith('additional:');
    const finalDocumentType = isAdditionalDocument ? documentType : documentType;
    const displayName = customDescription || file.name;
    
    const documentData = {
      offer_id: uploadLink.offer_id,
      document_type: finalDocumentType,
      file_name: displayName,
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
      await fileUploadClient.storage
        .from('offer-documents')
        .remove([fileName]);
      
      throw new Error(`Erreur base de données: ${insertError.message}`);
    }

    console.log('=== ✅ SUCCÈS COMPLET ===');
    console.log('Document enregistré:', insertedData);
    console.log('MIME type final:', detectedMimeType);
    console.log('Chemin final:', fileName);
    
    // Notifier les admins en arrière-plan (ne bloque pas l'upload)
    try {
      console.log('📧 Envoi notification admins...');
      supabase.functions.invoke('notify-admins-document-upload', {
        body: {
          offerId: uploadLink.offer_id,
          documentType: DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES] || documentType,
          fileName: file.name,
          uploaderEmail: uploaderEmail || null
        }
      }).then(({ data, error }) => {
        if (error) {
          console.error('⚠️ Erreur notification admins (non bloquant):', error);
        } else {
          console.log('✅ Notification admins envoyée:', data);
        }
      });
    } catch (notifError) {
      console.error('⚠️ Erreur lors de la notification admins (non bloquant):', notifError);
    }
    
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

// Marquer les documents d'une offre comme consultés par l'admin
export const markDocumentsAsViewed = async (offerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .update({ documents_last_viewed_at: new Date().toISOString() })
      .eq('id', offerId);

    if (error) {
      console.error('Erreur lors du marquage des documents comme vus:', error);
      return false;
    }

    console.log('✓ Documents marqués comme consultés pour l\'offre:', offerId);
    return true;
  } catch (error) {
    console.error('Erreur lors du marquage des documents comme vus:', error);
    return false;
  }
};

export const deleteDocument = async (documentId: string): Promise<boolean> => {
  try {
    console.log('=== SUPPRESSION DOCUMENT ===');
    console.log('Document ID:', documentId);

    // Récupérer les informations du document avant suppression
    const { data: document, error: fetchError } = await supabase
      .from('offer_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      console.error('Erreur lors de la récupération du document:', fetchError);
      return false;
    }

    console.log('Chemin du fichier à supprimer:', document.file_path);

    // Supprimer le fichier du storage
    const fileUploadClient = getFileUploadClient();
    const { error: storageError } = await fileUploadClient.storage
      .from('offer-documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Erreur lors de la suppression du fichier:', storageError);
      // On continue même si la suppression du fichier échoue
    } else {
      console.log('✓ Fichier supprimé du storage');
    }

    // Supprimer l'enregistrement de la base de données
    const { error: dbError } = await supabase
      .from('offer_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Erreur lors de la suppression en base:', dbError);
      return false;
    }

    console.log('✅ Document supprimé avec succès');
    return true;
  } catch (error) {
    console.error('Erreur générale lors de la suppression:', error);
    return false;
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

// Nouvelle fonction pour rejeter un document avec envoi d'email et suppression
export const rejectDocumentWithEmail = async (
  documentId: string,
  adminNotes: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Récupérer les informations du document et de l'offre
    const { data: document, error: docError } = await supabase
      .from('offer_documents')
      .select(`
        *,
        offer:offers (
          id,
          client_name,
          client_email,
          company_id,
          company:companies (
            name
          )
        )
      `)
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Erreur lors de la récupération du document:', docError);
      return { success: false, message: 'Document non trouvé' };
    }

    if (!document.offer?.client_email) {
      return { success: false, message: 'Email du client non disponible' };
    }

    // 2. Supprimer le fichier du storage
    console.log('🗑️ Suppression du fichier:', document.file_path);
    const { error: storageError } = await supabase.storage
      .from('offer-documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Erreur lors de la suppression du storage:', storageError);
      // Continue malgré l'erreur de suppression
    }

    // 3. Mettre à jour le statut du document
    const { error: updateError } = await supabase
      .from('offer_documents')
      .update({
        status: 'rejected',
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Erreur lors de la mise à jour:', updateError);
      return { success: false, message: 'Erreur lors du rejet du document' };
    }

    // 4. Créer un nouveau lien d'upload pour ce document spécifique
    const uploadToken = await createUploadLink(
      document.offer.id, 
      [document.document_type], 
      `Document rejeté: ${getDocumentTypeName(document.document_type)}. Raison: ${adminNotes}`,
      'internal'
    );

    if (!uploadToken) {
      return { success: false, message: 'Erreur lors de la création du lien de re-upload' };
    }

    // 5. Construire le lien d'upload
    const uploadLink = `${window.location.origin}/upload/${uploadToken}`;

    // 6. Envoyer l'email de rejet
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-document-rejection', {
      body: {
        clientEmail: document.offer.client_email,
        clientName: document.offer.client_name,
        documentType: getDocumentTypeName(document.document_type),
        rejectionReason: adminNotes,
        uploadLink: uploadLink,
        companyName: document.offer.company?.name || 'iTakecare'
      }
    });

    if (emailError || !emailData?.success) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError);
      return { 
        success: false, 
        message: 'Document rejeté mais erreur lors de l\'envoi de l\'email' 
      };
    }

    console.log('✅ Document rejeté avec succès, email envoyé');
    return { 
      success: true, 
      message: 'Document rejeté et email de notification envoyé au client' 
    };

  } catch (error) {
    console.error('Erreur lors du rejet avec email:', error);
    return { success: false, message: 'Erreur inattendue lors du rejet' };
  }
};

// Helper function pour obtenir le nom lisible du type de document
const getDocumentTypeName = (docType: string): string => {
  if (docType.startsWith('custom:')) {
    return docType.replace('custom:', '');
  }
  return DOCUMENT_TYPES[docType] || docType;
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
