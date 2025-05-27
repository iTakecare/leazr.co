
import { supabase } from '@/integrations/supabase/client';

export const initializeITakecare = async () => {
  try {
    console.log("Checking and assigning iTakecare subscription...");
    
    // Vérifier si l'entreprise iTakecare existe déjà
    const { data: existingCompany, error: checkError } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', '%itakecare%')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking iTakecare company:", checkError);
      return;
    }

    if (existingCompany) {
      console.log("iTakecare company already exists:", existingCompany);
      return;
    }

    console.log("iTakecare company not found, creating new one...");
    
    // Créer l'entreprise iTakecare seulement si l'utilisateur est authentifié
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log("Pas de session utilisateur, impossible de créer l'entreprise iTakecare");
      return;
    }

    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert({
        name: 'iTakecare',
        plan: 'business',
        is_active: true,
        subscription_ends_at: new Date('2030-12-31').toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error assigning iTakecare subscription:", createError);
      // Ne pas bloquer l'application si l'entreprise ne peut pas être créée
      return;
    }

    console.log("iTakecare subscription created successfully:", newCompany);
  } catch (error) {
    console.error("Failed to initialize iTakecare subscription:", error);
    // Ne pas bloquer l'application en cas d'erreur
  }
};

// Initialiser seulement si nous sommes dans le navigateur et qu'il y a une session
if (typeof window !== 'undefined') {
  // Attendre que l'authentification soit prête avant d'initialiser
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Utiliser setTimeout pour éviter les blocages
      setTimeout(() => {
        initializeITakecare();
      }, 1000);
    }
  });
}
