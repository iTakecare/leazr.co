import { supabase } from "@/integrations/supabase/client";
import CompanyCustomizationService from "./companyCustomizationService";

export interface CompanyInvoiceData {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  vat?: string;
  logo_url?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Récupère les données de l'entreprise pour la facturation
 */
export const getCompanyInvoiceData = async (companyId: string): Promise<CompanyInvoiceData> => {
  console.log("📋 Récupération des données entreprise pour facture:", companyId);
  
  try {
    // Récupérer les données de l'entreprise
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error("Erreur lors de la récupération de l'entreprise:", companyError);
    }

    // Récupérer la personnalisation de l'entreprise
    const branding = await CompanyCustomizationService.getCompanyBranding(companyId);
    
    // Récupérer les paramètres de site (fallback)
    const { data: siteSettings, error: settingsError } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError) {
      console.warn("Paramètres de site non trouvés:", settingsError);
    }

    // Construire les données finales avec priorité aux données de l'entreprise
    const invoiceData: CompanyInvoiceData = {
      name: branding?.company_name || companyData?.name || siteSettings?.company_name || "Entreprise",
      address: siteSettings?.company_address || "Adresse non renseignée",
      email: siteSettings?.company_email || "contact@entreprise.com",
      phone: siteSettings?.company_phone || "Téléphone non renseigné",
      vat: "TVA non renseignée", // À récupérer depuis les paramètres de l'entreprise
      logo_url: branding?.logo_url || siteSettings?.logo_url,
      primaryColor: branding?.primary_color || "#3b82f6",
      secondaryColor: branding?.secondary_color || "#64748b"
    };

    console.log("✅ Données entreprise récupérées:", invoiceData);
    return invoiceData;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des données entreprise:", error);
    
    // Données par défaut en cas d'erreur
    return {
      name: "Entreprise",
      address: "Adresse non renseignée",
      email: "contact@entreprise.com",
      phone: "Téléphone non renseigné",
      vat: "TVA non renseignée"
    };
  }
};

/**
 * Calcule le prix de vente à partir du prix d'achat et de la marge
 */
export const calculateSellingPrice = (purchasePrice: number, margin: number): number => {
  return purchasePrice * (1 + margin / 100);
};

/**
 * Calcule les montants par ligne d'équipement
 */
export const calculateLineAmounts = (sellingPrice: number, quantity: number, vatRate: number = 21) => {
  const totalExclVat = sellingPrice * quantity;
  const vatAmount = totalExclVat * (vatRate / 100);
  const totalInclVat = totalExclVat + vatAmount;

  return {
    unitPriceExclVat: sellingPrice,
    unitPriceInclVat: sellingPrice * (1 + vatRate / 100),
    totalExclVat: Math.round(totalExclVat * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalInclVat: Math.round(totalInclVat * 100) / 100,
    vatRate
  };
};

/**
 * Calcule les totaux de la facture et le récapitulatif TVA
 */
export const calculateInvoiceTotals = (equipmentLines: Array<{
  totalExclVat: number;
  vatAmount: number;
  totalInclVat: number;
  vatRate: number;
}>) => {
  // Grouper par taux de TVA
  const vatSummary = equipmentLines.reduce((acc, line) => {
    const rate = line.vatRate;
    if (!acc[rate]) {
      acc[rate] = {
        rate,
        totalExclVat: 0,
        vatAmount: 0,
        totalInclVat: 0
      };
    }
    
    acc[rate].totalExclVat += line.totalExclVat;
    acc[rate].vatAmount += line.vatAmount;
    acc[rate].totalInclVat += line.totalInclVat;
    
    return acc;
  }, {} as Record<number, {
    rate: number;
    totalExclVat: number;
    vatAmount: number;
    totalInclVat: number;
  }>);

  // Calculer les totaux généraux
  const totalExclVat = equipmentLines.reduce((sum, line) => sum + line.totalExclVat, 0);
  const totalVat = equipmentLines.reduce((sum, line) => sum + line.vatAmount, 0);
  const totalInclVat = equipmentLines.reduce((sum, line) => sum + line.totalInclVat, 0);

  return {
    vatSummary: Object.values(vatSummary).map(summary => ({
      ...summary,
      totalExclVat: Math.round(summary.totalExclVat * 100) / 100,
      vatAmount: Math.round(summary.vatAmount * 100) / 100,
      totalInclVat: Math.round(summary.totalInclVat * 100) / 100
    })),
    totalExclVat: Math.round(totalExclVat * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalInclVat: Math.round(totalInclVat * 100) / 100
  };
};