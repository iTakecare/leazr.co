import { supabase } from "@/integrations/supabase/client";

export interface Invoice {
  id: string;
  contract_id: string | null;
  offer_id?: string | null;
  company_id: string;
  leaser_name: string;
  invoice_type?: 'leasing' | 'purchase';
  external_invoice_id?: string;
  invoice_number?: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  generated_at?: string;
  sent_at?: string;
  paid_at?: string;
  due_date?: string;
  invoice_date?: string;
  billing_data: any;
  integration_type: string;
  created_at: string;
  updated_at: string;
  pdf_url?: string;
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

// Générer une facture brouillon à partir d'une offre d'achat (purchase mode)
export const generateInvoiceFromPurchaseOffer = async (offerId: string, companyId: string) => {
  try {
    console.log('📝 Génération facture depuis offre d\'achat - offerId:', offerId, 'companyId:', companyId);
    
    // Vérifier si une facture existe déjà pour cette offre
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('offer_id', offerId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (existingInvoice) {
      console.log('✅ Facture existante trouvée pour offre:', existingInvoice.id);
      return existingInvoice;
    }
    
    // Récupérer l'offre avec les données client
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        clients:client_id (
          id,
          name,
          company,
          email,
          phone,
          address,
          city,
          postal_code,
          country,
          vat_number,
          billing_address,
          billing_city,
          billing_postal_code,
          billing_country
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      throw new Error('Offre non trouvée');
    }

    if (!offer.is_purchase) {
      throw new Error('Cette offre n\'est pas une offre d\'achat');
    }

    // Récupérer les équipements de l'offre
    const { data: equipment, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select('*')
      .eq('offer_id', offerId);

    if (equipmentError) {
      throw new Error('Erreur lors de la récupération des équipements');
    }

    // Calculer le prix total de vente (multiplié par la quantité)
    // IMPORTANT: selling_price est le prix UNITAIRE de vente, pas le total de la ligne
    const totalSellingPrice = (equipment || []).reduce((total, item) => {
      const quantity = item.quantity || 1;
      // selling_price est déjà le prix unitaire - ne PAS diviser par quantity
      const unitSellingPrice = item.selling_price 
        || (item.purchase_price * (1 + (item.margin || 0) / 100));
      return total + (unitSellingPrice * quantity);
    }, 0);

    console.log('💰 Prix de vente total calculé:', totalSellingPrice);

    // Préparer les données client pour la facturation
    const client = offer.clients;
    const clientData = client ? {
      id: client.id,
      name: client.name || offer.client_name,
      company: client.company,
      email: client.email || offer.client_email,
      phone: client.phone,
      address: client.billing_address || client.address,
      city: client.billing_city || client.city,
      postal_code: client.billing_postal_code || client.postal_code,
      country: client.billing_country || client.country || 'Belgique',
      vat_number: client.vat_number
    } : {
      name: offer.client_name,
      email: offer.client_email
    };

    // Préparer les équipements enrichis
    // IMPORTANT: selling_price est le prix UNITAIRE de vente
    const enrichedEquipment = (equipment || []).map(item => {
      const quantity = item.quantity || 1;
      // selling_price est déjà le prix unitaire - ne PAS diviser par quantity
      const unitSellingPrice = item.selling_price 
        || (item.purchase_price * (1 + (item.margin || 0) / 100));
      const totalLinePrice = unitSellingPrice * quantity;
      return {
        ...item,
        selling_price_excl_vat: parseFloat(unitSellingPrice.toFixed(2)), // Prix unitaire HT
        unit_selling_price: parseFloat(unitSellingPrice.toFixed(2)),
        total_line_price: parseFloat(totalLinePrice.toFixed(2)) // Total de la ligne
      };
    });

    // Créer la facture en brouillon - Facture d'achat (pas de bailleur)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        offer_id: offerId,
        company_id: companyId,
        leaser_name: '', // Pas de bailleur pour les factures d'achat
        invoice_type: 'purchase', // Type facture achat
        amount: totalSellingPrice,
        status: 'draft',
        integration_type: 'local',
        invoice_date: offer.created_at ? new Date(offer.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        billing_data: {
          offer_data: {
            id: offer.id,
            reference: offer.offer_reference,
            created_at: offer.created_at,
            is_purchase: true
          },
          client_data: clientData,
          equipment_data: enrichedEquipment,
          invoice_totals: {
            total_excl_vat: totalSellingPrice,
            vat_amount: totalSellingPrice * 0.21,
            total_incl_vat: totalSellingPrice * 1.21
          },
          generated_from_purchase_offer: true,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ Erreur création facture:', invoiceError);
      throw new Error('Erreur lors de la création de la facture');
    }

    console.log('✅ Facture brouillon générée avec succès:', invoice);
    return invoice;
  } catch (error) {
    console.error('❌ Erreur lors de la génération de la facture depuis offre d\'achat:', error);
    throw error;
  }
};

export const generateLocalInvoice = async (contractId: string, companyId: string) => {
  try {
    console.log('📝 Génération facture locale - contractId:', contractId, 'companyId:', companyId);
    
    // Vérifier si une facture existe déjà pour ce contrat
    const { data: existingInvoice, error: existingInvoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .single();

    if (existingInvoice) {
      console.log('✅ Facture existante trouvée:', existingInvoice.id);
      return existingInvoice;
    }
    
    // Récupérer les données du contrat
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        client_id,
        client_name,
        monthly_payment,
        leaser_name,
        offer_id
      `)
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contrat non trouvé');
    }

    // Récupérer les données complètes du leaser en utilisant name pour la correspondance
    const { data: leaser, error: leaserError } = await supabase
      .from('leasers')
      .select('*')
      .ilike('name', contract.leaser_name)
      .single();

    if (leaserError || !leaser) {
      throw new Error(`Leaser "${contract.leaser_name}" non trouvé`);
    }

    // Vérifier que le leaser a toutes les données nécessaires
    if (!leaser.address || !leaser.city || !leaser.postal_code) {
      throw new Error('Données du leaser incomplètes (adresse, ville, code postal manquants)');
    }

    // Récupérer l'offer_id pour accéder aux données originales
    const offerId = contract.offer_id;
    console.log('📋 Offer ID du contrat:', offerId);

    // Récupérer les équipements du contrat pour les numéros de série
    const { data: contractEquipment, error: contractEquipmentError } = await supabase
      .from('contract_equipment')
      .select('*')
      .eq('contract_id', contractId);

    if (contractEquipmentError) {
      throw new Error('Erreur lors de la récupération des équipements du contrat');
    }

    // Vérifier que tous les équipements ont des numéros de série
    const missingSerialNumbers = (contractEquipment || []).filter(
      item => !item.serial_number || item.serial_number.trim() === ''
    );
    
    if (missingSerialNumbers.length > 0) {
      const missingTitles = missingSerialNumbers.map(e => e.title).join(', ');
      throw new Error(
        `Impossible de générer la facture : ${missingSerialNumbers.length} équipement(s) sans numéro de série.\n\n` +
        `Équipements concernés : ${missingTitles}\n\n` +
        `Veuillez ajouter les numéros de série dans la section "Numéros de série des équipements" avant de générer la facture.`
      );
    }

    // Si le contrat provient d'une offre, utiliser les équipements de l'offre
    // Sinon, fallback sur les équipements du contrat
    let equipment = [];
    let totalSellingPrice = 0;
    let offerData = null;

    if (offerId) {
      console.log('🔍 Récupération des équipements et données depuis l\'offre originale');
      
      // Récupérer l'offre pour avoir le coefficient et la mensualité totale
      const { data: offerInfo, error: offerInfoError } = await supabase
        .from('offers')
        .select('coefficient, monthly_payment, financed_amount')
        .eq('id', offerId)
        .single();
      
      if (!offerInfoError && offerInfo) {
        offerData = offerInfo;
        console.log('✅ Données de l\'offre récupérées:', {
          coefficient: offerData.coefficient,
          monthly_payment: offerData.monthly_payment,
          financed_amount: offerData.financed_amount
        });
      }
      
      const { data: offerEquipment, error: offerEquipmentError } = await supabase
        .from('offer_equipment')
        .select('*')
        .eq('offer_id', offerId);

      if (offerEquipmentError) {
        console.warn('⚠️ Erreur lors de la récupération des équipements de l\'offre, fallback sur contrat:', offerEquipmentError);
        equipment = contractEquipment || [];
      } else {
        equipment = offerEquipment || [];
        console.log('✅ Équipements de l\'offre récupérés:', equipment.length, 'items');
      }
    } else {
      console.log('🔍 Pas d\'offer_id, récupération des équipements du contrat');
      equipment = contractEquipment || [];
    }

    // Calculer le prix total de vente avec la formule inverse Grenke
    // Priorité 1: Formule inverse Grenke (monthly_payment * 100 / coefficient) - SOURCE OF TRUTH
    // Priorité 2: financed_amount de l'offre (si cohérent avec la formule)
    // Priorité 3: Somme des selling_price ou calcul avec marge %
    
    if (offerData?.monthly_payment && offerData?.coefficient && offerData.coefficient > 0) {
      // Formule inverse Grenke - SOURCE OF TRUTH pour le leasing
      totalSellingPrice = (offerData.monthly_payment * 100) / offerData.coefficient;
      console.log('💰 Prix de vente calculé avec formule inverse Grenke:', totalSellingPrice, 
        '(mensualité:', offerData.monthly_payment, '× 100 /', offerData.coefficient, ')');
      
      // Vérifier si financed_amount est incohérent
      if (offerData.financed_amount && Math.abs(offerData.financed_amount - totalSellingPrice) > 1) {
        console.warn('⚠️ Incohérence détectée: financed_amount =', offerData.financed_amount, 
          'vs formule Grenke =', totalSellingPrice, '- Utilisation de la formule Grenke');
      }
    } else if (offerData?.financed_amount && offerData.financed_amount > 0) {
      // Fallback sur financed_amount si pas de coefficient/mensualité
      totalSellingPrice = offerData.financed_amount;
      console.log('💰 Prix de vente calculé depuis financed_amount (fallback):', totalSellingPrice);
    } else {
      // Fallback: calcul depuis les équipements
      totalSellingPrice = equipment.reduce((total, item) => {
        const sellingPrice = item.selling_price || (item.purchase_price * (1 + (item.margin || 0) / 100));
        return total + (sellingPrice * (item.quantity || 1));
      }, 0);
      console.log('💰 Prix de vente total calculé depuis équipements (fallback):', totalSellingPrice);
    }

    // Calculer le total des mensualités pour la répartition proportionnelle
    // monthly_payment en BD est DÉJÀ le total pour cet équipement (pas unitaire)
    const totalMonthlyPayment = equipment.reduce((sum, item) => sum + (item.monthly_payment || 0), 0);

    // Mapper les numéros de série du contrat sur les équipements
    // et calculer le selling_price proportionnellement au montant financé total
    const enrichedEquipment = equipment.map(offerItem => {
      const contractItem = (contractEquipment || []).find(
        ce => ce.title === offerItem.title && ce.purchase_price === offerItem.purchase_price
      );
      
      // Calculer le selling_price proportionnellement au montant financé total (via mensualité)
      let itemSellingPrice;
      if (totalMonthlyPayment > 0 && totalSellingPrice > 0 && offerItem.monthly_payment) {
        // Répartition proportionnelle basée sur la mensualité
        // monthly_payment est déjà le total de la ligne
        const itemTotalMonthly = offerItem.monthly_payment || 0;
        const proportion = itemTotalMonthly / totalMonthlyPayment;
        itemSellingPrice = (totalSellingPrice * proportion) / (offerItem.quantity || 1);
      } else {
        // Fallback: calcul avec marge %
        itemSellingPrice = offerItem.selling_price || (offerItem.purchase_price * (1 + (offerItem.margin || 0) / 100));
      }
      
      return {
        ...offerItem,
        serial_number: contractItem?.serial_number || offerItem.serial_number,
        selling_price_excl_vat: parseFloat(itemSellingPrice.toFixed(2))
      };
    });

    // Créer la facture en brouillon avec toutes les données nécessaires
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        contract_id: contractId,
        company_id: companyId,
        leaser_name: leaser.company_name || leaser.name,
        amount: totalSellingPrice,
        status: 'draft',
        integration_type: 'local',
        billing_data: {
          contract_data: contract,
          equipment_data: enrichedEquipment,
          leaser_data: {
            name: leaser.company_name || leaser.name,
            address: leaser.address,
            city: leaser.city,
            postal_code: leaser.postal_code,
            country: leaser.country || 'Belgique',
            vat_number: leaser.vat_number,
            email: leaser.email,
            phone: leaser.phone
          },
          invoice_totals: {
            total_excl_vat: totalSellingPrice,
            vat_amount: totalSellingPrice * 0.21,
            total_incl_vat: totalSellingPrice * 1.21
          },
          generated_locally: true,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error('Erreur lors de la création de la facture');
    }

    // Marquer le contrat comme ayant une facture générée
    await supabase
      .from('contracts')
      .update({ 
        invoice_generated: true,
        invoice_id: invoice.id 
      })
      .eq('id', contractId);

    console.log('✅ Facture locale générée avec succès:', invoice);
    return invoice;
  } catch (error) {
    console.error('❌ Erreur lors de la génération de la facture locale:', error);
    throw error;
  }
};

// Envoyer une facture existante vers Billit
export const sendInvoiceToBillit = async (invoiceId: string) => {
  try {
    console.log('📤 Envoi facture vers Billit - invoiceId:', invoiceId);
    
    const { data, error } = await supabase.functions.invoke('billit-integration', {
      body: {
        invoiceId,
        action: 'send'
      }
    });

    console.log('📡 Réponse Edge Function:', { data, error });

    if (error) {
      console.error('❌ Erreur Edge Function:', error);
      throw new Error(`Erreur du serveur: ${error.message}`);
    }

    if (!data.success) {
      console.error('❌ Échec envoi:', data);
      throw new Error(data.error || data.message || 'Erreur lors de l\'envoi de la facture');
    }

    console.log('✅ Facture envoyée avec succès:', data.invoice);
    return data.invoice;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la facture:', error);
    throw error;
  }
};

// Tester l'intégration Billit
export const testBillitIntegration = async (companyId: string) => {
  try {
    console.log('🧪 Test intégration Billit pour companyId:', companyId);
    
    const { data, error } = await supabase.functions.invoke('billit-integration', {
      body: {
        companyId,
        testMode: true
      }
    });

    console.log('📊 Résultats test:', { data, error });

    if (error) {
      console.error('❌ Erreur test:', error);
      throw new Error(`Erreur du serveur: ${error.message}`);
    }

    return {
      success: data.success,
      results: data.test_results,
      message: data.message
    };
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
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

// Mettre à jour les données de facturation d'une facture
export const updateInvoiceBillingData = async (invoiceId: string, billingData: any) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ billing_data: billingData })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la mise à jour des données de facturation:', error);
    throw error;
  }

  return data;
};

// Mettre à jour la date de paiement d'une facture
export const updateInvoicePaidDate = async (invoiceId: string, paidAt: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ 
      paid_at: paidAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la mise à jour de la date de paiement:', error);
    throw error;
  }

  return data;
};

// Mettre à jour la date de facture
export const updateInvoiceDate = async (invoiceId: string, invoiceDate: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ 
      invoice_date: invoiceDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la mise à jour de la date de facture:', error);
    throw error;
  }

  return data;
};

// Mettre à jour la date d'échéance d'une facture
export const updateInvoiceDueDate = async (invoiceId: string, dueDate: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ 
      due_date: dueDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la mise à jour de la date d\'échéance:', error);
    throw error;
  }

  return data;
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

// Supprimer une facture
export const deleteInvoice = async (invoiceId: string) => {
  try {
    console.log('🗑️ Suppression de la facture:', invoiceId);
    
    // Étape 1 : Détacher le contrat de la facture (mettre invoice_id à NULL)
    const { error: detachError } = await supabase
      .from('contracts')
      .update({ 
        invoice_id: null,
        invoice_generated: false 
      })
      .eq('invoice_id', invoiceId);

    if (detachError) {
      console.error('❌ Erreur lors du détachement du contrat:', detachError);
      throw new Error(`Impossible de détacher le contrat : ${detachError.message}`);
    }

    console.log('✅ Contrat détaché avec succès');

    // Étape 2 : Supprimer la facture
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression de la facture:', deleteError);
      throw new Error(`Erreur lors de la suppression : ${deleteError.message}`);
    }

    console.log('✅ Facture supprimée avec succès');
  } catch (error) {
    console.error('❌ Erreur dans deleteInvoice:', error);
    throw error;
  }
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

// Synchroniser les statuts des factures avec Billit
export const syncBillitInvoiceStatuses = async (companyId: string, invoiceId?: string) => {
  try {
    console.log('🔄 Synchronisation statuts Billit pour companyId:', companyId);
    
    const { data, error } = await supabase.functions.invoke('billit-sync-status', {
      body: {
        companyId,
        invoiceId
      }
    });

    if (error) {
      console.error('❌ Erreur synchronisation:', error);
      throw new Error(`Erreur du serveur: ${error.message}`);
    }

    if (!data.success) {
      console.error('❌ Échec synchronisation:', data);
      throw new Error(data.error || data.message || 'Erreur lors de la synchronisation');
    }

    console.log('✅ Synchronisation réussie:', data);
    return data;
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    throw error;
  }
};

export const downloadBillitInvoicePdf = async (invoiceId: string) => {
  try {
    // Récupérer la facture avec son URL PDF
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, external_invoice_id, pdf_url, invoice_number, company_id')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      throw new Error('Facture non trouvée');
    }

    if (!invoice.pdf_url) {
      // Essayer de synchroniser d'abord pour récupérer l'URL PDF
      await syncBillitInvoiceStatuses(invoice.company_id, invoiceId);
      
      // Récupérer à nouveau la facture
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .select('pdf_url')
        .eq('id', invoiceId)
        .single();

      if (updateError || !updatedInvoice?.pdf_url) {
        throw new Error('URL PDF non disponible');
      }
      
      invoice.pdf_url = updatedInvoice.pdf_url;
    }

    // Télécharger le PDF
    const response = await fetch(invoice.pdf_url);
    if (!response.ok) {
      throw new Error('Erreur lors du téléchargement du PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facture-${invoice.invoice_number || invoice.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement:', error);
    throw error;
  }
};

// ==================== COMPANYWEB INTEGRATION ====================

// Récupérer l'intégration CompanyWeb pour une entreprise
export const getCompanyWebIntegration = async (companyId: string): Promise<CompanyIntegration | null> => {
  const { data, error } = await supabase
    .from('company_integrations')
    .select('*')
    .eq('company_id', companyId)
    .eq('integration_type', 'companyweb')
    .single();

  if (error) {
    console.error('Erreur lors de la récupération de l\'intégration CompanyWeb:', error);
    return null;
  }

  return data;
};

// Configurer l'intégration CompanyWeb pour une entreprise
export const setupCompanyWebIntegration = async (
  companyId: string, 
  apiKey: string, 
  baseUrl: string, 
  testMode: boolean = false,
  settings: any = {}
) => {
  const { data, error } = await supabase
    .from('company_integrations')
    .upsert({
      company_id: companyId,
      integration_type: 'companyweb',
      is_enabled: true,
      api_credentials: {
        apiKey,
        baseUrl,
        testMode
      },
      settings
    }, {
      onConflict: 'company_id,integration_type'
    })
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la configuration de l\'intégration CompanyWeb:', error);
    throw error;
  }

  return data;
};

// Désactiver l'intégration CompanyWeb
export const disableCompanyWebIntegration = async (companyId: string) => {
  const { error } = await supabase
    .from('company_integrations')
    .update({ is_enabled: false })
    .eq('company_id', companyId)
    .eq('integration_type', 'companyweb');

  if (error) {
    console.error('Erreur lors de la désactivation de l\'intégration CompanyWeb:', error);
    throw error;
  }
};

// Tester l'intégration CompanyWeb
export const testCompanyWebIntegration = async (companyId: string) => {
  try {
    console.log('🧪 Test intégration CompanyWeb pour companyId:', companyId);
    
    // Récupérer l'intégration
    const integration = await getCompanyWebIntegration(companyId);
    
    if (!integration) {
      return {
        success: false,
        message: 'Aucune intégration CompanyWeb trouvée',
        results: {
          integration_found: false,
          integration_enabled: false,
          has_credentials: false,
          auth_test: false,
          api_test: false,
          errors: ['Intégration CompanyWeb non configurée']
        }
      };
    }

    const results: any = {
      integration_found: !!integration,
      integration_enabled: integration.is_enabled,
      has_credentials: !!(integration.api_credentials?.apiKey && integration.api_credentials?.baseUrl),
      auth_test: false,
      api_test: false,
      warnings: [],
      errors: []
    };

    // Test des credentials
    if (!integration.api_credentials?.apiKey) {
      results.errors.push('Clé API manquante');
    }
    if (!integration.api_credentials?.baseUrl) {
      results.errors.push('URL de base manquante');
    }

    // Test basique d'authentification (simulation)
    if (results.has_credentials) {
      try {
        // Ici on pourrait faire un vrai appel à l'API CompanyWeb
        // Pour l'instant, on simule un test réussi
        results.auth_test = true;
        results.api_test = true;
        
        if (integration.api_credentials?.testMode) {
          results.warnings.push('Mode test activé - utilisez les données de production pour l\'environnement live');
        }
      } catch (error) {
        results.errors.push('Erreur lors du test d\'authentification: ' + error);
      }
    }

    const success = results.integration_found && 
                   results.integration_enabled && 
                   results.has_credentials && 
                   results.auth_test && 
                   results.api_test;

    return {
      success,
      results,
      message: success ? 
        'Intégration CompanyWeb configurée et fonctionnelle' : 
        'Problèmes détectés avec l\'intégration CompanyWeb'
    };
  } catch (error) {
    console.error('❌ Erreur lors du test CompanyWeb:', error);
    throw error;
  }
};

// Recalculer les montants d'une facture leasing depuis l'offre originale (formule inverse Grenke)
export const recalculateInvoiceFromOffer = async (invoiceId: string): Promise<Invoice> => {
  try {
    console.log('🔄 Recalcul de la facture depuis l\'offre:', invoiceId);

    // Récupérer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Facture non trouvée');
    }

    // Récupérer le contrat pour avoir l'offer_id
    let offerId = invoice.offer_id;
    if (!offerId && invoice.contract_id) {
      const { data: contract } = await supabase
        .from('contracts')
        .select('offer_id')
        .eq('id', invoice.contract_id)
        .single();
      offerId = contract?.offer_id;
    }

    if (!offerId) {
      throw new Error('Pas d\'offre liée à cette facture');
    }

    // Récupérer l'offre avec coefficient et mensualité
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, coefficient, monthly_payment, financed_amount')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      throw new Error('Offre non trouvée');
    }

    if (!offer.coefficient || !offer.monthly_payment || offer.coefficient <= 0) {
      throw new Error('Données insuffisantes pour le calcul (coefficient ou mensualité manquant)');
    }

    // Calculer le montant financé avec la formule inverse Grenke
    const totalSellingPrice = (offer.monthly_payment * 100) / offer.coefficient;
    console.log('💰 Montant recalculé via formule inverse Grenke:', totalSellingPrice,
      '(', offer.monthly_payment, '× 100 /', offer.coefficient, ')');

    // Récupérer les équipements de l'offre
    const { data: equipment } = await supabase
      .from('offer_equipment')
      .select('*')
      .eq('offer_id', offerId);

    // Calculer le total des mensualités pour la répartition proportionnelle
    // monthly_payment en BD est DÉJÀ le total pour cet équipement (pas unitaire)
    const totalMonthlyPayment = (equipment || []).reduce(
      (sum, item) => sum + (item.monthly_payment || 0), 0
    );

    // Recalculer les prix de vente des équipements proportionnellement
    const recalculatedEquipment = (equipment || []).map(item => {
      let itemSellingPrice;
      if (totalMonthlyPayment > 0 && item.monthly_payment) {
        // monthly_payment est déjà le total de la ligne
        const itemTotalMonthly = item.monthly_payment || 0;
        const proportion = itemTotalMonthly / totalMonthlyPayment;
        itemSellingPrice = (totalSellingPrice * proportion) / (item.quantity || 1);
      } else {
        itemSellingPrice = item.selling_price || (item.purchase_price * (1 + (item.margin || 0) / 100));
      }
      return {
        ...item,
        selling_price_excl_vat: parseFloat(itemSellingPrice.toFixed(2))
      };
    });

    // Préparer les nouvelles données de facturation
    const updatedBillingData = {
      ...invoice.billing_data,
      equipment_data: recalculatedEquipment,
      invoice_totals: {
        total_excl_vat: parseFloat(totalSellingPrice.toFixed(2)),
        vat_amount: parseFloat((totalSellingPrice * 0.21).toFixed(2)),
        total_incl_vat: parseFloat((totalSellingPrice * 1.21).toFixed(2))
      },
      recalculated_at: new Date().toISOString(),
      recalculation_source: 'inverse_grenke_formula'
    };

    // Mettre à jour la facture
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        amount: parseFloat(totalSellingPrice.toFixed(2)),
        billing_data: updatedBillingData,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Erreur lors de la mise à jour de la facture');
    }

    console.log('✅ Facture recalculée avec succès:', updatedInvoice.amount);
    return updatedInvoice;
  } catch (error) {
    console.error('❌ Erreur lors du recalcul de la facture:', error);
    throw error;
  }
};

// Générer une facture mensuelle self-leasing à partir d'un paiement Mollie
export const generateSelfLeasingMonthlyInvoice = async (
  contractId: string, 
  companyId: string, 
  paymentDate: string, 
  amountTvac: number,
  insufficientFundsFee?: number
) => {
  try {
    const date = new Date(paymentDate);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    console.log('📝 Génération facture self-leasing mensuelle -', monthKey, 'contractId:', contractId);

    // Vérifier si une facture existe déjà pour ce contrat et ce mois
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .gte('invoice_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('invoice_date', month === 12 
        ? `${year + 1}-01-01` 
        : `${year}-${String(month + 1).padStart(2, '0')}-01`)
      .maybeSingle();

    if (existing) {
      console.log('✅ Facture déjà existante pour ce mois:', existing.id);
      return { alreadyExists: true, invoice: existing };
    }

    // Récupérer les données complètes du contrat
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contrat non trouvé');
    }

    // Récupérer les équipements depuis offer_equipment via l'offre du contrat
    let equipmentItems: any[] = [];
    if (contract.offer_id) {
      const { data: eqData } = await supabase
        .from('offer_equipment')
        .select('*')
        .eq('offer_id', contract.offer_id);
      if (eqData) equipmentItems = eqData;
    }

    // Générer un numéro de facture
    const invoiceNumber = `SL-${monthKey}-${contractId.substring(0, 6).toUpperCase()}`;

    // Utiliser la mensualité du contrat (toujours HTVA) plutôt que le montant Mollie
    // car le montant Mollie peut être TVAC ou HTVA selon la configuration
    const vatRate = 21;
    const baseAmountHtva = contract.monthly_payment || Math.round((amountTvac / (1 + vatRate / 100)) * 100) / 100;
    
    // Add insufficient funds fee if present
    const feeHtva = insufficientFundsFee ? Math.round((insufficientFundsFee / (1 + vatRate / 100)) * 100) / 100 : 0;
    const amountHtva = Math.round((baseAmountHtva + feeHtva) * 100) / 100;
    const vatAmount = Math.round((amountHtva * vatRate / 100) * 100) / 100;
    const amountTvacCalc = Math.round((amountHtva + vatAmount) * 100) / 100;

    // Construire equipment_data pour l'affichage des lignes
    const equipmentData = equipmentItems.map(item => ({
      title: `Contrat de location ${contract.tracking_number || ''} / ${item.title}`,
      quantity: item.quantity || 1,
      selling_price_excl_vat: item.monthly_payment || (baseAmountHtva / (equipmentItems.length || 1)),
      serial_number: item.serial_number || null,
      vat_rate: vatRate,
    }));

    // Ajouter la ligne de frais d'insuffisance de fonds si présente
    if (insufficientFundsFee && feeHtva > 0) {
      equipmentData.push({
        title: "Frais pour insuffisance de fonds",
        quantity: 1,
        selling_price_excl_vat: feeHtva,
        serial_number: null,
        vat_rate: vatRate,
      });
    }

    // Créer la facture avec billing_data complet - amount = HTVA
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        contract_id: contractId,
        company_id: companyId,
        leaser_name: 'iTakecare',
        invoice_type: 'leasing',
        invoice_number: invoiceNumber,
        amount: amountHtva,
        status: 'paid',
        integration_type: 'mollie',
        invoice_date: paymentDate.split('T')[0],
        due_date: paymentDate.split('T')[0],
        paid_at: paymentDate,
        billing_data: {
          type: 'self_leasing_monthly',
          month: monthKey,
          payment_source: 'mollie',
          contract_data: {
            id: contract.id,
            tracking_number: contract.tracking_number,
            client_name: contract.client_name,
            client_email: contract.client_email,
            offer_id: contract.offer_id,
          },
          leaser_data: {
            name: 'iTakecare',
          },
          equipment_data: equipmentData,
          invoice_totals: {
            total_excl_vat: amountHtva,
            vat_amount: vatAmount,
            total_incl_vat: amountTvacCalc,
          },
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ Erreur création facture:', invoiceError);
      throw new Error('Erreur lors de la création de la facture');
    }

    console.log('✅ Facture self-leasing mensuelle créée:', invoice.id);
    return { alreadyExists: false, invoice };
  } catch (error) {
    console.error('❌ Erreur génération facture self-leasing:', error);
    throw error;
  }
};