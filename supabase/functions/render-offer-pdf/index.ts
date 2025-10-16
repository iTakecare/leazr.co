import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchOfferData } from "./data-fetcher.ts";
import { loadTemplate } from "./template-loader.ts";
import { compileTemplate } from "./template-compiler.ts";
import { generatePdfWithPlaywright } from "./pdf-generator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[RENDER-PDF] Function started');
    
    // 1. Parse params
    const { offerId, templateSlug } = await req.json();
    const finalTemplateSlug = templateSlug || 'itakecare-v1';
    
    console.log('[RENDER-PDF] Params:', { offerId, templateSlug: finalTemplateSlug });
    
    // 2. Auth + Supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Fetch offer data
    console.log('[RENDER-PDF] Fetching offer data...');
    const offerData = await fetchOfferData(supabase, offerId);
    console.log('[RENDER-PDF] Offer data fetched:', { clientName: offerData.client.name });
    
    // 4. Load template HTML
    console.log('[RENDER-PDF] Loading template...');
    const template = await loadTemplate(supabase, finalTemplateSlug, offerData.companyId);
    console.log('[RENDER-PDF] Template loaded:', template.name);
    
    // 5. Compile template with Handlebars
    console.log('[RENDER-PDF] Compiling template...');
    const compiledHtml = compileTemplate(template.html_content, offerData);
    
    // 6. Generate PDF with Playwright
    console.log('[RENDER-PDF] Generating PDF...');
    const pdfBuffer = await generatePdfWithPlaywright(compiledHtml, template.page_margins);
    console.log('[RENDER-PDF] PDF generated, size:', pdfBuffer.length);
    
    // 7. Return PDF
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Offre-${offerData.offer.id}.pdf"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
    
  } catch (error: any) {
    console.error('[RENDER-PDF] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
