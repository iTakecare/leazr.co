
import { supabase } from '@/integrations/supabase/client';
import { Equipment } from '@/types/equipment';

export const getEquipmentByClientId = async (clientId: string): Promise<Equipment[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('client_id', clientId)
      .order('title');

    if (error) {
      console.error("Error fetching equipment:", error);
      throw error;
    }

    return data as Equipment[] || [];
  } catch (error) {
    console.error("Error in getEquipmentByClientId:", error);
    return [];
  }
};

export const getEquipmentById = async (id: string): Promise<Equipment | null> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching equipment:", error);
      throw error;
    }

    return data as Equipment;
  } catch (error) {
    console.error("Error in getEquipmentById:", error);
    return null;
  }
};

export const updateEquipment = async (equipment: Equipment): Promise<Equipment | null> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .update(equipment)
      .eq('id', equipment.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating equipment:", error);
      throw error;
    }

    return data as Equipment;
  } catch (error) {
    console.error("Error in updateEquipment:", error);
    return null;
  }
};

export const createEquipment = async (equipment: Omit<Equipment, 'id'>): Promise<Equipment | null> => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .insert(equipment)
      .select()
      .single();

    if (error) {
      console.error("Error creating equipment:", error);
      throw error;
    }

    return data as Equipment;
  } catch (error) {
    console.error("Error in createEquipment:", error);
    return null;
  }
};
