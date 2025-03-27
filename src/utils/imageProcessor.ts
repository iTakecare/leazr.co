import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = false;

/**
 * Utilitaire de traitement d'images pour les produits
 */

// Taille maximale pour le traitement des images
const MAX_IMAGE_DIMENSION = 1024;

/**
 * Redimensionne l'image si nécessaire pour le traitement
 */
function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

/**
 * Supprime l'arrière-plan d'une image et standardise ses dimensions
 */
export const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
  try {
    console.log('Démarrage du processus de suppression d\'arrière-plan...');
    
    // Tentative d'utilisation du modèle Hugging Face si disponible
    try {
      const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
        device: 'cpu', // fallback to CPU if WebGPU not available
      });
      
      // Convert HTMLImageElement to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Impossible d\'obtenir le contexte du canvas');
      
      // Resize image if needed and draw it to canvas
      const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
      console.log(`L'image ${wasResized ? 'a été' : 'n\'a pas été'} redimensionnée. Dimensions: ${canvas.width}x${canvas.height}`);
      
      // Get image data as base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Process the image with the segmentation model
      console.log('Processing with segmentation model...');
      const result = await segmenter(imageData);
      
      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }
      
      // Create a new canvas for the masked image
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      const outputCtx = outputCanvas.getContext('2d');
      
      if (!outputCtx) throw new Error('Could not get output canvas context');
      
      // Draw original image
      outputCtx.drawImage(canvas, 0, 0);
      
      // Apply the mask
      const outputImageData = outputCtx.getImageData(
        0, 0,
        outputCanvas.width,
        outputCanvas.height
      );
      const data = outputImageData.data;
      
      // Apply inverted mask to alpha channel
      for (let i = 0; i < result[0].mask.data.length; i++) {
        // Invert the mask value (1 - value) to keep the subject instead of the background
        const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
        data[i * 4 + 3] = alpha;
      }
      
      outputCtx.putImageData(outputImageData, 0, 0);
      
      // Standardize the image
      const standardizedCanvas = await standardizeImage(outputCanvas);
      
      // Convert to WebP for better optimization
      return new Promise((resolve, reject) => {
        standardizedCanvas.toBlob(
          (blob) => {
            if (blob) {
              console.log('Blob WebP créé avec succès');
              resolve(blob);
            } else {
              reject(new Error('Échec de la création du blob'));
            }
          },
          'image/webp',
          0.9
        );
      });
    } catch (modelError) {
      console.warn('Erreur avec le modèle HuggingFace, utilisation du fallback:', modelError);
      
      // Créer un canvas pour l'image originale
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Impossible d\'obtenir le contexte du canvas');
      
      // Redimensionner l'image si nécessaire et la dessiner sur le canvas
      const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
      console.log(`L'image ${wasResized ? 'a été' : 'n\'a pas été'} redimensionnée. Dimensions finales: ${canvas.width}x${canvas.height}`);
      
      // Utiliser une segmentation simple pour l'exemple
      await simulateBackgroundRemoval(canvas, ctx);
      
      // Standardiser les dimensions à 600x600px avec bordure blanche
      const standardizedCanvas = await standardizeImage(canvas);
      
      // Convertir en WebP pour une meilleure optimisation
      return new Promise((resolve, reject) => {
        standardizedCanvas.toBlob(
          (blob) => {
            if (blob) {
              console.log('Blob WebP créé avec succès');
              resolve(blob);
            } else {
              reject(new Error('Échec de la création du blob'));
            }
          },
          'image/webp',
          0.9
        );
      });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'arrière-plan:', error);
    throw error;
  }
};

/**
 * Standardise l'image à 600x600px avec un fond blanc
 */
async function standardizeImage(sourceCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = 600;
  finalCanvas.height = 600;
  
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) throw new Error('Impossible d\'obtenir le contexte du canvas final');
  
  // Remplir avec un fond blanc
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 600, 600);
  
  // Calculer les dimensions pour centrer l'image
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;
  
  const ratio = Math.min(
    (600 * 0.8) / sourceWidth,
    (600 * 0.8) / sourceHeight
  );
  
  const newWidth = sourceWidth * ratio;
  const newHeight = sourceHeight * ratio;
  
  // Position pour centrer
  const x = (600 - newWidth) / 2;
  const y = (600 - newHeight) / 2;
  
  // Dessiner l'image centrée
  ctx.drawImage(sourceCanvas, 0, 0, sourceWidth, sourceHeight, x, y, newWidth, newHeight);
  
  return finalCanvas;
}

/**
 * Simulation de suppression d'arrière-plan
 * En production, remplacer par une méthode de ML comme TensorFlow.js ou autre API
 */
async function simulateBackgroundRemoval(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<void> {
  // Cette fonction simule la suppression d'arrière-plan
  // Dans une implémentation réelle, utiliser un modèle de ML
  
  return new Promise((resolve) => {
    // Simuler un délai pour le traitement
    setTimeout(() => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Technique simple: supposer que les coins représentent l'arrière-plan
      // et rendre transparent tout ce qui est similaire
      const corner = {
        r: data[0],
        g: data[1],
        b: data[2]
      };
      
      // Seuil de similarité (ajuster selon les besoins)
      const threshold = 35;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calcul de la distance de couleur
        const distance = Math.sqrt(
          Math.pow(r - corner.r, 2) +
          Math.pow(g - corner.g, 2) +
          Math.pow(b - corner.b, 2)
        );
        
        // Si la couleur est proche de la couleur du coin, la rendre transparente
        if (distance < threshold) {
          data[i + 3] = 0; // Alpha = 0 (transparent)
        }
      }
      
      // Appliquer les modifications
      ctx.putImageData(imageData, 0, 0);
      resolve();
    }, 1000); // Délai simulé d'une seconde
  });
}

/**
 * Génère un texte alternatif SEO pour une image de produit
 */
export const generateSeoAltText = (brand: string, productName: string, index: number = 0): string => {
  const baseAlt = `${brand} ${productName}`.trim();
  
  if (index === 0) {
    return `${baseAlt} - iTakecare leasing informatique reconditionné`;
  }
  
  // Descriptions supplémentaires selon l'index
  const descriptions = [
    "vue d'ensemble",
    "vue de côté",
    "vue de détail",
    "vue d'angle",
    "caractéristiques"
  ];
  
  const description = index <= descriptions.length ? descriptions[index - 1] : "";
  return `${baseAlt} ${description} - iTakecare leasing informatique reconditionné`;
};

/**
 * Charge une image à partir d'un fichier ou d'un blob
 */
export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};
