
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { cleanUserData } from '@/services/dataIsolationService';
import { DataIsolationCleanupService } from '@/services/dataIsolationCleanupService';

// Étendre le type User pour inclure les propriétés personnalisées
interface ExtendedUser extends User {
  first_name?: string;
  last_name?: string;
  role?: string;
  company?: string;
  partner_id?: string;
  ambassador_id?: string;
  client_id?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  isLoading: boolean;
  subscription: {
    subscribed: boolean;
    subscription_tier?: string;
    subscription_end?: string;
  } | null;
  checkSubscription: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, options?: any) => Promise<{ data?: any; error?: any }>;
  isAdmin: () => boolean;
  isClient: () => boolean;
  isPartner: () => boolean;
  isAmbassador: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<{
    subscribed: boolean;
    subscription_tier?: string;
    subscription_end?: string;
  } | null>(null);

  const checkSubscription = async () => {
    if (!session) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const logout = async () => {
    console.log("🔥 LOGOUT - Début de la déconnexion");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      console.log("🔥 LOGOUT - Déconnexion réussie");
    }
  };

  const signOut = logout;

  const signIn = async (email: string, password: string) => {
    console.log("🔑 SIGNIN - Tentative de connexion pour:", email);
    const result = await supabase.auth.signInWithPassword({ email, password });
    console.log("🔑 SIGNIN - Résultat:", { 
      hasUser: !!result.data.user, 
      hasSession: !!result.data.session, 
      error: result.error?.message 
    });
    return result;
  };

  const signUp = async (email: string, password: string, options?: any) => {
    return await supabase.auth.signUp({ email, password, options });
  };

  // Fonctions de vérification des rôles avec logging amélioré
  const isAdmin = () => {
    const result = user?.role === 'admin' || (!user?.role && !user?.partner_id && !user?.ambassador_id && !user?.client_id);
    console.log("🔍 isAdmin check:", {
      userRole: user?.role,
      partnerId: user?.partner_id,
      ambassadorId: user?.ambassador_id,
      clientId: user?.client_id,
      result
    });
    return result;
  };

  const isClient = () => {
    const result = user?.role === 'client' || !!user?.client_id;
    console.log("🔍 isClient check:", {
      userRole: user?.role,
      clientId: user?.client_id,
      result
    });
    return result;
  };

  const isPartner = () => {
    const result = user?.role === 'partner' || !!user?.partner_id;
    console.log("🔍 isPartner check:", {
      userRole: user?.role,
      partnerId: user?.partner_id,
      result
    });
    return result;
  };

  const isAmbassador = () => {
    const result = user?.role === 'ambassador' || !!user?.ambassador_id;
    console.log("🔍 isAmbassador check:", {
      userRole: user?.role,
      ambassadorId: user?.ambassador_id,
      result
    });
    return result;
  };

  // Fonction pour enrichir les données utilisateur avec gestion d'erreur améliorée
  const enrichUserData = async (baseUser: User): Promise<ExtendedUser> => {
    try {
      console.log("📝 ENRICH - Enrichissement des données pour:", baseUser.email);
      console.log("📝 ENRICH - Début de la requête vers profiles");
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', baseUser.id)
        .single();

      console.log("📝 ENRICH - Réponse de la requête profiles:", { 
        hasData: !!profile, 
        hasError: !!error,
        errorMessage: error?.message 
      });

      if (error) {
        console.log("📝 ENRICH - Pas de profil trouvé, utilisation des valeurs par défaut:", error.message);
        const defaultUser = {
          ...baseUser,
          first_name: '',
          last_name: '',
          role: 'admin',
          company: '',
          partner_id: '',
          ambassador_id: '',
          client_id: '',
        };
        console.log("📝 ENRICH - Utilisateur par défaut créé:", {
          email: defaultUser.email,
          role: defaultUser.role
        });
        return defaultUser;
      }

      // Récupérer l'ambassador_id depuis la table ambassadors si l'utilisateur est un ambassadeur
      let ambassadorId = '';
      if (profile?.role === 'ambassador') {
        console.log("📝 ENRICH - Utilisateur ambassadeur détecté, récupération de l'ambassador_id");
        const { data: ambassadorData, error: ambassadorError } = await supabase
          .from('ambassadors')
          .select('id')
          .eq('user_id', baseUser.id)
          .maybeSingle();
        
        if (!ambassadorError && ambassadorData) {
          ambassadorId = ambassadorData.id;
          console.log("📝 ENRICH - Ambassador ID trouvé:", ambassadorId);
        } else {
          console.log("📝 ENRICH - Erreur ou pas d'ambassador_id trouvé:", ambassadorError?.message);
        }
      }

      const enrichedUser = {
        ...baseUser,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        role: profile?.role || 'admin',
        company: profile?.company || '',
        partner_id: profile?.partner_id || '',
        ambassador_id: ambassadorId,
        client_id: profile?.client_id || '',
      };
      
      console.log("📝 ENRICH - Données enrichies:", {
        email: enrichedUser.email,
        role: enrichedUser.role,
        client_id: enrichedUser.client_id,
        partner_id: enrichedUser.partner_id,
        ambassador_id: enrichedUser.ambassador_id
      });
      
      return enrichedUser;
    } catch (error) {
      console.error('📝 ENRICH - Erreur lors de l\'enrichissement:', error);
      const fallbackUser = {
        ...baseUser,
        first_name: '',
        last_name: '',
        role: 'admin',
        company: '',
        partner_id: '',
        ambassador_id: '',
        client_id: '',
      };
      console.log("📝 ENRICH - Utilisateur de fallback créé:", {
        email: fallbackUser.email,
        role: fallbackUser.role
      });
      return fallbackUser;
    }
  };

  // Initialisation
  useEffect(() => {
    console.log("🚀 AUTH CONTEXT - Initialisation");
    
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        console.log("🚀 AUTH CONTEXT - Configuration de l'écoute des changements d'auth");
        
        // Configuration de l'écoute des changements d'auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("🔄 AUTH EVENT:", event, "Session présente:", !!newSession);
            
            if (!isMounted) {
              console.log("🔄 AUTH EVENT - Composant démonté, ignoré");
              return;
            }
            
            if (event === 'SIGNED_OUT' || !newSession) {
              console.log("🔄 AUTH EVENT - Déconnexion ou pas de session");
              setSession(null);
              setUser(null);
              setSubscription(null);
              setIsLoading(false);
              return;
            }
            
            if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
              console.log("🔄 AUTH EVENT - Session valide détectée, event:", event);
              setSession(newSession);
              
              console.log("🔄 AUTH EVENT - Enrichissement des données utilisateur...");
              
              // No timeout on homepage to prevent Safari loops
              if (window.location.pathname === '/') {
                try {
                  const enrichedUser = await enrichUserData(newSession.user);
                  if (isMounted) {
                    setUser(enrichedUser);
                    setIsLoading(false);
                  }
                } catch (error) {
                  if (isMounted) {
                    setUser(newSession.user as ExtendedUser);
                    setIsLoading(false);
                  }
                }
              } else {
                // Keep timeout for other pages
                setTimeout(async () => {
                  try {
                    const enrichedUser = await enrichUserData(newSession.user);
                    if (isMounted) {
                      setUser(enrichedUser);
                      setIsLoading(false);
                    }
                  } catch (error) {
                    if (isMounted) {
                      setUser(newSession.user as ExtendedUser);
                      setIsLoading(false);
                    }
                  }
                }, 50); // Reduced timeout
              }
            }
          }
        );
        
        console.log("🚀 AUTH CONTEXT - Vérification de la session existante");
        // Vérification de la session existante
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("🚀 AUTH CONTEXT - Erreur lors de la récupération de la session:", error);
          if (isMounted) {
            console.log("🚀 AUTH CONTEXT - Erreur: setIsLoading(false)");
            setIsLoading(false);
          }
          return;
        }
        
        console.log("🚀 AUTH CONTEXT - Session existante:", !!currentSession);
        
        if (currentSession?.user && isMounted) {
          console.log("🚀 AUTH CONTEXT - Session existante trouvée pour:", currentSession.user.email);
          setSession(currentSession);
          
          // No timeout on homepage to prevent Safari loops
          if (window.location.pathname === '/') {
            try {
              const enrichedUser = await enrichUserData(currentSession.user);
              if (isMounted) {
                setUser(enrichedUser);
                setIsLoading(false);
              }
            } catch (error) {
              if (isMounted) {
                setUser(currentSession.user as ExtendedUser);
                setIsLoading(false);
              }
            }
          } else {
            // Keep timeout for other pages
            setTimeout(async () => {
              try {
                const enrichedUser = await enrichUserData(currentSession.user);
                if (isMounted) {
                  setUser(enrichedUser);
                  setIsLoading(false);
                }
              } catch (error) {
                if (isMounted) {
                  setUser(currentSession.user as ExtendedUser);
                  setIsLoading(false);
                }
              }
            }, 50); // Reduced timeout
          }
        } else if (isMounted) {
          console.log("🚀 AUTH CONTEXT - Aucune session existante: setIsLoading(false)");
          setIsLoading(false);
        }

        return () => {
          subscription.unsubscribe();
        };
        
      } catch (error) {
        console.error("🚀 AUTH CONTEXT - Erreur initialisation:", error);
        if (isMounted) {
          console.log("🚀 AUTH CONTEXT - Erreur fatale: setIsLoading(false)");
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      console.log("🚀 AUTH CONTEXT - Nettoyage");
      isMounted = false;
    };
  }, []);

  // Auto-refresh subscription - disabled on homepage to prevent Safari loops
  useEffect(() => {
    if (!session || window.location.pathname === '/') return;

    const interval = setInterval(checkSubscription, 30000); // Increased to 30s
    return () => clearInterval(interval);
  }, [session]);

  const value = {
    user,
    session,
    isLoading,
    subscription,
    checkSubscription,
    logout,
    signOut,
    signIn,
    signUp,
    isAdmin,
    isClient,
    isPartner,
    isAmbassador,
  };

  // Reduced logging on homepage
  if (window.location.pathname !== '/') {
    console.log("🎯 AUTH CONTEXT RENDER - État actuel:", {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      userEmail: user?.email,
      userRole: user?.role
    });
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
