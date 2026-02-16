/**
 * Escapes special ILIKE/LIKE pattern characters (%, _, \) in user input
 * to prevent wildcard injection in PostgreSQL queries.
 *
 * Supabase parameterizes the value, so this is NOT about SQL injection,
 * but about ensuring the LIKE pattern matches literally what the user typed.
 */
export function sanitizeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
