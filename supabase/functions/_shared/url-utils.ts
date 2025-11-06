/**
 * Utilitaire pour gérer les URLs de manière dynamique
 * Permet de détecter automatiquement l'URL de l'application selon le contexte
 */

/**
 * Récupère l'URL de l'application de manière dynamique
 * Priorité:
 * 1. Variable d'environnement APP_URL (configuration explicite)
 * 2. Origin du header de la requête (domaine depuis lequel l'appel est fait)
 * 3. Referer du header de la requête (page depuis laquelle l'utilisateur vient)
 * 4. Fallback vers leazr.co (domaine principal)
 * 
 * @param req - La requête HTTP Deno
 * @returns L'URL de l'application (sans trailing slash)
 */
export function getAppUrl(req: Request): string {
  // 1. Vérifier la variable d'environnement
  const envUrl = Deno.env.get('APP_URL');
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // Retirer le trailing slash si présent
  }
  
  // 2. Vérifier le header Origin
  const origin = req.headers.get('origin');
  if (origin) {
    return origin.replace(/\/$/, '');
  }
  
  // 3. Vérifier le header Referer
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    } catch {
      // URL invalide, continuer
    }
  }
  
  // 4. Fallback vers le domaine principal
  return 'https://www.leazr.co';
}

/**
 * Récupère l'email FROM pour les notifications
 * Priorité:
 * 1. Variable d'environnement FROM_EMAIL
 * 2. Settings SMTP de la base de données
 * 3. Fallback vers noreply@leazr.co
 * 
 * @param smtpSettings - Les paramètres SMTP depuis la base de données
 * @returns L'adresse email FROM à utiliser
 */
export function getFromEmail(smtpSettings?: { from_email?: string }): string {
  const envFromEmail = Deno.env.get('FROM_EMAIL');
  if (envFromEmail) {
    return envFromEmail;
  }
  
  if (smtpSettings?.from_email) {
    return smtpSettings.from_email;
  }
  
  return 'noreply@leazr.co';
}

/**
 * Récupère le nom FROM pour les notifications
 * Priorité:
 * 1. Variable d'environnement FROM_NAME
 * 2. Settings SMTP de la base de données
 * 3. Fallback vers "Leazr"
 * 
 * @param smtpSettings - Les paramètres SMTP depuis la base de données
 * @returns Le nom FROM à utiliser
 */
export function getFromName(smtpSettings?: { from_name?: string }): string {
  const envFromName = Deno.env.get('FROM_NAME');
  if (envFromName) {
    return envFromName;
  }
  
  if (smtpSettings?.from_name) {
    return smtpSettings.from_name;
  }
  
  return 'Leazr';
}
