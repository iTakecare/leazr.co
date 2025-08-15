import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CompanyActionResponse {
  success: boolean;
  message: string;
}

export interface SuspendAccountParams {
  companyId: string;
  reason: string;
  duration: string;
  notifyClient: boolean;
  backupData: boolean;
}

export interface DeleteAccountParams {
  companyId: string;
  reason: string;
  backupData: boolean;
}

export const suspendCompanyAccount = async (params: SuspendAccountParams): Promise<CompanyActionResponse> => {
  try {
    // Update company status to suspended
    const { error: updateError } = await supabase
      .from('companies')
      .update({ 
        account_status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.companyId);

    if (updateError) {
      console.error('Error suspending company:', updateError);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de suspendre le compte"
      });
      return {
        success: false,
        message: updateError.message
      };
    }

    // Log the action
    const { error: logError } = await supabase
      .from('company_module_changes')
      .insert({
        company_id: params.companyId,
        modules_enabled: [],
        plan: '',
        changed_by: (await supabase.auth.getUser()).data.user?.id,
        notes: `Compte suspendu - Raison: ${params.reason} - Durée: ${params.duration} jours`
      });

    if (logError) {
      console.warn('Failed to log suspension action:', logError);
    }

    toast({
      title: "Succès",
      description: "Le compte a été suspendu avec succès"
    });

    return {
      success: true,
      message: "Compte suspendu avec succès"
    };
  } catch (error: any) {
    console.error('Error in suspendCompanyAccount:', error);
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Une erreur inattendue s'est produite"
    });
    return {
      success: false,
      message: error.message || "Erreur inattendue"
    };
  }
};

export const reactivateCompanyAccount = async (companyId: string): Promise<CompanyActionResponse> => {
  try {
    // Update company status to active
    const { error: updateError } = await supabase
      .from('companies')
      .update({ 
        account_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);

    if (updateError) {
      console.error('Error reactivating company:', updateError);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de réactiver le compte"
      });
      return {
        success: false,
        message: updateError.message
      };
    }

    // Log the action
    const { error: logError } = await supabase
      .from('company_module_changes')
      .insert({
        company_id: companyId,
        modules_enabled: [],
        plan: '',
        changed_by: (await supabase.auth.getUser()).data.user?.id,
        notes: 'Compte réactivé'
      });

    if (logError) {
      console.warn('Failed to log reactivation action:', logError);
    }

    toast({
      title: "Succès",
      description: "Le compte a été réactivé avec succès"
    });

    return {
      success: true,
      message: "Compte réactivé avec succès"
    };
  } catch (error: any) {
    console.error('Error in reactivateCompanyAccount:', error);
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Une erreur inattendue s'est produite"
    });
    return {
      success: false,
      message: error.message || "Erreur inattendue"
    };
  }
};

export const deleteCompanyAccount = async (params: DeleteAccountParams): Promise<CompanyActionResponse> => {
  try {
    // This is a sensitive operation that should be handled carefully
    // For now, we'll mark the company as inactive instead of actually deleting
    const { error: updateError } = await supabase
      .from('companies')
      .update({ 
        is_active: false,
        account_status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.companyId);

    if (updateError) {
      console.error('Error deleting company:', updateError);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le compte"
      });
      return {
        success: false,
        message: updateError.message
      };
    }

    // Log the action
    const { error: logError } = await supabase
      .from('company_module_changes')
      .insert({
        company_id: params.companyId,
        modules_enabled: [],
        plan: '',
        changed_by: (await supabase.auth.getUser()).data.user?.id,
        notes: `Compte supprimé - Raison: ${params.reason} - Sauvegarde: ${params.backupData ? 'Oui' : 'Non'}`
      });

    if (logError) {
      console.warn('Failed to log deletion action:', logError);
    }

    toast({
      title: "Succès",
      description: "Le compte a été supprimé avec succès"
    });

    return {
      success: true,
      message: "Compte supprimé avec succès"
    };
  } catch (error: any) {
    console.error('Error in deleteCompanyAccount:', error);
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Une erreur inattendue s'est produite"
    });
    return {
      success: false,
      message: error.message || "Erreur inattendue"
    };
  }
};

export const getCompanyActionHistory = async (companyId: string) => {
  try {
    const { data, error } = await supabase
      .from('company_module_changes')
      .select(`
        *,
        profiles:changed_by (
          first_name,
          last_name
        )
      `)
      .eq('company_id', companyId)
      .not('notes', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching action history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCompanyActionHistory:', error);
    return [];
  }
};