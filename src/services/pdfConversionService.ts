import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PdfConversionOptions {
  quality?: 'low' | 'medium' | 'high';
  pageNumber?: number;
}

/**
 * Convert a PDF page to an image (base64 data URL)
 */
export const convertPdfPageToImage = async (
  pdfFile: File,
  options: PdfConversionOptions = {}
): Promise<string> => {
  const { quality = 'medium', pageNumber = 1 } = options;

  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Page ${pageNumber} n'existe pas. Le PDF contient ${pdf.numPages} page(s).`);
    }

    const page = await pdf.getPage(pageNumber);

    // Scale according to quality
    const scales = { low: 1, medium: 2, high: 3 };
    const scale = scales[quality];
    
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context non disponible');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page
    await page.render({
      canvasContext: context,
      viewport: viewport
    } as any).promise;

    // Convert to base64 (JPEG for smaller size)
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    throw new Error('Erreur lors de la conversion du PDF en image');
  }
};

/**
 * Get the number of pages in a PDF
 */
export const getPdfPageCount = async (pdfFile: File): Promise<number> => {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    throw new Error('Erreur lors de la lecture du PDF');
  }
};

/**
 * Get thumbnails for all pages in a PDF
 */
export const getPdfThumbnails = async (
  pdfFile: File,
  maxPages: number = 20
): Promise<string[]> => {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const numPages = Math.min(pdf.numPages, maxPages);
    const thumbnails: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.5 }); // Small scale for thumbnails
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      } as any).promise;

      thumbnails.push(canvas.toDataURL('image/jpeg', 0.7));
    }

    return thumbnails;
  } catch (error) {
    console.error('Error generating PDF thumbnails:', error);
    throw new Error('Erreur lors de la génération des miniatures');
  }
};
