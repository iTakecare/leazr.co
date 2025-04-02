
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createUserAccount, resetPassword } from "@/services/accountService";
import { Ambassador } from "@/services/ambassadorService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AmbassadorUserAccountProps {
  ambassador: Ambassador;
  onAccountCreated: () => void;
}

const AmbassadorUserAccount = ({ ambassador, onAccountCreated }: AmbassadorUserAccountProps) => {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "dd MMMM yyyy", { locale: fr });
    } catch (error) {
      return "Date invalide";
    }
  };

  const hasUserAccount = Boolean(ambassador?.has_user_account);

  const handleCreateAccount = async () => {
    if (!ambassador) return;
    
    if (!ambassador.email) {
      toast.error("Cet ambassadeur n'a pas d'adresse email");
      return;
    }
    
    setIsCreatingAccount(true);
    try {
      const success = await createUserAccount(ambassador, "ambassador");
      if (success) {
        toast.success("Compte ambassadeur créé avec succès");
        onAccountCreated();
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte ambassadeur");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleResetPassword = async () => {
    if (!ambassador?.email) {
      toast.error("Cet ambassadeur n'a pas d'adresse email");
      return;
    }

    setIsResettingPassword(true);
    try {
      const success = await resetPassword(ambassador.email);
      if (success) {
        toast.success("Email de réinitialisation envoyé avec succès");
      } else {
        toast.error("Échec de l'envoi de l'email de réinitialisation");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      {hasUserAccount ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-green-50 p-4 rounded-md border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-800">Compte actif</div>
              {ambassador.user_account_created_at && (
                <span className="text-xs text-green-700">
                  Créé le {formatDate(ambassador.user_account_created_at)}
                </span>
              )}
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full flex items-center justify-center"
            onClick={handleResetPassword}
            disabled={isResettingPassword || !ambassador.email}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {isResettingPassword ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm">Cet ambassadeur n'a pas encore de compte utilisateur pour accéder au portail.</p>
          </div>
          {ambassador.email ? (
            <Button 
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
              onClick={handleCreateAccount}
              disabled={isCreatingAccount}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isCreatingAccount ? "Création en cours..." : "Créer un compte ambassadeur"}
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md">
              Une adresse email est nécessaire pour créer un compte utilisateur.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AmbassadorUserAccount;
