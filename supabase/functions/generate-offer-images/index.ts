import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageType } = await req.json();
    console.log('[GENERATE-OFFER-IMAGES] Generating image for type:', imageType);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Define prompts for each image type
    const prompts: Record<string, string> = {
      cover: 'Modern abstract technology background with geometric shapes and circuits, professional business style, blue gradient from #33638e to #4ab6c4, minimalist, corporate, high quality, 16:9 aspect ratio, subtle patterns',
      equipment: 'Modern tech workspace with computers and devices, professional office environment, blue tones #33638e and #4ab6c4, clean and organized, isometric view, high quality',
      'value-evolution': 'Modern circular icon representing evolution and growth, upward arrow with tech elements, colors #33638e and #4ab6c4, professional, minimalist, white background, centered',
      'value-confiance': 'Modern circular icon representing trust and security, shield or handshake with tech elements, colors #33638e and #4ab6c4, professional, minimalist, white background, centered',
      'value-entraide': 'Modern circular icon representing teamwork and collaboration, connected people or puzzle pieces, colors #33638e and #4ab6c4, professional, minimalist, white background, centered',
      conditions: 'Professional handshake or signed contract, abstract and stylized, blue gradient #33638e to #4ab6c4, modern business illustration, high quality, subtle and elegant',
    };

    const prompt = prompts[imageType];
    if (!prompt) {
      throw new Error(`Unknown image type: ${imageType}`);
    }

    console.log('[GENERATE-OFFER-IMAGES] Calling Lovable AI with prompt:', prompt);

    // Call Lovable AI to generate image
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[GENERATE-OFFER-IMAGES] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('[GENERATE-OFFER-IMAGES] No image URL in response:', JSON.stringify(aiData));
      throw new Error('No image generated');
    }

    console.log('[GENERATE-OFFER-IMAGES] Image generated successfully');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to blob
    const base64Data = imageUrl.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Upload to Supabase Storage
    const fileName = `${imageType}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('offer-images')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('[GENERATE-OFFER-IMAGES] Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('offer-images')
      .getPublicUrl(fileName);

    console.log('[GENERATE-OFFER-IMAGES] Image uploaded successfully:', publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        imageType,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[GENERATE-OFFER-IMAGES] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
