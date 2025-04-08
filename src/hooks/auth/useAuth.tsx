
import { useContext, createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';

// Types pour le contexte d'authentification
interface AuthContextType {
  user: UserWithRole | null;
  isAdmin: boolean;
  isLoading: boolean;
}

// Extension du type User avec un rôle
interface UserWithRole extends User {
  role?: 'admin' | 'user';
}

// Création du contexte
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true
});

// Hook pour utiliser le contexte d'authentification
export const useAuth = () => useContext(AuthContext);

// Fournisseur du contexte d'authentification
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'état de l'authentification actuelle
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error fetching session:', error);
        setIsLoading(false);
        return;
      }
      
      if (data.session) {
        // Récupérer le rôle de l'utilisateur à partir de son profil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .single();
          
        const userWithRole: UserWithRole = {
          ...data.session.user,
          role: profileData?.role || 'user'
        };
        
        setUser(userWithRole);
      }
      
      setIsLoading(false);
    };

    fetchSession();

    // Écouter les changements d'état d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          // Récupérer le rôle de l'utilisateur
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
            
          const userWithRole: UserWithRole = {
            ...session.user,
            role: profileData?.role || 'user'
          };
          
          setUser(userWithRole);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      // Nettoyer l'écouteur lors du démontage
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Détermine si l'utilisateur est administrateur
  const isAdmin = user?.role === 'admin';

  // Valeur du contexte
  const value = {
    user,
    isAdmin,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
