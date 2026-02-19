
import { getAdminSupabaseClient } from "@/integrations/supabase/client";
import { saveEquipment } from "@/services/offers/offerEquipment";
import { supabase } from "@/integrations/supabase/client";
import { getLeaserById } from "@/services/leaserService";
import { getCoefficientFromLeaser } from "@/utils/leaserCalculator";

/**
 * Crée une nouvelle demande client (offre) avec équipements structurés
 */
export const createClientRequest = async (data: any, cartItems?: any[]) => {
  try {
    console.log("Creating client request with data:", data);
    
    // Utiliser le client admin pour contourner les restrictions RLS
    const adminClient = getAdminSupabaseClient();
    
    // Vérification du client administrateur
    console.log("Client admin pour createClientRequest disponible");
    
    // Get client's default leaser
    let defaultLeaserId = 'd60b86d7-a129-4a17-a877-e8e5caa66949'; // Grenke by default
    
    if (data.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('default_leaser_id')
        .eq('id', data.client_id)
        .single();
      
      if (clientData?.default_leaser_id) {
        defaultLeaserId = clientData.default_leaser_id;
      }
    }

    // Get leaser to calculate proper coefficient
    const leaser = await getLeaserById(defaultLeaserId);
    
    // Calculate totals from cart items with proper leaser coefficient
    let totalPurchasePrice = 0;
    let totalMonthlyPayment = 0;
    
    if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        const price = item.price || { monthlyPrice: 0, purchasePrice: 0 };
        const actualPurchasePrice = price.purchasePrice > 0 ? price.purchasePrice : (price.monthlyPrice * 2.0);
        const quantity = item.quantity || 1;
        totalPurchasePrice += actualPurchasePrice * quantity;
      }
    }
    
    const totalMargin = totalPurchasePrice * 0.15; // 15% margin
    const totalFinancedAmount = totalPurchasePrice + totalMargin;
    
    // Get proper coefficient from leaser for this amount
    const coefficient = getCoefficientFromLeaser(leaser, totalFinancedAmount, 36);
    totalMonthlyPayment = (totalFinancedAmount * coefficient) / 100;

    // Update data with calculated values
    data.amount = totalPurchasePrice;
    data.financed_amount = totalFinancedAmount;
    data.margin = totalMargin;
    data.monthly_payment = totalMonthlyPayment;
    data.coefficient = coefficient;
    data.leaser_id = defaultLeaserId;

    // Définir les champs valides pour la table offers
    const validOfferFields = [
      'id', 'user_id', 'amount', 'coefficient', 'monthly_payment', 'commission',
      'client_id', 'converted_to_contract', 'signed_at', 'commission_paid_at',
      'ambassador_id', 'financed_amount', 'margin', 'margin_difference',
      'total_margin_with_difference', 'company_id', 'client_name', 'client_email',
      'equipment_description', 'status', 'workflow_status', 'type', 'previous_status',
      'remarks', 'signature_data', 'signer_name', 'commission_status', 'signer_ip',
      'internal_score', 'leaser_score', 'leaser_id',
      'discount_type', 'discount_value', 'discount_amount', 'monthly_payment_before_discount'
    ];
    
    // Filtrer les données pour ne garder que les champs valides
    const cleanedData = Object.keys(data)
      .filter(key => validOfferFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = data[key];
        return obj;
      }, {});
    
    // Logger les champs ignorés pour le debugging
    const ignoredFields = Object.keys(data).filter(key => !validOfferFields.includes(key));
    if (ignoredFields.length > 0) {
      console.log("Champs ignorés lors de l'insertion:", ignoredFields);
    }
    
    console.log("Données nettoyées pour insertion:", cleanedData);
    
    const { data: result, error } = await adminClient
      .from('offers')
      .insert(cleanedData)
      .select()
      .single();
    
    if (error) {
      console.error("Error inserting offer:", error);
      return { data: null, error };
    }
    
    console.log("Offer created successfully:", result);
    
    // If cart items are provided, save them as structured equipment data
    if (cartItems && cartItems.length > 0 && result?.id) {
      console.log("Creating structured equipment for offer:", result.id);
      
      for (const item of cartItems) {
        try {
          const price = item.price || { monthlyPrice: 0, purchasePrice: 0 };
          // Use actual purchase price, with fallback to monthly price * realistic coefficient
          const actualPurchasePrice = price.purchasePrice > 0 ? price.purchasePrice : (price.monthlyPrice * 2.0);
          
          const itemMargin = actualPurchasePrice * 0.15; // 15% margin
          const itemFinancedAmount = actualPurchasePrice + itemMargin;
          const itemMonthlyPayment = (itemFinancedAmount * coefficient) / 100;
          
          const equipment = {
            offer_id: result.id,
            title: item.product.name,
            purchase_price: actualPurchasePrice,
            quantity: item.quantity,
            margin: itemMargin,
            monthly_payment: itemMonthlyPayment,
            serial_number: null
          };
          
          // Prepare attributes from selected options
          const attributes = item.selectedOptions || {};
          
          // Add product details as attributes
          if (item.product.brand) {
            attributes['Marque'] = item.product.brand;
          }
          if (item.product.category) {
            attributes['Catégorie'] = item.product.category;
          }
          if (item.duration) {
            attributes['Durée'] = `${item.duration} mois`;
          }
          
          await saveEquipment(equipment, attributes, {});
          console.log("Equipment saved for product:", item.product.name);
        } catch (equipmentError) {
          console.error("Error saving equipment for product:", item.product.name, equipmentError);
          // Continue with other equipment items
        }
      }
    }
    
    return { data: result, error: null };
  } catch (error) {
    console.error("Exception in createClientRequest:", error);
    return { 
      data: null, 
      error: error instanceof Error 
        ? { message: error.message } 
        : { message: 'Une erreur inconnue est survenue' } 
    };
  }
};
