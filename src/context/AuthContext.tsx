import { createContext, useContext, useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      role: userData?.role,
      ambassador_id: userData?.ambassador_id,
      client_id: userData?.client_id,
      partner_id: userData?.partner_id,
      has_ambassador: !!userData?.ambassador_id,
      has_client: !!userData?.client_id,
      has_partner: !!userData?.partner_id,
    });
  };

  const checkRoleFromMetadata = (userMetadata: any) => {
    if (!userMetadata) return null;
    if (userMetadata.role === 'ambassador') return 'ambassador';
    if (userMetadata.role === 'partner') return 'partner';
    if (userMetadata.role === 'admin') return 'admin';
    return 'client'; // par défaut
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
          
          const userRole = checkRoleFromMetadata(data.session.user.user_metadata) || 
                           profileData?.role || 
                           'client';
          
          let extendedUser: ExtendedUser = {
            ...data.session.user,
            first_name: profileData?.first_name || '',
            last_name: profileData?.last_name || '',
            company: profileData?.company || '',
            role: userRole,
          };
          
          try {
            if (userRole === 'ambassador') {
              const { data: ambassadorData } = await supabase
                .from('ambassadors')
                .select('id')
                .eq('user_id', data.session.user.id)
                .maybeSingle();
                
              if (ambassadorData?.id) {
                console.log("[AuthContext] Utilisateur identifié comme AMBASSADEUR:", ambassadorData.id);
                extendedUser.ambassador_id = ambassadorData.id;
              }
            }
            
            if (userRole === 'client') {
              const { data: clientData } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', data.session.user.id)
                .maybeSingle();
                
              if (clientData?.id) {
                console.log("[AuthContext] Utilisateur identifié comme CLIENT:", clientData.id);
                extendedUser.client_id = clientData.id;
              }
            }
            
            if (userRole === 'partner') {
              const { data: partnerData } = await supabase
                .from('partners')
                .select('id')
                .eq('user_id', data.session.user.id)
                .maybeSingle();
                
              if (partnerData?.id) {
                console.log("[AuthContext] Utilisateur identifié comme PARTENAIRE:", partnerData.id);
                extendedUser.partner_id = partnerData.id;
              }
            }
          } catch (error) {
            console.error('[AuthContext] Erreur lors de la récupération des IDs associés:', error);
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
              
              const userRole = checkRoleFromMetadata(session.user.user_metadata) || 
                               profileData?.role || 
                               'client';
              
              let extendedUser: ExtendedUser = {
                ...session.user,
                first_name: profileData?.first_name || '',
                last_name: profileData?.last_name || '',
                company: profileData?.company || '',
                role: userRole,
              };
              
              try {
                if (userRole === 'ambassador') {
                  const { data: ambassadorData } = await supabase
                    .from('ambassadors')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .maybeSingle();
                    
                  if (ambassadorData?.id) {
                    console.log("[AuthContext] Utilisateur identifié comme AMBASSADEUR:", ambassadorData.id);
                    extendedUser.ambassador_id = ambassadorData.id;
                  }
                }
                
                if (userRole === 'client') {
                  const { data: clientData } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .maybeSingle();
                    
                  if (clientData?.id) {
                    console.log("[AuthContext] Utilisateur identifié comme CLIENT:", clientData.id);
                    extendedUser.client_id = clientData.id;
                  }
                }
                
                if (userRole === 'partner') {
                  const { data: partnerData } = await supabase
                    .from('partners')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .maybeSingle();
                    
                  if (partnerData?.id) {
                    console.log("[AuthContext] Utilisateur identifié comme PARTENAIRE:", partnerData.id);
                    extendedUser.partner_id = partnerData.id;
                  }
                }
              } catch (error) {
                console.error('[AuthContext] Erreur lors de la récupération des IDs associés:', error);
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
      
      const role = user.role?.toLowerCase();
      
      if (role === 'admin' || user.email === "hello@itakecare.be" || user.email === "admin@itakecare.com" || user.email === "admin@test.com" || user.email === "alex@test.com") {
        console.log("[AuthContext] Redirection admin, email/rôle trouvé:", role, user.email);
        setTimeout(() => navigate("/dashboard"), 0);
        return;
      }
      
      if (role === 'ambassador') {
        console.log("[AuthContext] Redirection ambassadeur, rôle trouvé:", role);
        setTimeout(() => navigate("/ambassador/dashboard"), 0);
        return;
      } 
      
      if (role === 'client') {
        console.log("[AuthContext] Redirection client, rôle trouvé:", role);
        setTimeout(() => navigate("/client/dashboard"), 0);
        return;
      } 
      
      if (role === 'partner') {
        console.log("[AuthContext] Redirection partenaire, rôle trouvé:", role);
        setTimeout(() => navigate("/partner/dashboard"), 0);
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
          .select('first_name, last_name, company, role')
          .eq('id', data.user.id)
          .single();
          
        extendedUser = {
          ...data.user,
          first_name: profileData?.first_name || '',
          last_name: profileData?.last_name || '',
          company: profileData?.company || '',
          role: checkRoleFromMetadata(data.user.user_metadata) || profileData?.role || 'client'
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
      setUser(null);
      setSession(null);
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
           user?.email === "admin@itakecare.com" ||
           user?.email === "hello@itakecare.be";
  };

  const isClient = () => {
    console.log("[AuthContext] isClient check:", user?.role === "client", user?.role);
    return user?.role === "client";
  };

  const isPartner = () => {
    console.log("[AuthContext] isPartner check:", user?.role === "partner", user?.role);
    return user?.role === "partner";
  };

  const isAmbassador = () => {
    console.log("[AuthContext] isAmbassador check:", user?.role === "ambassador", user?.role);
    return user?.role === "ambassador";
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
