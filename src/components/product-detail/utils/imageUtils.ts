
/**
 * Utility functions for product image handling
 */

/**
 * Checks if an image URL is valid
 */
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  // Si l'URL est null, undefined ou une chaîne vide, elle n'est pas valide
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // Si c'est l'image placeholder par défaut, considérée comme non valide (pour forcer le chargement d'une vraie image)
  if (url === '/placeholder.svg') {
    return false;
  }
  
  // Exclure les placeholders ou fichiers cachés
  if (
    url.includes('.emptyFolderPlaceholder') || 
    url.split('/').pop()?.startsWith('.') ||
    url.includes('undefined') ||
    url.endsWith('/')
  ) {
    return false;
  }
  
  // Validation d'URL avec une approche plus permissive
  try {
    // Si c'est un chemin relatif commençant par /, c'est valide
    if (url.startsWith('/') && url !== '/placeholder.svg') {
      console.log(`Accepting relative URL: ${url}`);
      return true;
    }
    
    // Accepter toute URL commençant par http(s):// ou data:
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      console.log(`Accepting URL with protocol: ${url}`);
      return true;
    }
    
    // Essayer de valider comme URL avec une approche plus permissive
    new URL(url);
    console.log(`URL validated successfully: ${url}`);
    return true;
  } catch (e) {
    // Si ce n'est pas une URL valide mais semble être un chemin, l'accepter
    const seemsLikePath = url.includes('/') && !url.includes('undefined');
    console.log(`URL validation failed for ${url}, seems like path: ${seemsLikePath}`);
    return seemsLikePath;
  }
};

/**
 * Filter and deduplicate valid image URLs
 */
export const filterValidImages = (mainImageUrl: string, additionalUrls: string[] = []): string[] => {
  // Create a set to deduplicate images
  const uniqueUrlsSet = new Set<string>();
  const validUrls: string[] = [];
  
  // Process the main image first if valid
  if (isValidImageUrl(mainImageUrl)) {
    uniqueUrlsSet.add(mainImageUrl);
    validUrls.push(mainImageUrl);
  }
  
  // Process additional images if valid
  if (Array.isArray(additionalUrls)) {
    additionalUrls.forEach(url => {
      // Only add if it's valid and not already added
      if (isValidImageUrl(url) && !uniqueUrlsSet.has(url)) {
        uniqueUrlsSet.add(url);
        validUrls.push(url);
      }
    });
  }
  
  console.log("Filtered valid images:", validUrls.length, "from", additionalUrls?.length || 0, "additional URLs");
  return validUrls;
};

/**
 * Add a timestamp to image URLs to prevent caching issues
 */
export const addTimestamp = (url: string): string => {
  if (!url || !isValidImageUrl(url)) {
    console.log("Invalid image URL detected:", url);
    return "/placeholder.svg";
  }
  
  try {
    // Check if it's already our placeholder
    if (url === '/placeholder.svg') {
      return url;
    }
    
    // Pour les URL Supabase Storage qui génèrent des erreurs d'accès
    if (url.includes('supabase.co/storage/v1/object/public')) {
      // Vérifier si l'URL est accessible avec un fetch HEAD silencieux
      // Pour éviter de générer des erreurs CORS, nous acceptons simplement l'URL telle quelle
      // Et laissons l'élément img gérer l'erreur si nécessaire
      console.log(`Processing Supabase storage URL: ${url}`);
      
      // Strip any existing timestamp parameter
      let cleanUrl = url;
      if (url.includes('?t=') || url.includes('&t=')) {
        cleanUrl = url.replace(/([?&])t=\d+(&|$)/, '$1').replace(/[?&]$/, '');
      }
      
      // Add a timestamp query parameter to prevent caching
      const separator = cleanUrl.includes('?') ? '&' : '?';
      return `${cleanUrl}${separator}t=${Date.now()}`;
    }
    
    // Pour les autres URL normales
    // Strip any existing timestamp parameter
    let cleanUrl = url;
    if (url.includes('?t=') || url.includes('&t=')) {
      cleanUrl = url.replace(/([?&])t=\d+(&|$)/, '$1').replace(/[?&]$/, '');
    }
    
    // Add a timestamp query parameter to prevent caching
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const timestampedUrl = `${cleanUrl}${separator}t=${Date.now()}`;
    
    console.log(`Added timestamp to URL: ${url} -> ${timestampedUrl}`);
    return timestampedUrl;
  } catch (e) {
    console.error("Error in addTimestamp:", e);
    return "/placeholder.svg";
  }
};
