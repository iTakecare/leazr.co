import { supabase } from '@/integrations/supabase/client';

export interface EquipmentItem {
  id: string;
  title: string;
  collaborator_id: string | null;
  equipment_type: 'offer' | 'contract';
  source_id: string; // offer_id ou contract_id
  source_name: string; // nom de l'offre ou du contrat
  purchase_price?: number;
  quantity?: number;
  serial_number?: string;
  monthly_payment?: number;
}

export interface CollaboratorEquipment {
  collaborator_id: string;
  collaborator_name: string;
  collaborator_email: string;
  equipment: EquipmentItem[];
}

export interface EquipmentAssignmentHistory {
  id: string;
  equipment_type: 'offer' | 'contract';
  equipment_id: string;
  collaborator_id: string;
  collaborator_name: string;
  assigned_by: string;
  assigned_at: string;
  unassigned_at: string | null;
  notes: string | null;
}

export const collaboratorEquipmentService = {
  // Récupérer tous les équipements d'un client
  async getClientEquipment(clientId: string): Promise<EquipmentItem[]> {
    try {
      console.log('🔍 Recherche d\'équipements pour le client:', clientId);
      
      // Récupérer les équipements des offres
      const { data: offerEquipment, error: offerError } = await supabase
        .from('offer_equipment')
        .select(`
          id,
          title,
          collaborator_id,
          purchase_price,
          quantity,
          serial_number,
          offers!inner(id, client_name, client_id)
        `)
        .eq('offers.client_id', clientId);

      if (offerError) {
        console.error('❌ Erreur récupération équipements offres:', offerError);
        throw offerError;
      }

      console.log('📋 Équipements des offres trouvés:', offerEquipment?.length || 0);

      // Récupérer les équipements des contrats
      const { data: contractEquipment, error: contractError } = await supabase
        .from('contract_equipment')
        .select(`
          id,
          title,
          collaborator_id,
          purchase_price,
          quantity,
          serial_number,
          monthly_payment,
          contracts!inner(id, client_name, client_id)
        `)
        .eq('contracts.client_id', clientId);

      if (contractError) {
        console.error('❌ Erreur récupération équipements contrats:', contractError);
        throw contractError;
      }

      console.log('📋 Équipements des contrats trouvés:', contractEquipment?.length || 0);

      // Debug: vérifier les IDs des contrats trouvés
      if (contractEquipment && contractEquipment.length > 0) {
        console.log('🔍 IDs des contrats avec équipements:', contractEquipment.map(e => e.contracts.id));
      }

      // Combiner et formater les données
      const allEquipment: EquipmentItem[] = [
        ...(offerEquipment || []).map(item => ({
          id: item.id,
          title: item.title,
          collaborator_id: item.collaborator_id,
          equipment_type: 'offer' as const,
          source_id: item.offers.id,
          source_name: `Offre - ${item.offers.client_name}`,
          purchase_price: item.purchase_price,
          quantity: item.quantity,
          serial_number: item.serial_number,
        })),
        ...(contractEquipment || []).map(item => ({
          id: item.id,
          title: item.title,
          collaborator_id: item.collaborator_id,
          equipment_type: 'contract' as const,
          source_id: item.contracts.id,
          source_name: `Contrat - ${item.contracts.client_name}`,
          purchase_price: item.purchase_price,
          quantity: item.quantity,
          serial_number: item.serial_number,
          monthly_payment: item.monthly_payment,
        })),
      ];

      return allEquipment;
    } catch (error) {
      console.error('Erreur lors de la récupération des équipements du client:', error);
      throw error;
    }
  },

  // Récupérer les équipements groupés par collaborateur
  async getEquipmentByCollaborator(clientId: string): Promise<CollaboratorEquipment[]> {
    try {
      const equipment = await this.getClientEquipment(clientId);
      
      // Récupérer les collaborateurs
      const { data: collaborators, error: collabError } = await supabase
        .from('collaborators')
        .select('id, name, email')
        .eq('client_id', clientId);

      if (collabError) throw collabError;

      // Si aucun collaborateur n'existe, créer un collaborateur principal avec les infos du client
      let finalCollaborators = collaborators || [];
      if (!finalCollaborators.length) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('name, email, contact_name')
          .eq('id', clientId)
          .single();

        if (clientError) throw clientError;

        if (clientData) {
          // Créer automatiquement un collaborateur principal
          const { data: newCollaborator, error: createError } = await supabase
            .from('collaborators')
            .insert({
              client_id: clientId,
              name: clientData.contact_name || clientData.name || 'Responsable principal',
              email: clientData.email || '',
              role: 'Responsable',
              is_primary: true
            })
            .select('id, name, email')
            .single();

          if (createError) {
            console.warn('Impossible de créer le collaborateur principal:', createError);
          } else if (newCollaborator) {
            finalCollaborators = [newCollaborator];
          }
        }
      }

      // Grouper les équipements par collaborateur
      const collaboratorMap = new Map<string, CollaboratorEquipment>();
      
      // Initialiser avec tous les collaborateurs
      finalCollaborators.forEach(collab => {
        collaboratorMap.set(collab.id, {
          collaborator_id: collab.id,
          collaborator_name: collab.name,
          collaborator_email: collab.email,
          equipment: []
        });
      });

      // Ajouter les équipements assignés
      equipment.forEach(item => {
        if (item.collaborator_id && collaboratorMap.has(item.collaborator_id)) {
          collaboratorMap.get(item.collaborator_id)!.equipment.push(item);
        }
      });

      // Ajouter une entrée pour les équipements non assignés
      const unassignedEquipment = equipment.filter(item => !item.collaborator_id);
      if (unassignedEquipment.length > 0 || finalCollaborators.length === 0) {
        collaboratorMap.set('unassigned', {
          collaborator_id: 'unassigned',
          collaborator_name: 'Non assigné',
          collaborator_email: '',
          equipment: unassignedEquipment
        });
      }

      return Array.from(collaboratorMap.values());
    } catch (error) {
      console.error('Erreur lors de la récupération des équipements par collaborateur:', error);
      throw error;
    }
  },

  // Assigner un équipement à un collaborateur
  async assignEquipment(
    equipmentId: string, 
    equipmentType: 'offer' | 'contract', 
    collaboratorId: string | null
  ): Promise<void> {
    try {
      const tableName = equipmentType === 'offer' ? 'offer_equipment' : 'contract_equipment';
      
      const { error } = await supabase
        .from(tableName)
        .update({ collaborator_id: collaboratorId })
        .eq('id', equipmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de l\'assignation d\'équipement:', error);
      throw error;
    }
  },

  // Récupérer l'historique des assignations d'un équipement
  async getEquipmentAssignmentHistory(
    equipmentId: string, 
    equipmentType: 'offer' | 'contract'
  ): Promise<EquipmentAssignmentHistory[]> {
    try {
      const { data, error } = await supabase
        .from('equipment_assignments_history')
        .select(`
          id,
          equipment_type,
          equipment_id,
          collaborator_id,
          assigned_by,
          assigned_at,
          unassigned_at,
          notes,
          collaborators!inner(name)
        `)
        .eq('equipment_id', equipmentId)
        .eq('equipment_type', equipmentType)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        equipment_type: item.equipment_type as 'offer' | 'contract',
        equipment_id: item.equipment_id,
        collaborator_id: item.collaborator_id,
        collaborator_name: item.collaborators?.name || 'Collaborateur supprimé',
        assigned_by: item.assigned_by || '',
        assigned_at: item.assigned_at,
        unassigned_at: item.unassigned_at,
        notes: item.notes,
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  },

  // Récupérer l'historique complet des assignations d'un client
  async getClientEquipmentHistory(clientId: string): Promise<EquipmentAssignmentHistory[]> {
    try {
      const { data, error } = await supabase
        .from('equipment_assignments_history')
        .select(`
          id,
          equipment_type,
          equipment_id,
          collaborator_id,
          assigned_by,
          assigned_at,
          unassigned_at,
          notes,
          collaborators!inner(name, client_id)
        `)
        .eq('collaborators.client_id', clientId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        equipment_type: item.equipment_type as 'offer' | 'contract',
        equipment_id: item.equipment_id,
        collaborator_id: item.collaborator_id,
        collaborator_name: item.collaborators?.name || 'Collaborateur supprimé',
        assigned_by: item.assigned_by || '',
        assigned_at: item.assigned_at,
        unassigned_at: item.unassigned_at,
        notes: item.notes,
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique du client:', error);
      throw error;
    }
  }
};