import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type ExtendedUser = User & {
  first_name?: string;
  last_name?: string;
  company?: string;
  role?: string;
  partner_id?: string;
  ambassador_id?: string;
  client_id?: string;
};

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ user: ExtendedUser | null; session: Session | null; error: any }>;
  signIn: (email: string, password: string) => Promise<{ user: ExtendedUser | null; session: Session | null; error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ data: any; error: any }>;
  isAdmin: () => boolean;
  isClient: () => boolean;
  isPartner: () => boolean;
  isAmbassador: () => boolean;
  userRoleChecked: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoleChecked, setUserRoleChecked] = useState(false);
  const navigate = useNavigate();

  const fetchUserProfile = useCallback(async (userId: string) => {
    console.time('fetchUserProfile');
    try {
      const { data, error } = await supabase.rpc('get_user_profile_with_associations', {
        user_id: userId
      });
      
      if (error) {
        console.error('Erreur lors de la récupération du profil utilisateur:', error);
        return null;
      }

      console.log('Profil utilisateur et associations récupérés en une seule requête:', data);
      
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil utilisateur:', error);
      return null;
    } finally {
      console.timeEnd('fetchUserProfile');
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      console.time('initAuth');
      try {
        setIsLoading(true);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);
          setUser(null);
          setSession(null);
          return;
        }
        
        if (session) {
          const profile = await fetchUserProfile(session.user.id);
          
          if (profile) {
            // Mettre à jour l'utilisateur avec toutes les informations obtenues en une seule requête
            setUser({
              ...session.user,
              first_name: profile.first_name,
              last_name: profile.last_name,
              company: profile.company,
              role: profile.role,
              partner_id: profile.partner_id,
              ambassador_id: profile.ambassador_id,
              client_id: profile.client_id
            });
            setUserRoleChecked(true);
          } else {
            setUser(session.user);
          }
          
          setSession(session);
        } else {
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
      } finally {
        setIsLoading(false);
        console.timeEnd('initAuth');
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Événement d\'authentification:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.time('authStateChange');
        if (session) {
          const profile = await fetchUserProfile(session.user.id);
          
          if (profile) {
            // Mettre à jour l'utilisateur avec toutes les informations obtenues en une seule requête
            setUser({
              ...session.user,
              first_name: profile.first_name,
              last_name: profile.last_name,
              company: profile.company,
              role: profile.role,
              partner_id: profile.partner_id,
              ambassador_id: profile.ambassador_id,
              client_id: profile.client_id
            });
            setUserRoleChecked(true);
          } else {
            setUser(session.user);
          }
          
          setSession(session);
        }
        console.timeEnd('authStateChange');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setUserRoleChecked(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      
      const extendedUser = data.user ? {
        ...data.user,
        first_name: '',
        last_name: '',
        company: ''
      } : null;
      
      return { user: extendedUser, session: data.session, error };
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      return { user: null, session: null, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.time('signIn');
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Erreur de connexion:", error);
        return { user: null, session: null, error };
      }
      
      console.log("Connexion réussie pour l'utilisateur:", data.user?.id);
      
      let extendedUser = null;
      
      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        
        if (profile) {
          extendedUser = {
            ...data.user,
            ...profile
          };
        } else {
          extendedUser = {
            ...data.user,
            first_name: '',
            last_name: '',
            company: ''
          };
        }
      }
      
      console.timeEnd('signIn');
      return { user: extendedUser, session: data.session, error: null };
    } catch (error: any) {
      console.error("Erreur lors de la connexion:", error);
      return { user: null, session: null, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error: any) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
     try {
          const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
               redirectTo: `${window.location.origin}/update-password`,
          });
          return { data, error };
     } catch (error: any) {
          console.error("Erreur de réinitialisation de mot de passe:", error);
          return { data: null, error: error.message };
     }
  };

  const isAdmin = () => {
    return user?.role === "admin" ||
           user?.email === "admin@test.com" || 
           user?.email === "alex@test.com" ||
           user?.email === "admin@itakecare.com";
  };

  const isClient = () => {
    return !!user?.client_id;
  };

  const isPartner = () => {
    return !!user?.partner_id;
  };

  const isAmbassador = () => {
    return !!user?.ambassador_id;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signIn,
        signOut,
        isLoading,
        isClient,
        isPartner,
        isAmbassador,
        isAdmin,
        userRoleChecked
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
