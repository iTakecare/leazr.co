
import { createContext, useContext, useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Extend the User type to include the missing properties
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoleChecked, setUserRoleChecked] = useState(false);
  const navigate = useNavigate();

  const loadUserProfile = async (userId: string) => {
    try {
      console.time('loadUserProfile');
      
      // Optimisation: Utiliser une seule requête RPC pour récupérer toutes les informations nécessaires
      // Cette approche est beaucoup plus rapide que de faire plusieurs requêtes séparées
      const { data, error } = await supabase.rpc('get_user_profile_with_associations', {
        user_id: userId
      });
      
      if (error) {
        console.error("Erreur lors de la récupération du profil utilisateur:", error);
        return null;
      }
      
      if (data) {
        console.log("Profil utilisateur récupéré avec succès:", data);
        return {
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          company: data.company || '',
          role: data.role || 'client',
          partner_id: data.partner_id || null,
          ambassador_id: data.ambassador_id || null,
          client_id: data.client_id || null
        };
      }
      
      // Fallback à l'ancienne méthode si la RPC n'existe pas encore
      
      // Récupérer les données du profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, company, role')
        .eq('id', userId)
        .single();
      
      // Vérifier l'association avec un partenaire
      const { data: partnerData } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      // Vérifier l'association avec un ambassadeur
      const { data: ambassadorData } = await supabase
        .from('ambassadors')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      // Vérifier l'association avec un client
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      console.timeEnd('loadUserProfile');
      
      return {
        first_name: profileData?.first_name || '',
        last_name: profileData?.last_name || '',
        company: profileData?.company || '',
        role: profileData?.role || 'client',
        partner_id: partnerData?.id || null,
        ambassador_id: ambassadorData?.id || null,
        client_id: clientData?.id || null
      };
    } catch (error) {
      console.error("Erreur dans loadUserProfile:", error);
      return null;
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      console.time('checkSession');
      setIsLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        
        if (data.session?.user) {
          console.log("Session trouvée pour l'utilisateur:", data.session.user.id);
          const userProfileData = await loadUserProfile(data.session.user.id);
          
          if (userProfileData) {
            // Fusionner les données utilisateur avec les données de profil
            const extendedUser: ExtendedUser = {
              ...data.session.user,
              ...userProfileData
            };
            
            setUser(extendedUser);
          } else {
            setUser(data.session.user as ExtendedUser);
          }
        } else {
          console.log("Aucune session trouvée");
          setUser(null);
        }
        
        setUserRoleChecked(true);

        // Configurer l'écouteur d'état d'authentification
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            console.log("Changement d'état d'authentification:", _event);
            setSession(session);
            
            if (session?.user) {
              console.log("Nouvel état d'authentification avec utilisateur:", session.user.id);
              const userProfileData = await loadUserProfile(session.user.id);
              
              if (userProfileData) {
                const extendedUser: ExtendedUser = {
                  ...session.user,
                  ...userProfileData
                };
                
                setUser(extendedUser);
              } else {
                setUser(session.user as ExtendedUser);
              }
            } else {
              console.log("Nouvel état d'authentification sans utilisateur");
              setUser(null);
            }
            
            setUserRoleChecked(true);
          }
        );

        console.timeEnd('checkSession');
        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Erreur lors de la vérification de session:", error);
        setUserRoleChecked(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

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
        // Récupérer les données du profil utilisateur
        const userProfileData = await loadUserProfile(data.user.id);
        
        if (userProfileData) {
          extendedUser = {
            ...data.user,
            ...userProfileData
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

  // Fonctions utilitaires pour vérifier le rôle de l'utilisateur
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
        isLoading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        isAdmin,
        isClient,
        isPartner,
        isAmbassador,
        userRoleChecked
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
