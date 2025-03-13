
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { products as mockProducts } from "@/data/products";

/**
 * Récupère tous les produits du catalogue depuis Supabase
 * Utilise les données mockées en cas de problème de connexion à Supabase
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    // Utiliser un timeout pour éviter les blocages indéfinis
    const timeoutPromise = new Promise<{ data: Product[] }>((_, reject) =>
      setTimeout(() => {
        console.log("Timeout atteint, utilisation des données mockées");
        // Retourne les produits mockés si le timeout est atteint
        return { data: mockProducts };
      }, 3000)
    );
    
    const fetchPromise = supabase
      .from('products')
      .select('*')
      .order('name');
    
    // Utiliser Promise.race pour résoudre avec la première promesse qui se termine
    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]) as any;
    
    if (error) {
      console.error("Error fetching products:", error);
      // Utiliser les données mockées en cas d'erreur
      return mockProducts;
    }
    
    return data || mockProducts;
  } catch (error) {
    console.error("Error in getProducts:", error);
    // Retourner les données mockées en cas d'erreur
    return mockProducts;
  }
};

/**
 * Récupère un produit par son ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    // D'abord essayer de charger depuis Supabase
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    
    if (data) return data;
    
    // Si non trouvé dans Supabase, chercher dans les données mockées
    const mockProduct = mockProducts.find(p => p.id === id);
    return mockProduct || null;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    
    // Chercher dans les données mockées
    const mockProduct = mockProducts.find(p => p.id === id);
    return mockProduct || null;
  }
};
