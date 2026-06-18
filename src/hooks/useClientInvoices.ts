import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClientInvoice {
  id: string;
  invoice_number: string | null;
  amount: number | null;
  status: string | null;
  invoice_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  invoice_type: string | null;
  contract_id: string | null;
  leaser_name: string | null;
  credited_amount: number | null;
  created_at: string;
}

/**
 * Factures du client (RLS scopée : ne renvoie que les factures liées aux
 * contrats du client connecté). Refetch au focus de l'onglet.
 */
export const useClientInvoices = () => {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, amount, status, invoice_date, due_date, paid_at, pdf_url, invoice_type, contract_id, leaser_name, credited_amount, created_at"
        )
        .order("invoice_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvoices((data || []) as ClientInvoice[]);
    } catch (e) {
      console.error("Erreur chargement factures client:", e);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const focusThrottle = useRef(0);
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - focusThrottle.current < 10000) return;
      focusThrottle.current = now;
      fetchInvoices();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return { invoices, loading, refresh: fetchInvoices };
};
