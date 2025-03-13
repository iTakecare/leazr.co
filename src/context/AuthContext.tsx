import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
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
  
  const supabase = getSupabaseClient();
  const adminSupabase = getAdminSupabaseClient();

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        setSession(currentSession);
        
        if (currentSession) {
          await fetchUserProfile(currentSession.user.id);
        } else {
          setIsLoading(false);
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            console.log("Auth state change:", _event, newSession ? "session exists" : "no session");
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
    };
    
    initAuth();
  }, []);

  async function fetchUserProfile(userId: string) {
    try {
      setIsLoading(true);
      console.log("Fetching user profile for ID:", userId);
      
      let profileData = null;
      
      try {
        const { data, error } = await adminSupabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) {
          console.error("Admin fetch error:", error);
        } else if (data) {
          console.log("Profile data retrieved via admin client:", data);
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
          } else if (data) {
            console.log("Profile data retrieved via standard client:", data);
            profileData = data;
          }
        } catch (standardError) {
          console.error('Standard fetch failed:', standardError);
        }
      }
      
      if (!profileData && session) {
        console.log("No profile found, creating default profile");
        profileData = {
          id: userId,
          first_name: null,
          last_name: null,
          role: 'client' as const,
          company: null,
          avatar_url: null
        };
      }
      
      if (profileData) {
        const userWithEmail = {
          ...profileData,
          email: session?.user?.email || null,
        };
        
        console.log("Setting user profile:", userWithEmail);
        setUser(userWithEmail as UserProfile);
      } else {
        console.log("No profile data available");
      }
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
      console.log("Attempting signin with email:", email);

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }

      if (data.session) {
        console.log("Sign in successful, session established");
        navigate('/dashboard');
        toast.success('Connexion réussie');
      } else {
        console.error("No session returned after signin");
        toast.error('Erreur de connexion: aucune session retournée');
      }
    } catch (error: any) {
      console.error('Error signing in:', error);
      const errorMessage = error.message === 'Invalid login credentials' 
        ? 'Email ou mot de passe incorrect'
        : error.message || 'Erreur lors de la connexion';
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(email: string, password: string, userData: Partial<UserProfile>) {
    try {
      setIsLoading(true);
      console.log("Attempting signup with email:", email);
      
      const { data: existingClient, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', email)
        .single();
      
      if (clientError && clientError.code !== 'PGRST116') {
        console.error("Error checking existing client:", clientError);
      }
      
      if (existingClient) {
        console.log("Client found in database:", existingClient);
        
        userData = {
          ...userData,
          first_name: userData.first_name || existingClient.name.split(' ')[0],
          last_name: userData.last_name || existingClient.name.split(' ').slice(1).join(' '),
          company: userData.company || existingClient.company,
        };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      
      if (error) {
        console.error("Signup error:", error);
        throw error;
      }
      
      toast.success('Compte créé avec succès! Veuillez vérifier votre email pour activer votre compte.');
      navigate('/login');
    } catch (error: any) {
      console.error('Error signing up:', error);
      toast.error(error.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut(): Promise<void> {
    try {
      setIsLoading(true);
      console.log("Starting sign out process...");
      
      setUser(null);
      setSession(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      
      console.log("Supabase signOut completed successfully");
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw error;
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
