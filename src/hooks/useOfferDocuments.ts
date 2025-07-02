import { useState, useEffect } from "react";
import { getOfferDocuments, createUploadLink } from "@/services/offers/offerDocuments";
import { OfferDocument } from "@/services/offers/offerDocuments";
import { supabase } from "@/integrations/supabase/client";

export const useOfferDocuments = (offerId?: string) => {
  const [documents, setDocuments] = useState<OfferDocument[]>([]);
  const [uploadLinks, setUploadLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    if (!offerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch documents
      const docs = await getOfferDocuments(offerId);
      setDocuments(docs);

      // Fetch upload links for this offer
      const { data: links, error: linksError } = await supabase
        .from('offer_upload_links')
        .select('*')
        .eq('offer_id', offerId)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .order('created_at', { ascending: false });

      if (linksError) {
        console.error("Erreur lors de la récupération des liens d'upload:", linksError);
      } else {
        setUploadLinks(links || []);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Erreur lors de la récupération des documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [offerId]);

  const refresh = () => {
    fetchDocuments();
  };

  const generateUploadLink = async (requestedDocuments: string[], customMessage?: string) => {
    if (!offerId) return null;

    try {
      const token = await createUploadLink(offerId, requestedDocuments, customMessage);
      if (token) {
        // Refresh upload links
        await fetchDocuments();
        return token;
      }
    } catch (err) {
      console.error("Erreur lors de la génération du lien d'upload:", err);
    }
    return null;
  };

  return { 
    documents, 
    uploadLinks, 
    loading, 
    error, 
    refresh, 
    generateUploadLink 
  };
};