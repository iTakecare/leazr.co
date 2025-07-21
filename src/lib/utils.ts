
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatCurrency(amount: number | string): string {
  // Convert to number if it's a string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Return default format if not a number
  if (isNaN(numericAmount)) return '0,00 €';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(numericAmount);
}

// Format de l'équipement pour le PDF
export function formatEquipmentForPdf(equipmentData: any[] | string): string {
  try {
    let equipment;
    
    if (typeof equipmentData === 'string') {
      equipment = JSON.parse(equipmentData);
    } else {
      equipment = equipmentData;
    }
    
    if (Array.isArray(equipment) && equipment.length > 0) {
      // Format spécifique pour le PDF
      return equipment.map((item: any) => {
        const title = item.title || 'Produit sans nom';
        const quantity = item.quantity || 1;
        const monthlyPayment = parseFloat(item.monthlyPayment) || 0;
        
        return `${title}\nQuantité : ${quantity}\nMensualité unitaire : ${formatCurrency(monthlyPayment)}`;
      }).join('\n\n');
    }
    
    return "Aucun équipement spécifié";
  } catch (e) {
    console.error("Erreur lors du formatage de l'équipement pour PDF:", e);
    return "Erreur de formatage des données d'équipement";
  }
}

// Vérifie si une donnée d'équipement est valide
export function hasValidEquipmentData(data: any): boolean {
  if (!data) return false;
  
  try {
    let equipment;
    if (typeof data === 'string') {
      equipment = JSON.parse(data);
    } else {
      equipment = data;
    }
    
    return Array.isArray(equipment) && equipment.length > 0;
  } catch (e) {
    return false;
  }
}

// Génère un identifiant unique pour un modèle PDF
export function generateTemplateId(prefix: string = 'template'): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomStr}`;
}

// Récupère tous les modèles disponibles avec leur nom pour les listes de sélection
export function formatTemplatesForSelection(templates: any[]): { label: string, value: string }[] {
  if (!Array.isArray(templates) || templates.length === 0) {
    return [{ label: "Modèle par défaut", value: "default" }];
  }
  
  return templates.map(template => ({
    label: template.name || `Modèle ${template.id}`,
    value: template.id
  }));
}

// Génère un slug SEO-friendly à partir du nom et de la marque d'un produit
export function generateProductSlug(name: string, brand?: string): string {
  // Créer la chaîne de base : brand-name ou juste name
  let baseString = brand ? `${brand} ${name}` : name;
  
  // Normaliser le slug
  return baseString
    .toLowerCase() // Tout en minuscules
    .normalize('NFD') // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
    .replace(/-+/g, '-') // Remplacer les tirets multiples par un seul
    .replace(/^-|-$/g, '') // Supprimer les tirets en début/fin
    .trim();
}

// Trouve un produit par son slug dans une liste de produits
export function findProductBySlug(products: any[], targetSlug: string): any | null {
  if (!products || !Array.isArray(products) || !targetSlug) {
    return null;
  }
  
  // Map pour éviter de recalculer les slugs plusieurs fois
  const productSlugs = new Map();
  
  for (const product of products) {
    if (!product.name) continue;
    
    const productSlug = generateProductSlug(product.name, product.brand);
    productSlugs.set(product.id, productSlug);
    
    if (productSlug === targetSlug) {
      return product;
    }
  }
  
  // Si aucun match exact, essayer de trouver un produit avec un slug similaire
  // (gestion des conflits potentiels avec suffixes numériques)
  for (const product of products) {
    const productSlug = productSlugs.get(product.id);
    if (productSlug && targetSlug.startsWith(productSlug + '-')) {
      // Le slug cible pourrait être une variation avec suffixe numérique
      const suffix = targetSlug.substring(productSlug.length + 1);
      if (/^\d+$/.test(suffix)) {
        return product;
      }
    }
  }
  
  return null;
}
