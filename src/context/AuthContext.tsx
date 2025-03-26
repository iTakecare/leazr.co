import { createContext, useState, useEffect, useContext } from 'react';
import {
  AuthChangeEvent,
  Session,
  User,
} from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextProps {
  children: React.ReactNode;
}

interface UserMetadata {
  first_name?: string;
  last_name?: string;
  company?: string;
  role?: string;
}

// Définir le type pour le contexte utilisateur
// Mettre à jour la structure UserContextType pour inclure le rôle
export interface UserContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, userData?: Partial<UserMetadata>) => Promise<User | null>;
  resetPassword: (email: string) => Promise<void>;
  updateUserData: (userData: Partial<UserMetadata>) => Promise<void>;
  checkSession: () => Promise<User | null>;
}

// Créer le contexte avec un type
const AuthContext = createContext<UserContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => null,
  logout: async () => {},
  signup: async () => null,
  resetPassword: async () => {},
  updateUserData: async () => {},
  checkSession: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<AuthContextProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    checkSession();

    supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log(`Auth event: ${event}`);
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });
  }, []);

  const signup = async (email: string, password: string, userData?: Partial<UserMetadata>): Promise<User | null> => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...userData,
          },
        },
      });

      if (error) throw error;

      setUser(data.user);
      return data.user;
    } catch (error) {
      setError(error as Error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // S'assurer que les données métier sont correctement remplies lors du login
  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data?.user) {
        // Récupérer les informations de profil si elles ne sont pas présentes
        if (!data.user.user_metadata?.role) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('role, first_name, last_name, company')
              .eq('id', data.user.id)
              .single();
            
            if (!profileError && profileData) {
              // Mettre à jour les métadonnées de l'utilisateur avec le rôle et autres données
              await supabase.auth.updateUser({
                data: {
                  role: profileData.role,
                  first_name: profileData.first_name,
                  last_name: profileData.last_name,
                  company: profileData.company
                }
              });
              
              // Mettre à jour l'utilisateur localement
              data.user.user_metadata = {
                ...data.user.user_metadata,
                role: profileData.role,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                company: profileData.company
              };
            }
          } catch (profileFetchError) {
            console.error("Erreur lors de la récupération du profil:", profileFetchError);
          }
        }
        
        setUser(data.user);
        return data.user;
      }
      
      return null;
    } catch (error) {
      setError(error as Error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
    } catch (error) {
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (userData: Partial<UserMetadata>): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...userData,
        },
      });

      if (error) throw error;

      setUser(data.user);
    } catch (error) {
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  // Vérifier la session, récupérer les informations de profil si nécessaire
  const checkSession = async (): Promise<User | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (data.session?.user) {
        // Récupérer les informations de profil si elles ne sont pas présentes
        if (!data.session.user.user_metadata?.role) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('role, first_name, last_name, company')
              .eq('id', data.session.user.id)
              .single();
            
            if (!profileError && profileData) {
              // Mettre à jour les métadonnées de l'utilisateur avec le rôle et autres données
              await supabase.auth.updateUser({
                data: {
                  role: profileData.role,
                  first_name: profileData.first_name,
                  last_name: profileData.last_name,
                  company: profileData.company
                }
              });
              
              // Mettre à jour l'utilisateur localement
              data.session.user.user_metadata = {
                ...data.session.user.user_metadata,
                role: profileData.role,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                company: profileData.company
              };
            }
          } catch (profileFetchError) {
            console.error("Erreur lors de la récupération du profil:", profileFetchError);
          }
        }
        
        setUser(data.session.user);
        return data.session.user;
      } else {
        setUser(null);
        return null;
      }
    } catch (error) {
      setError(error as Error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // S'assurer que login et checkSession sont passés au contexte
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        signup,
        resetPassword,
        updateUserData,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
