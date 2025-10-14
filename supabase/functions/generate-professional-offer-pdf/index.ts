import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offerId } = await req.json();
    
    console.log('[PROFESSIONAL PDF] Generating PDF for offer:', offerId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer l'offre complète
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        clients (*),
        ambassadors (*),
        leasers (*)
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('[PROFESSIONAL PDF] Offer not found:', offerError);
      throw new Error('Offer not found');
    }

    // Récupérer les équipements
    const { data: equipment, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select('*')
      .eq('offer_id', offerId);

    if (equipmentError) {
      console.error('[PROFESSIONAL PDF] Equipment error:', equipmentError);
    }

    // Récupérer les templates de l'entreprise
    const { data: templates, error: templatesError } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('company_id', offer.company_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (templatesError || !templates || templates.length === 0) {
      console.error('[PROFESSIONAL PDF] No templates found:', templatesError);
      throw new Error('No PDF templates found for this company');
    }

    console.log('[PROFESSIONAL PDF] Found templates:', templates.length);

    // Préparer les données pour injection
    const offerData = {
      client_name: offer.client_name || offer.clients?.name || '',
      client_email: offer.client_email || offer.clients?.email || '',
      client_company: offer.clients?.company || '',
      client_phone: offer.clients?.phone || '',
      client_address: offer.clients?.address || '',
      client_city: offer.clients?.city || '',
      client_postal_code: offer.clients?.postal_code || '',
      offer_amount: offer.amount || 0,
      monthly_payment: offer.monthly_payment || 0,
      financed_amount: offer.financed_amount || offer.amount || 0,
      ambassador_name: offer.ambassadors?.name || '',
      ambassador_email: offer.ambassadors?.email || '',
      ambassador_phone: offer.ambassadors?.phone || '',
      leaser_name: offer.leasers?.name || '',
      current_date: new Date().toLocaleDateString('fr-FR'),
      company_logo: '', // URL du logo de l'entreprise
      equipment_rows: equipment ? equipment.map(eq => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${eq.title || 'Équipement'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${eq.quantity || 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(eq.purchase_price || 0).toFixed(2)}€</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${((eq.purchase_price || 0) * (eq.quantity || 1)).toFixed(2)}€</td>
        </tr>
      `).join('') : '',
      equipment_total: equipment ? equipment.reduce((sum, eq) => sum + ((eq.purchase_price || 0) * (eq.quantity || 1)), 0).toFixed(2) : '0.00'
    };

    // Remplacer les variables dans chaque template
    const injectVariables = (html: string, data: any): string => {
      let result = html;
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(regex, String(value));
      });
      return result;
    };

    // Construire le HTML complet
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offre ${offer.id}</title>
          <style>
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 0; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            ${templates.map(t => t.css_styles).join('\n')}
          </style>
        </head>
        <body>
          ${templates.map(template => {
            return `<div class="page" style="page-break-after: always;">${injectVariables(template.html_content, offerData)}</div>`;
          }).join('')}
        </body>
      </html>
    `;

    console.log('[PROFESSIONAL PDF] HTML generated, converting to PDF...');

    // Pour le moment, retourner le HTML (sera converti en PDF côté client)
    // Dans une version future, on pourra utiliser Puppeteer ici
    return new Response(
      JSON.stringify({ 
        success: true,
        html: fullHtml,
        offerId: offerId
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[PROFESSIONAL PDF] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});