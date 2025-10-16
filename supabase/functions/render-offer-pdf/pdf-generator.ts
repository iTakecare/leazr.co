import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

export async function generatePdfWithPlaywright(
  html: string, 
  margins: any
): Promise<Uint8Array> {
  console.log('[PDF-GENERATOR] Starting PDF generation...');
  console.log('[PDF-GENERATOR] HTML length:', html.length);
  console.log('[PDF-GENERATOR] Margins:', JSON.stringify(margins));
  
  let browser;
  
  try {
    // Launch browser with Puppeteer (works in Deno Deploy)
    console.log('[PDF-GENERATOR] Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    console.log('[PDF-GENERATOR] Browser launched, creating page...');
    const page = await browser.newPage();
    
    // Set viewport to A4 dimensions
    await page.setViewport({
      width: 794,  // A4 width in pixels at 96 DPI
      height: 1123 // A4 height in pixels at 96 DPI
    });
    
    console.log('[PDF-GENERATOR] Setting HTML content...');
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'load'],
      timeout: 30000
    });
    
    console.log('[PDF-GENERATOR] Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: margins?.top || '12mm',
        bottom: margins?.bottom || '12mm',
        left: margins?.left || '12mm',
        right: margins?.right || '12mm'
      }
    });
    
    console.log('[PDF-GENERATOR] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    await browser.close();
    return pdfBuffer;
    
  } catch (error) {
    console.error('[PDF-GENERATOR] Error generating PDF:', error);
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[PDF-GENERATOR] Error closing browser:', closeError);
      }
    }
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}
