import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📧 [SEND-OFFER-EMAIL] Starting email send process');
    
    const authHeader = req.headers.get('Authorization');
    console.log('[SEND-OFFER-EMAIL] Authorization header present:', !!authHeader);
    console.log('[SEND-OFFER-EMAIL] RESEND_API_KEY configured:', !!RESEND_API_KEY);
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Extract JWT token from header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('[SEND-OFFER-EMAIL] Auth error:', authError);
    }
    
    if (!user) {
      console.error('[SEND-OFFER-EMAIL] No user found');
      throw new Error('Unauthorized - User not authenticated');
    }
    
    console.log('[SEND-OFFER-EMAIL] User authenticated:', user.email);

    const { 
      offerId, 
      to, 
      subject, 
      message, 
      pdfBase64,
      pdfFilename 
    } = await req.json();

    console.log('[SEND-OFFER-EMAIL] Request payload:', {
      offerId,
      to,
      subject,
      hasPdfBase64: !!pdfBase64,
      pdfSize: pdfBase64?.length || 0,
    });

    if (!offerId || !to || !subject || !pdfBase64) {
      throw new Error('Missing required fields');
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    console.log(`[SEND-OFFER-EMAIL] Sending offer ${offerId} to ${to}`);

    // Send email with Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'iTakecare <noreply@itakecare.be>',
        to: [to],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #33638e;">Nouvelle offre de leasing</h2>
            <div style="margin: 20px 0;">
              ${message || ''}
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Cordialement,<br>
              L'équipe iTakecare
            </p>
          </div>
        `,
        attachments: [
          {
            filename: pdfFilename || `offre-${offerId}.pdf`,
            content: pdfBase64,
          }
        ],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[SEND-OFFER-EMAIL] Resend error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log('[SEND-OFFER-EMAIL] Email sent successfully:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('[SEND-OFFER-EMAIL] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Une erreur est survenue' 
      }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});
