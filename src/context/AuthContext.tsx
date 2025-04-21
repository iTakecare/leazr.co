import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  role?: string;
  name?: string;
  ambassador_id?: string;
  client_id?: string;
  partner_id?: string;
  has_ambassador?: boolean;
  has_client?: boolean;
  has_partner?: boolean;
}

export interface AuthContextProps {
  user: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ data?: any, error?: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  loading: boolean;
  isAdmin: () => boolean;
  isClient: () => boolean;
  isPartner: () => boolean;
  isAmbassador: () => boolean;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<UserProfile | null>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  isLoading: boolean;
  userRoleChecked: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userRoleChecked, setUserRoleChecked] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session?.user) {
          await extendSessionData(session.user);
        }
      } catch (error) {
        console.error("[AuthContext] Erreur lors de la récupération de la session:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] État d'authentification changé, événement:", event);
      setSession(session);

      if (session?.user) {
        console.log("[AuthContext] Session mise à jour pour:", session.user.email);
        await extendSessionData(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const extendSessionData = async (userAuth: User) => {
    try {
      console.log("[AuthContext] Vérification de la session...");
      
      // Fetch user details from the public.profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          first_name,
          last_name,
          company,
          role,
          name,
          ambassador_id,
          partner_id,
          has_ambassador,
          has_client,
          has_partner
        `)
        .eq('id', userAuth.id)
        .single();
      
      if (profileError) {
        console.error("Erreur lors de la récupération du profil:", profileError);
      }
      
      let client_id = null;
      
      // Check if the user has a client ID in the local cache
      const cachedClientId = localStorage.getItem(`client_id_${userAuth.id}`);
      if (cachedClientId) {
        client_id = cachedClientId;
        console.log("Found client ID in local cache:", client_id);
      } else {
        // If not in cache, attempt to retrieve it from the clients table
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userAuth.id)
          .eq('status', 'active')
          .maybeSingle();
        
        if (clientError) {
          console.error("Erreur lors de la vérification des clients existants:", clientError);
        } else if (clientData) {
          client_id = clientData.id;
          localStorage.setItem(`client_id_${userAuth.id}`, client_id);
          console.log("Client associé trouvé:", clientData);
        }
      }
      
      const extendedUserData: UserProfile = {
        id: userAuth.id,
        email: userAuth.email,
        ...profile,
        client_id: client_id,
      };
      
      setUser(extendedUserData);
      
      if (extendedUserData.role === 'administrator') {
        console.log("[AuthContext] Utilisateur identifié comme ADMIN");
      } else if (extendedUserData.role === 'ambassador') {
        console.log("[AuthContext] Utilisateur identifié comme AMBASSADOR");
      } else if (extendedUserData.role === 'partner') {
        console.log("[AuthContext] Utilisateur identifié comme PARTNER");
      } else {
        console.log("[AuthContext] Utilisateur identifié comme CLIENT:", client_id);
      }
      
      console.log("[AuthContext] [AuthContext] Données utilisateur étendues:", extendedUserData);
    } catch (error) {
      console.error("Erreur lors de l'extension des données utilisateur:", error);
    } finally {
      setIsLoading(false);
      setUserRoleChecked(true);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      if (response.error) {
        console.error("[AuthContext] Erreur lors de la connexion:", response.error.message);
        return { error: response.error };
      }
      console.log("[AuthContext] Connexion réussie:", response.data);
      return { data: response.data };
    } catch (error: any) {
      console.error("[AuthContext] Exception lors de la connexion:", error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      console.log("[AuthContext] Déconnexion réussie");
    } catch (error: any) {
      console.error("[AuthContext] Erreur lors de la déconnexion:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: metadata
        }
      });
      
      if (error) {
        console.error("[AuthContext] Erreur lors de l'inscription:", error);
        throw error;
      }
      
      console.log("[AuthContext] Inscription réussie:", data);
    } catch (error: any) {
      console.error("[AuthContext] Erreur lors de l'inscription:", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    if (!user?.id) {
      console.error("Tentative de mise à jour du profil sans ID utilisateur.");
      return null;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (error) {
        console.error("Erreur lors de la mise à jour du profil:", error);
        return null;
      }
      
      // Fetch the updated profile
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          first_name,
          last_name,
          company,
          role,
          name,
          ambassador_id,
          partner_id,
          has_ambassador,
          has_client,
          has_partner
        `)
        .eq('id', user.id)
        .single();
      
      if (fetchError) {
        console.error("Erreur lors de la récupération du profil mis à jour:", fetchError);
        return null;
      }
      
      const updatedUserData: UserProfile = {
        ...user,
        ...updatedProfile,
        ...updates,
      };
      
      setUser(updatedUserData);
      console.log("[AuthContext] Profil mis à jour avec succès:", updatedUserData);
      return updatedUserData;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      console.log("[AuthContext] Demande de réinitialisation du mot de passe envoyée");
    } catch (error: any) {
      console.error("[AuthContext] Erreur lors de la demande de réinitialisation du mot de passe:", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      console.log("[AuthContext] Mot de passe réinitialisé avec succès");
    } catch (error: any) {
      console.error("[AuthContext] Erreur lors de la réinitialisation du mot de passe:", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = useCallback(() => user?.role === 'administrator', [user]);
  const isClient = useCallback(() => user?.role === 'client', [user]);
  const isPartner = useCallback(() => user?.role === 'partner', [user]);
  const isAmbassador = useCallback(() => user?.role === 'ambassador', [user]);

  const value = {
    user,
    signIn,
    signOut,
    signUp,
    loading,
    isAdmin,
    isClient,
    isPartner,
    isAmbassador,
    updateUserProfile,
    forgotPassword,
    resetPassword,
    isLoading,
    userRoleChecked
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
