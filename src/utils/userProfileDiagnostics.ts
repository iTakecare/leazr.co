
import { supabase } from "@/integrations/supabase/client";

export interface UserProfileDiagnostics {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  profileExists: boolean;
  profileRole?: string;
  isAmbassador: boolean;
  ambassadorProfile?: any;
  hasCorrectPermissions: boolean;
  diagnostics: string[];
}

/**
 * Diagnostique le profil utilisateur pour identifier les problèmes de permissions
 */
export const diagnoseUserProfile = async (): Promise<UserProfileDiagnostics> => {
  const diagnostics: string[] = [];
  const result: UserProfileDiagnostics = {
    isAuthenticated: false,
    profileExists: false,
    isAmbassador: false,
    hasCorrectPermissions: false,
    diagnostics
  };

  try {
    // Étape 1: Vérifier l'authentification
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      diagnostics.push(`Erreur d'authentification: ${authError.message}`);
      return result;
    }

    if (!authData.user) {
      diagnostics.push("Aucun utilisateur authentifié trouvé");
      return result;
    }

    result.isAuthenticated = true;
    result.userId = authData.user.id;
    result.email = authData.user.email;
    diagnostics.push(`✓ Utilisateur authentifié: ${authData.user.email}`);

    // Étape 2: Vérifier le profil dans la table profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name, company_id')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      diagnostics.push(`Erreur lors de la récupération du profil: ${profileError.message}`);
      return result;
    }

    if (!profileData) {
      diagnostics.push("❌ Aucun profil trouvé dans la table profiles");
      return result;
    }

    result.profileExists = true;
    result.profileRole = profileData.role;
    diagnostics.push(`✓ Profil trouvé avec le rôle: ${profileData.role}`);

    // Étape 3: Vérifier si c'est un ambassadeur
    if (profileData.role === 'ambassador') {
      result.isAmbassador = true;
      diagnostics.push("✓ L'utilisateur a le rôle 'ambassador'");

      // Vérifier le profil ambassadeur
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (ambassadorError) {
        diagnostics.push(`⚠️ Erreur lors de la récupération du profil ambassadeur: ${ambassadorError.message}`);
      } else if (ambassadorData) {
        result.ambassadorProfile = ambassadorData;
        diagnostics.push(`✓ Profil ambassadeur trouvé: ${ambassadorData.name}`);
      } else {
        diagnostics.push("❌ Aucun profil ambassadeur trouvé dans la table ambassadors");
      }
    } else {
      diagnostics.push(`❌ L'utilisateur n'a pas le rôle 'ambassador' (rôle actuel: ${profileData.role})`);
    }

    // Étape 4: Tester les permissions sur les tables sensibles
    if (result.isAmbassador) {
      // Test d'accès aux email_templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('email_templates')
        .select('id, type, name')
        .limit(1);

      if (templatesError) {
        diagnostics.push(`❌ Impossible d'accéder aux email_templates: ${templatesError.message}`);
      } else {
        diagnostics.push("✓ Accès aux email_templates autorisé");
      }

      // Test d'accès aux smtp_settings
      const { data: smtpData, error: smtpError } = await supabase
        .from('smtp_settings')
        .select('id, from_email, from_name')
        .limit(1);

      if (smtpError) {
        diagnostics.push(`❌ Impossible d'accéder aux smtp_settings: ${smtpError.message}`);
      } else {
        diagnostics.push("✓ Accès aux smtp_settings autorisé");
        result.hasCorrectPermissions = true;
      }
    }

    return result;
  } catch (error) {
    diagnostics.push(`Exception lors du diagnostic: ${error}`);
    return result;
  }
};

/**
 * Affiche un rapport de diagnostic dans la console
 */
export const logUserProfileDiagnostics = async (): Promise<void> => {
  console.log("🔍 === DIAGNOSTIC DU PROFIL UTILISATEUR ===");
  
  const diagnostics = await diagnoseUserProfile();
  
  console.log("📊 Résumé:");
  console.log(`- Authentifié: ${diagnostics.isAuthenticated ? '✓' : '❌'}`);
  console.log(`- Profil existe: ${diagnostics.profileExists ? '✓' : '❌'}`);
  console.log(`- Est ambassadeur: ${diagnostics.isAmbassador ? '✓' : '❌'}`);
  console.log(`- Permissions correctes: ${diagnostics.hasCorrectPermissions ? '✓' : '❌'}`);
  
  console.log("\n📝 Détails:");
  diagnostics.diagnostics.forEach(msg => console.log(`  ${msg}`));
  
  console.log("\n===========================================");
  
  return;
};
