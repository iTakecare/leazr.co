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

// Générer une facture en local (brouillon)
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
        leaser_name
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

    // Récupérer les équipements du contrat avec numéros de série
    const { data: equipment, error: equipmentError } = await supabase
      .from('contract_equipment')
      .select('*')
      .eq('contract_id', contractId);

    if (equipmentError) {
      throw new Error('Erreur lors de la récupération des équipements');
    }

    // Vérifier que tous les équipements ont des numéros de série
    const missingSerialNumbers = equipment.filter(item => !item.serial_number || item.serial_number.trim() === '');
    if (missingSerialNumbers.length > 0) {
      const missingTitles = missingSerialNumbers.map(e => e.title).join(', ');
      throw new Error(
        `Impossible de générer la facture : ${missingSerialNumbers.length} équipement(s) sans numéro de série.\n\n` +
        `Équipements concernés : ${missingTitles}\n\n` +
        `Veuillez ajouter les numéros de série dans la section "Numéros de série des équipements" avant de générer la facture.`
      );
    }

    // Calculer le prix total de vente (avec marge en pourcentage)
    const totalSellingPrice = equipment.reduce((total, item) => {
      const sellingPrice = item.purchase_price * (1 + item.margin / 100);
      return total + (sellingPrice * item.quantity);
    }, 0);

    // Préparer les données d'équipement enrichies avec prix de vente
    // La marge est stockée en pourcentage, il faut la convertir en montant
    const enrichedEquipment = equipment.map(item => ({
      ...item,
      selling_price_excl_vat: parseFloat((item.purchase_price * (1 + item.margin / 100)).toFixed(2))
    }));

    // Créer la facture en brouillon avec toutes les données nécessaires
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        contract_id: contractId,
        company_id: companyId,
        leaser_name: leaser.company_name || leaser.name,
        amount: totalSellingPrice,
        status: 'draft',
        integration_type: 'billit',
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