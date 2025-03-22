
import { supabase } from "@/integrations/supabase/client";

export const getOfferById = async (offerId: string) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        clients:client_id (
          id, 
          name, 
          email, 
          company
        )
      `)
      .eq('id', offerId)
      .single();

    if (error) {
      console.error('Error fetching offer:', error);
      return null;
    }

    if (data && data.equipment_description) {
      try {
        // Better parsing of equipment data with explicit type conversion
        const equipmentData = JSON.parse(data.equipment_description);
        console.log("Parsed equipment data:", equipmentData);
        
        // Ensure all numeric values are properly parsed as numbers
        if (Array.isArray(equipmentData)) {
          data.equipment_data = equipmentData.map(item => ({
            ...item,
            purchasePrice: parseFloat(item.purchasePrice) || 0,
            quantity: parseInt(item.quantity, 10) || 1,
            margin: parseFloat(item.margin) || 20,
            monthlyPayment: parseFloat(item.monthlyPayment || 0)
          }));
        } else {
          data.equipment_data = equipmentData;
        }
        
        console.log("Processed equipment data with preserved values:", data.equipment_data);
      } catch (e) {
        console.log("Equipment description is not valid JSON:", data.equipment_description);
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching offer:', error);
    return null;
  }
};

export const updateOffer = async (offerId: string, offerData: any) => {
  try {
    // Create a clean data object with only valid columns
    const dataToSend = { 
      client_id: offerData.client_id,
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      equipment_description: offerData.equipment_description,
      amount: offerData.amount,
      coefficient: offerData.coefficient,
      monthly_payment: offerData.monthly_payment,
      commission: offerData.commission,
      workflow_status: offerData.workflow_status,
      status: offerData.status,
      remarks: offerData.remarks,
      type: offerData.type,
      user_id: offerData.user_id,
      converted_to_contract: offerData.converted_to_contract
    };
    
    // Remove undefined fields
    Object.keys(dataToSend).forEach(key => 
      dataToSend[key] === undefined && delete dataToSend[key]
    );
    
    console.log("Updating offer with cleaned data:", dataToSend);
    
    const { data, error } = await supabase
      .from('offers')
      .update(dataToSend)
      .eq('id', offerId);

    if (error) {
      console.error('Error updating offer:', error);
      throw error;
    }

    return offerId;
  } catch (error) {
    console.error('Error updating offer:', error);
    return null;
  }
};
