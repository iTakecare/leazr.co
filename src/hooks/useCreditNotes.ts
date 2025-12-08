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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getCreditNotes(companyId);
      setCreditNotes(data);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des notes de crédit:', err);
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
