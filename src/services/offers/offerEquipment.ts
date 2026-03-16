import { supabase } from "@/integrations/supabase/client";
import { sanitizeLikePattern } from "@/utils/sanitizeLikePattern";
import { 
  OfferEquipment, 
  OfferEquipmentAttribute, 
  OfferEquipmentSpecification 
} from "@/types/offerEquipment";

/**
 * Parse JSON equipment data and convert to OfferEquipment format
 */
const parseEquipmentFromJson = (equipmentJson: string): OfferEquipment[] => {
  try {
    const data = JSON.parse(equipmentJson);
    if (!Array.isArray(data)) return [];
    
    return data.map((item, index) => ({
      id: `temp-${index}`,
      offer_id: 'temp',
      title: item.title || "Produit sans nom",
      purchase_price: Number(item.purchasePrice || item.purchase_price) || 0,
      quantity: Number(item.quantity) || 1,
      margin: Number(item.margin) || 0,
      monthly_payment: Number(item.monthlyPayment || item.monthly_payment) || 0,
      serial_number: item.serialNumber || item.serial_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: item.attributes ? Object.entries(item.attributes).map(([key, value]) => ({
        equipment_id: `temp-${index}`,
        key,
        value: String(value)
      })) : [],
      specifications: item.specifications ? Object.entries(item.specifications).map(([key, value]) => ({
        equipment_id: `temp-${index}`,
        key,
        value: String(value)
      })) : []
    }));
  } catch (error) {
    console.error("Error parsing equipment JSON:", error);
    return [];
  }
};

/**
 * Enrichit les équipements sans image en cherchant dans le catalogue par titre
 */
const enrichEquipmentImages = async (equipment: OfferEquipment[], offerId: string): Promise<OfferEquipment[]> => {
  try {
    // Récupérer le company_id de l'offre
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('company_id')
      .eq('id', offerId)
      .single();
    
    if (offerError || !offer?.company_id) {
      console.warn("Cannot enrich images: company_id not found");
      return equipment;
    }
    
    const companyId = offer.company_id;
    const imageCache = new Map<string, string | null>();
    
    // Enrichir en parallèle tous les équipements sans image
    const enrichedEquipment = await Promise.all(
      equipment.map(async (item) => {
        // Si l'équipement a déjà une image, le retourner tel quel
        if (item.image_url) {
          return item;
        }
        
        // Vérifier le cache d'abord
        const cacheKey = item.title.toLowerCase().trim();
        if (imageCache.has(cacheKey)) {
          return { ...item, image_url: imageCache.get(cacheKey) };
        }
        
        // Première recherche: exacte par titre complet
        let { data: products, error: productError } = await supabase
          .from('products')
          .select('id, name, image_url, image_urls')
          .eq('company_id', companyId)
          .ilike('name', `%${sanitizeLikePattern(item.title)}%`)
          .limit(1);
        
        // Si pas de résultat, recherche permissive avec titre nettoyé
        if (!products || products.length === 0) {
          // Nettoyer le titre: retirer chiffres et normaliser espaces
          const cleanTitle = item.title
            .replace(/\d+/g, '') // Retirer "2", "3", etc.
            .replace(/\s+/g, ' ') // Normaliser espaces multiples
            .trim();
          
          if (cleanTitle !== item.title) {
            console.log(`🔍 Fallback search for "${item.title}" → "${cleanTitle}"`);
            
            const { data: altProducts, error: altError } = await supabase
              .from('products')
              .select('id, name, image_url, image_urls')
              .eq('company_id', companyId)
              .ilike('name', `%${sanitizeLikePattern(cleanTitle)}%`)
              .limit(1);
            
            if (!altError && altProducts && altProducts.length > 0) {
              products = altProducts;
              console.log(`✅ Found with fallback: "${altProducts[0].name}"`);
            }
          }
        }
        
        if (productError || !products || products.length === 0) {
          console.warn(`❌ No image found for "${item.title}"`);
          imageCache.set(cacheKey, null);
          return item;
        }
        
        const product = products[0];
        const finalImage = product.image_urls?.[0] || product.image_url || null;
        
        imageCache.set(cacheKey, finalImage);
        console.log(`✅ Enriched image for "${item.title}": ${finalImage ? 'found' : 'null'}`);
        
        return { ...item, image_url: finalImage };
      })
    );
    
    return enrichedEquipment;
  } catch (error) {
    console.error("Error enriching equipment images:", error);
    return equipment;
  }
};

/**
 * Enrichit les équipements dont le purchase_price est à 0 en cherchant dans le catalogue
 */
const enrichEquipmentPurchasePrices = async (equipment: OfferEquipment[], offerId: string): Promise<OfferEquipment[]> => {
  try {
    // Filtrer les équipements avec purchase_price à 0
    const needsEnrichment = equipment.filter(item => !item.purchase_price || item.purchase_price === 0);
    if (needsEnrichment.length === 0) return equipment;

    // Récupérer le company_id de l'offre
    const { data: offer } = await supabase
      .from('offers')
      .select('company_id')
      .eq('id', offerId)
      .single();

    if (!offer?.company_id) return equipment;

    const enriched = await Promise.all(
      equipment.map(async (item) => {
        if (item.purchase_price && item.purchase_price > 0) return item;

        // Si on a un product_id, chercher directement
        if (item.product_id) {
          // D'abord chercher dans product_variant_prices avec les attributs
          const attrs = item.attributes || [];
          if (attrs.length > 0) {
            const { data: variantPrices } = await supabase
              .from('product_variant_prices')
              .select('price, purchase_price')
              .eq('product_id', item.product_id);

            if (variantPrices && variantPrices.length > 0) {
              // Trouver la variante correspondant aux attributs
              const attrMap: Record<string, string> = {};
              attrs.forEach(a => { attrMap[a.key] = a.value; });

              for (const vp of variantPrices) {
                const vpAttrs = (vp as any).attributes;
                if (vpAttrs && typeof vpAttrs === 'object') {
                  const matches = Object.entries(attrMap).every(([k, v]) => vpAttrs[k] === v);
                  if (matches) {
                    const price = vp.purchase_price || vp.price || 0;
                    if (price > 0) {
                      console.log(`✅ Enriched purchase_price for "${item.title}" via variant: ${price}€`);
                      return { ...item, purchase_price: price };
                    }
                  }
                }
              }
            }
          }

          // Fallback: prix du produit parent
          const { data: product } = await supabase
            .from('products')
            .select('price, purchase_price')
            .eq('id', item.product_id)
            .single();

          if (product) {
            const price = product.purchase_price || product.price || 0;
            if (price > 0) {
              console.log(`✅ Enriched purchase_price for "${item.title}" via product: ${price}€`);
              return { ...item, purchase_price: price };
            }
          }
        }

        // Sinon, chercher par titre dans le catalogue
        const { data: products } = await supabase
          .from('products')
          .select('id, price, purchase_price')
          .eq('company_id', offer.company_id)
          .ilike('name', `%${sanitizeLikePattern(item.title)}%`)
          .limit(1);

        if (products && products.length > 0) {
          const p = products[0];
          // Chercher aussi dans les variant prices
          const { data: variantPrices } = await supabase
            .from('product_variant_prices')
            .select('price, purchase_price')
            .eq('product_id', p.id);

          if (variantPrices && variantPrices.length > 0) {
            const attrs = item.attributes || [];
            const attrMap: Record<string, string> = {};
            attrs.forEach(a => { attrMap[a.key] = a.value; });

            for (const vp of variantPrices) {
              const vpAttrs = (vp as any).attributes;
              if (vpAttrs && typeof vpAttrs === 'object' && Object.keys(attrMap).length > 0) {
                const matches = Object.entries(attrMap).every(([k, v]) => vpAttrs[k] === v);
                if (matches) {
                  const price = vp.purchase_price || vp.price || 0;
                  if (price > 0) {
                    console.log(`✅ Enriched purchase_price for "${item.title}" via title+variant: ${price}€`);
                    return { ...item, purchase_price: price };
                  }
                }
              }
            }
          }

          const price = p.purchase_price || p.price || 0;
          if (price > 0) {
            console.log(`✅ Enriched purchase_price for "${item.title}" via title search: ${price}€`);
            return { ...item, purchase_price: price };
          }
        }

        return item;
      })
    );

    return enriched;
  } catch (error) {
    console.error("Error enriching purchase prices:", error);
    return equipment;
  }
};

/**
 * Fetch equipment with their attributes and specifications
 */
const fetchEquipmentWithDetails = async (equipmentData: any[]): Promise<OfferEquipment[]> => {
  const equipmentWithDetails: OfferEquipment[] = [];
  
  // Pour chaque équipement, récupérer ses attributs et spécifications
  for (const equipment of equipmentData) {
    // Récupérer les attributs
    const { data: attributesData, error: attributesError } = await supabase
      .from('offer_equipment_attributes')
      .select('*')
      .eq('equipment_id', equipment.id);
    
    if (attributesError) {
      console.error("Erreur lors de la récupération des attributs:", attributesError);
    }
    
    // Récupérer les spécifications
    const { data: specificationsData, error: specificationsError } = await supabase
      .from('offer_equipment_specifications')
      .select('*')
      .eq('equipment_id', equipment.id);
    
    if (specificationsError) {
      console.error("Erreur lors de la récupération des spécifications:", specificationsError);
    }
    
    // Déterminer l'image URL prioritaire (snapshot > product image_urls[0] > product image_url)
    const finalImageUrl = equipment.image_url || 
                          equipment.product?.image_urls?.[0] || 
                          equipment.product?.image_url || 
                          null;
    
    equipmentWithDetails.push({
      ...equipment,
      image_url: finalImageUrl,
      attributes: attributesData || [],
      specifications: specificationsData || []
    });
  }
  
  console.log("Offer equipment fetched successfully with details");
  return equipmentWithDetails;
};

/**
 * Récupère tous les équipements d'une offre avec leurs attributs et spécifications
 * Avec migration automatique depuis JSON si les nouvelles tables sont vides
 */
export const getOfferEquipment = async (offerId: string): Promise<OfferEquipment[]> => {
  console.log("🔥 EQUIPMENT SERVICE - Starting getOfferEquipment for:", offerId);
  
  try {
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("🔥 EQUIPMENT SERVICE - Current user:", user?.id, "Email:", user?.email);
    
    if (authError) {
      console.error("🔥 EQUIPMENT SERVICE - Auth error:", authError);
      throw new Error("Erreur d'authentification: " + authError.message);
    }

    // D'abord essayer de récupérer depuis la nouvelle table offer_equipment
    console.log("🔥 EQUIPMENT SERVICE - Querying offer_equipment table...");
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select(`
        *,
        product:products(image_url, image_urls),
        attributes:offer_equipment_attributes(key, value),
        specifications:offer_equipment_specifications(key, value)
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });

    if (equipmentError) {
      console.error("🔥 EQUIPMENT SERVICE - Equipment query error:", equipmentError);
      throw new Error("Erreur lors de la récupération des équipements: " + equipmentError.message);
    }

    console.log("🔥 EQUIPMENT SERVICE - Equipment query result:", equipmentData?.length, "items");

    // Si nous avons des données dans offer_equipment, les utiliser
    if (equipmentData && equipmentData.length > 0) {
      console.log("🔥 EQUIPMENT SERVICE - Processing equipment details...");
      const processed = await fetchEquipmentWithDetails(equipmentData);
      console.log("🔥 EQUIPMENT SERVICE - Processed equipment:", processed.length, "items");
      
      // Fallback: enrichir les images manquantes en cherchant par titre dans le catalogue
      const withImages = await enrichEquipmentImages(processed, offerId);
      // Enrichir les prix d'achat manquants depuis le catalogue
      const enriched = await enrichEquipmentPurchasePrices(withImages, offerId);
      return enriched;
    }

    console.log("🔥 EQUIPMENT SERVICE - No equipment in offer_equipment, checking offer JSON...");
    
    // Sinon, essayer de migrer depuis le champ JSON de la table offers
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select('equipment_description, company_id')
      .eq('id', offerId)
      .single();

    if (offerError) {
      console.error("🔥 EQUIPMENT SERVICE - Offer query error:", offerError);
      throw new Error("Erreur lors de la récupération de l'offre: " + offerError.message);
    }

    console.log("🔥 EQUIPMENT SERVICE - Offer equipment_description:", !!offerData?.equipment_description);

    if (offerData?.equipment_description) {
      console.log("🔥 EQUIPMENT SERVICE - Attempting migration from JSON...");
      
      try {
        // Essayer de migrer les données JSON vers la nouvelle structure
        const migrationSuccess = await migrateEquipmentFromJson(offerId, offerData.equipment_description);
        
        if (migrationSuccess) {
          console.log("🔥 EQUIPMENT SERVICE - Migration successful, fetching migrated data...");
          // Récupérer les équipements migrés
          const { data: migratedData, error: migratedError } = await supabase
            .from('offer_equipment')
            .select(`
              *,
              attributes:offer_equipment_attributes(key, value),
              specifications:offer_equipment_specifications(key, value)
            `)
            .eq('offer_id', offerId)
            .order('created_at', { ascending: true });

          if (migratedError) {
            console.error("🔥 EQUIPMENT SERVICE - Migration query error:", migratedError);
            throw new Error("Erreur lors de la récupération des équipements migrés: " + migratedError.message);
          }

          const processed = await fetchEquipmentWithDetails(migratedData || []);
          console.log("🔥 EQUIPMENT SERVICE - Final migrated equipment:", processed.length, "items");
          
           // Fallback: enrichir les images manquantes en cherchant par titre dans le catalogue
           const withImages = await enrichEquipmentImages(processed, offerId);
           // Enrichir les prix d'achat manquants depuis le catalogue
           const enriched = await enrichEquipmentPurchasePrices(withImages, offerId);
           return enriched;
        } else {
          console.warn("🔥 EQUIPMENT SERVICE - Migration failed");
        }
      } catch (migrationError) {
        console.error("🔥 EQUIPMENT SERVICE - Migration error:", migrationError);
        // En cas d'erreur de migration, retourner un tableau vide plutôt que de lancer une erreur
      }
    }

    console.log("🔥 EQUIPMENT SERVICE - No equipment found for offer:", offerId);
    return [];

  } catch (error) {
    console.error("🔥 EQUIPMENT SERVICE - Global error:", error);
    throw error;
  }
};

/**
 * Enregistre un équipment et ses attributs/spécifications en utilisant les fonctions SECURITY DEFINER
 */
export const saveEquipment = async (
  equipment: Omit<OfferEquipment, 'id' | 'created_at' | 'updated_at'>,
  attributes: Record<string, string> = {},
  specifications: Record<string, string | number> = {}
): Promise<OfferEquipment | null> => {
  try {
    console.log("Saving equipment for offer:", equipment.offer_id);
    console.log("Equipment attributes to save:", attributes);
    console.log("Equipment specifications to save:", specifications);
    
    // 1. Insérer l'équipement principal en utilisant la fonction SECURITY DEFINER
    const { data: equipmentId, error: equipmentError } = await supabase
      .rpc('insert_offer_equipment_secure', {
        p_offer_id: equipment.offer_id,
        p_title: equipment.title,
        p_purchase_price: equipment.purchase_price,
        p_quantity: equipment.quantity,
        p_margin: equipment.margin,
        p_monthly_payment: equipment.monthly_payment,
        p_selling_price: equipment.selling_price,
        p_coefficient: equipment.coefficient,
        p_serial_number: equipment.serial_number,
        p_collaborator_id: equipment.collaborator_id,
        p_delivery_site_id: equipment.delivery_site_id,
        p_delivery_type: equipment.delivery_type,
        p_delivery_address: equipment.delivery_address,
        p_delivery_city: equipment.delivery_city,
        p_delivery_postal_code: equipment.delivery_postal_code,
        p_delivery_country: equipment.delivery_country,
        p_delivery_contact_name: equipment.delivery_contact_name,
        p_delivery_contact_email: equipment.delivery_contact_email,
        p_delivery_contact_phone: equipment.delivery_contact_phone,
        p_product_id: equipment.product_id || null,
        p_image_url: equipment.image_url || null
      });
    
    if (equipmentError) {
      console.error("Erreur lors de la sauvegarde de l'équipement:", equipmentError);
      return null;
    }
    
    console.log("Equipment created with ID:", equipmentId);
    
    // 2. Insérer les attributs en utilisant la fonction SECURITY DEFINER
    if (Object.keys(attributes).length > 0) {
      console.log("Inserting attributes:", attributes);
      for (const [key, value] of Object.entries(attributes)) {
        const { error: attributeError } = await supabase
          .rpc('insert_offer_equipment_attributes_secure', {
            p_equipment_id: equipmentId,
            p_key: key,
            p_value: value
          });
        
        if (attributeError) {
          console.error("Erreur lors de la sauvegarde de l'attribut:", attributeError);
        }
      }
      console.log("Attributes saved successfully");
    }
    
    // 3. Insérer les spécifications en utilisant la fonction SECURITY DEFINER
    if (Object.keys(specifications).length > 0) {
      console.log("Inserting specifications:", specifications);
      for (const [key, value] of Object.entries(specifications)) {
        const { error: specificationError } = await supabase
          .rpc('insert_offer_equipment_specifications_secure', {
            p_equipment_id: equipmentId,
            p_key: key,
            p_value: String(value)
          });
        
        if (specificationError) {
          console.error("Erreur lors de la sauvegarde de la spécification:", specificationError);
        }
      }
      console.log("Specifications saved successfully");
    }
    
    // Retourner l'équipement avec ses attributs et spécifications
    return {
      id: equipmentId,
      offer_id: equipment.offer_id,
      title: equipment.title,
      purchase_price: equipment.purchase_price,
      quantity: equipment.quantity,
      margin: equipment.margin,
      monthly_payment: equipment.monthly_payment,
      serial_number: equipment.serial_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: Object.entries(attributes).map(([key, value]) => ({
        equipment_id: equipmentId,
        key,
        value
      })),
      specifications: Object.entries(specifications).map(([key, value]) => ({
        equipment_id: equipmentId,
        key,
        value: String(value)
      }))
    };
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de l'équipement:", error);
    return null;
  }
};

/**
 * Migre les équipements existants du format JSON vers la nouvelle structure de tables
 * Utilise maintenant les fonctions SECURITY DEFINER
 */
export const migrateEquipmentFromJson = async (offerId: string, equipmentJson: string | any): Promise<boolean> => {
  try {
    console.log("Starting equipment migration for offer:", offerId);
    
    // Convertir equipmentJson en objet s'il est déjà une chaîne
    let equipmentData;
    
    if (typeof equipmentJson === 'string') {
      try {
        equipmentData = JSON.parse(equipmentJson);
      } catch (error) {
        console.error("Erreur lors du parsing du JSON d'équipement:", error);
        return false;
      }
    } else {
      equipmentData = equipmentJson;
    }
    
    if (!Array.isArray(equipmentData)) {
      console.error("Le format JSON n'est pas un tableau d'équipements");
      return false;
    }
    
    console.log("Données d'équipement à migrer:", equipmentData);
    
    // Migrer chaque équipement
    for (const item of equipmentData) {
      // Calculer le selling_price si non fourni
      const purchasePrice = Number(item.purchasePrice || item.purchase_price) || 0;
      const margin = Number(item.margin) || 0;
      const providedSellingPrice = Number(item.sellingPrice || item.selling_price) || 0;
      const calculatedSellingPrice = purchasePrice * (1 + margin / 100);
      
      // Créer l'équipement de base avec selling_price
      const newEquipment = {
        offer_id: offerId,
        title: item.title || "Produit sans nom",
        purchase_price: purchasePrice,
        quantity: Number(item.quantity) || 1,
        margin: margin,
        monthly_payment: Number(item.monthlyPayment || item.monthly_payment) || 0,
        serial_number: item.serialNumber || item.serial_number,
        selling_price: providedSellingPrice > 0 ? providedSellingPrice : calculatedSellingPrice
      };
      
      // Extraire les attributs et spécifications
      const attributes = {};
      const specifications = {};
      
      // Traiter les attributs s'ils existent
      if (item.attributes && typeof item.attributes === 'object') {
        Object.entries(item.attributes).forEach(([key, value]) => {
          attributes[key] = String(value);
        });
      }
      
      // Traiter les spécifications s'ils existent
      if (item.specifications && typeof item.specifications === 'object') {
        Object.entries(item.specifications).forEach(([key, value]) => {
          specifications[key] = String(value);
        });
      }
      
      // Compatibilité avec l'ancien format qui utilisait "variants" au lieu de "specifications"
      if (item.variants && typeof item.variants === 'object') {
        Object.entries(item.variants).forEach(([key, value]) => {
          specifications[key] = String(value);
        });
      }
      
      // Sauvegarder l'équipement avec ses attributs et spécifications
      const result = await saveEquipment(newEquipment, attributes, specifications);
      if (!result) {
        console.error("Échec de la sauvegarde d'un équipement:", newEquipment);
        // Ne pas faire échouer toute la migration pour un seul équipement
        continue;
      }
    }
    
    console.log(`Migration terminée avec succès pour l'offre ${offerId}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de la migration des équipements:", error);
    return false;
  }
};

/**
 * Convertit les équipements en JSON pour la compatibilité avec le code existant
 */
export const convertEquipmentToJson = (equipment: OfferEquipment[]): string => {
  try {
    const jsonData = equipment.map(item => {
      // Convertir les attributs en objet
      const attributes: Record<string, string> = {};
      if (item.attributes && item.attributes.length > 0) {
        item.attributes.forEach(attr => {
          attributes[attr.key] = attr.value;
        });
      }
      
      // Convertir les spécifications en objet
      const specifications: Record<string, string> = {};
      if (item.specifications && item.specifications.length > 0) {
        item.specifications.forEach(spec => {
          specifications[spec.key] = spec.value;
        });
      }
      
      return {
        id: item.id,
        title: item.title,
        purchasePrice: item.purchase_price,
        quantity: item.quantity,
        margin: item.margin,
        monthlyPayment: item.monthly_payment,
        serialNumber: item.serial_number,
        attributes,
        specifications
      };
    });
    
    return JSON.stringify(jsonData);
  } catch (error) {
    console.error("Erreur lors de la conversion des équipements en JSON:", error);
    return "[]";
  }
};

/**
 * Force la migration de tous les équipements pour une offre spécifique
 */
export const forceMigrateEquipmentData = async (offerId: string): Promise<boolean> => {
  try {
    // 1. Récupérer l'offre existante
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('equipment_description')
      .eq('id', offerId)
      .single();
    
    if (offerError || !offer) {
      console.error("Erreur lors de la récupération de l'offre:", offerError);
      return false;
    }
    
    if (!offer.equipment_description) {
      console.log("Aucune description d'équipement à migrer pour cette offre");
      return false;
    }
    
    // 2. Forcer la migration des équipements
    const success = await migrateEquipmentFromJson(offerId, offer.equipment_description);
    return success;
  } catch (error) {
    console.error("Erreur lors de la migration forcée:", error);
    return false;
  }
};

/**
 * Met à jour un équipement existant
 */
export const updateOfferEquipment = async (
  equipmentId: string,
  updates: Partial<
    Pick<
      OfferEquipment,
      | 'title'
      | 'purchase_price'
      | 'quantity'
      | 'margin'
      | 'monthly_payment'
      | 'selling_price'
      | 'coefficient'
      | 'serial_number'
      | 'collaborator_id'
      | 'delivery_site_id'
      | 'delivery_type'
      | 'delivery_address'
      | 'delivery_city'
      | 'delivery_postal_code'
      | 'delivery_country'
      | 'delivery_contact_name'
      | 'delivery_contact_email'
      | 'delivery_contact_phone'
      | 'product_id'
      | 'image_url'
    >
  >
): Promise<boolean> => {
  try {
    console.log("🔵 UPDATE EQUIPMENT SERVICE - Updating equipment:", equipmentId);
    console.log("🔵 UPDATE EQUIPMENT SERVICE - Updates:", updates);
    
    const { data, error } = await supabase
      .rpc('update_offer_equipment_secure', {
        p_equipment_id: equipmentId,
        p_title: updates.title ?? null,
        p_purchase_price: updates.purchase_price ?? null,
        p_quantity: updates.quantity ?? null,
        p_margin: updates.margin ?? null,
        p_monthly_payment: updates.monthly_payment ?? null,
        p_selling_price: updates.selling_price ?? null,
        p_coefficient: updates.coefficient ?? null,
        p_serial_number: updates.serial_number ?? null,
        // Extended delivery/product fields to disambiguate RPC overload
        p_collaborator_id: updates.collaborator_id ?? null,
        p_delivery_site_id: updates.delivery_site_id ?? null,
        p_delivery_type: updates.delivery_type ?? null,
        p_delivery_address: updates.delivery_address ?? null,
        p_delivery_city: updates.delivery_city ?? null,
        p_delivery_postal_code: updates.delivery_postal_code ?? null,
        p_delivery_country: updates.delivery_country ?? null,
        p_delivery_contact_name: updates.delivery_contact_name ?? null,
        p_delivery_contact_email: updates.delivery_contact_email ?? null,
        p_delivery_contact_phone: updates.delivery_contact_phone ?? null,
        p_product_id: updates.product_id ?? null,
        p_image_url: updates.image_url ?? null
      });
    
    if (error) {
      console.error("🔴 UPDATE EQUIPMENT SERVICE - RPC Error:", error);
      console.error("🔴 UPDATE EQUIPMENT SERVICE - Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(error.message || "Erreur lors de la mise à jour de l'équipement");
    }
    
    console.log("✅ UPDATE EQUIPMENT SERVICE - Equipment updated successfully:", data);
    return true;
  } catch (error: any) {
    console.error("🔴 UPDATE EQUIPMENT SERVICE - Catch error:", error);
    throw new Error(error?.message || "Erreur lors de la mise à jour de l'équipement");
  }
};

/**
 * Supprime un équipement existant et toutes ses données liées
 */
export const deleteOfferEquipment = async (equipmentId: string): Promise<boolean> => {
  try {
    console.log("Deleting equipment:", equipmentId);
    
    // Supprimer d'abord les attributs
    const { error: attributesError } = await supabase
      .from('offer_equipment_attributes')
      .delete()
      .eq('equipment_id', equipmentId);
    
    if (attributesError) {
      console.error("Erreur lors de la suppression des attributs:", attributesError);
    }
    
    // Supprimer les spécifications
    const { error: specificationsError } = await supabase
      .from('offer_equipment_specifications')
      .delete()
      .eq('equipment_id', equipmentId);
    
    if (specificationsError) {
      console.error("Erreur lors de la suppression des spécifications:", specificationsError);
    }
    
    // Supprimer l'équipement principal
    const { error: equipmentError } = await supabase
      .from('offer_equipment')
      .delete()
      .eq('id', equipmentId);
    
    if (equipmentError) {
      console.error("Erreur lors de la suppression de l'équipement:", equipmentError);
      throw new Error(equipmentError.message);
    }
    
    console.log("Equipment deleted successfully");
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'équipement:", error);
    throw error;
  }
};
