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
  // Récupérer tous les équipements d'un client (UNIQUEMENT LES CONTRATS pour l'assignation)
  async getClientEquipment(clientId: string): Promise<EquipmentItem[]> {
    try {
      console.log('🔍 Recherche d\'équipements de contrats pour le client:', clientId);
      
      // Récupérer UNIQUEMENT les équipements des contrats (les offres ne sont pas assignables)
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

      // Formater uniquement les équipements de contrats
      const allEquipment: EquipmentItem[] = [
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
      // 🚨 DEBUGGING: Vérifier l'état d'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🔐 DEBUG - Utilisateur authentifié:', {
        userId: user?.id,
        email: user?.email,
        authError
      });

      // 🚨 DEBUGGING: Vérifier l'association client/utilisateur
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email, user_id, company_id')
        .eq('id', clientId)
        .single();

      console.log('🏢 DEBUG - Données client:', {
        clientId,
        clientData,
        clientError,
        userMatch: clientData?.user_id === user?.id
      });

      console.log('🔍 Récupération équipements pour client:', clientId);
      const equipment = await this.getClientEquipment(clientId);
      console.log('📋 Équipements trouvés:', equipment.length);
      
      // 🚨 DEBUGGING: Test direct des politiques RLS sur collaborateurs
      const { data: collaboratorsTest, error: collabTestError } = await supabase
        .from('collaborators')
        .select('*')
        .eq('client_id', clientId);

      console.log('🧪 DEBUG - Test collaborateurs RLS:', {
        clientId,
        collaboratorsFound: collaboratorsTest?.length || 0,
        collaboratorsTest,
        collabTestError
      });

      // Récupérer les collaborateurs (le trigger auto-create se charge de créer un collaborateur principal si nécessaire)
      const { data: collaborators, error: collabError } = await supabase
        .from('collaborators')
        .select('id, name, email, is_primary')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false }); // Collaborateur principal en premier

      if (collabError) {
        console.error('❌ Erreur récupération collaborateurs:', collabError);
        throw collabError;
      }

      console.log('👥 Collaborateurs trouvés:', collaborators?.length || 0, collaborators);

      // Grouper les équipements par collaborateur
      const collaboratorMap = new Map<string, CollaboratorEquipment>();
      
      // Initialiser avec tous les collaborateurs
      (collaborators || []).forEach(collab => {
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

      // Toujours ajouter une entrée pour les équipements non assignés
      const unassignedEquipment = equipment.filter(item => !item.collaborator_id);
      console.log('📦 Équipements non assignés:', unassignedEquipment.length);
      
      // TOUJOURS afficher la zone "Non assigné" pour permettre l'assignation
      collaboratorMap.set('unassigned', {
        collaborator_id: 'unassigned',
        collaborator_name: 'Non assigné',
        collaborator_email: '',
        equipment: unassignedEquipment
      });

      const result = Array.from(collaboratorMap.values());
      console.log('📊 Résultat final - groupes de collaborateurs:', result.length, result.map(g => ({ name: g.collaborator_name, equipmentCount: g.equipment.length })));
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération des équipements par collaborateur:', error);
      // En cas d'erreur, au moins retourner la zone "Non assigné"
      return [{
        collaborator_id: 'unassigned',
        collaborator_name: 'Non assigné',
        collaborator_email: '',
        equipment: []
      }];
    }
  },

  // Assigner un équipement à un collaborateur
  async assignEquipment(
    equipmentId: string, 
    equipmentType: 'offer' | 'contract', 
    collaboratorId: string | null
  ): Promise<void> {
    try {
      console.log('🔧 Assignation équipement:', { equipmentId, equipmentType, collaboratorId });
      
      // Vérifier que le collaboratorId est valide (UUID) ou null
      if (collaboratorId && (collaboratorId === 'virtual-primary' || collaboratorId === 'unassigned')) {
        console.warn('⚠️ Tentative d\'assignation à un collaborateur virtuel:', collaboratorId);
        collaboratorId = null; // Assigner à null au lieu d'un ID virtuel
      }
      
      const tableName = equipmentType === 'offer' ? 'offer_equipment' : 'contract_equipment';
      
      const { error } = await supabase
        .from(tableName)
        .update({ collaborator_id: collaboratorId })
        .eq('id', equipmentId);

      if (error) {
        console.error('❌ Erreur SQL lors de l\'assignation:', error);
        throw error;
      }
      
      console.log('✅ Assignation réussie');
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