import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { checkRateLimit } from './rateLimit.ts';

interface RequireElevatedAccessOptions {
  allowedRoles?: string[];
  allowServiceRole?: boolean;
  rateLimit?: {
    endpoint: string;
    maxRequests: number;
    windowSeconds: number;
    identifierPrefix?: string;
  };
}

interface SecurityContext {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string | null;
  role: string | null;
  companyId: string | null;
  isServiceRole: boolean;
}

interface SecuritySuccess {
  ok: true;
  context: SecurityContext;
}

interface SecurityFailure {
  ok: false;
  response: Response;
}

type SecurityResult = SecuritySuccess | SecurityFailure;

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payloadBase64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    const jsonPayload = atob(padded);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function getJwtRoleFromRequest(req: Request): string | null {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  return payload?.role || null;
}

export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('fly-client-ip') ||
    'unknown-ip'
  );
}

function jsonError(status: number, message: string, corsHeaders: Record<string, string>, extra?: Record<string, any>) {
  return new Response(
    JSON.stringify({ error: message, ...(extra || {}) }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

export async function requireElevatedAccess(
  req: Request,
  corsHeaders: Record<string, string>,
  options: RequireElevatedAccessOptions = {}
): Promise<SecurityResult> {
  try {
    const allowedRoles = options.allowedRoles || ['admin', 'super_admin'];
    const allowServiceRole = options.allowServiceRole !== false;

    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = extractBearerToken(req);
    if (!token) {
      return {
        ok: false,
        response: jsonError(401, 'Authorization Bearer token is required', corsHeaders),
      };
    }

    const payload = decodeJwtPayload(token);
    if (allowServiceRole && payload?.role === 'service_role') {
      return {
        ok: true,
        context: {
          supabaseAdmin,
          userId: null,
          role: 'service_role',
          companyId: null,
          isServiceRole: true,
        },
      };
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return {
        ok: false,
        response: jsonError(401, 'Invalid or expired token', corsHeaders),
      };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return {
        ok: false,
        response: jsonError(500, 'Unable to verify profile role', corsHeaders),
      };
    }

    const roles = new Set<string>();
    if (profile?.role) {
      roles.add(profile.role);
    }

    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    userRoles?.forEach((entry: any) => {
      if (entry?.role) {
        roles.add(entry.role);
      }
    });

    const hasAllowedRole = allowedRoles.some((role) => roles.has(role));
    if (!hasAllowedRole) {
      return {
        ok: false,
        response: jsonError(403, 'Admin privileges required', corsHeaders),
      };
    }

    if (options.rateLimit) {
      const identifierBase = user.id || getClientIp(req);
      const identifierPrefix = options.rateLimit.identifierPrefix || 'secure';
      const rateLimit = await checkRateLimit(
        supabaseAdmin,
        `${identifierPrefix}:${identifierBase}`,
        options.rateLimit.endpoint,
        {
          maxRequests: options.rateLimit.maxRequests,
          windowSeconds: options.rateLimit.windowSeconds,
        }
      );

      if (!rateLimit.allowed) {
        return {
          ok: false,
          response: new Response(
            JSON.stringify({ error: 'Too many requests' }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              },
            }
          ),
        };
      }
    }

    return {
      ok: true,
      context: {
        supabaseAdmin,
        userId: user.id,
        role: profile?.role || null,
        companyId: profile?.company_id || null,
        isServiceRole: false,
      },
    };
  } catch (error) {
    console.error('[SECURITY] Access verification failure:', error);
    return {
      ok: false,
      response: jsonError(500, 'Security verification failed', corsHeaders),
    };
  }
}
