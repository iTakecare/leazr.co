
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

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

// Variable globale pour éviter les initialisations multiples
let authInitialized = false;

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
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const signOut = logout;

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, options?: any) => {
    return await supabase.auth.signUp({ email, password, options });
  };

  // Fonctions de vérification des rôles avec logging amélioré
  const isAdmin = () => {
    const result = user?.role === 'admin' || (!user?.role && !user?.partner_id && !user?.ambassador_id && !user?.client_id);
    console.log("isAdmin check:", {
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
    console.log("isClient check:", {
      userRole: user?.role,
      clientId: user?.client_id,
      result
    });
    return result;
  };

  const isPartner = () => {
    const result = user?.role === 'partner' || !!user?.partner_id;
    console.log("isPartner check:", {
      userRole: user?.role,
      partnerId: user?.partner_id,
      result
    });
    return result;
  };

  const isAmbassador = () => {
    const result = user?.role === 'ambassador' || !!user?.ambassador_id;
    console.log("isAmbassador check:", {
      userRole: user?.role,
      ambassadorId: user?.ambassador_id,
      result
    });
    return result;
  };

  // Fonction pour enrichir les données utilisateur avec logging amélioré
  const enrichUserData = async (baseUser: User): Promise<ExtendedUser> => {
    try {
      console.log("Enriching user data for:", baseUser.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', baseUser.id)
        .single();

      if (error) {
        console.log("No profile found, using default values:", error);
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
        console.log("Default user created:", defaultUser);
        return defaultUser;
      }

      const enrichedUser = {
        ...baseUser,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        role: profile?.role || 'admin',
        company: profile?.company || '',
        partner_id: profile?.partner_id || '',
        ambassador_id: profile?.ambassador_id || '',
        client_id: profile?.client_id || '',
      };
      
      console.log("User data enriched:", {
        email: enrichedUser.email,
        role: enrichedUser.role,
        client_id: enrichedUser.client_id,
        partner_id: enrichedUser.partner_id,
        ambassador_id: enrichedUser.ambassador_id
      });
      
      return enrichedUser;
    } catch (error) {
      console.error('Error enriching user data:', error);
      return {
        ...baseUser,
        first_name: '',
        last_name: '',
        role: 'admin',
        company: '',
        partner_id: '',
        ambassador_id: '',
        client_id: '',
      };
    }
  };

  // Initialisation unique avec protection contre les doubles initialisations
  useEffect(() => {
    if (authInitialized) {
      console.log("AuthContext déjà initialisé, ignorant la nouvelle initialisation");
      return;
    }

    authInitialized = true;
    console.log("AuthContext - Initialisation unique");
    
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        // 1. Écouter les changements d'auth AVANT de vérifier la session
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth event:", event, "Session:", !!newSession);
            
            if (!isMounted) return;
            
            if (event === 'SIGNED_OUT' || !newSession) {
              setSession(null);
              setUser(null);
              setSubscription(null);
              setIsLoading(false);
              return;
            }
            
            if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
              setSession(newSession);
              // Utiliser setTimeout pour éviter les blocages
              setTimeout(async () => {
                if (isMounted) {
                  try {
                    const enrichedUser = await enrichUserData(newSession.user);
                    setUser(enrichedUser);
                  } catch (error) {
                    console.error('Erreur lors de l\'enrichissement utilisateur:', error);
                    setUser(newSession.user as ExtendedUser);
                  }
                  setIsLoading(false);
                }
              }, 0);
            } else {
              setIsLoading(false);
            }
          }
        );
        
        // 2. Vérifier la session existante APRÈS avoir configuré l'écoute
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Erreur lors de la récupération de la session:", error);
          setIsLoading(false);
          return;
        }
        
        if (currentSession?.user && isMounted) {
          setSession(currentSession);
          try {
            const enrichedUser = await enrichUserData(currentSession.user);
            setUser(enrichedUser);
          } catch (error) {
            console.error('Erreur lors de l\'enrichissement utilisateur initial:', error);
            setUser(currentSession.user as ExtendedUser);
          }
        }
        
        if (isMounted) {
          setIsLoading(false);
        }

        return () => {
          subscription.unsubscribe();
        };
        
      } catch (error) {
        console.error("Erreur initialisation auth:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-refresh subscription
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(checkSubscription, 10000);
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
