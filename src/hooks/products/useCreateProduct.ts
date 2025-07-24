
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface CreateProductData {
  name: string;
  description?: string;
  short_description?: string;
  category?: string;
  brand?: string;
  category_id?: string;
  brand_id?: string;
  price: number;
  monthly_price?: number;
  image_url?: string;
  specifications?: Record<string, any>;
  stock?: number;
  sku?: string;
  is_refurbished?: boolean;
  condition?: string | null;
  purchase_price?: number;
  active?: boolean;
  admin_only?: boolean;
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { getCurrentCompanyId } = useMultiTenant();

  return useMutation({
    mutationFn: async (data: CreateProductData) => {
      console.log("🏗️ CREATE PRODUCT - Début de la création", data);
      
      // Récupérer le company_id de l'utilisateur connecté
      const companyId = await getCurrentCompanyId();
      console.log("🏗️ CREATE PRODUCT - Company ID récupéré:", companyId);
      
      if (!companyId) {
        throw new Error("Impossible de récupérer l'ID de l'entreprise. Veuillez vous reconnecter.");
      }

      const productData = {
        name: data.name,
        description: data.description,
        short_description: data.short_description,
        category: data.category,
        brand: data.brand,
        category_id: data.category_id,
        brand_id: data.brand_id,
        price: data.price,
        monthly_price: data.monthly_price,
        image_url: data.image_url,
        specifications: data.specifications,
        stock: data.stock || 0,
        sku: data.sku,
        is_refurbished: data.is_refurbished || false,
        condition: data.condition,
        purchase_price: data.purchase_price,
        active: data.active !== false,
        admin_only: data.admin_only || false,
        company_id: companyId, // Ajouter le company_id
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("🏗️ CREATE PRODUCT - Données à insérer:", productData);

      const { data: product, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();

      if (error) {
        console.error("🏗️ CREATE PRODUCT - Erreur lors de l'insertion:", error);
        throw error;
      }

      console.log("🏗️ CREATE PRODUCT - Produit créé avec succès:", product);
      return product as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit créé avec succès");
    },
    onError: (error: any) => {
      console.error("🏗️ CREATE PRODUCT - Erreur lors de la création:", error);
      
      // Messages d'erreur plus informatifs
      if (error.message?.includes('company_id')) {
        toast.error("Erreur: ID d'entreprise manquant. Veuillez vous reconnecter.");
      } else if (error.message?.includes('not-null')) {
        toast.error("Erreur: Certains champs obligatoires sont manquants.");
      } else if (error.message?.includes('permission')) {
        toast.error("Erreur: Vous n'avez pas les permissions pour créer ce produit.");
      } else {
        toast.error("Erreur lors de la création du produit: " + (error.message || "Erreur inconnue"));
      }
    },
  });
};
