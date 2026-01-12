import { supabase } from "@/integrations/supabase/client";

export interface FiscalYearReport {
  year: number;
  invoices: {
    total: number;
    count: number;
    paid: number;
    paidCount: number;
    unpaid: number;
    unpaidCount: number;
    credited: number;
    creditedCount: number;
    netRevenue: number;
  };
  creditNotes: {
    total: number;
    count: number;
  };
}

export const getAccountingReport = async (companyId: string): Promise<FiscalYearReport[]> => {
  // Récupérer toutes les factures
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, invoice_date, created_at, amount, status, credited_amount')
    .eq('company_id', companyId);

  if (invoicesError) {
    console.error('Erreur lors de la récupération des factures:', invoicesError);
    throw invoicesError;
  }

  // Récupérer les notes de crédit avec la date de facture originale
  const { data: creditNotes, error: creditNotesError } = await supabase
    .from('credit_notes')
    .select(`
      id, 
      issued_at, 
      amount,
      invoice_id,
      invoices:invoice_id (
        invoice_date,
        created_at
      )
    `)
    .eq('company_id', companyId);

  if (creditNotesError) {
    console.error('Erreur lors de la récupération des notes de crédit:', creditNotesError);
    throw creditNotesError;
  }

  // Grouper par année fiscale (basée sur invoice_date)
  const reportByYear: Map<number, FiscalYearReport> = new Map();

  invoices?.forEach(invoice => {
    const year = new Date(invoice.invoice_date || invoice.created_at).getFullYear();
    
    if (!reportByYear.has(year)) {
      reportByYear.set(year, {
        year,
        invoices: { 
          total: 0, 
          count: 0, 
          paid: 0, 
          paidCount: 0, 
          unpaid: 0, 
          unpaidCount: 0, 
          credited: 0, 
          creditedCount: 0, 
          netRevenue: 0 
        },
        creditNotes: { total: 0, count: 0 }
      });
    }
    
    const report = reportByYear.get(year)!;
    report.invoices.total += invoice.amount || 0;
    report.invoices.count++;
    
    if (invoice.status === 'credited' || (invoice.credited_amount && invoice.credited_amount > 0)) {
      report.invoices.credited += invoice.credited_amount || invoice.amount || 0;
      report.invoices.creditedCount++;
    } else if (invoice.status === 'paid') {
      report.invoices.paid += invoice.amount || 0;
      report.invoices.paidCount++;
    } else {
      report.invoices.unpaid += invoice.amount || 0;
      report.invoices.unpaidCount++;
    }
    
    report.invoices.netRevenue = report.invoices.total - report.invoices.credited;
  });

  // Ajouter les notes de crédit par année d'émission de la facture originale
  creditNotes?.forEach(cn => {
    const invoiceData = cn.invoices as any;
    const invoiceYear = invoiceData?.invoice_date 
      ? new Date(invoiceData.invoice_date).getFullYear()
      : invoiceData?.created_at 
        ? new Date(invoiceData.created_at).getFullYear()
        : new Date(cn.issued_at).getFullYear();
    
    // S'assurer que l'année existe dans le rapport
    if (!reportByYear.has(invoiceYear)) {
      reportByYear.set(invoiceYear, {
        year: invoiceYear,
        invoices: { 
          total: 0, 
          count: 0, 
          paid: 0, 
          paidCount: 0, 
          unpaid: 0, 
          unpaidCount: 0, 
          credited: 0, 
          creditedCount: 0, 
          netRevenue: 0 
        },
        creditNotes: { total: 0, count: 0 }
      });
    }
    
    const report = reportByYear.get(invoiceYear);
    if (report) {
      report.creditNotes.total += cn.amount || 0;
      report.creditNotes.count++;
    }
  });

  return Array.from(reportByYear.values()).sort((a, b) => b.year - a.year);
};
