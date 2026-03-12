import { supabase } from "@/integrations/supabase/client";
import { generateInvoiceFromPurchaseOffer } from "@/services/invoiceService";

export interface RestoreResult {
  total: number;
  success: number;
  errors: string[];
}

/**
 * Récupère les offres d'achat en statut 'invoicing' sans facture associée
 */
export const getOrphanedPurchaseOffers = async () => {
  // Récupérer toutes les offres is_purchase en invoicing
  const { data: offers, error } = await supabase
    .from('offers')
    .select('id, company_id, client_name, amount, created_at, offer_reference')
    .eq('is_purchase', true)
    .eq('workflow_status', 'invoicing');

  if (error || !offers) return [];

  // Vérifier lesquelles n'ont pas de facture
  const orphaned = [];
  for (const offer of offers) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('offer_id', offer.id)
      .maybeSingle();

    if (!invoice) {
      orphaned.push(offer);
    }
  }

  return orphaned;
};

/**
 * Restaure les factures manquantes pour les offres d'achat orphelines
 */
export const restorePurchaseInvoices = async (): Promise<RestoreResult> => {
  const orphaned = await getOrphanedPurchaseOffers();
  const result: RestoreResult = { total: orphaned.length, success: 0, errors: [] };

  for (const offer of orphaned) {
    try {
      await generateInvoiceFromPurchaseOffer(offer.id, offer.company_id);
      result.success++;
      console.log(`✅ Facture restaurée pour offre ${offer.offer_reference || offer.id}`);
    } catch (err: any) {
      const msg = `Erreur pour offre ${offer.offer_reference || offer.id}: ${err.message}`;
      console.error(`❌ ${msg}`);
      result.errors.push(msg);
    }
  }

  return result;
};
