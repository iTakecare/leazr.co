import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ModuleToggleResponse {
  success: boolean;
  message: string;
  modules_enabled?: string[];
  plan?: string;
}

export const updateCompanyModules = async (
  companyId: string,
  modulesEnabled: string[]
): Promise<ModuleToggleResponse> => {
  try {
    const { data, error } = await supabase.rpc('update_company_modules', {
      p_company_id: companyId,
      p_modules_enabled: modulesEnabled
    });

    if (error) {
      console.error('Error updating company modules:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour les modules"
      });
      return {
        success: false,
        message: error.message || "Erreur lors de la mise à jour"
      };
    }

    if (data && data.length > 0) {
      const result = data[0];
      if (result.success) {
        toast({
          title: "Succès",
          description: result.message
        });
        return {
          success: true,
          message: result.message,
          modules_enabled: result.modules_enabled,
          plan: result.plan
        };
      } else {
        toast({
          variant: "destructive", 
          title: "Erreur",
          description: result.message
        });
        return {
          success: false,
          message: result.message
        };
      }
    }

    return {
      success: false,
      message: "Réponse inattendue du serveur"
    };
  } catch (error: any) {
    console.error('Error in updateCompanyModules:', error);
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

export const updateCompanyPlan = async (
  companyId: string,
  plan: string,
  modulesEnabled: string[]
): Promise<ModuleToggleResponse> => {
  try {
    const { data, error } = await supabase.rpc('update_company_modules', {
      p_company_id: companyId,
      p_modules_enabled: modulesEnabled,
      p_plan: plan
    });

    if (error) {
      console.error('Error updating company plan:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de changer le plan"
      });
      return {
        success: false,
        message: error.message || "Erreur lors du changement de plan"
      };
    }

    if (data && data.length > 0) {
      const result = data[0];
      if (result.success) {
        toast({
          title: "Succès",
          description: `Plan mis à jour vers ${plan}`
        });
        return {
          success: true,
          message: result.message,
          modules_enabled: result.modules_enabled,
          plan: result.plan
        };
      } else {
        toast({
          variant: "destructive",
          title: "Erreur", 
          description: result.message
        });
        return {
          success: false,
          message: result.message
        };
      }
    }

    return {
      success: false,
      message: "Réponse inattendue du serveur"
    };
  } catch (error: any) {
    console.error('Error in updateCompanyPlan:', error);
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

export const getCompanyModuleHistory = async (companyId: string) => {
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
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching module history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCompanyModuleHistory:', error);
    return [];
  }
};