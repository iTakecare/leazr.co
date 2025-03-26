import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserExtended {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  company: string | null;
  title: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  avatar_url: string | null;
  user_metadata?: {
    ambassador_id?: string;
    partner_id?: string;
    role?: string;
  };
}

export const fetchAllUsers = async (): Promise<UserExtended[]> => {
  try {
    // Récupérer les profils depuis la table profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin'); // Filtrer uniquement les administrateurs
    
    if (profilesError) {
      console.error("Erreur lors de la récupération des profils:", profilesError);
      throw profilesError;
    }
    
    // Format the data into the expected UserExtended structure
    const users: UserExtended[] = [];
    
    for (const profile of profiles) {
      users.push({
        id: profile.id,
        email: '',  // Will be filled from auth metadata query
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
        company: profile.company,
        title: profile.title,
        email_confirmed_at: null,
        last_sign_in_at: null,
        created_at: profile.created_at,
        avatar_url: profile.avatar_url,
        user_metadata: {} // Will be filled later
      });
    }
    
    // Pour chaque profil, récupérer les métadonnées utilisateur
    for (const user of users) {
      try {
        // Récupérer les métadonnées utilisateur (email, etc.)
        const { data: authUser, error: authError } = await supabase
          .from('users_view')
          .select('email, email_confirmed_at, last_sign_in_at, raw_user_meta_data')
          .eq('id', user.id)
          .single();
        
        if (!authError && authUser) {
          user.email = authUser.email || '';
          user.email_confirmed_at = authUser.email_confirmed_at;
          user.last_sign_in_at = authUser.last_sign_in_at;
          
          // Récupérer les métadonnées utilisateur
          if (authUser.raw_user_meta_data) {
            user.user_metadata = {
              ambassador_id: authUser.raw_user_meta_data.ambassador_id,
              partner_id: authUser.raw_user_meta_data.partner_id,
              role: authUser.raw_user_meta_data.role
            };
          }
        } else {
          // Fallback pour récupérer au moins l'email
          const { data: userEmail } = await supabase
            .from('auth_users_email_view')
            .select('email')
            .eq('id', user.id)
            .single();
            
          if (userEmail) {
            user.email = userEmail.email;
          }
          
          // Vérifier si l'utilisateur est un ambassadeur
          const { data: ambassador } = await supabase
            .from('ambassadors')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
          if (ambassador) {
            user.user_metadata = { 
              ...user.user_metadata,
              ambassador_id: ambassador.id 
            };
          }
          
          // Vérifier si l'utilisateur est un partenaire
          const { data: partner } = await supabase
            .from('partners')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
          if (partner) {
            user.user_metadata = { 
              ...user.user_metadata,
              partner_id: partner.id 
            };
          }
        }
      } catch (err) {
        console.error(`Impossible de récupérer les données complètes pour l'utilisateur ${user.id}:`, err);
      }
    }
    
    return users;
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

export const updateUserAvatar = async (userId: string, avatarUrl: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);
      
    if (error) {
      console.error("Erreur lors de la mise à jour de l'avatar:", error);
      toast.error("Impossible de mettre à jour l'avatar");
      return false;
    }

    // Mettre à jour les métadonnées utilisateur pour que l'avatar soit disponible
    // dans la session utilisateur
    await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl }
    });
    
    toast.success("Avatar mis à jour avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'avatar:", error);
    toast.error("Impossible de mettre à jour l'avatar");
    return false;
  }
};

export const updateUserPassword = async (password: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) {
      console.error("Erreur lors de la mise à jour du mot de passe:", error);
      toast.error(`Impossible de mettre à jour le mot de passe: ${error.message}`);
      return false;
    }
    
    toast.success("Mot de passe mis à jour avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mot de passe:", error);
    toast.error("Impossible de mettre à jour le mot de passe");
    return false;
  }
};

export const createUser = async (userData: { email: string, password: string, role?: string, first_name?: string, last_name?: string, company?: string }): Promise<boolean> => {
  try {
    // Use regular signup instead of admin createUser
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          role: userData.role || 'admin' // Default to admin for this function
        }
      }
    });
    
    if (error) {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      toast.error(`Impossible de créer l'utilisateur: ${error.message}`);
      return false;
    }
    
    // Update the profile if user was created successfully
    if (data?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company: userData.company || null,
          role: userData.role || 'admin'
        })
        .eq('id', data.user.id);
        
      if (profileError) {
        console.error("Erreur lors de la mise à jour du profil:", profileError);
        // Continue despite profile error
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
