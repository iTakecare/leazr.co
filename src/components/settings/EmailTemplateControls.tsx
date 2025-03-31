
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplateControlsProps {
  onRefresh: () => void;
}

const EmailTemplateControls: React.FC<EmailTemplateControlsProps> = ({ onRefresh }) => {
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  
  const initializeTemplates = async () => {
    try {
      setIsInitializing(true);
      toast.loading("Initialisation des modèles d'email...");
      
      const { data, error } = await supabase.functions.invoke('initialize-email-templates', {
        body: {}
      });
      
      if (error) {
        console.error("Erreur lors de l'initialisation des modèles d'email:", error);
        toast.error("Échec de l'initialisation des modèles d'email");
        return;
      }
      
      if (data && data.success) {
        toast.success(`${data.inserted} nouveaux modèles d'email ajoutés (${data.total} modèles au total)`);
        // Rafraîchir la liste des modèles
        onRefresh();
      } else {
        toast.error("L'initialisation des modèles d'email a échoué");
      }
    } catch (err) {
      console.error("Exception lors de l'initialisation des modèles d'email:", err);
      toast.error("Une erreur est survenue lors de l'initialisation des modèles d'email");
    } finally {
      setIsInitializing(false);
    }
  };
  
  return (
    <div className="flex justify-end mb-4">
      <Button 
        variant="outline"
        onClick={initializeTemplates}
        disabled={isInitializing}
        className="flex items-center gap-2"
      >
        {isInitializing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Initialiser les modèles d'email
      </Button>
    </div>
  );
};

export default EmailTemplateControls;
