
import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'client' | 'partner';
  company: string | null;
  avatar_url: string | null;
  email?: string; // Add email to UserProfile
}

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for active session on component mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchUserProfile(userId: string) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      // Add email from session to the user profile
      const userWithEmail = {
        ...data,
        email: session?.user?.email || null,
      };

      setUser(userWithEmail as UserProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Erreur lors de la récupération du profil');
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      navigate('/dashboard');
      toast.success('Connexion réussie');
    } catch (error: any) {
      console.error('Error signing in:', error);
      toast.error(error.message || 'Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(email: string, password: string, userData: Partial<UserProfile>) {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Inscription réussie, vérifiez votre email pour confirmer');
    } catch (error: any) {
      console.error('Error signing up:', error);
      toast.error(error.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast.success('Déconnexion réussie');
      navigate('/');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error(error.message || 'Erreur lors de la déconnexion');
    } finally {
      setIsLoading(false);
    }
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    try {
      if (!user) throw new Error('User not authenticated');
      
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Update local user state with new values
      setUser({ ...user, ...updates });
      toast.success('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  }

  const value = {
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
