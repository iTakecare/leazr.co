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

  try {
    // Utiliser la fonction atomique de la base de données pour éviter les race conditions
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_window_start: windowStart.toISOString(),
      p_max_requests: config.maxRequests
    });

    if (error) {
      console.error('Erreur lors du rate limiting:', error);
      // En cas d'erreur, on autorise la requête pour ne pas bloquer le service
      return { allowed: true, remaining: config.maxRequests };
    }

    // La fonction retourne un tableau avec un seul élément
    const result = data[0];
    return {
      allowed: result.allowed,
      remaining: result.remaining
    };
  } catch (error) {
    console.error('Exception lors du rate limiting:', error);
    // En cas d'erreur, on autorise la requête pour ne pas bloquer le service
    return { allowed: true, remaining: config.maxRequests };
  }
}
