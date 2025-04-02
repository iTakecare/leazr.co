import { createContext, useContext, useState, useEffect } from "react";
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoleChecked, setUserRoleChecked] = useState(false);
  const navigate = useNavigate();

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
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, company, role')
            .eq('id', data.session.user.id)
            .single();
          
          let extendedUser: ExtendedUser = {
            ...data.session.user,
            first_name: profileData?.first_name || '',
            last_name: profileData?.last_name || '',
            company: profileData?.company || '',
            role: profileData?.role || 'client',
          };
          
          const [ambassadorResult, clientResult, partnerResult] = await Promise.all([
            supabase.from('ambassadors').select('id').eq('user_id', data.session.user.id).single(),
            supabase.from('clients').select('id').eq('user_id', data.session.user.id).single(),
            supabase.from('partners').select('id').eq('user_id', data.session.user.id).single()
          ]);
            
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

        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            console.log("[AuthContext] État d'authentification changé, événement:", _event);
            setSession(session);
            
            if (session?.user) {
              console.log("[AuthContext] Session mise à jour pour:", session.user.email);
              
              const { data: profileData } = await supabase
                .from('profiles')
                .select('first_name, last_name, company, role')
                .eq('id', session.user.id)
                .single();

              let extendedUser: ExtendedUser = {
                ...session.user,
                first_name: profileData?.first_name || '',
                last_name: profileData?.last_name || '',
                company: profileData?.company || '',
                role: profileData?.role || 'client',
              };
              
              const [ambassadorResult, clientResult, partnerResult] = await Promise.all([
                supabase.from('ambassadors').select('id').eq('user_id', session.user.id).single(),
                supabase.from('clients').select('id').eq('user_id', session.user.id).single(),
                supabase.from('partners').select('id').eq('user_id', session.user.id).single()
              ]);
                
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

  const handleRoleBasedRedirection = (user: ExtendedUser) => {
    if (!user) return;
    
    const currentPath = window.location.pathname;
    console.log("[AuthContext] Redirection basée sur le rôle, chemin actuel:", currentPath);
    
    if (currentPath === "/" || currentPath === "") {
      console.log("[AuthContext] Utilisateur sur la page d'index, vérification des rôles:");
      
      if (user.ambassador_id) {
        console.log("[AuthContext] Redirection ambassadeur, ID trouvé:", user.ambassador_id);
        setTimeout(() => navigate("/ambassador/dashboard"), 0);
        return;
      } 
      
      if (user.client_id) {
        console.log("[AuthContext] Redirection client, ID trouvé:", user.client_id);
        setTimeout(() => navigate("/client/dashboard"), 0);
        return;
      } 
      
      if (user.partner_id) {
        console.log("[AuthContext] Redirection partenaire, ID trouvé:", user.partner_id);
        setTimeout(() => navigate("/partner/dashboard"), 0);
        return;
      } 
      
      if (isAdmin()) {
        console.log("[AuthContext] Redirection admin, rôle vérifié:", user.role);
        setTimeout(() => navigate("/dashboard"), 0);
        return;
      }
      
      console.log("[AuthContext] Aucun rôle spécifique correspondant, redirection par défaut");
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
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, company')
          .eq('id', data.user.id)
          .single();
          
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
    return user?.role === "admin" ||
           user?.email === "admin@test.com" || 
           user?.email === "alex@test.com" ||
           user?.email === "admin@itakecare.com";
  };

  const isClient = () => {
    console.log("[AuthContext] isClient check:", !!user?.client_id, user?.client_id);
    return !!user?.client_id;
  };

  const isPartner = () => {
    console.log("[AuthContext] isPartner check:", !!user?.partner_id, user?.partner_id);
    return !!user?.partner_id;
  };

  const isAmbassador = () => {
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
