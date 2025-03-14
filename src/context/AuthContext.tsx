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
  client_id?: string | null; // Add client_id property
}

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
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
        
        const hash = window.location.hash;
        
        if (hash && hash.includes('type=recovery')) {
          console.log("Flux de réinitialisation de mot de passe détecté, maintien de l'utilisateur sur la page de connexion");
          setIsLoading(false);
          return;
        }
        
        setSession(currentSession);
        
        if (currentSession) {
          await fetchUserProfile(currentSession.user.id);
          
          if (currentSession.user.email) {
            if (isAdmin()) {
              await cleanupDuplicateClients();
            }
            
            await linkUserToClient(currentSession.user.id, currentSession.user.email);
            
            await verifyClientUserAssociation(currentSession.user.id, currentSession.user.email);
          }
        } else {
          setIsLoading(false);
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            console.log("Changement d'état d'authentification:", _event, newSession ? "session existe" : "pas de session");
            
            const currentHash = window.location.hash;
            
            if (currentHash && currentHash.includes('type=recovery') && _event !== 'PASSWORD_RECOVERY') {
              console.log("Flux de réinitialisation actif, ne pas définir la session");
              setIsLoading(false);
              return;
            }
            
            setSession(newSession);
            
            if (newSession) {
              await fetchUserProfile(newSession.user.id);
              
              if (newSession.user.email) {
                if (_event === 'SIGNED_IN' && user?.role === 'admin') {
                  await cleanupDuplicateClients();
                }
                
                await linkUserToClient(newSession.user.id, newSession.user.email);
                
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
        console.error("Erreur d'initialisation de l'authentification:", error);
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  async function fetchUserProfile(userId: string) {
    try {
      setIsLoading(true);
      console.log("Récupération du profil utilisateur pour l'ID:", userId);
      
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;
      
      console.log("Email de l'utilisateur provenant de l'authentification:", userEmail);
      
      let profileData = null;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) {
          console.error("Erreur de récupération standard:", error);
        } else if (data) {
          console.log("Données de profil récupérées via le client standard:", data);
          profileData = data;
        }
      } catch (standardError) {
        console.error('Échec de la récupération standard:', standardError);
      }
      
      if (!profileData && session) {
        console.log("Aucun profil trouvé, création d'un profil par défaut");
        
        const { data: authUser } = await supabase.auth.getUser();
        const userMetadata = authUser?.user?.user_metadata;
        
        profileData = {
          id: userId,
          first_name: userMetadata?.first_name || null,
          last_name: userMetadata?.last_name || null,
          role: userMetadata?.role || 'client' as const,
          company: userMetadata?.company || null,
          avatar_url: null
        };
        
        try {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(profileData);
            
          if (insertError) {
            console.error("Erreur lors de la création du profil:", insertError);
          } else {
            console.log("Nouveau profil créé pour l'utilisateur");
          }
        } catch (insertError) {
          console.error("Exception lors de la création du profil:", insertError);
        }
      }
      
      if (profileData) {
        const userWithEmail = {
          ...profileData,
          email: userEmail || session?.user?.email || null,
        };
        
        console.log("Définition du profil utilisateur:", userWithEmail);
        setUser(userWithEmail as UserProfile);
      } else {
        console.log("Aucune donnée de profil disponible");
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil utilisateur:', error);
      toast.error('Erreur lors de la récupération du profil');
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string): Promise<{ error?: Error }> {
    try {
      setIsLoading(true);
      console.log("Tentative de connexion avec l'email:", email);

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        console.error("Erreur de connexion:", error);
        return { error };
      }

      if (data.session) {
        console.log("Connexion réussie, session établie");
        
        if (data.user) {
          if (data.user.email) {
            if (isAdmin()) {
              await cleanupDuplicateClients();
            }
            
            await linkUserToClient(data.user.id, email);
          }
        }
        
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        
        if (type !== 'recovery') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
          if (profile && profile.role === 'client') {
            navigate('/client/dashboard');
          } else {
            navigate('/dashboard');
          }
          
          toast.success('Connexion réussie');
        }
      } else {
        console.error("Aucune session retournée après la connexion");
        toast.error('Erreur de connexion: aucune session retournée');
      }
      
      return {};
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      const errorMessage = error.message === 'Invalid login credentials' 
        ? 'Email ou mot de passe incorrect'
        : error.message || 'Erreur lors de la connexion';
      
      toast.error(errorMessage);
      return { error };
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
      
      navigate('/login');
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
  
  async function createUserAccountForClient(email: string): Promise<boolean> {
    try {
      console.log(`Création d'un compte utilisateur pour le client avec l'email ${email}`);
      
      const checkUserFunction = async () => {
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const existingUser = authUsers?.users?.find(user => user.email === email);
          return existingUser || null;
        } catch (e) {
          console.error("Error checking users with admin:", e);
          
          try {
            const { data: exists } = await supabase.rpc('check_user_exists_by_email', {
              user_email: email
            });
            
            if (exists) {
              console.log("User exists according to RPC");
              return true;
            }
            
            return null;
          } catch (rpcError) {
            console.error("Error checking user with RPC:", rpcError);
            return null;
          }
        }
      };
      
      const existingUser = await checkUserFunction();
      
      if (existingUser) {
        console.log("User already exists:", existingUser);
        toast.info("Un compte utilisateur existe déjà pour cette adresse email");
        return true;
      }
      
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
      
      const generatePassword = () => {
        const randomPart = Math.random().toString(36).slice(-10);
        const uppercasePart = Math.random().toString(36).toUpperCase().slice(-2);
        return `${randomPart}${uppercasePart}!1`;
      };
      
      const tempPassword = generatePassword();
      
      const createUserFunction = async () => {
        try {
          return await supabase.auth.admin.createUser({
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
        } catch (e) {
          console.error("Error creating user with admin:", e);
          
          return await supabase.auth.signUp({
            email: email,
            password: tempPassword,
            options: {
              data: {
                first_name: client.name.split(' ')[0],
                last_name: client.name.split(' ').slice(1).join(' '),
                role: 'client',
                company: client.company
              },
              emailRedirectTo: `${window.location.origin}/login`
            }
          });
        }
      };
      
      const { data: newUser, error: createError } = await createUserFunction();
      
      if (createError) {
        console.error("Error creating user:", createError);
        toast.error("Erreur lors de la création du compte utilisateur");
        return false;
      }
      
      if (newUser?.user) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ 
            user_id: newUser.user.id,
            has_user_account: true,
            user_account_created_at: new Date().toISOString()
          })
          .eq('id', client.id);
          
        if (updateError) {
          console.error("Error linking user to client:", updateError);
        }
        
        const siteUrl = window.location.origin;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/login`
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
