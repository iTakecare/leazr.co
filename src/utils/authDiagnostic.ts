import { supabase } from '@/integrations/supabase/client';

export const diagnoseAuthSession = async () => {
  console.log("🔬 DIAGNOSTIC AUTH - Début du diagnostic");
  
  try {
    // 1. Vérifier la session côté client
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log("🔬 Session client:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      hasAccessToken: !!session?.access_token,
      tokenLength: session?.access_token?.length,
      sessionError: sessionError?.message
    });

    if (!session) {
      console.log("❌ DIAGNOSTIC: Aucune session trouvée côté client");
      return { success: false, error: "No session found" };
    }

    // 2. Tester la transmission du token vers Supabase
    console.log("🔬 Test de transmission du token...");
    
    // Test avec une requête simple qui utilise auth.uid()
    const { data: authTest, error: authError } = await supabase
      .rpc('get_current_user_profile');
    
    console.log("🔬 Test auth.uid():", { 
      authTest, 
      authError: authError?.message 
    });

    // 3. Test direct avec une requête qui nécessite l'authentification
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, company_id')
      .eq('id', session.user.id);

    console.log("🔬 Test requête profiles:", {
      hasProfiles: !!profiles && profiles.length > 0,
      profilesCount: profiles?.length || 0,
      profileError: profileError?.message
    });

    // 4. Test avec une requête SQL directe
    const { data: sqlTest, error: sqlError } = await supabase
      .rpc('execute_sql', { 
        sql: 'SELECT auth.uid() as current_user_id, get_user_company_id() as company_id' 
      });

    console.log("🔬 Test SQL direct:", {
      sqlTest,
      sqlError: sqlError?.message
    });

    return {
      success: true,
      session: !!session,
      authTest,
      profiles: profiles?.length || 0,
      diagnosis: authError || profileError || sqlError ? "Authentication issues detected" : "All tests passed"
    };

  } catch (error) {
    console.error("🔬 DIAGNOSTIC ERROR:", error);
    return { success: false, error: error.message };
  }
};

export const fixAuthTransmission = async () => {
  console.log("🔧 Tentative de correction de la transmission auth...");
  
  try {
    // Forcer le refresh de la session
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("🔧 Erreur refresh session:", error);
      return { success: false, error: error.message };
    }

    console.log("🔧 Session rafraîchie:", !!session);
    
    // Re-tester après le refresh
    const diagnostic = await diagnoseAuthSession();
    return diagnostic;
    
  } catch (error) {
    console.error("🔧 Erreur lors de la correction:", error);
    return { success: false, error: error.message };
  }
};