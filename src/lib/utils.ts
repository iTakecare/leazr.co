
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Product } from "@/types/catalog";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateProductSlug(productName: string, productBrand?: string): string {
  // Nettoyer et normaliser le nom du produit
  let slug = productName.toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '') // Supprimer tous les caractères spéciaux sauf espaces et tirets
    .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
    .replace(/-+/g, '-') // Remplacer les tirets multiples par un seul
    .trim();

  // Ajouter la marque au début si elle est fournie
  if (productBrand && productBrand.trim()) {
    const brandSlug = productBrand.toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    if (brandSlug) {
      slug = `${brandSlug}-${slug}`;
    }
  }

  // Nettoyer les tirets en début et fin
  slug = slug.replace(/^-+|-+$/g, '');
  
  console.log(`🔗 generateProductSlug: "${productName}" + "${productBrand}" -> "${slug}"`);
  
  return slug;
}

export function findProductBySlug(products: Product[], targetSlug: string): Product | null {
  console.log(`🔍 findProductBySlug: Looking for "${targetSlug}" among ${products.length} products`);
  
  for (const product of products) {
    const generatedSlug = generateProductSlug(product.name, product.brand);
    console.log(`🔍 Comparing: "${generatedSlug}" vs "${targetSlug}" for product "${product.name}" (brand: "${product.brand}")`);
    
    if (generatedSlug === targetSlug) {
      console.log(`✅ Match found: "${product.name}" with slug "${generatedSlug}"`);
      return product;
    }
  }
  
  console.log(`❌ No match found for slug: "${targetSlug}"`);
  return null;
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR').format(dateObj);
}

export function generateTemplateId(): string {
  return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
