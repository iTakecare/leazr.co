import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

  // Rechercher les requêtes existantes dans la fenêtre de temps
  const { data: existingLimit } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (!existingLimit) {
    // Première requête dans cette fenêtre
    await supabase.from('rate_limits').insert({
      identifier,
      endpoint,
      request_count: 1,
      window_start: now.toISOString()
    });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (existingLimit.request_count >= config.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Incrémenter le compteur
  await supabase
    .from('rate_limits')
    .update({ request_count: existingLimit.request_count + 1 })
    .eq('id', existingLimit.id);

  return { 
    allowed: true, 
    remaining: config.maxRequests - existingLimit.request_count - 1 
  };
}
