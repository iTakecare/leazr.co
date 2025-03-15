
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

    // Type assertion to tell TypeScript that data has all the fields we need
    // This ensures TypeScript knows it's safe to access these properties
    const offerData = data as any;

    // Create a copy of data with a guaranteed additional_info property
    const resultData = { 
      ...offerData, 
      equipment_data: null,
      // Ensure additional_info exists regardless of whether it's in the original data
      additional_info: offerData.additional_info || ""
    };

    if (offerData && offerData.equipment_description) {
      try {
        // Better parsing of equipment data with explicit type conversion
        const equipmentData = JSON.parse(offerData.equipment_description);
        console.log("Parsed equipment data:", equipmentData);
        
        // Ensure all numeric values are properly parsed as numbers
        if (Array.isArray(equipmentData)) {
          resultData.equipment_data = equipmentData.map(item => ({
            ...item,
            purchasePrice: parseFloat(String(item.purchasePrice)) || 0,
            quantity: parseInt(String(item.quantity), 10) || 1,
            margin: parseFloat(String(item.margin)) || 20,
            monthlyPayment: parseFloat(String(item.monthlyPayment || 0))
          }));
        } else {
          resultData.equipment_data = equipmentData;
        }
        
        console.log("Processed equipment data with preserved values:", resultData.equipment_data);
      } catch (e) {
        console.log("Equipment description is not valid JSON:", offerData.equipment_description);
      }
    }

    return resultData;
  } catch (error) {
    console.error('Error fetching offer:', error);
    return null;
  }
};
