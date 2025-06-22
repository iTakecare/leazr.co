
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  clientId: string | null;
  partnerId: string | null;
  ambassadorId: string | null;
  companyId: string | null;
  isClient: boolean;
  isPartner: boolean;
  isAmbassador: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [ambassadorId, setAmbassadorId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  console.log("🎯 AUTH CONTEXT RENDER - État actuel:", {
    hasUser: !!user,
    hasSession: !!session,
    isLoading: loading,
    userEmail: user?.email,
    userRole,
    ambassadorId,
    companyId
  });

  const enrichUserData = async (currentUser: User, timeoutMs = 10000) => {
    console.log("🔄 AUTH EVENT - Début enrichissement avec timeout");
    
    const enrichPromise = async () => {
      console.log("📝 ENRICH - Enrichissement des données pour:", currentUser.email);
      console.log("📝 ENRICH - Début de la requête vers profiles");
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          role,
          client_id,
          company_id,
          partners!inner(id),
          ambassadors!inner(id)
        `)
        .eq('id', currentUser.id)
        .single();

      console.log("📝 ENRICH - Réponse de la requête profiles:", {
        hasData: !!profileData,
        hasError: !!profileError,
        errorMessage: profileError?.message
      });

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Erreur lors de l'enrichissement:", profileError);
        throw profileError;
      }

      // Récupérer les IDs depuis les tables spécialisées si pas dans le profil
      let finalPartnerId = profileData?.partners?.[0]?.id || null;
      let finalAmbassadorId = profileData?.ambassadors?.[0]?.id || null;

      // Si pas trouvé dans les jointures, chercher directement
      if (!finalPartnerId && (profileData?.role === 'partner' || profileData?.role === 'ambassador')) {
        const { data: partnerData } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();
        finalPartnerId = partnerData?.id || null;
      }

      if (!finalAmbassadorId && (profileData?.role === 'ambassador' || profileData?.role === 'partner')) {
        const { data: ambassadorData } = await supabase
          .from('ambassadors')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();
        finalAmbassadorId = ambassadorData?.id || null;
      }

      const enrichedData = {
        email: currentUser.email || '',
        role: (profileData as any)?.role || 'client',
        client_id: (profileData as any)?.client_id || '',
        partner_id: finalPartnerId || '',
        ambassador_id: finalAmbassadorId || '',
        company_id: (profileData as any)?.company_id || ''
      };

      console.log("📝 ENRICH - Données enrichies:", enrichedData);

      return enrichedData;
    };

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout enrichissement utilisateur')), timeoutMs)
    );

    try {
      const enrichedData = await Promise.race([enrichPromise(), timeoutPromise]) as any;
      
      console.log("🔄 AUTH EVENT - Utilisateur défini:", currentUser.email);
      setUser(currentUser);
      setUserRole(enrichedData.role);
      setClientId(enrichedData.client_id);
      setPartnerId(enrichedData.partner_id);
      setAmbassadorId(enrichedData.ambassador_id);
      setCompanyId(enrichedData.company_id);
      
      console.log("🔄 AUTH EVENT - setIsLoading(false) appelé");
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de l'enrichissement des données utilisateur:", error);
      
      // Fallback: définir au moins les données de base
      setUser(currentUser);
      setUserRole('client');
      setClientId('');
      setPartnerId('');
      setAmbassadorId('');
      setCompanyId('');
      setLoading(false);
      
      toast.error("Erreur lors du chargement de votre profil");
    }
  };

  useEffect(() => {
    console.log("🚀 AUTH CONTEXT - Initialisation");
    
    // Configurer l'écoute des changements d'authentification
    console.log("🚀 AUTH CONTEXT - Configuration de l'écoute des changements d'auth");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 AUTH EVENT:", event, "Session présente:", !!session);
      
      setSession(session);

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          console.log("🔄 AUTH EVENT - Session valide détectée, event:", event);
          console.log("🔄 AUTH EVENT - Enrichissement des données utilisateur...");
          await enrichUserData(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("🔄 AUTH EVENT - Déconnexion détectée");
        setUser(null);
        setUserRole(null);
        setClientId(null);
        setPartnerId(null);
        setAmbassadorId(null);
        setCompanyId(null);
        setLoading(false);
      }
    });

    // Vérifier s'il y a déjà une session
    console.log("🚀 AUTH CONTEXT - Vérification de la session existante");
    const checkExistingSession = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        console.log("🚀 AUTH CONTEXT - Session existante:", !!existingSession);
        
        if (existingSession?.user) {
          console.log("🚀 AUTH CONTEXT - Session existante trouvée pour:", existingSession.user.email);
          console.log("🚀 AUTH CONTEXT - Début enrichissement session existante avec timeout");
          await enrichUserData(existingSession.user);
        } else {
          console.log("🚀 AUTH CONTEXT - Session existante: setIsLoading(false)");
          setLoading(false);
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de la session:", error);
        setLoading(false);
      }
    };

    checkExistingSession();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isClient = userRole === 'client';
  const isPartner = userRole === 'partner';
  const isAmbassador = userRole === 'ambassador';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  console.log("🔍 isClient check:", { userRole, clientId, result: isClient });
  console.log("🔍 isAmbassador check:", { userRole, ambassadorId, result: isAmbassador });

  const value: AuthContextType = {
    user,
    session,
    loading,
    userRole,
    clientId,
    partnerId,
    ambassadorId,
    companyId,
    isClient,
    isPartner,
    isAmbassador,
    isAdmin,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
