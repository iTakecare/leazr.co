import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno&dts";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, message, senderName } = await req.json();

    if (!ticketId || !message) {
      return new Response(
        JSON.stringify({ error: 'ticketId and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get ticket with client info
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('subject, clients(name, email), companies(name)')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      console.error('Ticket not found:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientEmail = (ticket as any).clients?.email;
    const clientName = (ticket as any).clients?.name || 'Client';
    const companyName = (ticket as any).companies?.name || 'Support';

    if (!clientEmail) {
      console.warn('No client email found for ticket:', ticketId);
      return new Response(
        JSON.stringify({ success: true, message: 'No client email - notification skipped' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.warn('ITAKECARE_RESEND_API not configured');
      return new Response(
        JSON.stringify({ success: true, message: 'Resend not configured - notification skipped' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; border-radius: 12px 12px 0 0; color: white;">
          <h2 style="margin: 0; font-size: 18px;">${companyName} - Support</h2>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Nouvelle réponse à votre ticket</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 8px;">Bonjour ${clientName},</p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">
            ${senderName || 'Un membre de notre équipe'} a répondu à votre ticket <strong>"${ticket.subject}"</strong> :
          </p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 0 0 20px;">
            <p style="margin: 0; font-size: 14px; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">
            Connectez-vous à votre espace client pour voir la conversation complète et y répondre si nécessaire.
          </p>
          <p style="margin: 0; font-size: 13px; color: #9ca3af;">— L'équipe ${companyName}</p>
        </div>
      </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} Support <noreply@itakecare.be>`,
        to: [clientEmail],
        subject: `Réponse à votre ticket: ${ticket.subject}`,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData);
      return new Response(
        JSON.stringify({ success: false, error: resendData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Ticket reply notification sent to:', clientEmail);

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
