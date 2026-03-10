// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno&dts";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('send-manual-followup-email v1');

  try {
    if (!RESEND_API_KEY) {
      throw new Error('ITAKECARE_RESEND_API non configurée');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user with anon client
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    // Parse body
    const { contractId, to, subject, html } = await req.json();

    if (!contractId || !to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Paramètres manquants (contractId, to, subject, html)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get contract company info for sender name
    const { data: contract } = await supabase
      .from('contracts')
      .select('company_id, contract_number')
      .eq('id', contractId)
      .single();

    let senderName = "iTakecare";
    if (contract?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', contract.company_id)
        .single();
      if (company?.name) senderName = company.name;
    }

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${senderName} <noreply@itakecare.be>`,
        to: [to],
        subject,
        html,
        reply_to: userEmail || undefined,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('❌ Erreur Resend:', resendData);
      throw new Error(resendData?.message || 'Erreur Resend');
    }

    // Mark as sent
    await supabase
      .from('contracts')
      .update({ welcome_followup_sent_at: new Date().toISOString() })
      .eq('id', contractId);

    console.log(`✅ Email de suivi envoyé manuellement pour contrat ${contractId} par ${userEmail}`);

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

Deno.serve(handler);
