
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserExtended {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  company: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  avatar_url: string | null;
}

export const fetchAllUsers = async (): Promise<UserExtended[]> => {
  try {
    // Récupérer les informations d'authentification des utilisateurs via la fonction SQL
    const { data: authUsers, error: authError } = await supabase
      .rpc('get_all_users_extended');
    
    if (authError) {
      console.error("Erreur lors de la récupération des informations d'authentification:", authError);
      throw authError;
    }
    
    // Récupérer les profils des utilisateurs
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error("Erreur lors de la récupération des profils:", profilesError);
      throw profilesError;
    }
    
    // Fusionner les données d'authentification et de profil
    const mergedUsers = authUsers.map(authUser => {
      const profile = profiles.find(p => p.id === authUser.id) || {};
      return {
        id: authUser.id,
        email: authUser.email,
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
        role: profile.role || 'client',
        company: profile.company || null,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at,
        created_at: authUser.created_at,
        avatar_url: profile.avatar_url || null
      };
    });
    
    return mergedUsers;
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    toast.error("Impossible de récupérer la liste des utilisateurs");
    return [];
  }
};

export const updateUserProfile = async (userId: string, profileData: Partial<Omit<UserExtended, 'id' | 'email' | 'email_confirmed_at' | 'last_sign_in_at' | 'created_at'>>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId);
      
    if (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error("Impossible de mettre à jour le profil utilisateur");
      return false;
    }
    
    toast.success("Profil utilisateur mis à jour avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    toast.error("Impossible de mettre à jour le profil utilisateur");
    return false;
  }
};

export const createUser = async (userData: { email: string, password: string, role?: string, first_name?: string, last_name?: string, company?: string }): Promise<boolean> => {
  try {
    // Utiliser l'API d'administration de Supabase pour créer un utilisateur
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        role: userData.role || 'client'
      }
    });
    
    if (error) {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      toast.error(`Impossible de créer l'utilisateur: ${error.message}`);
      return false;
    }
    
    // Mise à jour du profil avec les informations supplémentaires
    if (data?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company: userData.company || null,
          role: userData.role || 'client'
        })
        .eq('id', data.user.id);
        
      if (profileError) {
        console.error("Erreur lors de la mise à jour du profil:", profileError);
        // Continuer malgré l'erreur de profil
      }
    }
    
    toast.success("Utilisateur créé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    toast.error("Impossible de créer l'utilisateur");
    return false;
  }
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await adminSupabase.auth.admin.deleteUser(
      userId
    );
    
    if (error) {
      console.error("Erreur lors de la suppression de l'utilisateur:", error);
      toast.error(`Impossible de supprimer l'utilisateur: ${error.message}`);
      return false;
    }
    
    toast.success("Utilisateur supprimé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    toast.error("Impossible de supprimer l'utilisateur");
    return false;
  }
};
