
import { supabase } from '@/integrations/supabase/client';

export const initializeITakecare = async () => {
  try {
    // SEULEMENT pour les utilisateurs iTakecare spécifiquement
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.email) {
      console.log("Pas de session utilisateur");
      return;
    }

    // CRITICAL: Seulement s'exécuter pour les emails iTakecare
    if (!session.user.email.includes('itakecare.be')) {
      console.log("Utilisateur non-iTakecare, aucune initialisation nécessaire");
      return;
    }

    console.log("Vérification et assignation de l'abonnement iTakecare pour:", session.user.email);
    
    // Vérifier si l'entreprise iTakecare existe déjà
    const { data: existingCompany, error: checkError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'iTakecare')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking iTakecare company:", checkError);
      return;
    }

    if (existingCompany) {
      console.log("iTakecare company already exists:", existingCompany.id);
      
      // Vérifier si l'utilisateur a déjà un profil avec cette entreprise
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile && profile.company_id) {
        console.log("Utilisateur iTakecare déjà associé à une entreprise");
        return;
      }

      // Associer l'utilisateur à l'entreprise iTakecare existante
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ company_id: existingCompany.id })
        .eq('id', session.user.id);

      if (updateError) {
        console.error("Erreur lors de l'association à l'entreprise iTakecare:", updateError);
      } else {
        console.log("Utilisateur iTakecare associé à l'entreprise existante");
      }
      return;
    }

    console.log("Entreprise iTakecare non trouvée, création...");
    
    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert({
        name: 'iTakecare',
        plan: 'business',
        account_status: 'active',
        is_active: true,
        subscription_ends_at: new Date('2030-12-31').toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating iTakecare company:", createError);
      return;
    }

    // Associer l'utilisateur iTakecare à la nouvelle entreprise
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ company_id: newCompany.id })
      .eq('id', session.user.id);

    if (updateError) {
      console.error("Erreur lors de l'association:", updateError);
    } else {
      console.log("Entreprise iTakecare créée et utilisateur associé:", newCompany.id);
    }

  } catch (error) {
    console.error("Failed to initialize iTakecare subscription:", error);
  }
};

// Initialiser seulement si nous sommes dans le navigateur et qu'il y a une session iTakecare
if (typeof window !== 'undefined') {
  // Attendre que l'authentification soit prête avant d'initialiser
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user?.email?.includes('itakecare.be')) {
      // Seulement pour les utilisateurs iTakecare
      setTimeout(() => {
        initializeITakecare();
      }, 1000);
    }
  });
}
