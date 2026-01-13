import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getOfferEquipment } from "./offers/offerEquipment";

export const contractStatuses = {
  CONTRACT_SENT: "contract_sent",
  CONTRACT_SIGNED: "contract_signed",
  EQUIPMENT_ORDERED: "equipment_ordered",
  DELIVERED: "delivered",
  ACTIVE: "active",
  EXTENDED: "extended",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
};

export interface Contract {
  id: string;
  offer_id: string;
  offer_dossier_number?: string;
  client_name: string;
  client_id?: string;
  client_email?: string;
  client_phone?: string;
  clients?: {
    name: string;
    email: string;
    company: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    vat_number?: string | null;
    billing_address?: string | null;
    billing_city?: string | null;
    billing_postal_code?: string | null;
  } | null;
  monthly_payment: number;
  adjusted_monthly_payment?: number;
  down_payment?: number;
  coefficient?: number;
  financed_amount?: number;
  amount?: number;
  lease_duration?: number;
  equipment_description?: string;
  status: string;
  leaser_name: string;
  leaser_id?: string;
  leaser_logo?: string;
  created_at: string;
  updated_at?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  delivery_status?: string;
  delivery_carrier?: string;
  contract_number?: string;
  dossier_date?: string;
  invoice_date?: string;
  payment_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  delivery_date?: string;
  is_self_leasing?: boolean;
  special_provisions?: string;
}

export interface ContractEquipment {
  id: string;
  contract_id: string;
  title: string;
  purchase_price: number;
  quantity: number;
  margin: number;
  monthly_payment?: number;
  serial_number?: string;
  attributes: Array<{ key: string; value: string }>;
  specifications: Array<{ key: string; value: string }>;
  // Delivery information fields
  collaborator_id?: string;
  delivery_site_id?: string;
  delivery_type?: 'main_client' | 'collaborator' | 'predefined_site' | 'specific_address';
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  delivery_contact_name?: string;
  delivery_contact_email?: string;
  delivery_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractDocument {
  id: string;
  contract_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: string;
  status: string;
  admin_notes?: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContractCreateData {
  offer_id: string;
  client_name: string;
  client_id?: string;
  monthly_payment: number;
  equipment_description?: string;
  leaser_name: string;
  leaser_logo?: string;
  user_id: string;
}

// Nouvelle fonction pour récupérer un contrat par ID avec toutes ses données
export const getContractById = async (contractId: string): Promise<Contract | null> => {
  try {
    console.log("🔍 Récupération du contrat:", contractId);

    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *, 
        clients(name, email, company, phone, address, city, postal_code, vat_number, billing_address, billing_city, billing_postal_code),
        offers!inner(dossier_number, down_payment, coefficient, financed_amount),
        contract_equipment(id, monthly_payment, quantity)
      `)
      .eq('id', contractId)
      .single();

    if (error) {
      console.error("❌ Erreur lors de la récupération du contrat:", error);
      return null;
    }

    if (!data) {
      console.error("❌ Contrat non trouvé:", contractId);
      return null;
    }

    // Calculer la mensualité réelle depuis les équipements
    // monthly_payment en DB est DÉJÀ le total pour chaque équipement (pas unitaire)
    const calculatedMonthlyPayment = data.contract_equipment?.reduce(
      (sum: number, eq: any) => sum + (Number(eq.monthly_payment) || 0),
      0
    ) || 0;

    // Calculer la mensualité ajustée si acompte et self-leasing
    const downPayment = Number(data.offers?.down_payment) || 0;
    const coefficient = Number(data.offers?.coefficient) || 0;
    const financedAmount = Number(data.offers?.financed_amount) || 0;
    const isSelfLeasing = data.is_self_leasing === true;
    
    let adjustedMonthlyPayment = calculatedMonthlyPayment > 0 ? calculatedMonthlyPayment : data.monthly_payment;
    if (downPayment > 0 && coefficient > 0 && isSelfLeasing) {
      adjustedMonthlyPayment = Math.round(((financedAmount - downPayment) * coefficient) / 100 * 100) / 100;
    }

    // Reformater les données pour extraire le dossier_number
    const contractData = {
      ...data,
      offer_dossier_number: data.offers?.dossier_number,
      down_payment: downPayment,
      coefficient: coefficient,
      financed_amount: financedAmount,
      // Utiliser le montant calculé s'il y a des équipements, sinon garder la valeur stockée
      monthly_payment: calculatedMonthlyPayment > 0 ? calculatedMonthlyPayment : data.monthly_payment,
      adjusted_monthly_payment: adjustedMonthlyPayment
    };

    console.log("✅ Contrat récupéré avec succès:", contractData);
    return contractData;
  } catch (error) {
    console.error("❌ Exception lors de la récupération du contrat:", error);
    return null;
  }
};

// Nouvelle fonction pour récupérer les équipements d'un contrat
export const getContractEquipment = async (contractId: string): Promise<ContractEquipment[]> => {
  try {
    console.log("🔍 Récupération des équipements du contrat:", contractId);

    const { data: equipmentData, error: equipmentError } = await supabase
      .from('contract_equipment')
      .select(`
        *,
        contract_equipment_attributes(key, value),
        contract_equipment_specifications(key, value)
      `)
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true });

    if (equipmentError) {
      console.error("❌ Erreur lors de la récupération des équipements:", equipmentError);
      return [];
    }

    const formattedEquipment = equipmentData?.map(item => ({
      ...item,
      attributes: item.contract_equipment_attributes || [],
      specifications: item.contract_equipment_specifications || []
    })) || [];

    console.log("✅ Équipements du contrat récupérés:", formattedEquipment);
    return formattedEquipment;
  } catch (error) {
    console.error("❌ Exception lors de la récupération des équipements:", error);
    return [];
  }
};

// Nouvelle fonction pour récupérer les documents d'un contrat
export const getContractDocuments = async (contractId: string): Promise<ContractDocument[]> => {
  try {
    console.log("🔍 Récupération des documents du contrat:", contractId);

    const { data, error } = await supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Erreur lors de la récupération des documents:", error);
      return [];
    }

    console.log("✅ Documents du contrat récupérés:", data || []);
    return data || [];
  } catch (error) {
    console.error("❌ Exception lors de la récupération des documents:", error);
    return [];
  }
};

// Fonction pour créer les équipements du contrat depuis l'offre
const createContractEquipmentFromOffer = async (contractId: string, offerId: string): Promise<boolean> => {
  try {
    console.log("🔧 Création des équipements du contrat depuis l'offre:", { contractId, offerId });

    // Récupérer les équipements de l'offre
    const offerEquipment = await getOfferEquipment(offerId);
    
    if (offerEquipment.length === 0) {
      console.log("ℹ️ Aucun équipement trouvé dans l'offre");
      return true;
    }

    for (const equipment of offerEquipment) {
      console.log("📝 Création de l'équipement:", equipment.title);

      // Créer l'équipement du contrat
      const { data: contractEquipmentData, error: equipmentError } = await supabase
        .from('contract_equipment')
        .insert({
          contract_id: contractId,
          title: equipment.title,
          purchase_price: equipment.purchase_price,
          quantity: equipment.quantity,
          margin: equipment.margin,
          monthly_payment: equipment.monthly_payment,
          serial_number: equipment.serial_number
        })
        .select()
        .single();

      if (equipmentError) {
        console.error("❌ Erreur lors de la création de l'équipement:", equipmentError);
        continue;
      }

      const contractEquipmentId = contractEquipmentData.id;

      // Créer les attributs
      if (equipment.attributes && equipment.attributes.length > 0) {
        const attributesData = equipment.attributes.map(attr => ({
          equipment_id: contractEquipmentId,
          key: attr.key,
          value: attr.value
        }));

        const { error: attributesError } = await supabase
          .from('contract_equipment_attributes')
          .insert(attributesData);

        if (attributesError) {
          console.error("❌ Erreur lors de la création des attributs:", attributesError);
        }
      }

      // Créer les spécifications
      if (equipment.specifications && equipment.specifications.length > 0) {
        const specificationsData = equipment.specifications.map(spec => ({
          equipment_id: contractEquipmentId,
          key: spec.key,
          value: spec.value
        }));

        const { error: specificationsError } = await supabase
          .from('contract_equipment_specifications')
          .insert(specificationsData);

        if (specificationsError) {
          console.error("❌ Erreur lors de la création des spécifications:", specificationsError);
        }
      }
    }

    console.log("✅ Équipements du contrat créés avec succès");
    return true;
  } catch (error) {
    console.error("❌ Exception lors de la création des équipements:", error);
    return false;
  }
};

export const createContractFromOffer = async (
  offerId: string,
  leaserName: string,
  leaserLogo?: string,
  isSelfLeasing: boolean = false
): Promise<string | null> => {
  try {
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select('*, clients(name, email, company)')
      .eq('id', offerId)
      .single();

    if (offerError || !offerData) {
      console.error("Erreur lors de la récupération de l'offre:", offerError);
      toast.error("Impossible de créer le contrat : offre non trouvée");
      return null;
    }

    console.log("📋 Données de l'offre pour création du contrat:", {
      id: offerData.id,
      client_name: offerData.client_name,
      monthly_payment: offerData.monthly_payment,
      company_id: offerData.company_id,
      user_id: offerData.user_id,
      isSelfLeasing
    });

    // For self-leasing, also check if leaser is_own_company
    let actualIsSelfLeasing = isSelfLeasing;
    if (!actualIsSelfLeasing && offerData.leaser_id) {
      const { data: leaserData } = await supabase
        .from('leasers')
        .select('is_own_company')
        .eq('id', offerData.leaser_id)
        .single();
      if (leaserData?.is_own_company) {
        actualIsSelfLeasing = true;
        console.log("Detected self-leasing based on leaser.is_own_company");
      }
    }

    // Generate contract number for self-leasing contracts
    let contractNumber: string | null = null;
    if (actualIsSelfLeasing && offerData.company_id) {
      const { data: generatedNumber, error: numberError } = await supabase.rpc(
        'generate_self_leasing_contract_number',
        { p_company_id: offerData.company_id }
      );
      
      if (numberError) {
        console.error("Erreur lors de la génération du numéro de contrat:", numberError);
      } else {
        contractNumber = generatedNumber;
        console.log("✅ Numéro de contrat généré:", contractNumber);
      }
    }

    const contractData = {
      offer_id: offerId,
      client_name: offerData.client_name,
      client_id: offerData.client_id,
      monthly_payment: offerData.monthly_payment,
      equipment_description: offerData.equipment_description,
      leaser_id: offerData.leaser_id,
      leaser_name: leaserName,
      leaser_logo: leaserLogo || null,
      status: contractStatuses.CONTRACT_SENT,
      user_id: offerData.user_id,
      company_id: offerData.company_id,
      is_self_leasing: actualIsSelfLeasing,
      contract_number: contractNumber
    };

    console.log("💾 Données du contrat à créer:", contractData);

    const { data, error } = await supabase
      .from('contracts')
      .insert(contractData)
      .select();

    if (error) {
      console.error("Erreur lors de la création du contrat:", error);
      toast.error("Erreur lors de la création du contrat");
      return null;
    }

    console.log("✅ Contrat créé avec succès:", data?.[0]);

    const contractId = data?.[0]?.id;
    if (contractId) {
      // Créer les équipements détaillés du contrat
      await createContractEquipmentFromOffer(contractId, offerId);
    }

    // Marquer l'offre comme convertie en contrat avec le statut "accepted"
    const { error: updateError } = await supabase
      .from('offers')
      .update({ 
        converted_to_contract: true,
        status: 'accepted',
        workflow_status: 'accepted'
      })
      .eq('id', offerId);

    if (updateError) {
      console.error("Erreur lors de la mise à jour de l'offre:", updateError);
    }

    return contractId || null;
  } catch (error) {
    console.error("Erreur lors de la création du contrat:", error);
    toast.error("Erreur lors de la création du contrat");
    return null;
  }
};

// Fonction pour mettre à jour le numéro de série d'un équipement
export const updateEquipmentSerialNumber = async (
  equipmentId: string,
  serialNumber: string
): Promise<boolean> => {
  try {
    console.log("🔧 Mise à jour du numéro de série:", { equipmentId, serialNumber });

    const { error } = await supabase
      .from('contract_equipment')
      .update({ 
        serial_number: serialNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', equipmentId);

    if (error) {
      console.error("❌ Erreur lors de la mise à jour du numéro de série:", error);
      return false;
    }

    console.log("✅ Numéro de série mis à jour avec succès");
    return true;
  } catch (error) {
    console.error("❌ Exception lors de la mise à jour du numéro de série:", error);
    return false;
  }
};

// Fonction pour uploader un document de contrat
export const uploadContractDocument = async (
  contractId: string,
  file: File,
  documentType: string
): Promise<boolean> => {
  try {
    console.log("📤 Upload d'un document de contrat:", { contractId, fileName: file.name, documentType });

    // Upload du fichier vers Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${contractId}_${documentType}_${Date.now()}.${fileExt}`;
    const filePath = `contracts/${contractId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, file);

    if (uploadError) {
      console.error("❌ Erreur lors de l'upload du fichier:", uploadError);
      toast.error("Erreur lors de l'upload du fichier");
      return false;
    }

    // Créer l'entrée dans la base de données
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error: dbError } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: contractId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id,
        status: 'pending'
      });

    if (dbError) {
      console.error("❌ Erreur lors de l'enregistrement du document:", dbError);
      toast.error("Erreur lors de l'enregistrement du document");
      return false;
    }

    console.log("✅ Document uploadé avec succès");
    toast.success("Document uploadé avec succès");
    return true;
  } catch (error) {
    console.error("❌ Exception lors de l'upload du document:", error);
    toast.error("Erreur lors de l'upload du document");
    return false;
  }
};

export const getContracts = async (includeCompleted = true): Promise<Contract[]> => {
  try {
    let query = supabase
      .from('contracts')
      .select(`
        *, 
        clients(name, email, company),
        offers!inner(dossier_number, down_payment, coefficient, financed_amount),
        contract_equipment(id, title, monthly_payment, quantity)
      `)
    if (!includeCompleted) {
      query = query.neq('status', contractStatuses.COMPLETED);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reformater les données et calculer la vraie mensualité depuis les équipements
    const contracts = data?.map(contract => {
      // monthly_payment en DB est DÉJÀ le total pour chaque équipement (pas unitaire)
      const calculatedMonthlyPayment = contract.contract_equipment?.reduce(
        (sum: number, eq: any) => sum + (Number(eq.monthly_payment) || 0),
        0
      ) || 0;
      
      // Calculer la mensualité ajustée si acompte et self-leasing
      const downPayment = Number(contract.offers?.down_payment) || 0;
      const coefficient = Number(contract.offers?.coefficient) || 0;
      const financedAmount = Number(contract.offers?.financed_amount) || 0;
      const isSelfLeasing = contract.is_self_leasing === true;
      
      const baseMonthlyPayment = calculatedMonthlyPayment > 0 ? calculatedMonthlyPayment : contract.monthly_payment;
      let adjustedMonthlyPayment = baseMonthlyPayment;
      if (downPayment > 0 && coefficient > 0 && isSelfLeasing) {
        adjustedMonthlyPayment = Math.round(((financedAmount - downPayment) * coefficient) / 100 * 100) / 100;
      }
      
      // Générer equipment_description à partir de contract_equipment si non défini
      let equipmentDescription = contract.equipment_description;
      if (!equipmentDescription && contract.contract_equipment && contract.contract_equipment.length > 0) {
        equipmentDescription = contract.contract_equipment
          .map((eq: any) => {
            const title = eq.title || 'Équipement';
            const qty = eq.quantity || 1;
            return qty > 1 ? `${title} (x${qty})` : title;
          })
          .join(', ');
      }
      
      return {
        ...contract,
        equipment_description: equipmentDescription,
        offer_dossier_number: contract.offers?.dossier_number,
        down_payment: downPayment,
        coefficient: coefficient,
        financed_amount: financedAmount,
        // Utiliser le montant calculé s'il y a des équipements, sinon garder la valeur stockée
        monthly_payment: baseMonthlyPayment,
        adjusted_monthly_payment: adjustedMonthlyPayment
      };
    }) || [];

    // Trier par contract_start_date (ou created_at si non définie) - les plus récents en premier
    contracts.sort((a, b) => {
      const dateA = new Date(a.contract_start_date || a.created_at).getTime();
      const dateB = new Date(b.contract_start_date || b.created_at).getTime();
      return dateB - dateA;
    });

    console.log('Contrats récupérés:', contracts.length, 'dont terminés:', contracts.filter(c => c.status === 'completed').length);
    console.log('Statuts des contrats:', contracts.map(c => ({ name: c.client_name, status: c.status })));

    return contracts;
  } catch (error) {
    console.error("Erreur lors de la récupération des contrats:", error);
    toast.error("Erreur lors du chargement des contrats");
    return [];
  }
};

export const updateContractStatus = async (
  contractId: string,
  newStatus: string,
  previousStatus: string,
  reason?: string
): Promise<boolean> => {
  try {
    console.log(`Mise à jour du contrat ${contractId} de ${previousStatus} à ${newStatus} avec raison: ${reason || 'Aucune'}`);

    // Mettre à jour le statut du contrat
    const { error } = await supabase
      .from('contracts')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (error) {
      console.error("Erreur lors de la mise à jour du contrat:", error);
      return false;
    }

    // Créer un log de workflow - essayer d'abord avec RPC, sinon insertion directe
    try {
      const { error: logError } = await supabase
        .rpc('create_contract_workflow_log', {
          p_contract_id: contractId,
          p_previous_status: previousStatus,
          p_new_status: newStatus,
          p_reason: reason || null
        });

      if (logError) {
        console.warn("RPC non disponible, création du log directement");
        // Fallback: créer le log directement
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase
          .from('contract_workflow_logs')
          .insert({
            contract_id: contractId,
            user_id: user?.id,
            previous_status: previousStatus,
            new_status: newStatus,
            reason: reason || null,
            user_name: 'Utilisateur système'
          });
      }
    } catch (error) {
      console.error("Erreur lors de la création du log de workflow:", error);
      // Ne pas bloquer l'opération si le log échoue
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut du contrat:", error);
    return false;
  }
};


export const deleteContract = async (contractId: string): Promise<boolean> => {
  try {
    console.log("🗑️ Suppression du contrat:", contractId);

    // Supprimer le contrat - les logs seront supprimés automatiquement grâce à CASCADE
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId);

    if (error) {
      console.error("❌ Erreur lors de la suppression du contrat:", error);
      return false;
    }

    console.log("✅ Contrat supprimé avec succès");
    return true;
  } catch (error) {
    console.error("❌ Exception lors de la suppression du contrat:", error);
    return false;
  }
};

export const addTrackingNumber = async (
  contractId: string,
  trackingNumber: string,
  estimatedDelivery?: string,
  carrier?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contracts')
      .update({
        tracking_number: trackingNumber,
        estimated_delivery: estimatedDelivery,
        delivery_carrier: carrier,
        delivery_status: 'en_attente',
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (error) {
      console.error("Erreur lors de l'ajout du numéro de suivi:", error);
      return false;
    }

    // Créer un log pour l'ajout du tracking
    try {
      const { error: logError } = await supabase
        .rpc('create_contract_workflow_log', {
          p_contract_id: contractId,
          p_previous_status: 'equipment_ordered',
          p_new_status: 'equipment_ordered',
          p_reason: `Numéro de suivi ajouté: ${trackingNumber}${carrier ? ` (${carrier})` : ''}${estimatedDelivery ? ` - Livraison estimée: ${estimatedDelivery}` : ''}`
        });

      if (logError) {
        console.warn("RPC non disponible, création du log de tracking directement");
        // Fallback: créer le log directement
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase
          .from('contract_workflow_logs')
          .insert({
            contract_id: contractId,
            user_id: user?.id,
            previous_status: 'equipment_ordered',
            new_status: 'equipment_ordered',
            reason: `Numéro de suivi ajouté: ${trackingNumber}${carrier ? ` (${carrier})` : ''}${estimatedDelivery ? ` - Livraison estimée: ${estimatedDelivery}` : ''}`,
            user_name: 'Utilisateur système'
          });
      }
    } catch (error) {
      console.error("Erreur lors de la création du log de workflow:", error);
      // Ne pas bloquer l'opération si le log échoue
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de l'ajout du numéro de suivi:", error);
    return false;
  }
};

export const getContractWorkflowLogs = async (contractId: string): Promise<any[]> => {
  try {
    console.log("🔍 Récupération des logs de workflow du contrat:", contractId);

    // Essayer d'abord la fonction RPC, sinon utiliser une requête directe
    let data, error;
    
    try {
      ({ data, error } = await supabase
        .rpc('get_contract_workflow_logs', { p_contract_id: contractId }));
    } catch (rpcError) {
      console.log("RPC non disponible, utilisation de la requête directe");
      ({ data, error } = await supabase
        .from('contract_workflow_logs')
        .select(`
          id,
          contract_id,
          user_id,
          previous_status,
          new_status,
          reason,
          created_at,
          user_name,
          profiles:user_id(first_name, last_name)
        `)
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false }));
    }

    if (error) {
      console.error("❌ Erreur lors de la récupération des logs:", error);
      return [];
    }

    console.log("✅ Logs de workflow récupérés:", data || []);
    return data || [];
  } catch (error) {
    console.error("❌ Exception lors de la récupération des logs:", error);
    return [];
  }
};

