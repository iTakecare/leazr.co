import { supabase } from "@/integrations/supabase/client";

export const associateClientWithAmbassador = async (clientId: string, ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from('ambassador_clients')
      .insert([
        { client_id: clientId, ambassador_id: ambassadorId }
      ]);

    if (error) {
      console.error("Error associating client with ambassador:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error associating client with ambassador:", error);
    return false;
  }
};

export const disassociateClientWithAmbassador = async (clientId: string, ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from('ambassador_clients')
      .delete()
      .eq('client_id', clientId)
      .eq('ambassador_id', ambassadorId);

    if (error) {
      console.error("Error disassociating client with ambassador:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error disassociating client with ambassador:", error);
    return false;
  }
};

export const getClientsByAmbassador = async (ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from('ambassador_clients')
      .select('client_id')
      .eq('ambassador_id', ambassadorId);

    if (error) {
      console.error("Error fetching clients by ambassador:", error);
      return [];
    }

    return data ? data.map(item => item.client_id) : [];
  } catch (error) {
    console.error("Error fetching clients by ambassador:", error);
    return [];
  }
};

export const getAmbassadorsByClient = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('ambassador_clients')
      .select('ambassador_id')
      .eq('client_id', clientId);

    if (error) {
      console.error("Error fetching ambassadors by client:", error);
      return [];
    }

    return data ? data.map(item => item.ambassador_id) : [];
  } catch (error) {
    console.error("Error fetching ambassadors by client:", error);
    return [];
  }
};

export const getAllClientAmbassadorAssociations = async () => {
  try {
    const { data: ambassadorClients, error: ambassadorError } = await supabase
      .from('ambassador_clients')
      .select('ambassador_id, client_id');

    // Then manually group the data
    const groupedByAmbassador: Record<string, string[]> = {};
    if (ambassadorClients) {
      ambassadorClients.forEach(relation => {
        if (!groupedByAmbassador[relation.ambassador_id]) {
          groupedByAmbassador[relation.ambassador_id] = [];
        }
        groupedByAmbassador[relation.ambassador_id].push(relation.client_id);
      });
    }

    return groupedByAmbassador;
  } catch (error) {
    console.error("Error fetching all client ambassador associations:", error);
    return {};
  }
};
