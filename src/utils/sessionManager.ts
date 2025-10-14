import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Gestionnaire de session pour éviter les déconnexions intempestives
 */
class SessionManager {
  private static instance: SessionManager;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Vérifie si la session est valide et la rafraîchit si nécessaire
   */
  async ensureValidSession(): Promise<boolean> {
    try {
      // Si un refresh est déjà en cours, attendre sa complétion
      if (this.isRefreshing && this.refreshPromise) {
        return await this.refreshPromise;
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Erreur lors de la vérification de session:', error);
        return false;
      }

      if (!session) {
        console.warn('Aucune session active détectée');
        return false;
      }

      // Vérifier si le token expire bientôt (dans les 5 prochaines minutes)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiresAt - now < fiveMinutes) {
        console.log('🔄 Token expire bientôt, rafraîchissement préventif...');
        return await this.refreshSession();
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification de session:', error);
      return false;
    }
  }

  /**
   * Rafraîchit la session de manière sécurisée
   */
  private async refreshSession(): Promise<boolean> {
    // Éviter les refreshs multiples simultanés
    if (this.isRefreshing && this.refreshPromise) {
      return await this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 Rafraîchissement de la session...');
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          console.error('Erreur lors du rafraîchissement de session:', error);
          toast.error('Votre session a expiré. Veuillez vous reconnecter.');
          return false;
        }

        if (!data.session) {
          console.warn('Aucune session retournée après rafraîchissement');
          return false;
        }

        console.log('✅ Session rafraîchie avec succès');
        return true;
      } catch (error) {
        console.error('Exception lors du rafraîchissement de session:', error);
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return await this.refreshPromise;
  }

  /**
   * Gère les erreurs d'authentification
   */
  async handleAuthError(error: any): Promise<boolean> {
    if (!error) return false;

    const isAuthError = 
      error.message?.includes('JWT') ||
      error.message?.includes('expired') ||
      error.message?.includes('invalid') ||
      error.code === 'PGRST301' || // JWT expired
      error.status === 401;

    if (isAuthError) {
      console.log('🔒 Erreur d\'authentification détectée, tentative de refresh...');
      const refreshed = await this.refreshSession();
      
      if (!refreshed) {
        toast.error('Votre session a expiré. Veuillez vous reconnecter.', {
          duration: 5000,
        });
      }
      
      return refreshed;
    }

    return false;
  }
}

export const sessionManager = SessionManager.getInstance();

/**
 * Wrapper pour exécuter une fonction avec vérification de session
 */
export async function withSession<T>(
  fn: () => Promise<T>,
  retryOnAuthError = true
): Promise<T> {
  // Vérifier et rafraîchir la session si nécessaire
  const sessionValid = await sessionManager.ensureValidSession();
  
  if (!sessionValid) {
    throw new Error('Session invalide. Veuillez vous reconnecter.');
  }

  try {
    return await fn();
  } catch (error: any) {
    // Si c'est une erreur d'auth et qu'on peut retry
    if (retryOnAuthError) {
      const handled = await sessionManager.handleAuthError(error);
      
      // Si le refresh a réussi, retry une fois
      if (handled) {
        console.log('🔄 Retry après rafraîchissement de session...');
        return await fn();
      }
    }
    
    throw error;
  }
}
