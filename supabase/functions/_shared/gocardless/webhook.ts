/**
 * GoCardless Webhook Signature Verification
 * Uses raw body bytes for HMAC-SHA256 verification (no JSON re-stringifying)
 */

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify GoCardless webhook signature
 * 
 * CRITICAL: Pass raw body bytes directly - never JSON.stringify the parsed body
 * GoCardless signs the exact bytes sent, not a re-serialized version
 */
export async function verifyWebhookSignature(
  rawBodyBytes: Uint8Array,
  signatureHeader: string,
  webhookSecret: string
): Promise<WebhookVerificationResult> {
  try {
    // Normalize inputs
    const cleanSignature = signatureHeader.trim().toLowerCase();
    const cleanSecret = webhookSecret.trim();
    
    // Validate signature format (64 hex chars = 32 bytes SHA-256)
    if (cleanSignature.length !== 64 || !/^[a-f0-9]+$/.test(cleanSignature)) {
      return { 
        valid: false, 
        error: 'Invalid signature format' 
      };
    }
    
    // Import the secret key
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(cleanSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Calculate HMAC-SHA256 on raw bytes
    const signatureBytes = await crypto.subtle.sign('HMAC', key, rawBodyBytes);
    const expectedBytes = new Uint8Array(signatureBytes);
    const receivedBytes = hexToBytes(cleanSignature);
    
    // Constant-time comparison
    const isValid = constantTimeEqual(expectedBytes, receivedBytes);
    
    if (!isValid) {
      // Safe logging - don't expose full signatures
      const expectedHex = Array.from(expectedBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      console.warn('[Webhook] Signature mismatch', {
        receivedPrefix: cleanSignature.substring(0, 8),
        expectedPrefix: expectedHex.substring(0, 8),
        bodyLength: rawBodyBytes.length
      });
      return { valid: false, error: 'Signature mismatch' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('[Webhook] Verification error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return { valid: false, error: 'Verification failed' };
  }
}

/**
 * Extract organisation_id from webhook event for multi-tenant routing
 */
export function extractOrganisationId(event: Record<string, unknown>): string | null {
  const links = event.links as Record<string, unknown> | undefined;
  if (links && typeof links.organisation === 'string') {
    return links.organisation;
  }
  return null;
}

/**
 * Safe event logging - never log full payloads in production
 */
export function logWebhookEvent(
  event: Record<string, unknown>,
  options: { includePayload?: boolean } = {}
): void {
  const isProduction = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined;
  
  const safeLog: Record<string, unknown> = {
    eventId: event.id,
    resourceType: event.resource_type,
    action: event.action,
    createdAt: event.created_at,
    organisationId: extractOrganisationId(event)
  };
  
  // Only include links in logs (no sensitive data)
  if (event.links) {
    safeLog.links = event.links;
  }
  
  // Include full payload only in non-production and when explicitly requested
  if (!isProduction && options.includePayload) {
    safeLog.payload = event;
  }
  
  console.log('[Webhook] Event received', safeLog);
}

/**
 * Parse webhook body and validate structure
 */
export function parseWebhookPayload(bodyText: string): { 
  events: Record<string, unknown>[];
  error?: string;
} {
  try {
    const payload = JSON.parse(bodyText);
    
    if (!payload.events || !Array.isArray(payload.events)) {
      return { events: [], error: 'Invalid payload structure: missing events array' };
    }
    
    return { events: payload.events };
  } catch (error) {
    return { events: [], error: 'Failed to parse JSON payload' };
  }
}
