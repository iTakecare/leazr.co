
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
    const { data, error } = await supabase
      .from('offer_upload_links')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (error || !data) {
      return null;
    }

    return data as OfferUploadLink;
  } catch (error) {
    console.error('Erreur lors de la validation du token:', error);
    return null;
  }
};

// Uploader un document
export const uploadDocument = async (
  token: string,
  documentType: string,
  file: File,
  uploaderEmail?: string
): Promise<boolean> => {
  try {
    // Valider le token
    const uploadLink = await validateUploadToken(token);
    if (!uploadLink) {
      throw new Error('Token invalide ou expiré');
    }

    // Créer le chemin du fichier
    const fileExtension = file.name.split('.').pop();
    const fileName = `${token}/${documentType}_${Date.now()}.${fileExtension}`;

    // Uploader le fichier vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('offer-documents')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // Enregistrer les métadonnées du document
    const { error: insertError } = await supabase
      .from('offer_documents')
      .insert({
        offer_id: uploadLink.offer_id,
        document_type: documentType,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: uploaderEmail,
        status: 'pending'
      });

    if (insertError) {
      // Supprimer le fichier uploadé en cas d'erreur
      await supabase.storage
        .from('offer-documents')
        .remove([fileName]);
      throw insertError;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de l\'upload du document:', error);
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

// Mettre à jour le statut d'un document
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

// Télécharger un document
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

// Marquer un lien comme utilisé
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
