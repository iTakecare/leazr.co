import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
};

// Fonction pour vérifier la signature HMAC du webhook GoCardless
// GoCardless envoie un simple hash HMAC-SHA256 du body (pas de timestamp comme Stripe)
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    
    // Importer la clé secrète
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Calculer le HMAC-SHA256 du body directement (format GoCardless)
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    // Convertir en hex
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Comparaison directe avec la signature reçue
    const isValid = signature === expectedSignature;
    
    if (!isValid) {
      console.log('Signature reçue:', signature);
      console.log('Signature attendue:', expectedSignature);
    }
    
    return isValid;
  } catch (error) {
    console.error('Erreur vérification signature:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('GOCARDLESS_WEBHOOK_SECRET');
    const signature = req.headers.get('Webhook-Signature');
    const body = await req.text();

    // Vérifier la signature en production
    if (webhookSecret && signature) {
      const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('Signature webhook invalide');
        return new Response(
          JSON.stringify({ error: 'Signature invalide' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload = JSON.parse(body);
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
