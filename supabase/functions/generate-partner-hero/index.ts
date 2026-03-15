import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function scrapeWebsite(url: string, apiKey: string): Promise<string | null> {
  try {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    console.log('[GENERATE-PARTNER-HERO] Scraping website:', formattedUrl);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: `Visit this website and provide a concise summary (max 200 words) of what this company does, their main products/services, their industry, and any visual identity elements (colors, style). URL: ${formattedUrl}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "summarize_website",
            description: "Summarize a company website",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Concise summary of the company's activity, products, services and industry" },
                industry: { type: "string", description: "The main industry or sector" },
                visual_style: { type: "string", description: "Visual identity keywords (colors, mood, style)" }
              },
              required: ["summary", "industry"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "summarize_website" } }
      }),
    });

    if (!response.ok) {
      console.error('[GENERATE-PARTNER-HERO] Website scrape failed:', response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const parts = [parsed.summary, parsed.industry && `Industry: ${parsed.industry}`, parsed.visual_style && `Visual style: ${parsed.visual_style}`].filter(Boolean);
      return parts.join('. ');
    }

    // Fallback to text content
    const content = data.choices?.[0]?.message?.content;
    return content || null;
  } catch (error) {
    console.error('[GENERATE-PARTNER-HERO] Website scrape error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partner_name, partner_description, website_url } = await req.json();
    
    if (!partner_name) {
      throw new Error('partner_name is required');
    }

    console.log('[GENERATE-PARTNER-HERO] Generating for:', partner_name, '| website:', website_url);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Scrape website if URL provided
    let websiteContext = '';
    if (website_url) {
      const scraped = await scrapeWebsite(website_url, LOVABLE_API_KEY);
      if (scraped) {
        websiteContext = scraped;
        console.log('[GENERATE-PARTNER-HERO] Website context:', websiteContext.substring(0, 200));
      }
    }

    const contextParts = [];
    if (partner_description) {
      contextParts.push(`Partner description: "${partner_description}"`);
    }
    if (websiteContext) {
      contextParts.push(`Website analysis: ${websiteContext}`);
    }

    const prompt = `Create a professional hero banner image (16:9 ratio) for a business partner page.
Partner: "${partner_name}".
${contextParts.length > 0 ? `\nContext about this partner:\n${contextParts.join('\n')}\n\nThe image MUST visually represent the partner's actual activity, products, services, and industry based on the context above. Create a realistic scene or illustration that directly relates to what this company actually does.` : ''}
Style: Modern, professional, high quality. Use a color palette that fits the described activity, with blue-teal (#33638e, #4ab6c4) as accent colors.
Do NOT include any text in the image. Polished, clean aesthetic.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[GENERATE-PARTNER-HERO] AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('[GENERATE-PARTNER-HERO] No image in response');
      throw new Error('No image generated');
    }

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const base64Data = imageUrl.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `partners/heroes/${partner_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('site-settings')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[GENERATE-PARTNER-HERO] Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('site-settings')
      .getPublicUrl(fileName);

    console.log('[GENERATE-PARTNER-HERO] Success:', publicUrl);

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-PARTNER-HERO] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
