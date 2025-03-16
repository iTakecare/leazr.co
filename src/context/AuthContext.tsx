
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
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        
        if (data.session?.user) {
          // Get user profile data from profiles table if needed
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, company, role')
            .eq('id', data.session.user.id)
            .single();
          
          // Vérifier si l'utilisateur est lié à un partenaire
          const { data: partnerData } = await supabase
            .from('partners')
            .select('id')
            .eq('user_id', data.session.user.id)
            .single();
            
          // Merge user data with profile data and partner info
          const extendedUser: ExtendedUser = {
            ...data.session.user,
            first_name: profileData?.first_name || '',
            last_name: profileData?.last_name || '',
            company: profileData?.company || '',
            role: profileData?.role || 'client',
            partner_id: partnerData?.id || null
          };
          
          setUser(extendedUser);
          setUserRoleChecked(true);
        } else {
          setUser(null);
          setUserRoleChecked(true);
        }

        // Set up auth state listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            setSession(session);
            
            if (session?.user) {
              // Get user profile data from profiles table if needed
              const { data: profileData } = await supabase
                .from('profiles')
                .select('first_name, last_name, company, role')
                .eq('id', session.user.id)
                .single();
                
              // Vérifier si l'utilisateur est lié à un partenaire
              const { data: partnerData } = await supabase
                .from('partners')
                .select('id')
                .eq('user_id', session.user.id)
                .single();
                
              // Merge user data with profile data and partner info
              const extendedUser: ExtendedUser = {
                ...session.user,
                first_name: profileData?.first_name || '',
                last_name: profileData?.last_name || '',
                company: profileData?.company || '',
                role: profileData?.role || 'client',
                partner_id: partnerData?.id || null
              };
              
              setUser(extendedUser);
              setUserRoleChecked(true);
            } else {
              setUser(null);
              setUserRoleChecked(true);
            }
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
    // Add a check to see if the email is admin@test.com
    return user?.email === "admin@test.com" || 
           user?.email === "alex@test.com" ||
           user?.email === "admin@itakecare.com";
  };

  const isClient = () => {
    // Considéré comme client s'il n'est ni admin ni partenaire
    return !isAdmin() && !isPartner();
  };

  const isPartner = () => {
    // Considéré comme partenaire s'il a un partner_id associé
    return !!user?.partner_id;
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
        userRoleChecked
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
