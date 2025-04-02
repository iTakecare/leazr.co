
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, KeyRound, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createUserAccount, resetPassword, deleteUserAccount } from "@/services/accountService";
import { Ambassador } from "@/services/ambassadorService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AmbassadorUserAccountProps {
  ambassador: Ambassador;
  onAccountCreated: () => void;
}

const AmbassadorUserAccount = ({ ambassador, onAccountCreated }: AmbassadorUserAccountProps) => {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
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

  const handleDeleteAccount = async () => {
    if (!ambassador?.user_id) {
      toast.error("Cet ambassadeur n'a pas de compte utilisateur associé");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const success = await deleteUserAccount(ambassador.user_id);
      if (success) {
        toast.success("Compte utilisateur supprimé avec succès");
        onAccountCreated(); // Refresh data
      } else {
        toast.error("Échec de la suppression du compte utilisateur");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Erreur lors de la suppression du compte utilisateur");
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirmation(false);
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
              {ambassador.user_id && (
                <span className="block text-xs text-green-700">
                  ID: {ambassador.user_id}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
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
            
            <Button 
              variant="outline" 
              size="sm"
              className="w-full flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={isDeletingAccount || !ambassador.user_id}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeletingAccount ? "Suppression en cours..." : "Supprimer le compte utilisateur"}
            </Button>
          </div>
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
      
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Êtes-vous sûr de vouloir supprimer le compte utilisateur associé à cet ambassadeur ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AmbassadorUserAccount;
