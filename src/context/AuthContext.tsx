
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  ambassador_id?: string;
  company?: string;
  avatar_url?: string;
}

interface AuthContextProps {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: { first_name?: string, last_name?: string }) => Promise<{ error: any, data?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  isClient: () => boolean;
  isAdmin: () => boolean;
  isPartner: () => boolean;
  isAmbassador: () => boolean;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupération de la session et configuration de l'écouteur d'authentification
    const getSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
        }
        
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Écouteur pour les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Fonction pour récupérer le profil de l'utilisateur
  const fetchUserProfile = async (authUser: User) => {
    try {
      // Récupérer le profil complet depuis la table profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Fusionner les données d'authentification et du profil
        setUser({
          id: authUser.id,
          email: authUser.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          ambassador_id: data.ambassador_id,
          company: data.company,
          avatar_url: data.avatar_url
        });
      } else {
        // Si aucun profil n'existe, créer un profil basique
        setUser({
          id: authUser.id,
          email: authUser.email
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Définir un utilisateur avec des informations minimales
      setUser({
        id: authUser.id,
        email: authUser.email
      });
    }
  };

  // Fonction d'authentification
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  // Fonction d'inscription
  const signUp = async (email: string, password: string, metadata?: { first_name?: string, last_name?: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      return { data, error };
    } catch (error: any) {
      return { error };
    }
  };

  // Fonction de déconnexion
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Réinitialisation du mot de passe
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  // Mettre à jour le mot de passe
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password
      });
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  // Vérification des rôles
  const isClient = () => {
    return user?.role === 'client';
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isPartner = () => {
    return user?.role === 'partner';
  };

  const isAmbassador = () => {
    return user?.role === 'ambassador';
  };

  // Fonction pour mettre à jour le profil utilisateur
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) return;
    
    try {
      // Mettre à jour la base de données
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Mettre à jour l'état local
      setUser(prev => {
        if (!prev) return null;
        return { ...prev, ...updates };
      });
      
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isClient,
    isAdmin,
    isPartner,
    isAmbassador,
    updateUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
