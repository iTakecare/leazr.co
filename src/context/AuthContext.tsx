
import { createContext, useContext, useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        console.log("Checking auth session...");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setIsLoading(false);
          return;
        }
        
        setSession(data.session);
        
        if (data.session?.user) {
          console.log("User found in session, fetching profile data...");
          await fetchAndSetUserData(data.session.user);
          setUserRoleChecked(true);
        } else {
          console.log("No active session found");
          setUser(null);
          setUserRoleChecked(true);
        }

        // Set up auth state listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            console.log("Auth state changed:", _event);
            setSession(session);
            
            if (session?.user) {
              await fetchAndSetUserData(session.user);
            } else {
              setUser(null);
            }
            setUserRoleChecked(true);
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Session check error:", error);
        setUserRoleChecked(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const fetchAndSetUserData = async (authUser: User) => {
    try {
      // Get user profile data from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, company, role')
        .eq('id', authUser.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile data:", profileError);
        toast.error("Erreur lors de la récupération des données du profil");
      }
      
      // Rechercher l'association avec un partenaire
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();
        
      if (partnerError) {
        console.error("Error fetching partner data:", partnerError);
      }
        
      // Rechercher l'association avec un ambassadeur
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();
        
      if (ambassadorError) {
        console.error("Error fetching ambassador data:", ambassadorError);
      }
        
      // Rechercher l'association avec un client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();
        
      if (clientError) {
        console.error("Error fetching client data:", clientError);
      }
        
      // Fusionner les données utilisateur avec les données de profil
      const extendedUser: ExtendedUser = {
        ...authUser,
        first_name: profileData?.first_name || '',
        last_name: profileData?.last_name || '',
        company: profileData?.company || '',
        role: profileData?.role || 'client',
        partner_id: partnerData?.id || null,
        ambassador_id: ambassadorData?.id || null,
        client_id: clientData?.id || null
      };
      
      console.log("User data fetched and merged:", {
        first_name: extendedUser.first_name,
        last_name: extendedUser.last_name,
        role: extendedUser.role,
        partner_id: extendedUser.partner_id,
        ambassador_id: extendedUser.ambassador_id,
        client_id: extendedUser.client_id
      });
      
      setUser(extendedUser);
      
    } catch (error) {
      console.error("Error in fetchAndSetUserData:", error);
      toast.error("Erreur lors de la récupération des données utilisateur");
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
      
      if (error) {
        console.error("Signin error:", error);
        return { user: null, session: null, error };
      }
      
      let extendedUser = null;
      
      if (data.user) {
        await fetchAndSetUserData(data.user);
        extendedUser = user;
      }
      
      return { user: extendedUser, session: data.session, error: null };
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
      toast.error("Erreur lors de la déconnexion");
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
    return !!user?.client_id;
  };

  const isPartner = () => {
    // Considéré comme partenaire s'il a un partner_id associé
    return !!user?.partner_id;
  };

  const isAmbassador = () => {
    // Considéré comme ambassadeur s'il a un ambassador_id associé
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
