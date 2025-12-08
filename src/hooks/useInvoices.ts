import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "./useMultiTenant";

export interface Invoice {
  id: string;
  contract_id: string | null;
  offer_id?: string | null;
  company_id: string;
  invoice_number?: string;
  leaser_name: string;
  invoice_type?: 'leasing' | 'purchase';
  amount: number;
  status: string;
  integration_type: string;
  due_date?: string;
  invoice_date?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  billing_data: any;
}

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { companyId } = useMultiTenant();

  const fetchInvoices = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setInvoices(data || []);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des factures:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceByContractId = async (contractId: string): Promise<Invoice | null> => {
    if (!companyId) return null;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .eq('contract_id', contractId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (err: any) {
      console.error('Erreur lors de la récupération de la facture:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [companyId]);

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    getInvoiceByContractId
  };
};