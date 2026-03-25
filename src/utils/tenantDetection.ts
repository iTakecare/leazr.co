/**
 * Détecte le slug du tenant depuis le sous-domaine.
 *
 * Exemples :
 *   itakecare.leazr.co  → "itakecare"
 *   app.leazr.co        → null  (portail générique)
 *   localhost:8080      → null  (dev, pas de tenant)
 *   itakecare.localhost → "itakecare" (dev avec sous-domaine)
 */
export function getTenantSlug(): string | null {
  const hostname = window.location.hostname;

  // En local sans sous-domaine
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  const parts = hostname.split('.');

  // Sous-domaine de localhost (ex: itakecare.localhost)
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }

  // Sous-domaine réel (ex: itakecare.leazr.co → 3+ parties)
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Ignorer les sous-domaines réservés
    const reserved = ['app', 'www', 'api', 'mail', 'staging'];
    if (!reserved.includes(subdomain)) {
      return subdomain;
    }
  }

  return null;
}
