/**
 * GoCardless Token Encryption Module
 * Uses AES-256-GCM for secure token storage
 * 
 * Environment variable: LEAZR_ENCRYPTION_KEY_32B (base64 encoded 32-byte key)
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 128; // bits

/**
 * Decode the base64 encryption key from environment
 */
function getEncryptionKey(): Uint8Array {
  const keyBase64 = Deno.env.get('LEAZR_ENCRYPTION_KEY_32B');
  if (!keyBase64) {
    throw new Error('LEAZR_ENCRYPTION_KEY_32B environment variable is not set');
  }
  
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  
  if (keyBytes.length !== 32) {
    throw new Error(`Invalid encryption key length: expected 32 bytes, got ${keyBytes.length}`);
  }
  
  return keyBytes;
}

/**
 * Import the AES key for encryption/decryption
 */
async function importKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a token using AES-256-GCM
 * Returns: base64(iv + ciphertext + tag)
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const keyBytes = getEncryptionKey();
  const key = await importKey(keyBytes);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Encrypt
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH
    },
    key,
    plaintextBytes
  );
  
  // Combine IV + ciphertext (tag is appended by SubtleCrypto)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a token encrypted with encryptToken
 * Input: base64(iv + ciphertext + tag)
 */
export async function decryptToken(encrypted: string): Promise<string> {
  const keyBytes = getEncryptionKey();
  const key = await importKey(keyBytes);
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  // Decrypt
  const plaintextBytes = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH
    },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(plaintextBytes);
}

/**
 * Generate a new 32-byte encryption key (for initial setup)
 * Returns base64-encoded key
 */
export function generateEncryptionKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...keyBytes));
}
