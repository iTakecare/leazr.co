import { useState, useEffect } from "react";
import { useMultiTenant } from "./useMultiTenant";
import { CreditNote, getCreditNotes } from "@/services/creditNoteService";

export const useCreditNotes = () => {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { companyId } = useMultiTenant();

  const fetchCreditNotes = async () => {
    if (!companyId) {
      console.log('🧾 CREDIT NOTES - Pas de companyId, skip fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🧾 CREDIT NOTES - Fetch pour companyId:', companyId);
      const data = await getCreditNotes(companyId);
      console.log('🧾 CREDIT NOTES - Data reçue:', data.length, 'notes de crédit');
      setCreditNotes(data);
    } catch (err: any) {
      console.error('🧾 CREDIT NOTES - Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditNotes();
  }, [companyId]);

  return {
    creditNotes,
    loading,
    error,
    fetchCreditNotes
  };
};
