
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplateControlsProps {
  onRefresh: () => void;
}

const EmailTemplateControls: React.FC<EmailTemplateControlsProps> = ({ onRefresh }) => {
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  
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
  
  const testEmailSetup = async () => {
    try {
      setIsTesting(true);
      toast.loading("Envoi d'un email de test...");
      
      const { data, error } = await supabase.functions.invoke('test-resend', {
        body: {}
      });
      
      if (error) {
        console.error("Erreur lors du test d'envoi d'email:", error);
        toast.error("Échec du test d'envoi d'email");
        return;
      }
      
      if (data && data.success) {
        toast.success(`Email de test envoyé avec succès à ${data.message}`);
      } else {
        toast.error(`Le test d'envoi d'email a échoué: ${data?.message || 'Erreur inconnue'}`);
      }
    } catch (err) {
      console.error("Exception lors du test d'envoi d'email:", err);
      toast.error("Une erreur est survenue lors du test d'envoi d'email");
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <div className="flex justify-end gap-2 mb-4">
      <Button 
        variant="outline"
        onClick={testEmailSetup}
        disabled={isTesting}
        className="flex items-center gap-2"
      >
        {isTesting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Tester l'envoi d'email
      </Button>
      
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
