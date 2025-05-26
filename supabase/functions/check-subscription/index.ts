
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[CHECK-SUBSCRIPTION] Function started')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify Stripe key exists
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      console.log('[CHECK-SUBSCRIPTION] ERROR: STRIPE_SECRET_KEY not found')
      return new Response(
        JSON.stringify({ error: 'Stripe configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('[CHECK-SUBSCRIPTION] Stripe key verified')

    // Check authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('[CHECK-SUBSCRIPTION] ERROR: No authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('[CHECK-SUBSCRIPTION] Authorization header found')

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.log('[CHECK-SUBSCRIPTION] ERROR in check-subscription -', { message: userError?.message || 'No user found' })
      return new Response(
        JSON.stringify({ error: 'Authentication error: ' + (userError?.message || 'No user found') }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[CHECK-SUBSCRIPTION] User authenticated -', { userId: user.id, email: user.email })

    // First, check if user has a company subscription (like iTakecare)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profile?.company_id) {
      console.log('[CHECK-SUBSCRIPTION] Checking company subscription for company_id:', profile.company_id)
      
      const { data: company } = await supabaseClient
        .from('companies')
        .select('plan, is_active, subscription_ends_at')
        .eq('id', profile.company_id)
        .single()

      if (company && company.is_active) {
        console.log('[CHECK-SUBSCRIPTION] Company subscription found -', company)
        
        const subscriptionData = {
          subscribed: true,
          subscription_tier: company.plan,
          subscription_end: company.subscription_ends_at,
          source: 'company'
        }
        
        return new Response(
          JSON.stringify(subscriptionData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // If no company subscription, check Stripe
    console.log('[CHECK-SUBSCRIPTION] No company subscription found, checking Stripe...')

    // Get customer from Stripe
    const stripe = await import('https://esm.sh/stripe@14.21.0')
    const stripeClient = new stripe.Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    const customers = await stripeClient.customers.list({
      email: user.email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      console.log('[CHECK-SUBSCRIPTION] No customer found, updating unsubscribed state')
      
      return new Response(
        JSON.stringify({
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const customer = customers.data[0]
    console.log('[CHECK-SUBSCRIPTION] Customer found -', { customerId: customer.id })

    // Get active subscriptions
    const subscriptions = await stripeClient.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      console.log('[CHECK-SUBSCRIPTION] No active subscriptions found')
      
      return new Response(
        JSON.stringify({
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const subscription = subscriptions.data[0]
    console.log('[CHECK-SUBSCRIPTION] Active subscription found -', { subscriptionId: subscription.id })

    // Get subscription tier from price
    let subscriptionTier = 'starter'
    if (subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id
      console.log('[CHECK-SUBSCRIPTION] Price ID -', priceId)
      
      // Map price IDs to tiers (you'll need to update these with your actual Stripe price IDs)
      const priceToTier: Record<string, string> = {
        'price_starter': 'starter',
        'price_pro': 'pro', 
        'price_business': 'business',
      }
      
      subscriptionTier = priceToTier[priceId] || 'starter'
    }

    const subscriptionData = {
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
      source: 'stripe'
    }

    console.log('[CHECK-SUBSCRIPTION] Returning subscription data -', subscriptionData)
    
    return new Response(
      JSON.stringify(subscriptionData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.log('[CHECK-SUBSCRIPTION] ERROR in check-subscription -', { message: error.message })
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
