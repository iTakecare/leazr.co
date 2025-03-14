import { createContext, useContext, useState, useEffect } from "react";
import {
  Session,
  User,
  useSession,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";

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
  const supabaseClient = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        if (session) {
          // You can add additional checks here if needed
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [session]);

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabaseClient.auth.signUp({
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
      const { data, error } = await supabaseClient.auth.signInWithPassword({
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
      await supabaseClient.auth.signOut();
      router.push("/login");
    } catch (error: any) {
      console.error("Signout error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
     try {
          const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
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
    return session?.user?.email === "admin@test.com" || 
           session?.user?.email === "alex@test.com" ||
           session?.user?.email === "admin@itakecare.com";
  };

  const isClient = () => {
    return session?.user?.email === "client@test.com" || 
          (session?.user && !isAdmin() && !isPartner());
  };

  const isPartner = () => {
    return session?.user?.email === "partner@test.com" || 
           session?.user?.email?.includes("partner");
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
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

