// Utilitaires pour la gestion des prix et promotions des packs

import { ProductPack } from '@/types/pack';

/**
 * Parse une valeur date (string | Date) en objet Date
 */
export const parseDate = (value: string | Date | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    return new Date(value);
  } catch {
    return null;
  }
};

/**
 * Retourne la fin de journée pour une date (23:59:59.999)
 * pour rendre les fenêtres de promotion inclusives
 */
export const endOfDay = (date: Date): Date => {
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
};

/**
 * Vérifie si une promotion est actuellement active
 */
export const isPromoActive = (pack: ProductPack, now: Date = new Date()): boolean => {
  if (!pack.promo_active || !pack.pack_promo_price || pack.pack_promo_price <= 0) {
    return false;
  }

  const promoStart = parseDate(pack.promo_valid_from);
  const promoEnd = parseDate(pack.promo_valid_to);

  // Vérifier la fenêtre de promotion avec dates inclusives
  const isAfterStart = !promoStart || now >= promoStart;
  const isBeforeEnd = !promoEnd || now <= endOfDay(promoEnd);

  return isAfterStart && isBeforeEnd;
};

/**
 * Calcule le prix effectif d'un pack en tenant compte des promotions
 */
export const getEffectivePackPrice = (pack: ProductPack, now: Date = new Date()): number => {
  // 1. Si promo active, utiliser le prix promo
  if (isPromoActive(pack, now)) {
    return pack.pack_promo_price || 0;
  }

  // 2. Sinon, utiliser le prix personnalisé du pack s'il existe
  if (pack.pack_monthly_price && pack.pack_monthly_price > 0) {
    return pack.pack_monthly_price;
  }

  // 3. Sinon, utiliser la somme des prix individuels
  return pack.total_monthly_price || 0;
};

/**
 * Calcule les économies par rapport aux prix individuels
 */
export const getSavingsVsIndividuals = (pack: ProductPack, now: Date = new Date()): number => {
  const effectivePrice = getEffectivePackPrice(pack, now);
  const individualTotal = pack.total_monthly_price || 0;
  
  return Math.max(0, individualTotal - effectivePrice);
};

/**
 * Calcule le pourcentage d'économie
 */
export const getSavingsPercentage = (pack: ProductPack, now: Date = new Date()): number => {
  const savings = getSavingsVsIndividuals(pack, now);
  const individualTotal = pack.total_monthly_price || 0;
  
  if (individualTotal <= 0) return 0;
  
  return Math.round((savings / individualTotal) * 100);
};

/**
 * Formate un prix en euros
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};