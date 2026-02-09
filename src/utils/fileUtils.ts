/**
 * Sanitize a file name to prevent path traversal and injection attacks.
 * Only allows alphanumeric characters, dots, hyphens and underscores.
 */
export const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.');
};

/**
 * Validate a URL for safe redirection (only http/https protocols allowed).
 * Returns true if the URL is safe to redirect to.
 */
export const isSafeRedirectUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Safely redirect to a URL. Only allows http/https protocols.
 */
export const safeRedirect = (url: string): void => {
  if (isSafeRedirectUrl(url)) {
    window.location.href = url;
  }
};
