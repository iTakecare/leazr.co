import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno&dts";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Problème technique',
  billing: 'Question facturation',
  modification: 'Demande de modification',
  other: 'Autre',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId } = await req.json();
    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: 'ticketId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY (multi-tenant): lecture du ticket via le JWT de l'appelant (le
    // client qui vient de le créer) — la RLS garantit qu'il ne peut notifier
    // que sur SES tickets, pas ceux d'un autre tenant en devinant un id.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: ticket, error: ticketError } = await callerClient
      .from('support_tickets')
      .select('id, subject, description, category, priority, company_id, clients(name, email)')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      console.error('Ticket not found:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.warn('ITAKECARE_RESEND_API not configured');
      return new Response(
        JSON.stringify({ success: true, message: 'Resend not configured - email skipped' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admins du tenant (service role — la RLS du caller ne voit pas les profils admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name')
      .eq('company_id', (ticket as any).company_id)
      .in('role', ['admin', 'super_admin']);

    if (adminsError || !admins?.length) {
      console.warn('No admins to notify:', adminsError);
      return new Response(
        JSON.stringify({ success: true, message: 'No admins to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientName = (ticket as any).clients?.name || 'Un client';
    const clientEmail = (ticket as any).clients?.email || '';
    const category = CATEGORY_LABELS[(ticket as any).category] || (ticket as any).category || '—';
    const priority = PRIORITY_LABELS[(ticket as any).priority] || (ticket as any).priority || '—';
    const description = ((ticket as any).description || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">🎫 Nouveau ticket support</h2>
        <p><strong>${clientName}</strong>${clientEmail ? ` (${clientEmail})` : ''} vient de créer un ticket :</p>
        <div style="background: #f5f6fa; border-radius: 10px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>Sujet :</strong> ${(ticket as any).subject}</p>
          <p style="margin: 0 0 8px;"><strong>Catégorie :</strong> ${category} · <strong>Priorité :</strong> ${priority}</p>
          <p style="margin: 0; color: #444;">${description}</p>
        </div>
        <p>
          <a href="https://app.leazr.co" style="display: inline-block; background: #4f46e5; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">
            Ouvrir dans Leazr
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
      </div>`;

    const results = await Promise.allSettled(admins.map(async (admin: any) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'iTakecare <noreply@itakecare.be>',
          to: [admin.email],
          subject: `[Support] ${clientName} — ${(ticket as any).subject}`,
          html: emailHtml,
        }),
      });
      if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
      return admin.email;
    }));

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    results.filter((r) => r.status === 'rejected').forEach((r: any) => console.error('Email failed:', r.reason));
    console.log(`✅ Notification ticket ${ticketId}: ${sent}/${admins.length} email(s) envoyé(s)`);

    return new Response(
      JSON.stringify({ success: true, sent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('notify-new-ticket error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
