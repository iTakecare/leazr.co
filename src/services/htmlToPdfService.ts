import html2pdf from 'html2pdf.js';
import { renderTemplate, resolveImagePaths } from './handlebarsRenderService';
import { loadTemplateFiles } from './pdfTemplateLoaderService';

interface HtmlToPdfOptions {
  filename?: string;
  margin?: number | [number, number, number, number];
  image?: { type: string; quality: number };
  html2canvas?: { scale: number; useCORS: boolean; logging?: boolean; letterRendering?: boolean; allowTaint?: boolean };
  jsPDF?: { unit: string; format: string; orientation: string };
}

/**
 * Generate PDF from HTML template with Handlebars data
 */
export async function generatePdfFromHtmlTemplate(
  templateSlug: string,
  data: any,
  options: HtmlToPdfOptions = {}
): Promise<Blob> {
  console.log(`[HTML-TO-PDF] Generating PDF from template: ${templateSlug}`, data);
  
  try {
    // 1. Load template files
    const { html, css, manifest } = await loadTemplateFiles(templateSlug);
    console.log('[HTML-TO-PDF] Template files loaded successfully');
    
    // 2. Render HTML with Handlebars
    let renderedHtml = renderTemplate(html, data);
    console.log('[HTML-TO-PDF] HTML rendered with Handlebars');
    
    // 3. Resolve image paths
    renderedHtml = resolveImagePaths(renderedHtml, templateSlug);
    
    // 4. Build complete HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${css}</style>
      </head>
      <body>
        ${renderedHtml}
      </body>
      </html>
    `;
    
    // 5. Create temporary container
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullHtml;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    document.body.appendChild(tempDiv);
    
    console.log('[HTML-TO-PDF] Temporary container created');
    
    // 6. Configure html2pdf
    const pdfOptions = {
      margin: options.margin || [0, 0, 0, 0],
      filename: options.filename || 'document.pdf',
      image: options.image || { type: 'jpeg', quality: 0.98 },
      html2canvas: options.html2canvas || { 
        scale: 2, 
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true
      },
      jsPDF: options.jsPDF || { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    console.log('[HTML-TO-PDF] Starting PDF generation with html2pdf.js');
    
    // 7. Generate PDF
    const pdfOutput = await html2pdf()
      .set(pdfOptions)
      .from(tempDiv)
      .outputPdf('blob');
    
    // 8. Cleanup
    document.body.removeChild(tempDiv);
    
    console.log('[HTML-TO-PDF] PDF generated successfully');
    return pdfOutput as Blob;
    
  } catch (error) {
    console.error('[HTML-TO-PDF] Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download PDF directly
 */
export async function downloadPdfFromHtmlTemplate(
  templateSlug: string,
  data: any,
  filename: string
): Promise<void> {
  console.log('[HTML-TO-PDF] Starting PDF download');
  const blob = await generatePdfFromHtmlTemplate(templateSlug, data, { filename });
  
  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  console.log('[HTML-TO-PDF] PDF download triggered');
}
