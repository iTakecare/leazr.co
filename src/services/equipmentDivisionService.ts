import { supabase } from "@/integrations/supabase/client";
import { Equipment } from "@/types/equipment";

export interface ContractEquipment {
  id: string;
  title: string;
  quantity: number;
  purchase_price: number;
  margin: number;
  monthly_payment?: number;
  serial_number?: string;
  contract_id: string;
  collaborator_id?: string;
  parent_equipment_id?: string;
  is_individual?: boolean;
  individual_serial_number?: string;
  created_at: string;
  updated_at: string;
}

export interface DivisionConfig {
  equipmentId: string;
  serialNumbers?: string[];
  keepOriginal?: boolean;
}

/**
 * Divise un équipement en plusieurs équipements individuels
 */
export const divideEquipment = async (config: DivisionConfig): Promise<ContractEquipment[]> => {
  const { equipmentId, serialNumbers = [], keepOriginal = false } = config;

  // Récupérer l'équipement original
  const { data: originalEquipment, error: fetchError } = await supabase
    .from('contract_equipment')
    .select('*')
    .eq('id', equipmentId)
    .single();

  if (fetchError || !originalEquipment) {
    throw new Error('Équipement non trouvé');
  }

  if (originalEquipment.is_individual) {
    throw new Error('Cet équipement est déjà individuel');
  }

  // Analyser les numéros de série existants
  const existingSerials = originalEquipment.serial_number 
    ? originalEquipment.serial_number.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const allSerials = serialNumbers.length > 0 ? serialNumbers : existingSerials;
  const totalQuantity = Math.max(originalEquipment.quantity, allSerials.length);

  // Créer les équipements individuels
  const individualEquipments: Partial<ContractEquipment>[] = [];
  
  for (let i = 0; i < totalQuantity; i++) {
    individualEquipments.push({
      title: originalEquipment.title,
      quantity: 1,
      purchase_price: originalEquipment.purchase_price,
      margin: originalEquipment.margin,
      monthly_payment: originalEquipment.monthly_payment,
      contract_id: originalEquipment.contract_id,
      parent_equipment_id: equipmentId,
      is_individual: true,
      individual_serial_number: allSerials[i] || null,
    });
  }

  // Insérer les équipements individuels
  const { data: createdEquipments, error: createError } = await supabase
    .from('contract_equipment')
    .insert(individualEquipments)
    .select();

  if (createError) {
    throw new Error(`Erreur lors de la création des équipements individuels: ${createError.message}`);
  }

  // Marquer l'équipement original comme divisé (ou le supprimer selon le paramètre)
  if (!keepOriginal) {
    const { error: updateError } = await supabase
      .from('contract_equipment')
      .update({ 
        quantity: 0,  // Marquer comme divisé
        serial_number: null
      })
      .eq('id', equipmentId);

    if (updateError) {
      console.warn('Erreur lors de la mise à jour de l\'équipement original:', updateError);
    }
  }

  return createdEquipments || [];
};

/**
 * Reconstitue un équipement divisé (regroupe les équipements individuels)
 */
export const mergeIndividualEquipments = async (parentEquipmentId: string): Promise<boolean> => {
  // Récupérer tous les équipements individuels
  const { data: individualEquipments, error: fetchError } = await supabase
    .from('contract_equipment')
    .select('*')
    .eq('parent_equipment_id', parentEquipmentId)
    .eq('is_individual', true);

  if (fetchError) {
    throw new Error('Erreur lors de la récupération des équipements individuels');
  }

  if (!individualEquipments || individualEquipments.length === 0) {
    throw new Error('Aucun équipement individuel trouvé');
  }

  // Vérifier que tous sont non-assignés
  const assignedCount = individualEquipments.filter(eq => eq.collaborator_id).length;
  if (assignedCount > 0) {
    throw new Error(`${assignedCount} équipement(s) sont déjà assignés et ne peuvent pas être regroupés`);
  }

  // Supprimer les équipements individuels
  const { error: deleteError } = await supabase
    .from('contract_equipment')
    .delete()
    .eq('parent_equipment_id', parentEquipmentId)
    .eq('is_individual', true);

  if (deleteError) {
    throw new Error('Erreur lors de la suppression des équipements individuels');
  }

  // Restaurer l'équipement original
  const serialNumbers = individualEquipments
    .map(eq => eq.individual_serial_number)
    .filter(Boolean)
    .join(', ');

  const { error: updateError } = await supabase
    .from('contract_equipment')
    .update({
      quantity: individualEquipments.length,
      serial_number: serialNumbers || null
    })
    .eq('id', parentEquipmentId);

  if (updateError) {
    throw new Error('Erreur lors de la restauration de l\'équipement original');
  }

  return true;
};

/**
 * Récupère tous les équipements d'un contrat (y compris individuels)
 */
export const getContractEquipmentWithIndividuals = async (contractId: string): Promise<ContractEquipment[]> => {
  const { data, error } = await supabase
    .from('contract_equipment')
    .select(`
      *,
      collaborators(
        id,
        name,
        email
      )
    `)
    .eq('contract_id', contractId)
    .or('quantity.gt.0,is_individual.eq.true') // Exclure les équipements divisés (quantity = 0) sauf les individuels
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Erreur lors de la récupération des équipements: ${error.message}`);
  }

  return data || [];
};

/**
 * Assigne un équipement individuel à un collaborateur
 */
export const assignIndividualEquipment = async (
  equipmentId: string, 
  collaboratorId: string | null
): Promise<boolean> => {
  const { error } = await supabase
    .from('contract_equipment')
    .update({ collaborator_id: collaboratorId })
    .eq('id', equipmentId);

  if (error) {
    throw new Error(`Erreur lors de l'assignation: ${error.message}`);
  }

  return true;
};