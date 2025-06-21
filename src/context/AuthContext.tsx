
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userProfile: any;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  isClient: () => boolean;
  isAmbassador: () => boolean;
  isPartner: () => boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  const logAuthState = (message: string, data?: any) => {
    console.log(`🎯 AUTH CONTEXT ${message}`, data ? data : '');
  };

  const enrichUserData = async (currentUser: User, event?: string) => {
    if (!currentUser?.email) {
      logAuthState('ENRICH - Aucun utilisateur fourni');
      return;
    }

    logAuthState(`ENRICH - Enrichissement des données pour: ${currentUser.email}`);

    try {
      // D'abord, vérifier les métadonnées utilisateur dans le JWT
      const userMetadata = currentUser.user_metadata;
      const role = userMetadata?.role;
      const ambassadorId = userMetadata?.ambassador_id;

      logAuthState('ENRICH - Métadonnées utilisateur:', { role, ambassadorId });

      // Si l'utilisateur a un role d'ambassadeur dans ses métadonnées, on le respecte
      if (role === 'ambassador' && ambassadorId) {
        logAuthState('ENRICH - Utilisateur identifié comme ambassadeur via métadonnées');
        
        // Essayer de récupérer les détails de l'ambassadeur
        try {
          const { data: ambassadorData, error: ambassadorError } = await supabase
            .from('ambassadors')
            .select('*')
            .eq('id', ambassadorId)
            .single();

          if (!ambassadorError && ambassadorData) {
            const enrichedUser = {
              ...currentUser,
              role: 'ambassador',
              ambassador_id: ambassadorId,
              name: ambassadorData.name,
              email: ambassadorData.email
            };
            
            setUser(enrichedUser);
            setUserProfile({
              role: 'ambassador',
              ambassador_id: ambassadorId,
              first_name: ambassadorData.name?.split(' ')[0] || '',
              last_name: ambassadorData.name?.split(' ').slice(1).join(' ') || '',
              email: ambassadorData.email
            });
            
            logAuthState('ENRICH - Ambassadeur enrichi avec succès:', enrichedUser);
            return;
          }
        } catch (ambassadorError) {
          console.error('Erreur lors de la récupération des données ambassadeur:', ambassadorError);
        }
      }

      // Sinon, essayer de récupérer le profil depuis la table profiles
      logAuthState('ENRICH - Récupération du profil depuis la table profiles');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        logAuthState('ENRICH - Erreur profiles:', profileError.message);
        
        // Créer un utilisateur par défaut basé sur les métadonnées
        const fallbackUser = {
          ...currentUser,
          role: role || 'client'
        };
        
        setUser(fallbackUser);
        setUserProfile({
          role: role || 'client',
          first_name: userMetadata?.name?.split(' ')[0] || '',
          last_name: userMetadata?.name?.split(' ').slice(1).join(' ') || '',
          email: currentUser.email
        });
        
        logAuthState('ENRICH - Utilisateur fallback créé:', fallbackUser);
        return;
      }

      // Enrichir avec les données du profil
      const enrichedUser = {
        ...currentUser,
        role: profileData.role,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        company_id: profileData.company_id,
        client_id: profileData.client_id
      };

      setUser(enrichedUser);
      setUserProfile(profileData);
      
      logAuthState('ENRICH - Utilisateur enrichi depuis profiles:', enrichedUser);

    } catch (error) {
      console.error('Erreur lors de l\'enrichissement des données utilisateur:', error);
      
      // Fallback basé sur les métadonnées utilisateur
      const userMetadata = currentUser.user_metadata;
      const fallbackUser = {
        ...currentUser,
        role: userMetadata?.role || 'client'
      };
      
      setUser(fallbackUser);
      setUserProfile({
        role: userMetadata?.role || 'client',
        first_name: userMetadata?.name?.split(' ')[0] || '',
        last_name: userMetadata?.name?.split(' ').slice(1).join(' ') || '',
        email: currentUser.email
      });
      
      logAuthState('ENRICH - Utilisateur fallback avec métadonnées:', fallbackUser);
    }
  };

  const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
    logAuthState(`EVENT: ${event} Session présente: ${!!session}`);
    
    setSession(session);
    
    if (session?.user) {
      logAuthState(`EVENT - Session valide détectée, event: ${event}`);
      await enrichUserData(session.user, event);
    } else {
      logAuthState('EVENT - Aucune session, reset de l\'état');
      setUser(null);
      setUserProfile(null);
    }
    
    setIsLoading(false);
  };

  const refreshUserData = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session?.user && !error) {
      await enrichUserData(session.user, 'REFRESH');
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setIsLoading(false);
  };

  const isAdmin = () => {
    const role = user?.role || userProfile?.role;
    const result = role === 'admin' || role === 'super_admin';
    logAuthState('isAdmin check:', { userRole: role, result });
    return result;
  };

  const isClient = () => {
    const role = user?.role || userProfile?.role;
    const clientId = user?.client_id || userProfile?.client_id || '';
    const result = role === 'client';
    logAuthState('isClient check:', { userRole: role, clientId, result });
    return result;
  };

  const isAmbassador = () => {
    const role = user?.role || userProfile?.role;
    const ambassadorId = user?.ambassador_id || userProfile?.ambassador_id || '';
    const result = role === 'ambassador';
    logAuthState('isAmbassador check:', { userRole: role, ambassadorId, result });
    return result;
  };

  const isPartner = () => {
    const role = user?.role || userProfile?.role;
    const partnerId = user?.partner_id || userProfile?.partner_id || '';
    const result = role === 'partner';
    logAuthState('isPartner check:', { userRole: role, partnerId, result });
    return result;
  };

  useEffect(() => {
    logAuthState('CONTEXT - Initialisation');
    
    // Configuration de l'écoute des changements d'auth
    logAuthState('CONTEXT - Configuration de l\'écoute des changements d\'auth');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Vérification de la session existante
    logAuthState('CONTEXT - Vérification de la session existante');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Erreur lors de la récupération de la session:', error);
        setIsLoading(false);
        return;
      }
      
      logAuthState(`CONTEXT - Session existante: ${!!session}`);
      
      if (session?.user) {
        logAuthState(`CONTEXT - Session existante trouvée pour: ${session.user.email}`);
        enrichUserData(session.user, 'INITIAL_SESSION').then(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const contextValue = {
    user,
    session,
    isLoading,
    userProfile,
    signOut,
    isAdmin,
    isClient,
    isAmbassador,
    isPartner,
    refreshUserData
  };

  logAuthState('RENDER - État actuel:', {
    hasUser: !!user,
    hasSession: !!session,
    isLoading,
    userEmail: user?.email,
    userRole: user?.role || userProfile?.role
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
