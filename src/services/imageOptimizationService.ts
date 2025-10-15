/**
 * Service for optimizing images for PDF generation
 */

export interface ImageOptimizationOptions {
  targetQuality?: 'web' | 'print';
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Optimize an image for PDF inclusion
 * Converts to JPEG and resizes to optimal dimensions for A4 pages
 */
export const optimizeImageForPdf = async (
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<File> => {
  const { 
    targetQuality = 'web',
    maxWidth = targetQuality === 'web' ? 1240 : 2480, // 150 DPI or 300 DPI for A4 width (210mm)
    maxHeight = targetQuality === 'web' ? 1754 : 3508  // 150 DPI or 300 DPI for A4 height (297mm)
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context non disponible'));
        return;
      }
      
      // Calculate dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw optimized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to optimized JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Échec de la conversion'));
            return;
          }
          
          const optimizedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          console.log(`Image optimisée: ${(file.size / 1024).toFixed(2)}KB → ${(optimizedFile.size / 1024).toFixed(2)}KB`);
          resolve(optimizedFile);
        },
        'image/jpeg',
        0.85 // JPEG quality
      );
    };
    
    img.onerror = () => reject(new Error('Échec du chargement de l\'image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Convert image to base64 data URL
 */
export const imageToDataUrl = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Échec de la lecture du fichier'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
};

/**
 * Get image dimensions
 */
export const getImageDimensions = async (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Impossible de charger l\'image'));
    img.src = URL.createObjectURL(file);
  });
};
