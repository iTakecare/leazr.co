import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, KeyRound, CheckCircle, AlertCircle, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { createUserAccount, resetPassword, deleteUserAccount } from "@/services/accountService";
import { Client } from "@/types/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ClientUserAccountProps {
  client: Client;
  onAccountCreated: () => void;
}

const ClientUserAccount = ({
  client,
  onAccountCreated
}: ClientUserAccountProps) => {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);
  const [checkingEmailStatus, setCheckingEmailStatus] = useState(false);

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "dd MMMM yyyy", {
        locale: fr
      });
    } catch (error) {
      return "Date invalide";
    }
  };

  // Vérifier le statut de confirmation de l'email
  useEffect(() => {
    const checkEmailConfirmationStatus = async () => {
      if (!client.user_id) {
        setEmailConfirmed(null);
        return;
      }

      setCheckingEmailStatus(true);
      try {
        const { data: allUsers, error } = await supabase.functions.invoke('get-all-users');
        
        if (error) {
          console.error('Erreur lors de la vérification du statut email:', error);
          setEmailConfirmed(null);
        } else {
          const user = allUsers?.find((u: any) => u.id === client.user_id);
          setEmailConfirmed(user ? !!user.email_confirmed_at : false);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut email:', error);
        setEmailConfirmed(null);
      } finally {
        setCheckingEmailStatus(false);
      }
    };

    checkEmailConfirmationStatus();
  }, [client.user_id]);

  const hasUserAccount = Boolean(client?.has_user_account);

  const handleCreateAccount = async () => {
    if (!client) return;
    if (!client.email) {
      toast.error("Ce client n'a pas d'adresse email");
      return;
    }

    setIsCreatingAccount(true);
    try {
      const success = await createUserAccount(client, "client");
      if (success) {
        toast.success("Compte client créé avec succès");
        onAccountCreated();
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte client");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleResetPassword = async () => {
    if (!client?.email) {
      toast.error("Ce client n'a pas d'adresse email");
      return;
    }

    setIsResettingPassword(true);
    try {
      const success = await resetPassword(client.email);
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
    if (!client?.user_id) {
      toast.error("Ce client n'a pas de compte utilisateur associé");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const success = await deleteUserAccount(client.user_id);
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
          <div className={`flex items-center gap-2 p-4 rounded-md border ${
            checkingEmailStatus 
              ? 'bg-gray-50 border-gray-200' 
              : emailConfirmed === false 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-green-50 border-green-200'
          }`}>
            {checkingEmailStatus ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : emailConfirmed === false ? (
              <Clock className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <div>
              <div className={`font-medium ${
                checkingEmailStatus 
                  ? 'text-gray-800' 
                  : emailConfirmed === false 
                    ? 'text-amber-800' 
                    : 'text-green-800'
              }`}>
                {checkingEmailStatus 
                  ? 'Vérification...' 
                  : emailConfirmed === false 
                    ? 'En attente de validation' 
                    : 'Compte actif'
                }
              </div>
              {client.user_account_created_at && (
                <span className={`text-xs ${
                  checkingEmailStatus 
                    ? 'text-gray-700' 
                    : emailConfirmed === false 
                      ? 'text-amber-700' 
                      : 'text-green-700'
                }`}>
                  Créé le {formatDate(client.user_account_created_at)}
                </span>
              )}
              {client.user_id && (
                <span className={`block text-xs ${
                  checkingEmailStatus 
                    ? 'text-gray-700' 
                    : emailConfirmed === false 
                      ? 'text-amber-700' 
                      : 'text-green-700'
                }`}>
                  ID: {client.user_id}
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
              disabled={isResettingPassword || !client.email}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {isResettingPassword ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
              onClick={() => setShowDeleteConfirmation(true)} 
              disabled={isDeletingAccount || !client.user_id}
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
            <p className="text-sm">Ce client n'a pas encore de compte utilisateur pour accéder au portail.</p>
          </div>
          {client.email ? (
            <Button 
              onClick={handleCreateAccount} 
              disabled={isCreatingAccount} 
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isCreatingAccount ? "Création en cours..." : "Créer un compte client"}
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
              Cette action est irréversible. Êtes-vous sûr de vouloir supprimer le compte utilisateur associé à ce client ?
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

export default ClientUserAccount;