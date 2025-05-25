
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

// Étendre le type User pour inclure les propriétés personnalisées
interface ExtendedUser extends User {
  first_name?: string;
  last_name?: string;
  role?: string;
  partner_id?: string;
  ambassador_id?: string;
  client_id?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  isLoading: boolean;
  userRoleChecked: boolean;
  subscription: {
    subscribed: boolean;
    subscription_tier?: string;
    subscription_end?: string;
  } | null;
  checkSubscription: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
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
  const [userRoleChecked, setUserRoleChecked] = useState(false);
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

  const signOut = logout; // Alias pour logout

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
      // Récupérer le profil utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', baseUser.id)
        .single();

      return {
        ...baseUser,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        role: profile?.role || '',
        partner_id: profile?.partner_id || '',
        ambassador_id: profile?.ambassador_id || '',
        client_id: profile?.client_id || '',
      };
    } catch (error) {
      console.error('Error enriching user data:', error);
      return baseUser as ExtendedUser;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          const enrichedUser = await enrichUserData(session.user);
          setUser(enrichedUser);
          setUserRoleChecked(true);
          
          // Check subscription when user logs in
          setTimeout(() => {
            checkSubscription();
          }, 0);
        } else {
          setUser(null);
          setUserRoleChecked(true);
          setSubscription(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        const enrichedUser = await enrichUserData(session.user);
        setUser(enrichedUser);
        setUserRoleChecked(true);
        
        setTimeout(() => {
          checkSubscription();
        }, 0);
      } else {
        setUserRoleChecked(true);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-refresh subscription every 10 seconds when user is logged in
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(checkSubscription, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const value = {
    user,
    session,
    isLoading,
    userRoleChecked,
    subscription,
    checkSubscription,
    logout,
    signOut,
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
