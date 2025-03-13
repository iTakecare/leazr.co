
import { WooCommerceConfig, WooCommerceProduct } from './types';

// Gestion de la configuration WooCommerce
export const saveWooCommerceConfig = (config: WooCommerceConfig): void => {
  localStorage.setItem('woocommerce_config', JSON.stringify(config));
};

export const getWooCommerceConfig = (): WooCommerceConfig => {
  const config = localStorage.getItem('woocommerce_config');
  return config ? JSON.parse(config) : { url: '', consumerKey: '', consumerSecret: '' };
};

// Helpers pour les requêtes API WooCommerce
export const fetchAllProducts = async (): Promise<WooCommerceProduct[]> => {
  const config = getWooCommerceConfig();
  const { url, consumerKey, consumerSecret } = config;
  
  if (!url || !consumerKey || !consumerSecret) {
    throw new Error('Configuration WooCommerce incomplète');
  }
  
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  const apiUrl = `${url}/wp-json/wc/v3/products?per_page=100`;
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Échec de récupération des produits: ${response.status}`);
  }
  
  return await response.json();
};

export const fetchProductVariations = async (productId: number): Promise<any[]> => {
  const config = getWooCommerceConfig();
  const { url, consumerKey, consumerSecret } = config;
  
  if (!url || !consumerKey || !consumerSecret) {
    throw new Error('Configuration WooCommerce incomplète');
  }
  
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  const apiUrl = `${url}/wp-json/wc/v3/products/${productId}/variations?per_page=100`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Échec de récupération des variations: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Erreur lors de la récupération des variations pour le produit ${productId}:`, error);
    return [];
  }
};

// Utilitaires pour le traitement des données
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export const cleanHtml = (html: string): string => {
  if (!html) return '';
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let text = doc.body.textContent || '';
  text = text.replace(/\s+/g, ' ').trim();
  
  if (text.length > 500) {
    text = text.substring(0, 497) + '...';
  }
  
  return text;
};

export const parsePrice = (price: string): number => {
  if (!price) return 0;
  return parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
};

export const calculateMonthlyPrice = (purchasePrice: number): number => {
  // Environ 3.5% du prix d'achat
  return Math.round(purchasePrice * 0.035 * 100) / 100;
};

// Mapper les catégories WooCommerce vers les catégories internes
export const getCategoryMapping = (categories: { id: number; name: string; slug: string }[]): string => {
  if (!categories || categories.length === 0) return 'other';
  
  const categoryMap: { [key: string]: string } = {
    'ordinateur': 'desktop',
    'desktop': 'desktop',
    'pc': 'desktop',
    'ordinateur-portable': 'laptop',
    'laptop': 'laptop',
    'portable': 'laptop',
    'tablette': 'tablet',
    'tablet': 'tablet',
    'ipad': 'tablet',
    'telephone': 'smartphone',
    'smartphone': 'smartphone',
    'iphone': 'smartphone',
    'phone': 'smartphone',
    'mobile': 'smartphone',
    'ecran': 'display',
    'moniteur': 'display',
    'display': 'display',
    'accessoire': 'accessory',
    'accessory': 'accessory',
    'peripherique': 'peripheral',
    'peripheral': 'peripheral'
  };
  
  // Vérifier la catégorie la plus spécifique (dernier élément)
  const slug = categories[categories.length - 1].slug;
  
  // Correspondance exacte
  if (categoryMap[slug]) return categoryMap[slug];
  
  // Correspondance partielle
  for (const key in categoryMap) {
    if (slug.includes(key)) return categoryMap[key];
  }
  
  // Vérifier les mots dans le nom de la catégorie
  const words = slug.split('-');
  for (const word of words) {
    if (categoryMap[word]) return categoryMap[word];
  }
  
  // Vérifier les catégories parentes
  if (categories.length > 1) {
    const parentSlug = categories[categories.length - 2].slug;
    if (categoryMap[parentSlug]) return categoryMap[parentSlug];
    
    for (const key in categoryMap) {
      if (parentSlug.includes(key)) return categoryMap[key];
    }
  }
  
  return 'other';
};
