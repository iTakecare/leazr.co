
import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getClientIdForUser, linkUserToClient, cleanupDuplicateClients } from "@/utils/clientUserAssociation";
import { verifyClientUserAssociation } from "@/utils/clientDiagnostics";

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
  isClient: () => boolean;
  isAdmin: () => boolean;
  createUserAccountForClient: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const supabase = getSupabaseClient();
  const adminSupabase = getAdminSupabaseClient();

  const isClient = () => user?.role === 'client';
  const isAdmin = () => user?.role === 'admin';

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        setSession(currentSession);
        
        if (currentSession) {
          await fetchUserProfile(currentSession.user.id);
          
          if (currentSession.user.email) {
            // Nettoyer les doublons avant d'associer l'utilisateur
            if (isAdmin()) {
              await cleanupDuplicateClients();
            }
            
            await linkUserToClient(currentSession.user.id, currentSession.user.email);
            
            // Exécuter un diagnostic pour détecter et corriger les problèmes
            await verifyClientUserAssociation(currentSession.user.id, currentSession.user.email);
          }
        } else {
          setIsLoading(false);
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            console.log("Auth state change:", _event, newSession ? "session exists" : "no session");
            setSession(newSession);
            
            if (newSession) {
              await fetchUserProfile(newSession.user.id);
              
              if (newSession.user.email) {
                // Nettoyer les doublons lors de la connexion (pour les admins)
                if (_event === 'SIGNED_IN' && user?.role === 'admin') {
                  await cleanupDuplicateClients();
                }
                
                await linkUserToClient(newSession.user.id, newSession.user.email);
                
                // Diagnostic après connexion
                if (_event === 'SIGNED_IN') {
                  await verifyClientUserAssociation(newSession.user.id, newSession.user.email);
                }
              }
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
      
      // Récupérer l'email de l'utilisateur depuis la session
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      
      console.log("User email from auth:", userEmail);
      
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
          email: userEmail || session?.user?.email || null,
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
        
        if (data.user) {
          // Nettoyer les doublons lors de la connexion (pour les admins)
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
          if (userProfile?.role === 'admin') {
            await cleanupDuplicateClients();
          }
          
          await linkUserToClient(data.user.id, email);
        }
        
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
  
  /**
   * Créer un compte utilisateur pour un client existant
   * Utile pour les clients importés ou créés manuellement
   */
  async function createUserAccountForClient(email: string): Promise<boolean> {
    try {
      console.log(`Création d'un compte utilisateur pour le client avec l'email ${email}`);
      
      // Vérifier si un compte utilisateur existe déjà
      const { data: userData, error: userError } = await adminSupabase.auth.admin
        .getUserByEmail(email);
        
      if (userError) {
        console.error("Error checking user existence:", userError);
        toast.error("Erreur lors de la vérification de l'utilisateur");
        return false;
      }
      
      if (userData?.user) {
        console.log("User already exists:", userData.user);
        toast.info("Un compte utilisateur existe déjà pour cette adresse email");
        return true;
      }
      
      // Récupérer les infos du client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', email)
        .single();
        
      if (clientError) {
        console.error("Error getting client:", clientError);
        toast.error("Client non trouvé pour cette adresse email");
        return false;
      }
      
      if (!client) {
        toast.error("Aucun client trouvé avec cette adresse email");
        return false;
      }
      
      // Générer un mot de passe temporaire
      const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).toUpperCase().slice(-2) + "!1";
      
      // Créer le compte utilisateur
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: client.name.split(' ')[0],
          last_name: client.name.split(' ').slice(1).join(' '),
          role: 'client',
          company: client.company
        }
      });
      
      if (createError) {
        console.error("Error creating user:", createError);
        toast.error("Erreur lors de la création du compte utilisateur");
        return false;
      }
      
      // Associer l'utilisateur au client
      if (newUser?.user) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ user_id: newUser.user.id })
          .eq('id', client.id);
          
        if (updateError) {
          console.error("Error linking user to client:", updateError);
        }
        
        // Envoyer l'email de réinitialisation de mot de passe
        const { error: resetError } = await adminSupabase.auth.admin
          .generateLink({
            type: 'recovery',
            email: email,
            options: {
              redirectTo: `${window.location.origin}/login`
            }
          });
          
        if (resetError) {
          console.error("Error sending reset email:", resetError);
          toast.warning("Compte créé mais erreur lors de l'envoi de l'email de réinitialisation");
        } else {
          toast.success("Compte créé et email de réinitialisation envoyé");
        }
        
        return true;
      }
      
      toast.error("Erreur lors de la création du compte utilisateur");
      return false;
    } catch (error) {
      console.error("Error in createUserAccountForClient:", error);
      toast.error("Erreur lors de la création du compte utilisateur");
      return false;
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
    isClient,
    isAdmin,
    createUserAccountForClient,
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
