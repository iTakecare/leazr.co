import { supabase } from "@/integrations/supabase/client";

export interface Invoice {
  id: string;
  contract_id: string;
  company_id: string;
  leaser_name: string;
  external_invoice_id?: string;
  invoice_number?: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  generated_at?: string;
  sent_at?: string;
  paid_at?: string;
  due_date?: string;
  billing_data: any;
  integration_type: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyIntegration {
  id: string;
  company_id: string;
  integration_type: string;
  is_enabled: boolean;
  api_credentials: any;
  settings: any;
  created_at: string;
  updated_at: string;
}

// Vérifier si l'intégration Billit est configurée pour une entreprise
export const getBillitIntegration = async (companyId: string): Promise<CompanyIntegration | null> => {
  const { data, error } = await supabase
    .from('company_integrations')
    .select('*')
    .eq('company_id', companyId)
    .eq('integration_type', 'billit')
    .single();

  if (error) {
    console.error('Erreur lors de la récupération de l\'intégration Billit:', error);
    return null;
  }

  return data;
};

// Vérifier si tous les numéros de série sont remplis pour un contrat
export const areAllSerialNumbersComplete = (equipment: any[]): boolean => {
  if (!equipment || equipment.length === 0) return false;
  
  return equipment.every(item => 
    item.serial_number && 
    item.serial_number.trim() !== ''
  );
};

// Générer une facture via Billit
export const generateBillitInvoice = async (contractId: string, companyId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('billit-integration', {
      body: {
        contractId,
        companyId
      }
    });

    if (error) {
      throw error;
    }

    if (!data.success) {
      throw new Error(data.message || 'Erreur lors de la génération de la facture');
    }

    return data.invoice;
  } catch (error) {
    console.error('Erreur lors de la génération de la facture:', error);
    throw error;
  }
};

// Récupérer toutes les factures d'une entreprise
export const getCompanyInvoices = async (companyId?: string): Promise<Invoice[]> => {
  try {
    let targetCompanyId = companyId;
    
    // Si pas de companyId fourni, le récupérer depuis le profil utilisateur
    if (!targetCompanyId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (profileError) {
        console.error('Erreur lors de la récupération du profil:', profileError);
        throw profileError;
      }
      
      targetCompanyId = profile?.company_id;
    }

    if (!targetCompanyId) {
      console.error('Aucun company_id trouvé');
      return [];
    }

    console.log('Récupération des factures pour company_id:', targetCompanyId);
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', targetCompanyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      throw error;
    }

    console.log('Factures récupérées:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Erreur dans getCompanyInvoices:', error);
    throw error;
  }
};

// Récupérer les factures par statut
export const getInvoicesByStatus = async (companyId: string, status: string): Promise<Invoice[]> => {
  try {
    let targetCompanyId = companyId;
    
    // Si pas de companyId fourni, le récupérer depuis le profil utilisateur
    if (!targetCompanyId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (profileError) {
        console.error('Erreur lors de la récupération du profil:', profileError);
        throw profileError;
      }
      
      targetCompanyId = profile?.company_id;
    }

    if (!targetCompanyId) {
      console.error('Aucun company_id trouvé');
      return [];
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', targetCompanyId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des factures par statut:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erreur dans getInvoicesByStatus:', error);
    throw error;
  }
};

// Mettre à jour le statut d'une facture
export const updateInvoiceStatus = async (invoiceId: string, status: string, paidAt?: string) => {
  const updateData: any = { status };
  
  if (status === 'paid' && paidAt) {
    updateData.paid_at = paidAt;
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la mise à jour de la facture:', error);
    throw error;
  }

  return data;
};

// Configurer l'intégration Billit pour une entreprise
export const setupBillitIntegration = async (
  companyId: string, 
  apiKey: string, 
  baseUrl: string, 
  billitCompanyId: string,
  settings: any = {}
) => {
  const { data, error } = await supabase
    .from('company_integrations')
    .upsert({
      company_id: companyId,
      integration_type: 'billit',
      is_enabled: true,
      api_credentials: {
        apiKey,
        baseUrl,
        companyId: billitCompanyId
      },
      settings
    }, {
      onConflict: 'company_id,integration_type'
    })
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la configuration de l\'intégration Billit:', error);
    throw error;
  }

  return data;
};

// Désactiver l'intégration Billit
export const disableBillitIntegration = async (companyId: string) => {
  const { error } = await supabase
    .from('company_integrations')
    .update({ is_enabled: false })
    .eq('company_id', companyId)
    .eq('integration_type', 'billit');

  if (error) {
    console.error('Erreur lors de la désactivation de l\'intégration Billit:', error);
    throw error;
  }
};

// Générer et télécharger le PDF d'une facture
export const generateAndDownloadInvoicePdf = async (invoiceId: string) => {
  const { downloadInvoicePdf } = await import('@/utils/invoicePdfGenerator');
  const { getCompanyInvoiceData } = await import('./invoiceCompanyService');
  
  try {
    // Récupérer la facture
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      throw new Error('Facture non trouvée');
    }

    // Récupérer les données de l'entreprise
    const companyInfo = await getCompanyInvoiceData(invoice.company_id);

    // Générer et télécharger le PDF
    const filename = await downloadInvoicePdf(invoice, companyInfo);
    return filename;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF de facture:', error);
    throw error;
  }
};