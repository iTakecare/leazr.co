
import { createContext, useContext, useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null; error: any }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null; error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ data: any; error: any }>;
  isAdmin: () => boolean;
  isClient: () => boolean;
  isPartner: () => boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user || null);

        // Set up auth state listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            setSession(session);
            setUser(session?.user || null);
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Session check error:", error);
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
      return { user: data.user, session: data.session, error };
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
      return { user: data.user, session: data.session, error };
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
    return user?.email === "client@test.com" || 
          (user && !isAdmin() && !isPartner());
  };

  const isPartner = () => {
    return user?.email === "partner@test.com" || 
           user?.email?.includes("partner");
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
        isPartner
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
