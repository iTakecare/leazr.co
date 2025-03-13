import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'client' | 'partner';
  company: string | null;
  avatar_url: string | null;
  email?: string;
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
    console.log("AuthProvider initialized");
    
    async function initializeAuth() {
      try {
        setIsLoading(true);
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Current session retrieved:", !!currentSession);
        setSession(currentSession);
        
        if (currentSession) {
          await fetchUserProfile(currentSession.user.id);
        } else {
          setIsLoading(false);
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            console.log("Auth state changed, event:", _event);
            setSession(newSession);
            
            if (newSession) {
              await fetchUserProfile(newSession.user.id);
            } else {
              setUser(null);
              setIsLoading(false);
            }
          }
        );
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsLoading(false);
      }
    }
    
    initializeAuth();
  }, []);

  async function fetchUserProfile(userId: string) {
    try {
      console.log("Fetching user profile for:", userId);
      
      let profileData = null;
      
      try {
        const { data, error } = await adminSupabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) {
          console.error("Admin fetch error:", error);
        } else {
          console.log("Admin fetch successful:", data);
          profileData = data;
        }
      } catch (adminError) {
        console.error('Admin fetch failed:', adminError);
      }
      
      if (!profileData) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (error) {
            console.error("Standard fetch error:", error);
          } else {
            console.log("Standard fetch successful:", data);
            profileData = data;
          }
        } catch (standardError) {
          console.error('Standard fetch failed:', standardError);
        }
      }
      
      if (!profileData && session) {
        console.log("Creating minimal profile");
        profileData = {
          id: userId,
          first_name: session.user?.user_metadata?.first_name || "Utilisateur",
          last_name: session.user?.user_metadata?.last_name || "",
          role: 'client' as const,
          company: null,
          avatar_url: null
        };
      }
      
      if (profileData && session) {
        const userWithEmail = {
          ...profileData,
          email: session?.user?.email || null,
        };
        
        console.log("Setting user profile:", userWithEmail);
        setUser(userWithEmail as UserProfile);
      } else {
        console.error("No profile data found or created");
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Erreur lors de la récupération du profil');
    } finally {
      console.log("Fetch profile completed, setting isLoading to false");
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      setIsLoading(true);
      console.log("Signing in with:", email);

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        throw error;
      }

      console.log("Sign in successful:", !!data.session);
      navigate('/dashboard');
      toast.success('Connexion réussie');
    } catch (error: any) {
      console.error('Error signing in:', error);
      setIsLoading(false);
      
      const errorMessage = error.message === 'Invalid login credentials' 
        ? 'Email ou mot de passe incorrect'
        : error.message || 'Erreur lors de la connexion';
      
      toast.error(errorMessage);
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
