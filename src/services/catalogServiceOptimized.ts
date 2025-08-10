import { supabase } from "@/integrations/supabase/client";
import { Product, PublicPack } from "@/types/catalog";

// Optimized service that loads only essential product data without variants
export const getPublicProductsOptimized = async (companyId: string): Promise<Product[]> => {
  if (!companyId) {
    throw new Error("Company ID requis");
  }

  try {
    // First get products
    const { data: productsData, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        brand_name,
        category_name,
        price,
        monthly_price,
        image_url,
        imageurls,
        slug,
        active,
        admin_only,
        brands(name, translation),
        categories(name, translation)
      `)
      .eq("company_id", companyId)
      .eq("active", true)
      .or("admin_only.is.null,admin_only.eq.false")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Get variant prices for all products
    const productIds = productsData?.map(p => p.id) || [];
    const { data: variantPrices } = await supabase
      .from("product_variant_prices")
      .select("product_id, monthly_price")
      .in("product_id", productIds)
      .gt("monthly_price", 0);

    // Create a map of minimum prices by product
    const minPriceMap = new Map<string, number>();
    variantPrices?.forEach(vp => {
      const currentMin = minPriceMap.get(vp.product_id) || Infinity;
      if (vp.monthly_price < currentMin) {
        minPriceMap.set(vp.product_id, vp.monthly_price);
      }
    });


    // Simple mapping with minimum pricing and pre-calculated slug
    const mappedProducts: Product[] = (productsData || []).map(item => {
      const minVariantPrice = minPriceMap.get(item.id) || 0;
      return {
        id: item.id,
        name: item.name || "",
        description: item.description || "",
        brand: item.brands?.name || item.brand_name || "",
        category: item.categories?.name || item.category_name || "",
        price: item.price || 0,
        monthly_price: item.monthly_price || 0,
        min_variant_price: minVariantPrice,
        slug: item.slug || "",
        image_url: item.image_url || "",
        images: item.imageurls || [],
        co2_savings: 0, // Default value since column doesn't exist
        has_variants: minVariantPrice > 0,
        variants_count: 0, // Default value since column doesn't exist
        active: item.active || false,
        // Don't load variants or variant_combination_prices for performance
        variants: [],
        variant_combination_prices: []
      };
    });

    return mappedProducts;
  } catch (error) {
    console.error("Error loading optimized products:", error);
    throw error;
  }
};

// Optimized function to get related products without loading all products
export const getRelatedProducts = async (
  companyId: string, 
  category?: string, 
  brand?: string, 
  currentProductId?: string, 
  limit: number = 6
): Promise<Product[]> => {
  if (!companyId || (!category && !brand)) {
    return [];
  }

  try {
    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        brand_name,
        category_name,
        price,
        monthly_price,
        image_url,
        imageurls,
        slug,
        active,
        admin_only,
        brands(name, translation),
        categories(name, translation)
      `)
      .eq("company_id", companyId)
      .eq("active", true)
      .or("admin_only.is.null,admin_only.eq.false");

    // Use separate queries to avoid multiple or= clauses issue
    let allProducts: any[] = [];

    if (brand) {
      // Query 1: Search by brand_name
      let brandQuery1 = supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          brand_name,
          category_name,
          price,
          monthly_price,
          image_url,
          imageurls,
          slug,
          active,
          admin_only,
          brands(name, translation),
          categories(name, translation)
        `)
        .eq("company_id", companyId)
        .eq("active", true)
        .or("admin_only.is.null,admin_only.eq.false")
        .eq("brand_name", brand);

      if (currentProductId) {
        brandQuery1 = brandQuery1.neq("id", currentProductId);
      }

      const { data: brandData1 } = await brandQuery1
        .limit(limit)
        .order("created_at", { ascending: false });

      // Query 2: Search by brands.name
      let brandQuery2 = supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          brand_name,
          category_name,
          price,
          monthly_price,
          image_url,
          imageurls,
          slug,
          active,
          admin_only,
          brands(name, translation),
          categories(name, translation)
        `)
        .eq("company_id", companyId)
        .eq("active", true)
        .or("admin_only.is.null,admin_only.eq.false")
        .eq("brands.name", brand);

      if (currentProductId) {
        brandQuery2 = brandQuery2.neq("id", currentProductId);
      }

      const { data: brandData2 } = await brandQuery2
        .limit(limit)
        .order("created_at", { ascending: false });

      // Merge results and remove duplicates
      const combined = [...(brandData1 || []), ...(brandData2 || [])];
      const uniqueProducts = combined.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );
      allProducts = uniqueProducts.slice(0, limit);

    } else if (category) {
      // Query 1: Search by category_name
      let categoryQuery1 = supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          brand_name,
          category_name,
          price,
          monthly_price,
          image_url,
          imageurls,
          slug,
          active,
          admin_only,
          brands(name, translation),
          categories(name, translation)
        `)
        .eq("company_id", companyId)
        .eq("active", true)
        .or("admin_only.is.null,admin_only.eq.false")
        .eq("category_name", category);

      if (currentProductId) {
        categoryQuery1 = categoryQuery1.neq("id", currentProductId);
      }

      const { data: categoryData1 } = await categoryQuery1
        .limit(limit)
        .order("created_at", { ascending: false });

      // Query 2: Search by categories.name
      let categoryQuery2 = supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          brand_name,
          category_name,
          price,
          monthly_price,
          image_url,
          imageurls,
          slug,
          active,
          admin_only,
          brands(name, translation),
          categories(name, translation)
        `)
        .eq("company_id", companyId)
        .eq("active", true)
        .or("admin_only.is.null,admin_only.eq.false")
        .eq("categories.name", category);

      if (currentProductId) {
        categoryQuery2 = categoryQuery2.neq("id", currentProductId);
      }

      const { data: categoryData2 } = await categoryQuery2
        .limit(limit)
        .order("created_at", { ascending: false });

      // Merge results and remove duplicates
      const combined = [...(categoryData1 || []), ...(categoryData2 || [])];
      const uniqueProducts = combined.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );
      allProducts = uniqueProducts.slice(0, limit);

    } else {
      // Fallback: get any products from the same company
      let fallbackQuery = supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          brand_name,
          category_name,
          price,
          monthly_price,
          image_url,
          imageurls,
          slug,
          active,
          admin_only,
          brands(name, translation),
          categories(name, translation)
        `)
        .eq("company_id", companyId)
        .eq("active", true)
        .or("admin_only.is.null,admin_only.eq.false");

      if (currentProductId) {
        fallbackQuery = fallbackQuery.neq("id", currentProductId);
      }

      const { data } = await fallbackQuery
        .limit(limit)
        .order("created_at", { ascending: false });
      
      allProducts = data || [];
    }

    const productsData = allProducts;
    const error = null;

    if (error) {
      throw error;
    }

    if (!productsData || productsData.length === 0) {
      return [];
    }

    // Get variant prices for these specific products
    const productIds = productsData.map(p => p.id);
    const { data: variantPrices } = await supabase
      .from("product_variant_prices")
      .select("product_id, monthly_price")
      .in("product_id", productIds)
      .gt("monthly_price", 0);

    // Create a map of minimum prices by product
    const minPriceMap = new Map<string, number>();
    variantPrices?.forEach(vp => {
      const currentMin = minPriceMap.get(vp.product_id) || Infinity;
      if (vp.monthly_price < currentMin) {
        minPriceMap.set(vp.product_id, vp.monthly_price);
      }
    });

    // Map products with minimum pricing
    const mappedProducts: Product[] = productsData.map(item => {
      const minVariantPrice = minPriceMap.get(item.id) || 0;
      return {
        id: item.id,
        name: item.name || "",
        description: item.description || "",
        brand: item.brands?.name || item.brand_name || "",
        category: item.categories?.name || item.category_name || "",
        price: item.price || 0,
        monthly_price: item.monthly_price || 0,
        min_variant_price: minVariantPrice,
        slug: item.slug || "",
        image_url: item.image_url || "",
        images: item.imageurls || [],
        co2_savings: 0,
        has_variants: minVariantPrice > 0,
        variants_count: 0,
        active: item.active || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
        variant_combination_prices: []
      };
    });

    return mappedProducts;
  } catch (error) {
    console.error("Error loading related products:", error);
    return [];
  }
};

// Optimized service to get public packs for a company
export const getPublicPacksOptimized = async (companyId: string): Promise<PublicPack[]> => {
  if (!companyId) {
    throw new Error("Company ID requis");
  }

  try {
    // Get active packs with their items
    const { data: packsData, error } = await supabase
      .from("product_packs")
      .select(`
        id,
        name,
        description,
        image_url,
        is_featured,
        is_active,
        pack_monthly_price,
        pack_promo_price,
        promo_active,
        total_monthly_price,
        product_pack_items(
          quantity,
          products(
            id,
            name,
            image_url,
            category_name,
            categories(name, translation)
          )
        )
      `)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .or("admin_only.is.null,admin_only.eq.false")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Map to PublicPack format
    const mappedPacks: PublicPack[] = (packsData || []).map(pack => ({
      id: pack.id,
      name: pack.name || "",
      description: pack.description || "",
      image_url: pack.image_url || "",
      is_featured: pack.is_featured || false,
      pack_monthly_price: pack.pack_monthly_price || 0,
      pack_promo_price: pack.pack_promo_price || 0,
      promo_active: pack.promo_active || false,
      total_monthly_price: pack.total_monthly_price || 0,
      items: (pack.product_pack_items || []).map(item => ({
        quantity: item.quantity || 1,
        product: {
          id: item.products?.id || "",
          name: item.products?.name || "",
          image_url: item.products?.image_url || "",
          category: item.products?.categories?.name || item.products?.category_name || ""
        }
      }))
    }));

    return mappedPacks;
  } catch (error) {
    console.error("Error loading public packs:", error);
    throw error;
  }
};

/**
 * Mapping complet des produits complémentaires pour les suggestions d'upsell
 * Chaque clé correspond à un type de produit principal avec mots-clés d'inclusion et d'exclusion
 */
const complementaryMapping: Record<string, { include: string[], exclude: string[] }> = {
  // ========== TABLETTES ==========
  'iPad': {
    include: ['clavier iPad', 'stylet', 'pencil', 'housse iPad', 'support iPad', 'étui', 'protection iPad', 'accessoires iPad'],
    exclude: ['MacBook', 'iMac', 'iPhone', 'desktop', 'laptop']
  },
  'tablette': {
    include: ['clavier tablette', 'stylet', 'pencil', 'housse tablette', 'support tablette', 'étui', 'protection tablette'],
    exclude: ['MacBook', 'iMac', 'iPhone', 'desktop', 'laptop']
  },
  'tablet': {
    include: ['clavier tablet', 'stylet', 'pencil', 'housse tablet', 'support tablet', 'étui', 'protection tablet'],
    exclude: ['MacBook', 'iMac', 'iPhone', 'desktop', 'laptop']
  },
  
  // ========== ORDINATEURS PORTABLES ==========
  'MacBook': {
    include: ['souris', 'mouse', 'housse MacBook', 'hub', 'support laptop', 'dock', 'accessoires MacBook', 'clavier externe', 'clavier USB', 'clavier sans fil', 'écran externe'],
    exclude: ['iPad', 'iPhone', 'desktop', 'tablette', 'Smart Keyboard', 'Magic Keyboard', 'clavier iPad', 'pour iPad', 'folio', 'smart', 'magic keyboard']
  },
  'laptop': {
    include: ['souris', 'mouse', 'housse laptop', 'hub', 'support laptop', 'dock', 'accessoires laptop', 'clavier externe', 'écran externe'],
    exclude: ['iPad', 'iPhone', 'desktop', 'tablette']
  },
  'portable': {
    include: ['souris', 'mouse', 'housse laptop', 'hub', 'support laptop', 'dock', 'accessoires laptop', 'clavier externe', 'écran externe'],
    exclude: ['iPad', 'iPhone', 'desktop', 'tablette']
  },
  'ordinateur portable': {
    include: ['souris', 'mouse', 'housse laptop', 'hub', 'support laptop', 'dock', 'accessoires laptop', 'clavier externe', 'écran externe'],
    exclude: ['iPad', 'iPhone', 'desktop', 'tablette']
  },
  
  // ========== ORDINATEURS FIXES ==========
  'iMac': {
    include: ['clavier externe', 'clavier USB', 'clavier sans fil', 'souris', 'mouse', 'écran externe', 'hub', 'support', 'accessoires iMac', 'dock'],
    exclude: ['iPad', 'iPhone', 'MacBook', 'laptop', 'tablette', 'Smart Keyboard', 'Magic Keyboard', 'clavier iPad', 'pour iPad', 'folio', 'smart', 'magic keyboard']
  },
  'Mac mini': {
    include: ['clavier', 'souris', 'mouse', 'écran', 'hub', 'support', 'accessoires Mac', 'dock'],
    exclude: ['iPad', 'iPhone', 'MacBook', 'laptop', 'tablette']
  },
  'desktop': {
    include: ['clavier', 'souris', 'mouse', 'écran', 'hub', 'support', 'accessoires desktop', 'dock'],
    exclude: ['iPad', 'iPhone', 'MacBook', 'laptop', 'tablette']
  },
  'ordinateur': {
    include: ['clavier', 'souris', 'mouse', 'écran', 'hub', 'support', 'accessoires ordinateur', 'dock'],
    exclude: ['iPad', 'iPhone', 'MacBook', 'laptop', 'tablette']
  },
  'PC': {
    include: ['clavier', 'souris', 'mouse', 'écran', 'hub', 'support', 'accessoires PC', 'dock'],
    exclude: ['iPad', 'iPhone', 'MacBook', 'laptop', 'tablette']
  },
  
  // ========== SMARTPHONES ==========
  'iPhone': {
    include: ['coque iPhone', 'chargeur iPhone', 'écouteurs', 'support iPhone', 'accessoires iPhone', 'protection iPhone'],
    exclude: ['iPad', 'MacBook', 'iMac', 'desktop', 'laptop']
  },
  'smartphone': {
    include: ['coque', 'chargeur', 'écouteurs', 'support smartphone', 'accessoires smartphone', 'protection smartphone'],
    exclude: ['iPad', 'MacBook', 'iMac', 'desktop', 'laptop']
  },
  'téléphone': {
    include: ['coque', 'chargeur', 'écouteurs', 'support téléphone', 'accessoires téléphone', 'protection téléphone'],
    exclude: ['iPad', 'MacBook', 'iMac', 'desktop', 'laptop']
  },
  'mobile': {
    include: ['coque', 'chargeur', 'écouteurs', 'support mobile', 'accessoires mobile', 'protection mobile'],
    exclude: ['iPad', 'MacBook', 'iMac', 'desktop', 'laptop']
  },
  
  // ========== PÉRIPHÉRIQUES ==========
  'souris': {
    include: ['tapis souris', 'clavier', 'support poignet', 'nettoyant', 'hub'],
    exclude: ['smartphone', 'iPhone', 'mobile']
  },
  'mouse': {
    include: ['tapis souris', 'clavier', 'support poignet', 'nettoyant', 'hub'],
    exclude: ['smartphone', 'iPhone', 'mobile']
  },
  'clavier': {
    include: ['souris', 'mouse', 'support poignet', 'nettoyant', 'hub', 'repose-poignet', 'tapis souris'],
    exclude: ['smartphone', 'iPhone', 'mobile', 'iPad', 'tablette', 'Smart', 'Pro']
  },
  'keyboard': {
    include: ['souris', 'mouse', 'support poignet', 'nettoyant', 'hub', 'repose-poignet'],
    exclude: ['smartphone', 'iPhone', 'mobile', 'iPad']
  },
  
  // ========== AUDIO/VIDÉO ==========
  'casque': {
    include: ['support casque', 'adaptateur', 'câbles audio', 'mousse casque', 'nettoyant'],
    exclude: []
  },
  'écouteurs': {
    include: ['étui écouteurs', 'adaptateur', 'câbles audio', 'embouts', 'nettoyant'],
    exclude: []
  },
  'microphone': {
    include: ['support microphone', 'filtre pop', 'bras articule', 'adaptateur', 'mousse acoustique'],
    exclude: []
  },
  'webcam': {
    include: ['support webcam', 'éclairage', 'fond vert', 'microphone', 'trépied'],
    exclude: []
  },
  'haut-parleur': {
    include: ['support haut-parleur', 'câbles audio', 'adaptateur', 'isolation'],
    exclude: []
  },
  'speaker': {
    include: ['support speaker', 'câbles audio', 'adaptateur', 'isolation'],
    exclude: []
  },
  
  // ========== STOCKAGE ET RÉSEAUX ==========
  'disque dur': {
    include: ['housse disque', 'hub', 'câbles', 'adaptateur', 'boîtier protection'],
    exclude: []
  },
  'SSD': {
    include: ['housse SSD', 'hub', 'câbles', 'adaptateur', 'boîtier protection'],
    exclude: []
  },
  'stockage': {
    include: ['housse stockage', 'hub', 'câbles', 'adaptateur', 'boîtier protection'],
    exclude: []
  },
  'routeur': {
    include: ['câbles réseau', 'switch', 'répéteur', 'support mural', 'onduleur'],
    exclude: []
  },
  'switch': {
    include: ['câbles réseau', 'routeur', 'support rack', 'onduleur'],
    exclude: []
  },
  'modem': {
    include: ['câbles réseau', 'filtre ADSL', 'support', 'onduleur'],
    exclude: []
  },
  
  // ========== ÉCRANS ET AFFICHAGE ==========
  'écran': {
    include: ['bras écran', 'support écran', 'hub', 'câbles vidéo', 'nettoyant écran'],
    exclude: []
  },
  'monitor': {
    include: ['bras monitor', 'support monitor', 'hub', 'câbles vidéo', 'nettoyant écran'],
    exclude: []
  },
  'display': {
    include: ['support display', 'bras', 'hub', 'câbles vidéo', 'nettoyant écran'],
    exclude: []
  },
  'projecteur': {
    include: ['écran projection', 'support plafond', 'télécommande', 'câbles vidéo'],
    exclude: []
  },
  'vidéoprojecteur': {
    include: ['écran projection', 'support plafond', 'télécommande', 'câbles vidéo'],
    exclude: []
  },
  
  // ========== LOGICIELS ET SERVICES ==========
  'Office': {
    include: ['accessoires bureautiques', 'clavier', 'souris', 'écran', 'support'],
    exclude: []
  },
  'bureautique': {
    include: ['accessoires bureautiques', 'clavier', 'souris', 'écran', 'support'],
    exclude: []
  },
  'logiciel': {
    include: ['formation', 'support', 'manuel', 'accessoires'],
    exclude: []
  },
  'software': {
    include: ['formation', 'support', 'manuel', 'accessoires'],
    exclude: []
  },
  'antivirus': {
    include: ['formation sécurité', 'support', 'sauvegarde', 'VPN'],
    exclude: []
  },
  'sécurité': {
    include: ['antivirus', 'VPN', 'sauvegarde', 'formation'],
    exclude: []
  },
  
  // ========== ACCESSOIRES GÉNÉRIQUES ==========
  'câble': {
    include: ['organisateur câble', 'adaptateur', 'gaine protection', 'enrouleur'],
    exclude: []
  },
  'chargeur': {
    include: ['câble', 'adaptateur', 'support chargeur', 'multiprise'],
    exclude: []
  },
  'adaptateur': {
    include: ['câbles', 'hub', 'convertisseur', 'boîtier'],
    exclude: []
  },
  'hub': {
    include: ['câbles', 'adaptateur', 'support', 'alimentation'],
    exclude: []
  },
  'dock': {
    include: ['câbles', 'adaptateur', 'support', 'hub'],
    exclude: []
  },
  'support': {
    include: ['accessoires montage', 'visserie', 'adaptateur', 'bras'],
    exclude: []
  },
  'housse': {
    include: ['protection', 'nettoyant', 'accessoires transport'],
    exclude: []
  },
  'protection': {
    include: ['nettoyant', 'housse', 'film protection', 'étui'],
    exclude: []
  },
  'étui': {
    include: ['protection', 'nettoyant', 'accessoires'],
    exclude: []
  },
  'coque': {
    include: ['protection écran', 'support', 'chargeur', 'nettoyant'],
    exclude: []
  },
  
  // ========== PACK ET BUNDLES ==========
  'pack': {
    include: ['accessoires', 'extensions', 'compléments'],
    exclude: []
  },
  'bundle': {
    include: ['accessoires', 'extensions', 'compléments'],
    exclude: []
  },
  'kit': {
    include: ['accessoires', 'extensions', 'compléments'],
    exclude: []
  }
};

/**
 * Mapping par catégories pour les produits sans type spécifique détecté
 */
const categoryMapping: Record<string, { include: string[], exclude: string[] }> = {
  'ordinateurs': {
    include: ['clavier', 'souris', 'écran', 'hub', 'support', 'accessoires'],
    exclude: ['smartphone', 'mobile']
  },
  'accessoires': {
    include: ['câbles', 'adaptateur', 'support', 'protection', 'nettoyant'],
    exclude: []
  },
  'périphériques': {
    include: ['accessoires', 'câbles', 'support', 'hub', 'nettoyant'],
    exclude: []
  },
  'audio': {
    include: ['support', 'câbles audio', 'adaptateur', 'accessoires audio'],
    exclude: []
  },
  'vidéo': {
    include: ['support', 'câbles vidéo', 'éclairage', 'accessoires vidéo'],
    exclude: []
  },
  'stockage': {
    include: ['housse', 'câbles', 'adaptateur', 'hub', 'protection'],
    exclude: []
  },
  'réseau': {
    include: ['câbles réseau', 'adaptateur réseau', 'support', 'onduleur'],
    exclude: []
  },
  'sécurité': {
    include: ['formation', 'support', 'sauvegarde', 'accessoires sécurité'],
    exclude: []
  },
  'logiciels': {
    include: ['formation', 'support', 'manuel', 'accessoires'],
    exclude: []
  }
};

/**
 * Mapping universel de fallback pour tous les produits
 */
const universalFallback = {
  include: ['accessoires', 'support', 'câbles', 'protection', 'nettoyant', 'housse', 'adaptateur'],
  exclude: []
};

/**
 * Détermine le type de produit principal à partir du nom et de la catégorie
 */
const detectProductType = (productName: string, category: string): string | null => {
  const searchText = `${productName} ${category}`.toLowerCase();
  
  // Ordre de priorité pour la détection (spécifique → générique)
  const detectionOrder = [
    // Spécifiques Apple d'abord
    'iPad', 'MacBook', 'iMac', 'Mac mini', 'iPhone',
    
    // Ordinateurs spécifiques
    'ordinateur portable', 'laptop', 'portable', 'desktop', 'ordinateur', 'PC',
    
    // Devices mobiles
    'smartphone', 'téléphone', 'mobile', 'tablette', 'tablet',
    
    // Périphériques spécifiques
    'souris', 'mouse', 'clavier', 'keyboard', 'casque', 'écouteurs', 'microphone', 
    'webcam', 'haut-parleur', 'speaker',
    
    // Stockage et réseau
    'disque dur', 'SSD', 'stockage', 'routeur', 'switch', 'modem',
    
    // Écrans et affichage
    'projecteur', 'vidéoprojecteur', 'écran', 'monitor', 'display',
    
    // Logiciels et services
    'Office', 'bureautique', 'logiciel', 'software', 'antivirus', 'sécurité',
    
    // Accessoires génériques
    'câble', 'chargeur', 'adaptateur', 'hub', 'dock', 'support', 'housse', 
    'protection', 'étui', 'coque',
    
    // Bundles et packs
    'pack', 'bundle', 'kit'
  ];
  
  for (const type of detectionOrder) {
    if (searchText.includes(type.toLowerCase())) {
      return type;
    }
  }
  
  return null;
};

/**
 * Détecte le type de produit par catégorie si aucun type spécifique n'est trouvé
 */
const detectProductByCategory = (category: string): { include: string[], exclude: string[] } | null => {
  if (!category) return null;
  
  const categoryLower = category.toLowerCase();
  
  // Chercher dans le mapping de catégories
  for (const [catKey, mapping] of Object.entries(categoryMapping)) {
    if (categoryLower.includes(catKey.toLowerCase()) || 
        catKey.toLowerCase().includes(categoryLower)) {
      return mapping;
    }
  }
  
  return null;
};

/**
 * Service pour récupérer les produits complémentaires (upsell) intelligents
 * Suggère des accessoires et périphériques qui complètent le produit principal
 */
export const getUpsellProducts = async (
  companyId: string,
  currentProductId: string,
  category?: string,
  brand?: string
): Promise<Product[]> => {
  try {
    console.log('🛒 UPSELL - Recherche de produits complémentaires pour:', { companyId, currentProductId, category, brand });
    
    // Récupérer le produit principal pour analyser ses caractéristiques
    const { data: currentProduct } = await supabase
      .from('products')
      .select('name, category_name, brand_name, brands(name)')
      .eq('id', currentProductId)
      .single();

    if (!currentProduct) {
      console.log('🛒 UPSELL - Produit principal non trouvé');
      return [];
    }

    const productName = currentProduct.name || '';
    const productCategory = currentProduct.category_name || category || '';
    const productBrand = currentProduct.brands?.name || currentProduct.brand_name || brand || '';
    
    console.log('🛒 UPSELL - Analyse du produit principal:', { productName, productCategory, productBrand });

    // Déterminer le type de produit pour trouver les compléments appropriés
    const productType = detectProductType(productName, productCategory);
    console.log('🛒 UPSELL - Type de produit détecté:', productType);

    if (!productType) {
      console.log('🛒 UPSELL - Type de produit non reconnu, utilisation de la logique de fallback');
      return getFallbackUpsellProducts(companyId, currentProductId, productCategory, productBrand);
    }

    // Récupérer les mots-clés complémentaires pour ce type de produit
    const complementaryConfig = complementaryMapping[productType] || { include: [], exclude: [] };
    console.log('🛒 UPSELL - Configuration complémentaire:', complementaryConfig);

    if (complementaryConfig.include.length === 0) {
      return getFallbackUpsellProducts(companyId, currentProductId, productCategory, productBrand);
    }

    // Construire une requête pour chercher des produits complémentaires
    let complementaryProducts: any[] = [];

    // Étape 1: Chercher par mots-clés dans le nom des produits avec filtres d'exclusion
    for (const keyword of complementaryConfig.include.slice(0, 4)) { // Limiter à 4 mots-clés pour les performances
      const { data: keywordProducts } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          brand_name,
          category_name,
          price,
          monthly_price,
          image_url,
          imageurls,
          slug,
          active,
          brands(name, translation),
          product_variant_prices(monthly_price)
        `)
        .eq('company_id', companyId)
        .eq('active', true)
        .neq('id', currentProductId)
        .ilike('name', `%${keyword}%`)
        .limit(3);

      if (keywordProducts) {
        // Filtrer les produits selon les exclusions avec logique stricte
        const filteredProducts = keywordProducts.filter(product => {
          const productName = product.name.toLowerCase();
          const productDesc = (product.description || '').toLowerCase();
          const searchText = `${productName} ${productDesc}`;
          
          return !complementaryConfig.exclude.some(excludeKeyword => {
            const keyword = excludeKeyword.toLowerCase();
            return searchText.includes(keyword);
          });
        });
        complementaryProducts.push(...filteredProducts);
      }
    }

    // Étape 2: Si pas assez de produits, chercher dans la catégorie "Accessoires" ou similaire
    if (complementaryProducts.length < 3) {
      const { data: accessoryProducts } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          brand_name,
          category_name,
          price,
          monthly_price,
          image_url,
          imageurls,
          slug,
          active,
          brands(name, translation),
          product_variant_prices(monthly_price)
        `)
        .eq('company_id', companyId)
        .eq('active', true)
        .neq('id', currentProductId)
        .or('category_name.ilike.%accessoire%,category_name.ilike.%périphérique%,category_name.ilike.%peripheral%')
        .limit(4);

      if (accessoryProducts) {
        complementaryProducts.push(...accessoryProducts);
      }
    }

    // Étape 3: Privilégier la même marque si c'est une marque reconnue (Apple, etc.)
    if (productBrand && (productBrand.toLowerCase().includes('apple') || productBrand.toLowerCase().includes('microsoft'))) {
      complementaryProducts = complementaryProducts.filter(product => {
        const productProductBrand = product.brands?.name || product.brand_name || '';
        return productProductBrand.toLowerCase().includes(productBrand.toLowerCase()) || 
               !productProductBrand || // Inclure les produits sans marque spécifiée
               productProductBrand.toLowerCase().includes('universel'); // Inclure les accessoires universels
      });
    }

    // Supprimer les doublons et limiter à 3 produits
    const uniqueProducts = complementaryProducts.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    ).slice(0, 3);

    console.log('🛒 UPSELL - Produits complémentaires trouvés:', uniqueProducts.length);

    // Mapper vers le format Product et calculer les prix
    const mappedProducts: Product[] = uniqueProducts.map(product => {
      let minPrice = product.monthly_price || 0;
      
      // Si le produit a des variants, récupérer le prix minimum
      if (product.product_variant_prices && product.product_variant_prices.length > 0) {
        const variantPrices = product.product_variant_prices
          .map((vp: any) => vp.monthly_price)
          .filter((price: number) => price > 0);
        if (variantPrices.length > 0) {
          minPrice = Math.min(...variantPrices);
        }
      }

      return {
        id: product.id,
        name: product.name || "",
        description: product.description || "",
        brand: product.brands?.name || product.brand_name || "",
        category: product.categories?.name || product.category_name || "",
        price: product.price || 0,
        monthly_price: minPrice,
        slug: product.slug || "",
        image_url: product.image_url || "",
        images: product.imageurls || [],
        co2_savings: 0,
        has_variants: false,
        variants_count: 0,
        active: product.active || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
        variant_combination_prices: []
      };
    });

    return mappedProducts;
  } catch (error) {
    console.error('🛒 UPSELL - Erreur lors de la recherche de produits complémentaires:', error);
    return [];
  }
};

/**
 * Fonction de fallback intelligente pour les cas où le type de produit n'est pas reconnu
 * Utilise le mapping par catégorie puis le fallback universel
 */
const getFallbackUpsellProducts = async (
  companyId: string,
  currentProductId: string,
  category?: string,
  brand?: string
): Promise<Product[]> => {
  try {
    console.log('🛒 UPSELL - Fallback intelligent avec catégorie/marque:', { category, brand });
    
    let complementaryConfig: { include: string[], exclude: string[] } | null = null;
    
    // Étape 1: Essayer de détecter par catégorie
    if (category) {
      complementaryConfig = detectProductByCategory(category);
      if (complementaryConfig) {
        console.log('🛒 UPSELL - Configuration trouvée par catégorie:', complementaryConfig);
      }
    }
    
    // Étape 2: Si pas de mapping par catégorie, utiliser le fallback universel
    if (!complementaryConfig) {
      complementaryConfig = universalFallback;
      console.log('🛒 UPSELL - Utilisation du fallback universel:', complementaryConfig);
    }
    
    let complementaryProducts: any[] = [];
    
    // Étape 3: Chercher par mots-clés intelligents
    for (const keyword of complementaryConfig.include.slice(0, 3)) { // Limiter à 3 mots-clés pour les performances
      const { data: keywordProducts } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          brand_name,
          category_name,
          price,
          monthly_price,
          image_url,
          imageurls,
          slug,
          active,
          brands(name, translation),
          product_variant_prices(monthly_price)
        `)
        .eq('company_id', companyId)
        .eq('active', true)
        .neq('id', currentProductId)
        .ilike('name', `%${keyword}%`)
        .limit(2);

      if (keywordProducts) {
        // Filtrer selon les exclusions
        const filteredProducts = keywordProducts.filter(product => {
          const productName = product.name.toLowerCase();
          return !complementaryConfig!.exclude.some(excludeKeyword => 
            productName.includes(excludeKeyword.toLowerCase())
          );
        });
        complementaryProducts.push(...filteredProducts);
      }
    }
    
    // Étape 4: Si pas assez de produits, chercher par catégorie ou marque traditionnelle
    if (complementaryProducts.length < 2) {
      let fallbackQuery = supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          brand_name,
          category_name,
          price,
          monthly_price,
          image_url,
          imageurls,
          slug,
          active,
          brands(name, translation),
          product_variant_prices(monthly_price)
        `)
        .eq('company_id', companyId)
        .eq('active', true)
        .neq('id', currentProductId);

      // Priorité à la marque si elle existe, sinon catégorie
      if (brand) {
        fallbackQuery = fallbackQuery.or(`brand_name.ilike.%${brand}%,brands.name.ilike.%${brand}%`);
      } else if (category) {
        fallbackQuery = fallbackQuery.or(`category_name.ilike.%${category}%,categories.name.ilike.%${category}%`);
      } else {
        // Chercher dans les accessoires génériques
        fallbackQuery = fallbackQuery.or('category_name.ilike.%accessoire%,category_name.ilike.%périphérique%,category_name.ilike.%support%');
      }

      const { data: fallbackData } = await fallbackQuery.limit(2);
      if (fallbackData) {
        complementaryProducts.push(...fallbackData);
      }
    }
    
    // Étape 5: Filtrer les doublons et limiter le nombre
    const uniqueProducts = complementaryProducts.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    ).slice(0, 3);
    
    console.log('🛒 UPSELL - Produits fallback trouvés:', uniqueProducts.length);

    return uniqueProducts.map(product => {
      let minPrice = product.monthly_price || 0;
      
      if (product.product_variant_prices && product.product_variant_prices.length > 0) {
        const variantPrices = product.product_variant_prices
          .map((vp: any) => vp.monthly_price)
          .filter((price: number) => price > 0);
        if (variantPrices.length > 0) {
          minPrice = Math.min(...variantPrices);
        }
      }

      return {
        id: product.id,
        name: product.name || "",
        description: product.description || "",
        brand: product.brands?.name || product.brand_name || "",
        category: product.categories?.name || product.category_name || "",
        price: product.price || 0,
        monthly_price: minPrice,
        slug: product.slug || "",
        image_url: product.image_url || "",
        images: product.imageurls || [],
        co2_savings: 0,
        has_variants: false,
        variants_count: 0,
        active: product.active || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
        variant_combination_prices: []
      };
    });
  } catch (error) {
    console.error('🛒 UPSELL - Erreur dans getFallbackUpsellProducts:', error);
    return [];
  }
};

export const getClientCustomCatalog = async (clientId: string): Promise<Product[]> => {
  if (!clientId) {
    throw new Error("Client ID requis pour le catalogue personnalisé");
  }

  try {
    console.log('🛒 CATALOGUE PERSONNALISÉ - Chargement pour client:', clientId);

    // Étape 1: Récupérer les prix personnalisés avec les IDs des produits
    const { data: customPricesData, error } = await supabase
      .from("client_custom_prices")
      .select(`
        product_id,
        custom_monthly_price,
        custom_purchase_price,
        margin_rate,
        is_active,
        valid_from,
        valid_to,
        notes
      `)
      .eq("client_id", clientId)
      .eq("is_active", true);

    if (error) {
      console.error('Erreur lors du chargement des prix personnalisés:', error);
      throw error;
    }

    if (!customPricesData || customPricesData.length === 0) {
      console.log('🛒 CATALOGUE PERSONNALISÉ - Aucun produit personnalisé trouvé pour ce client');
      return [];
    }

    // Filtrer les prix valides (sans date d'expiration ou pas encore expirés)
    const now = new Date().toISOString();
    const validPrices = customPricesData.filter(price => 
      !price.valid_to || new Date(price.valid_to).toISOString() >= now
    );

    if (validPrices.length === 0) {
      console.log('🛒 CATALOGUE PERSONNALISÉ - Aucun prix personnalisé valide trouvé');
      return [];
    }

    console.log('🛒 CATALOGUE PERSONNALISÉ - Prix personnalisés valides trouvés:', validPrices.length);

    // Extraire les IDs des produits
    const productIds = validPrices.map(item => item.product_id).filter(Boolean);

    // Étape 2: Récupérer les détails des produits
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        brand_name,
        category_name,
        price,
        monthly_price,
        image_url,
        imageurls,
        slug,
        active,
        admin_only,
        brands(name, translation),
        categories(name, translation)
      `)
      .in("id", productIds)
      .eq("active", true);

    if (productsError) {
      console.error('Erreur lors du chargement des produits:', productsError);
      throw productsError;
    }

    if (!productsData || productsData.length === 0) {
      console.log('🛒 CATALOGUE PERSONNALISÉ - Aucun produit actif trouvé');
      return [];
    }

    // Get client's hidden variants first
    const { data: clientData } = await supabase
      .from('clients')
      .select('hidden_variants')
      .eq('id', clientId)
      .single();
    
    const hiddenVariants = clientData?.hidden_variants || [];
    console.log(`🔒 Hidden variants for client ${clientId}:`, hiddenVariants);

    // Récupérer les prix personnalisés des variants pour ces produits
    const { data: customVariantPrices } = await supabase
      .from("client_custom_variant_prices")
      .select(`
        custom_monthly_price,
        custom_purchase_price,
        margin_rate,
        product_variant_prices (
          id,
          product_id,
          attributes,
          price,
          monthly_price,
          stock
        )
      `)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .in("product_variant_prices.product_id", productIds);

    // Récupérer les combinaisons personnalisées pour ces produits
    const { data: customCombinations } = await supabase
      .from("client_custom_variant_combinations")
      .select(`
        id,
        product_id,
        attributes,
        custom_monthly_price,
        custom_purchase_price,
        is_available
      `)
      .eq("client_id", clientId)
      .eq("is_available", true)
      .in("product_id", productIds);

    // Créer une map des prix personnalisés des variants par product_id, filtering hidden variants
    const customVariantPriceMap = new Map<string, any[]>();
    customVariantPrices?.forEach(cvp => {
      const productId = cvp.product_variant_prices?.product_id;
      const variantPriceId = cvp.product_variant_prices?.id;
      
      // Skip if this variant is hidden for this client
      if (variantPriceId && hiddenVariants.includes(variantPriceId)) {
        console.log(`🔒 Filtering out hidden variant from catalog: ${variantPriceId}`);
        return;
      }
      
      if (productId) {
        if (!customVariantPriceMap.has(productId)) {
          customVariantPriceMap.set(productId, []);
        }
        customVariantPriceMap.get(productId)?.push({
          id: cvp.product_variant_prices?.id,
          attributes: cvp.product_variant_prices?.attributes,
          price: cvp.custom_purchase_price || cvp.product_variant_prices?.price,
          monthly_price: cvp.custom_monthly_price || (
            cvp.margin_rate 
              ? (cvp.product_variant_prices?.price || 0) * (1 + cvp.margin_rate)
              : cvp.product_variant_prices?.monthly_price
          ),
          stock: cvp.product_variant_prices?.stock
        });
      }
    });

    // Créer une map des combinaisons personnalisées par product_id
    const customCombinationsMap = new Map<string, any[]>();
    customCombinations?.forEach(combination => {
      if (combination.product_id) {
        if (!customCombinationsMap.has(combination.product_id)) {
          customCombinationsMap.set(combination.product_id, []);
        }
        customCombinationsMap.get(combination.product_id)?.push({
          id: combination.id,
          attributes: combination.attributes,
          monthly_price: combination.custom_monthly_price || 0,
          price: combination.custom_purchase_price || 0
        });
      }
    });

    // Étape 3: Mapper les produits avec leurs prix personnalisés
    const mappedProducts: Product[] = productsData.map(product => {
      // Trouver le prix personnalisé correspondant à ce produit
      const customPrice = validPrices.find(price => price.product_id === product.id);
      if (!customPrice) return null;

      // Calculer le prix personnalisé selon la logique définie
      let customMonthlyPrice = product.monthly_price || 0;
      let customPurchasePrice = product.price || 0;

      // Priorité : custom_monthly_price > calcul par margin_rate > prix standard
      if (customPrice.custom_monthly_price) {
        customMonthlyPrice = customPrice.custom_monthly_price;
      } else if (customPrice.margin_rate && product.price) {
        customMonthlyPrice = product.price * (1 + customPrice.margin_rate);
      }

      if (customPrice.custom_purchase_price) {
        customPurchasePrice = customPrice.custom_purchase_price;
      }

      // Récupérer les variants personnalisés pour ce produit
      const customVariants = customVariantPriceMap.get(product.id) || [];
      
      // Récupérer les combinaisons personnalisées pour ce produit
      const productCustomCombinations = customCombinationsMap.get(product.id) || [];

      // Combiner tous les prix disponibles (variants + combinaisons) pour calculer le minimum
      const allAvailablePrices = [
        ...customVariants.map(v => v.monthly_price).filter(p => p > 0),
        ...productCustomCombinations.map(c => c.monthly_price).filter(p => p > 0)
      ];

      // Si on a des prix de variants/combinaisons, prendre le minimum, sinon utiliser le prix de base
      const minVariantPrice = allAvailablePrices.length > 0 
        ? Math.min(...allAvailablePrices)
        : 0;

      // Un produit a des variants s'il a des variants personnalisés OU des combinaisons personnalisées
      const hasVariants = customVariants.length > 0 || productCustomCombinations.length > 0;
      const totalVariantsCount = customVariants.length + productCustomCombinations.length;

      return {
        id: product.id,
        name: product.name || "",
        description: product.description || "",
        brand: product.brands?.name || product.brand_name || "",
        category: product.categories?.name || product.category_name || "",
        price: customPurchasePrice,
        monthly_price: customMonthlyPrice,
        min_variant_price: minVariantPrice,
        slug: product.slug || "",
        image_url: product.image_url || "",
        images: product.imageurls || [],
        co2_savings: 0,
        has_variants: hasVariants,
        variants_count: totalVariantsCount,
        active: product.active || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Ajouter les variants personnalisés
        variants: [],
        variant_combination_prices: customVariants,
        // Marquer comme prix personnalisé pour l'affichage
        is_custom_pricing: true,
        custom_pricing_notes: customPrice.notes
      };
    }).filter(Boolean) as Product[];

    console.log('🛒 CATALOGUE PERSONNALISÉ - Produits mappés:', mappedProducts.length);
    return mappedProducts;

  } catch (error) {
    console.error("Erreur lors du chargement du catalogue personnalisé:", error);
    throw error;
  }
};