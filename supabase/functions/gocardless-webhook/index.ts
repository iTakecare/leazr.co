/**
 * GoCardless Webhook Handler
 * 
 * SECURITY:
 * - Raw body signature verification (HMAC-SHA256)
 * - Rate limiting
 * - Multi-tenant routing via organisation_id
 * - Idempotent event processing
 * - Safe logging (no tokens, no full payloads in production)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  verifyWebhookSignature, 
  extractOrganisationId, 
  logWebhookEvent,
  parseWebhookPayload,
  checkRateLimit,
  getRateLimitIdentifier,
  GOCARDLESS_RATE_LIMITS
} from "../_shared/gocardless/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
};

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    SUPABASE_URL,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Rate limiting
    const identifier = getRateLimitIdentifier(req);
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin, 
      identifier, 
      'gocardless-webhook',
      GOCARDLESS_RATE_LIMITS.webhook
    );

    if (!rateLimitResult.allowed) {
      console.warn('[Webhook] Rate limit exceeded', { identifier });
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get webhook secret
    const webhookSecret = Deno.env.get('GOCARDLESS_WEBHOOK_SECRET');
    if (!webhookSecret || webhookSecret.trim() === '') {
      console.error('[Webhook] GOCARDLESS_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signature header
    const signatureHeader = req.headers.get('Webhook-Signature');
    if (!signatureHeader) {
      console.error('[Webhook] Missing Webhook-Signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Read raw body bytes for signature verification
    // Never JSON.stringify and re-verify - signatures are computed on exact bytes
    const bodyBuffer = await req.arrayBuffer();
    const bodyBytes = new Uint8Array(bodyBuffer);
    
    // Verify signature
    const verificationResult = await verifyWebhookSignature(bodyBytes, signatureHeader, webhookSecret);
    if (!verificationResult.valid) {
      console.error('[Webhook] Signature verification failed', { error: verificationResult.error });
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body after verification
    const decoder = new TextDecoder('utf-8');
    const bodyText = decoder.decode(bodyBytes);
    const { events, error: parseError } = parseWebhookPayload(bodyText);

    if (parseError) {
      console.error('[Webhook] Parse error', { error: parseError });
      return new Response(
        JSON.stringify({ error: parseError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Webhook] Received ${events.length} event(s)`);

    let processed = 0;
    let failed = 0;

    for (const event of events) {
      const eventId = event.id as string;
      const resourceType = event.resource_type as string;
      const action = event.action as string;
      const links = event.links as Record<string, string> | undefined;

      // Safe logging
      logWebhookEvent(event);

      // Multi-tenant routing via organisation_id
      const organisationId = extractOrganisationId(event);
      let companyId: string | null = null;

      if (organisationId) {
        // Find tenant by organisation_id
        const { data: connection } = await supabaseAdmin
          .from('gocardless_connections')
          .select('company_id')
          .eq('organisation_id', organisationId)
          .eq('status', 'active')
          .maybeSingle();

        if (connection) {
          companyId = connection.company_id;
        } else {
          // ALERT: Unknown tenant - log but don't fail
          console.warn('[Webhook] Unknown organisation_id - tenant not mapped', {
            organisationId: organisationId.substring(0, 8),
            eventId
          });
          // Return 202 to acknowledge receipt (prevents GoCardless retries)
          // but don't process the event
          continue;
        }
      }

      // Check for idempotency - have we already processed this event?
      const { data: existingEvent } = await supabaseAdmin
        .from('gocardless_webhook_events')
        .select('id')
        .eq('gocardless_event_id', eventId)
        .maybeSingle();

      if (existingEvent) {
        console.log('[Webhook] Event already processed, skipping', { eventId });
        processed++;
        continue;
      }

      // Process the event
      try {
        await processEvent(supabaseAdmin, event, companyId);

        // Mark event as processed ONLY on success
        await supabaseAdmin
          .from('gocardless_webhook_events')
          .insert({
            gocardless_event_id: eventId,
            company_id: companyId,
            resource_type: resourceType,
            action,
            payload: event,
            received_at: new Date().toISOString()
          });

        // Update last webhook received time
        if (companyId) {
          await supabaseAdmin
            .from('gocardless_connections')
            .update({ 
              updated_at: new Date().toISOString()
            })
            .eq('company_id', companyId);
        }

        processed++;
      } catch (processError) {
        // DO NOT mark as processed on failure - allow retry
        console.error('[Webhook] Event processing failed', {
          eventId,
          error: processError instanceof Error ? processError.message : 'Unknown'
        });
        failed++;
      }
    }

    console.log('[Webhook] Processing complete', { processed, failed, total: events.length });

    return new Response(
      JSON.stringify({ success: true, processed, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Process a single webhook event
 */
async function processEvent(
  supabase: ReturnType<typeof createClient>,
  event: Record<string, unknown>,
  companyId: string | null
): Promise<void> {
  const resourceType = event.resource_type as string;
  const action = event.action as string;
  const links = event.links as Record<string, string> | undefined;

  switch (resourceType) {
    case 'mandates':
      await handleMandateEvent(supabase, action, links, companyId);
      break;
    case 'payments':
      await handlePaymentEvent(supabase, action, links, event, companyId);
      break;
    case 'subscriptions':
      await handleSubscriptionEvent(supabase, action, links, companyId);
      break;
    default:
      console.log('[Webhook] Unhandled resource type', { resourceType, action });
  }
}

/**
 * Handle mandate lifecycle events
 */
async function handleMandateEvent(
  supabase: ReturnType<typeof createClient>,
  action: string,
  links: Record<string, string> | undefined,
  companyId: string | null
): Promise<void> {
  const mandateId = links?.mandate;
  if (!mandateId) return;

  const statusMap: Record<string, string> = {
    'created': 'pending_submission',
    'submitted': 'submitted',
    'active': 'active',
    'failed': 'failed',
    'cancelled': 'cancelled',
    'expired': 'expired',
    'reinstated': 'active',
    'replaced': 'replaced',
    'consumed': 'consumed',
    'blocked': 'blocked'
  };

  const newStatus = statusMap[action];
  if (!newStatus) {
    console.log('[Webhook] Unmapped mandate action', { action });
    return;
  }

  // Update gocardless_mandates table (with company scoping)
  const updateQuery = supabase
    .from('gocardless_mandates')
    .update({ 
      status: newStatus,
      last_event_at: new Date().toISOString()
    })
    .eq('gocardless_mandate_id', mandateId);

  if (companyId) {
    updateQuery.eq('company_id', companyId);
  }

  const { error: mandateError } = await updateQuery;
  if (mandateError) {
    console.error('[Webhook] Mandate update error', { error: mandateError.message });
  }

  // Also update contracts table for backward compatibility
  await supabase
    .from('contracts')
    .update({ gocardless_mandate_status: newStatus })
    .eq('gocardless_mandate_id', mandateId);
}

/**
 * Handle payment lifecycle events
 */
async function handlePaymentEvent(
  supabase: ReturnType<typeof createClient>,
  action: string,
  links: Record<string, string> | undefined,
  event: Record<string, unknown>,
  companyId: string | null
): Promise<void> {
  const paymentId = links?.payment;
  if (!paymentId) return;

  // Payment status timeline: submitted -> confirmed -> paid_out
  // Or: submitted -> failed/cancelled/charged_back
  const statusMap: Record<string, string> = {
    'created': 'pending_submission',
    'submitted': 'submitted',
    'confirmed': 'confirmed',
    'paid_out': 'paid_out',
    'failed': 'failed',
    'cancelled': 'cancelled',
    'charged_back': 'charged_back',
    'customer_approval_denied': 'customer_approval_denied',
    'late_failure': 'late_failure',
    'retried': 'submitted' // Goes back to submitted
  };

  const newStatus = statusMap[action] || action;

  // Update gocardless_payments table
  const updateQuery = supabase
    .from('gocardless_payments')
    .update({ status: newStatus })
    .eq('gocardless_payment_id', paymentId);

  if (companyId) {
    updateQuery.eq('company_id', companyId);
  }

  await updateQuery;

  // Handle failed payments - update mandate status
  if (['failed', 'late_failure', 'charged_back'].includes(action)) {
    const mandateId = links?.mandate;
    if (mandateId) {
      console.warn('[Webhook] Payment failure detected', { paymentId, action, mandateId });
      
      await supabase
        .from('gocardless_mandates')
        .update({ status: 'payment_failed' })
        .eq('gocardless_mandate_id', mandateId);
      
      await supabase
        .from('contracts')
        .update({ gocardless_mandate_status: 'payment_failed' })
        .eq('gocardless_mandate_id', mandateId);
    }
  }
}

/**
 * Handle subscription lifecycle events
 */
async function handleSubscriptionEvent(
  supabase: ReturnType<typeof createClient>,
  action: string,
  links: Record<string, string> | undefined,
  companyId: string | null
): Promise<void> {
  const subscriptionId = links?.subscription;
  if (!subscriptionId) return;

  const statusMap: Record<string, string> = {
    'created': 'active',
    'payment_created': 'active',
    'cancelled': 'cancelled',
    'finished': 'finished',
    'paused': 'paused',
    'resumed': 'active'
  };

  const newStatus = statusMap[action];
  if (!newStatus) return;

  // Update gocardless_subscriptions table
  const updateQuery = supabase
    .from('gocardless_subscriptions')
    .update({ status: newStatus })
    .eq('gocardless_subscription_id', subscriptionId);

  if (companyId) {
    updateQuery.eq('company_id', companyId);
  }

  await updateQuery;

  // Update contracts for backward compatibility
  if (action === 'cancelled' || action === 'finished') {
    await supabase
      .from('contracts')
      .update({ 
        gocardless_subscription_id: null,
        gocardless_mandate_status: action === 'cancelled' ? 'subscription_cancelled' : 'subscription_finished'
      })
      .eq('gocardless_subscription_id', subscriptionId);
  }
}
