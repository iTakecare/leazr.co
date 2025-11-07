/**
 * Mapping des catégories d'équipement vers des emojis
 */

export const EQUIPMENT_CATEGORY_EMOJIS: Record<string, string> = {
  // Ordinateurs
  'mac mini': '💻',
  'macbook': '💻',
  'imac': '💻',
  'pc': '💻',
  'ordinateur': '💻',
  'laptop': '💻',
  
  // Tablettes
  'ipad': '📱',
  'tablette': '📱',
  'tablet': '📱',
  
  // Accessoires
  'clavier': '⌨️',
  'keyboard': '⌨️',
  'souris': '🖱️',
  'mouse': '🖱️',
  'magic keyboard': '⌨️',
  'magic mouse': '🖱️',
  'trackpad': '🖱️',
  'magic trackpad': '🖱️',
  
  // Stylets
  'apple pencil': '🖊️',
  'pencil': '🖊️',
  'stylet': '🖊️',
  
  // Écrans
  'écran': '🖥️',
  'moniteur': '🖥️',
  'display': '🖥️',
  'studio display': '🖥️',
  
  // Téléphones
  'iphone': '📱',
  'téléphone': '📱',
  'phone': '📱',
  
  // Stockage
  'disque': '💾',
  'ssd': '💾',
  'stockage': '💾',
  'storage': '💾',
  
  // Audio
  'airpods': '🎧',
  'casque': '🎧',
  'écouteurs': '🎧',
  'headphones': '🎧',
  
  // Réseau
  'routeur': '📡',
  'router': '📡',
  'wifi': '📡',
  
  // Autres
  'autre': '📦',
  'accessoire': '📦',
  'default': '📦',
};

/**
 * Détecte la catégorie d'un équipement en fonction de son titre
 */
export function getCategoryEmoji(title: string): string {
  if (!title) return EQUIPMENT_CATEGORY_EMOJIS.default;
  
  const lowerTitle = title.toLowerCase();
  
  // Chercher une correspondance dans les clés
  for (const [key, emoji] of Object.entries(EQUIPMENT_CATEGORY_EMOJIS)) {
    if (lowerTitle.includes(key)) {
      return emoji;
    }
  }
  
  return EQUIPMENT_CATEGORY_EMOJIS.default;
}
