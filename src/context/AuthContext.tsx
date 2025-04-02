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

  // Fonction de debug améliorée
  const logUserInfo = (prefix: string, userData: any) => {
    console.log(`[AuthContext] ${prefix}`, {
      email: userData?.email,
      ambassador_id: userData?.ambassador_id,
      client_id: userData?.client_id,
      partner_id: userData?.partner_id,
      role: userData?.role,
      has_ambassador: !!userData?.ambassador_id,
      has_client: !!userData?.client_id,
      has_partner: !!userData?.partner_id,
    });
  };

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        console.log("[AuthContext] Vérification de la session...");
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        
        if (data.session?.user) {
          console.log("[AuthContext] Session trouvée pour:", data.session.user.email);
          
          // Get user profile data from profiles table if needed
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, company, role')
            .eq('id', data.session.user.id)
            .single();
          
          // Créer l'utilisateur étendu de base
          let extendedUser: ExtendedUser = {
            ...data.session.user,
            first_name: profileData?.first_name || '',
            last_name: profileData?.last_name || '',
            company: profileData?.company || '',
            role: profileData?.role || 'client',
          };
          
          // Vérifier les différents rôles en parallèle pour améliorer les performances
          const [ambassadorResult, clientResult, partnerResult] = await Promise.all([
            // Vérifier l'ambassadeur
            supabase.from('ambassadors').select('id').eq('user_id', data.session.user.id).single(),
            // Vérifier le client
            supabase.from('clients').select('id').eq('user_id', data.session.user.id).single(),
            // Vérifier le partenaire
            supabase.from('partners').select('id').eq('user_id', data.session.user.id).single()
          ]);
            
          // Assigner les IDs trouvés
          if (ambassadorResult.data?.id) {
            console.log("[AuthContext] Utilisateur identifié comme AMBASSADEUR:", ambassadorResult.data.id);
            extendedUser.ambassador_id = ambassadorResult.data.id;
          }
          
          if (clientResult.data?.id) {
            console.log("[AuthContext] Utilisateur identifié comme CLIENT:", clientResult.data.id);
            extendedUser.client_id = clientResult.data.id;
          }
          
          if (partnerResult.data?.id) {
            console.log("[AuthContext] Utilisateur identifié comme PARTENAIRE:", partnerResult.data.id);
            extendedUser.partner_id = partnerResult.data.id;
          }
          
          logUserInfo("[AuthContext] Données utilisateur étendues:", extendedUser);
          setUser(extendedUser);
          setUserRoleChecked(true);
        } else {
          console.log("[AuthContext] Aucune session trouvée");
          setUser(null);
          setUserRoleChecked(true);
        }

        // Set up auth state listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            console.log("[AuthContext] État d'authentification changé, événement:", _event);
            setSession(session);
            
            if (session?.user) {
              console.log("[AuthContext] Session mise à jour pour:", session.user.email);
              
              // Get user profile data from profiles table if needed
              const { data: profileData } = await supabase
                .from('profiles')
                .select('first_name, last_name, company, role')
                .eq('id', session.user.id)
                .single();

              // Créer l'utilisateur étendu de base
              let extendedUser: ExtendedUser = {
                ...session.user,
                first_name: profileData?.first_name || '',
                last_name: profileData?.last_name || '',
                company: profileData?.company || '',
                role: profileData?.role || 'client',
              };
              
              // Vérifier les différents rôles en parallèle
              const [ambassadorResult, clientResult, partnerResult] = await Promise.all([
                // Vérifier l'ambassadeur
                supabase.from('ambassadors').select('id').eq('user_id', session.user.id).single(),
                // Vérifier le client
                supabase.from('clients').select('id').eq('user_id', session.user.id).single(),
                // Vérifier le partenaire
                supabase.from('partners').select('id').eq('user_id', session.user.id).single()
              ]);
                
              // Assigner les IDs trouvés
              if (ambassadorResult.data?.id) {
                console.log("[AuthContext] Utilisateur identifié comme AMBASSADEUR:", ambassadorResult.data.id);
                extendedUser.ambassador_id = ambassadorResult.data.id;
              }
              
              if (clientResult.data?.id) {
                console.log("[AuthContext] Utilisateur identifié comme CLIENT:", clientResult.data.id);
                extendedUser.client_id = clientResult.data.id;
              }
              
              if (partnerResult.data?.id) {
                console.log("[AuthContext] Utilisateur identifié comme PARTENAIRE:", partnerResult.data.id);
                extendedUser.partner_id = partnerResult.data.id;
              }
              
              logUserInfo("[AuthContext] OnAuthStateChange - Données utilisateur étendues:", extendedUser);
              setUser(extendedUser);
              setUserRoleChecked(true);
              
              // Effectuer la redirection immédiate si l'utilisateur est sur la page d'index
              if (window.location.pathname === "/" || window.location.pathname === "") {
                handleRoleBasedRedirection(extendedUser);
              }
            } else {
              console.log("[AuthContext] Session terminée");
              setUser(null);
              setUserRoleChecked(true);
            }
          }
        );

        return () => {
          console.log("[AuthContext] Nettoyage des abonnements");
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("[AuthContext] Erreur de vérification de session:", error);
        setUserRoleChecked(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);
  
  // Helper function to handle role-based redirections
  const handleRoleBasedRedirection = (user: ExtendedUser) => {
    if (!user) return;
    
    // Get current path to avoid unnecessary redirections
    const currentPath = window.location.pathname;
    console.log("[AuthContext] Redirection basée sur le rôle, chemin actuel:", currentPath);
    
    // Vérifier si l'utilisateur est sur la page d'index et doit être redirigé
    if (currentPath === "/" || currentPath === "") {
      console.log("[AuthContext] Utilisateur sur la page d'index, vérification des rôles:");
      console.log("- Est ambassadeur?", !!user.ambassador_id);
      console.log("- Est client?", !!user.client_id);
      console.log("- Est partenaire?", !!user.partner_id);
      console.log("- Est admin?", isAdmin());
      
      // Rediriger l'utilisateur selon son rôle, en priorité
      if (user.ambassador_id) {
        console.log("[AuthContext] Redirection vers le tableau de bord ambassadeur");
        setTimeout(() => navigate("/ambassador/dashboard"), 0);
        return; // Arrêter après la première redirection
      } 
      
      if (user.client_id) {
        console.log("[AuthContext] Redirection vers le tableau de bord client");
        setTimeout(() => navigate("/client/dashboard"), 0);
        return; // Arrêter après la première redirection
      } 
      
      if (user.partner_id) {
        console.log("[AuthContext] Redirection vers le tableau de bord partenaire");
        setTimeout(() => navigate("/partner/dashboard"), 0);
        return; // Arrêter après la première redirection
      } 
      
      if (isAdmin()) {
        console.log("[AuthContext] Redirection vers le tableau de bord administrateur");
        setTimeout(() => navigate("/dashboard"), 0);
        return; // Arrêter après la première redirection
      }
      
      // Default fallback to client dashboard if no specific role match
      console.log("[AuthContext] Aucun rôle spécifique correspondant, redirection vers le tableau de bord client par défaut");
      setTimeout(() => navigate("/client/dashboard"), 0);
    }
  };

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
      console.error("Signup error", error);
      return { user: null, session: null, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      let extendedUser = null;
      
      if (data.user) {
        // Get user profile data from profiles table if needed
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, company')
          .eq('id', data.user.id)
          .single();
          
        // Merge user data with profile data
        extendedUser = {
          ...data.user,
          first_name: profileData?.first_name || '',
          last_name: profileData?.last_name || '',
          company: profileData?.company || ''
        };
      }
      
      return { user: extendedUser, session: data.session, error };
    } catch (error: any) {
      console.error("Signin error", error);
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
      console.error("Signout error", error);
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
          console.error("Reset password error", error);
          return { data: null, error: error.message };
     }
  };

  const isAdmin = () => {
    // Vérifier si le rôle est admin (nouvelle condition) ou l'email est dans la liste des admins
    return user?.role === "admin" ||
           user?.email === "admin@test.com" || 
           user?.email === "alex@test.com" ||
           user?.email === "admin@itakecare.com";
  };

  const isClient = () => {
    // Considéré comme client s'il a un client_id associé
    console.log("[AuthContext] isClient check:", !!user?.client_id, user?.client_id);
    return !!user?.client_id;
  };

  const isPartner = () => {
    // Considéré comme partenaire s'il a un partner_id associé
    console.log("[AuthContext] isPartner check:", !!user?.partner_id, user?.partner_id);
    return !!user?.partner_id;
  };

  const isAmbassador = () => {
    // Considéré comme ambassadeur s'il a un ambassador_id associé
    console.log("[AuthContext] isAmbassador check:", !!user?.ambassador_id, user?.ambassador_id);
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
