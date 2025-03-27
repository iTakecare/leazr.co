
// Utility functions for image processing

export const generateSeoAltText = (
  brand: string,
  productName: string,
  imageIndex: number = 1
): string => {
  const cleanBrand = brand.trim();
  const cleanName = productName.trim();
  
  if (!cleanBrand && !cleanName) {
    return `Product image ${imageIndex}`;
  }
  
  const brandText = cleanBrand ? `${cleanBrand} ` : '';
  return `${brandText}${cleanName} - Image ${imageIndex}`;
};

// Fonction qui utilise le service remove.bg pour supprimer l'arrière-plan
export const removeBackground = async (
  canvas: HTMLCanvasElement,
  img: HTMLImageElement
): Promise<void> => {
  try {
    // Implémentation basique de suppression d'arrière-plan
    // Dans un environnement de production, vous voudriez utiliser une API comme remove.bg
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Dessiner l'image originale
    ctx.drawImage(img, 0, 0);
    
    // Appliquer un filtre pour améliorer l'image (exemple)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simple filtre pour améliorer le contraste
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.1);     // R
      data[i + 1] = Math.min(255, data[i + 1] * 1.1); // G
      data[i + 2] = Math.min(255, data[i + 2] * 1.1); // B
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Ajouter un faux effet de suppression d'arrière-plan
    // C'est juste pour la simulation, dans une version réelle, vous utiliseriez
    // une API comme remove.bg ou un modèle ML plus sophistiqué
    ctx.globalCompositeOperation = 'destination-over';
    
    // Remplir avec un fond blanc
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return Promise.resolve();
  } catch (error) {
    console.error("Error in removeBackground:", error);
    return Promise.reject(error);
  }
};
