
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { createClientRequest } from "@/services/offers/clientRequests";
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";

export interface ProductRequestData {
  client_name: string;
  client_email: string;
  client_company: string;
  client_contact_email?: string;
  client_country?: string;
  client_vat_number?: string;
  client_is_vat_exempt?: boolean;
  equipment_description: string;
  message?: string;
  amount: number;
  monthly_payment: number;
  financed_amount?: number;
  coefficient?: number;
  margin?: number;
  quantity: number;
  duration: number;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  has_different_shipping_address?: boolean;
  shipping_address?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  phone?: string;
  company_id?: string;
  has_client_account?: boolean;
}

export interface RequestInfoData {
  offerId: string;
  previousStatus: string;
  requestedDocs: string[];
  message?: string;
}

/**
 * Crée une demande de produit (offre) à partir du catalogue public
 * Transforme les données plates en format structuré attendu par l'edge function
 */
export const createProductRequest = async (data: ProductRequestData, cartItems?: any[]) => {
  try {
    console.log("Creating product request with data:", data);
    
    // Format du numéro de téléphone - supprimer le 0 après l'indicatif international
    if (data.phone) {
      data.phone = data.phone.replace(/^\+(\d+)\s0/, '+$1 ');
    }
    
    // Transformer les données plates en format structuré attendu par l'edge function
    const structuredData: any = {
      // Mapper les vrais produits du panier avec leurs IDs réels
      products: cartItems && cartItems.length > 0
        ? cartItems.map(item => {
            const priceData = item.price || { monthlyPrice: 0, purchasePrice: 0 };
            // Résolution du variant_id: d'abord les clés internes
            let variantId = item.selectedOptions?.variant_id || item.selectedOptions?.selected_variant_id || item.product?.selected_variant_id;
            
            // Si pas de variant_id, essayer de le résoudre via variant_combination_prices
            if (!variantId && item.product?.variant_combination_prices && item.selectedOptions) {
              const selectedAttrs = { ...item.selectedOptions };
              // Supprimer les clés internes
              delete selectedAttrs.variant_id;
              delete selectedAttrs.selected_variant_id;
              
              const selectedKeys = Object.keys(selectedAttrs);
              if (selectedKeys.length > 0) {
                for (const combo of item.product.variant_combination_prices) {
                  if (combo.attributes && typeof combo.attributes === 'object') {
                    const allMatch = selectedKeys.every(key => {
                      const selVal = String(selectedAttrs[key]).trim().toLowerCase();
                      const comboVal = String(combo.attributes[key] || '').trim().toLowerCase();
                      return selVal === comboVal;
                    });
                    if (allMatch) {
                      variantId = combo.id;
                      console.log(`✅ Resolved variant_id from combination_prices: ${variantId}`);
                      break;
                    }
                  }
                }
              }
            }
            
            // Préparer selected_attributes nettoyées pour fallback serveur
            const selectedAttributes: Record<string, string> = {};
            if (item.selectedOptions) {
              Object.entries(item.selectedOptions).forEach(([k, v]) => {
                if (k !== 'variant_id' && k !== 'selected_variant_id' && v) {
                  selectedAttributes[k] = String(v);
                }
              });
            }
            
            return {
              product_id: item.product?.id || uuidv4(),
              ...(variantId ? { variant_id: variantId } : {}),
              quantity: item.quantity || 1,
              unit_price: priceData.monthlyPrice || 0,
              purchase_price: priceData.purchasePrice || 0,
              monthly_payment: priceData.monthlyPrice || 0,
              product_name: item.product?.name || 'Demande de leasing',
              duration: item.duration || data.duration || 36,
              ...(Object.keys(selectedAttributes).length > 0 ? { selected_attributes: selectedAttributes } : {}),
            };
          })
        : [{
            product_id: uuidv4(),
            quantity: data.quantity || 1,
            unit_price: data.monthly_payment || 0,
            purchase_price: data.amount || 0,
            monthly_payment: data.monthly_payment || 0,
            product_name: data.equipment_description?.split('\n')[0]?.replace(/^- /, '') || 'Demande de leasing',
            duration: data.duration || 36,
          }],
      // Format contact_info + company_info (nouveau format)
      contact_info: {
        first_name: data.client_name?.split(' ')[0] || data.client_name || '',
        last_name: data.client_name?.split(' ').slice(1).join(' ') || '',
        email: data.client_contact_email || data.client_email,
        phone: data.phone || '',
      },
      company_info: {
        company_name: data.client_company || '',
        vat_number: data.client_vat_number || '',
        address: data.address || '',
        postal_code: data.postal_code || '',
        city: data.city || '',
        country: (data.client_country || data.country || 'BE').substring(0, 2),
      },
      total: data.monthly_payment || 0,
      subtotal: data.amount || 0,
      create_client_account: data.has_client_account || false,
      notes: data.message || data.equipment_description || '',
    };

    // Ajouter delivery_info si adresse de livraison différente
    if (data.has_different_shipping_address) {
      structuredData.delivery_info = {
        same_as_company: false,
        address: data.shipping_address || '',
        postal_code: data.shipping_postal_code || '',
        city: data.shipping_city || '',
        country: (data.shipping_country || 'BE').substring(0, 2),
      };
    }

    console.log("Calling Edge function create-product-request with structured data");
    const { data: responseData, error } = await supabase.functions.invoke(
      'create-product-request',
      {
        body: JSON.stringify(structuredData),
      }
    );
    
    if (error) {
      console.error("Erreur lors de l'appel à la fonction Edge:", error);
      // Try to extract validation details from response
      let errorMsg = error.message;
      if (responseData?.details && Array.isArray(responseData.details)) {
        const fields = responseData.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
        errorMsg = `Données invalides: ${fields}`;
      }
      toast.error("Échec de création de la demande: " + errorMsg);
      throw new Error(`Échec de création de la demande: ${errorMsg}`);
    }
    
    console.log("Réponse de la fonction Edge:", responseData);
    
    // Sauvegarder les données de la demande dans sessionStorage
    sessionStorage.setItem('lastSubmittedRequest', JSON.stringify(responseData));
    sessionStorage.setItem('lastSubmittedOfferId', responseData.id);
    
    console.log("Request stored successfully:", responseData);
    toast.success("Votre demande a été envoyée avec succès");
    return responseData;
    
  } catch (error: any) {
    console.error("Error in product request service:", error);
    toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    throw error;
  }
};
