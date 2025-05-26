
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<{
    subscribed: boolean;
    subscription_tier?: string;
    subscription_end?: string;
  } | null>(null);
  const [initialized, setInitialized] = useState(false);

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

  // Fonctions de vérification des rôles
  const isAdmin = () => {
    return user?.role === 'admin' || (!user?.role && !user?.partner_id && !user?.ambassador_id && !user?.client_id);
  };

  const isClient = () => {
    return user?.role === 'client' || !!user?.client_id;
  };

  const isPartner = () => {
    return user?.role === 'partner' || !!user?.partner_id;
  };

  const isAmbassador = () => {
    return user?.role === 'ambassador' || !!user?.ambassador_id;
  };

  // Fonction pour enrichir les données utilisateur
  const enrichUserData = async (baseUser: User): Promise<ExtendedUser> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', baseUser.id)
        .single();

      if (error) {
        console.log("Pas de profil trouvé, utilisation des valeurs par défaut");
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

      return {
        ...baseUser,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        role: profile?.role || 'admin',
        company: profile?.company || '',
        partner_id: profile?.partner_id || '',
        ambassador_id: profile?.ambassador_id || '',
        client_id: profile?.client_id || '',
      };
    } catch (error) {
      console.error('Erreur enrichissement:', error);
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

  // Initialisation unique
  useEffect(() => {
    if (initialized) return;

    console.log("AuthContext - Initialisation unique");
    
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        // 1. Vérifier la session existante
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user && isMounted) {
          const enrichedUser = await enrichUserData(currentSession.user);
          setSession(currentSession);
          setUser(enrichedUser);
        }
        
        if (isMounted) {
          setIsLoading(false);
          setInitialized(true);
        }
        
        // 2. Écouter les changements d'auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth event:", event);
            
            if (!isMounted) return;
            
            if (newSession?.user) {
              const enrichedUser = await enrichUserData(newSession.user);
              setSession(newSession);
              setUser(enrichedUser);
            } else {
              setSession(null);
              setUser(null);
              setSubscription(null);
            }
            
            setIsLoading(false);
          }
        );

        return () => {
          subscription.unsubscribe();
        };
        
      } catch (error) {
        console.error("Erreur initialisation auth:", error);
        if (isMounted) {
          setIsLoading(false);
          setInitialized(true);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [initialized]);

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
