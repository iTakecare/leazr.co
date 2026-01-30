import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
};

// Comparaison constant-time pour éviter timing attacks
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// Convertir une string hex en Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Fonction pour vérifier la signature HMAC du webhook GoCardless
// GoCardless envoie un simple hash HMAC-SHA256 du body (pas de timestamp comme Stripe)
async function verifyWebhookSignature(bodyBytes: Uint8Array, signature: string, secret: string): Promise<{ valid: boolean; debug: string }> {
  try {
    // Normaliser les entrées
    const cleanSignature = signature.trim().toLowerCase();
    const cleanSecret = secret.trim();

    // Valider le format de la signature (64 chars hex = 32 bytes SHA-256)
    if (cleanSignature.length !== 64 || !/^[a-f0-9]+$/.test(cleanSignature)) {
      return { 
        valid: false, 
        debug: `Format signature invalide: length=${cleanSignature.length}, pattern=${/^[a-f0-9]+$/.test(cleanSignature)}` 
      };
    }

    const encoder = new TextEncoder();
    
    // Importer la clé secrète
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(cleanSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Calculer le HMAC-SHA256 directement sur les bytes bruts du body
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      bodyBytes
    );

    const expectedBytes = new Uint8Array(signatureBytes);
    const receivedBytes = hexToBytes(cleanSignature);

    // Comparaison constant-time
    const isValid = constantTimeEqual(expectedBytes, receivedBytes);
    
    if (!isValid) {
      // Logs diagnostics (sans exposer le secret ni la signature complète)
      const expectedHex = Array.from(expectedBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      return { 
        valid: false, 
        debug: `Mismatch: reçu=${cleanSignature.substring(0, 12)}..., attendu=${expectedHex.substring(0, 12)}..., bodyLen=${bodyBytes.length}` 
      };
    }
    
    return { valid: true, debug: 'OK' };
  } catch (error) {
    return { valid: false, debug: `Erreur: ${error.message}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('GOCARDLESS_WEBHOOK_SECRET');
    const signatureHeader = req.headers.get('Webhook-Signature');

    // Vérifier que le secret est configuré
    if (!webhookSecret || webhookSecret.trim() === '') {
      console.error('GOCARDLESS_WEBHOOK_SECRET non configuré');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que la signature est présente
    if (!signatureHeader) {
      console.error('Header Webhook-Signature manquant');
      return new Response(
        JSON.stringify({ error: 'Missing signature header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Lire le body en bytes bruts (évite tout problème d'encodage)
    const bodyBuffer = await req.arrayBuffer();
    const bodyBytes = new Uint8Array(bodyBuffer);
    
    // Convertir en string pour JSON.parse
    const decoder = new TextDecoder('utf-8');
    const bodyText = decoder.decode(bodyBytes);

    // Vérifier la signature
    const { valid, debug } = await verifyWebhookSignature(bodyBytes, signatureHeader, webhookSecret);
    
    if (!valid) {
      console.error('Signature webhook invalide:', debug);
      return new Response(
        JSON.stringify({ error: 'Signature invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature webhook validée avec succès');

    const payload = JSON.parse(bodyText);
    const events = payload.events || [];

    console.log(`Réception de ${events.length} événement(s) GoCardless`);

    const supabase = createClient(
      'https://cifbetjefyfocafanlhv.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    for (const event of events) {
      const { resource_type, action, links } = event;
      console.log(`Traitement événement: ${resource_type}.${action}`, links);

      try {
        switch (resource_type) {
          case 'mandates':
            await handleMandateEvent(supabase, action, links, event);
            break;
          case 'payments':
            await handlePaymentEvent(supabase, action, links, event);
            break;
          case 'subscriptions':
            await handleSubscriptionEvent(supabase, action, links, event);
            break;
          default:
            console.log(`Type d'événement non géré: ${resource_type}`);
        }
      } catch (eventError) {
        console.error(`Erreur traitement événement ${resource_type}.${action}:`, eventError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleMandateEvent(supabase: any, action: string, links: any, event: any) {
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
    console.log(`Action mandat non mappée: ${action}`);
    return;
  }

  console.log(`Mise à jour mandat ${mandateId} vers statut: ${newStatus}`);

  const { error } = await supabase
    .from('contracts')
    .update({ gocardless_mandate_status: newStatus })
    .eq('gocardless_mandate_id', mandateId);

  if (error) {
    console.error('Erreur mise à jour statut mandat:', error);
  }
}

async function handlePaymentEvent(supabase: any, action: string, links: any, event: any) {
  const paymentId = links?.payment;
  const mandateId = links?.mandate;
  
  console.log(`Événement paiement: ${action}`, { paymentId, mandateId });

  // Log pour suivi des paiements
  // Dans une version future, on pourrait créer une table pour les historiques de paiements
  
  if (action === 'failed' || action === 'late_failure' || action === 'charged_back') {
    console.warn(`⚠️ Paiement échoué: ${paymentId}, action: ${action}`);
    
    // On pourrait envoyer une notification à l'admin ici
    if (mandateId) {
      await supabase
        .from('contracts')
        .update({ gocardless_mandate_status: 'payment_failed' })
        .eq('gocardless_mandate_id', mandateId);
    }
  }
}

async function handleSubscriptionEvent(supabase: any, action: string, links: any, event: any) {
  const subscriptionId = links?.subscription;
  
  console.log(`Événement subscription: ${action}`, { subscriptionId });

  if (action === 'cancelled' || action === 'finished') {
    const { error } = await supabase
      .from('contracts')
      .update({ 
        gocardless_subscription_id: null,
        gocardless_mandate_status: action === 'cancelled' ? 'subscription_cancelled' : 'subscription_finished'
      })
      .eq('gocardless_subscription_id', subscriptionId);

    if (error) {
      console.error('Erreur mise à jour subscription:', error);
    }
  }
}
