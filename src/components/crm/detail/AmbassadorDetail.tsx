
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Ambassador } from "@/services/ambassadorService";
import { ArrowLeft, CheckCircle, AlertCircle, UserPlus, KeyRound, Loader2 } from "lucide-react";
import { createUserAccount, resetPassword } from "@/services/accountService";
import { toast } from "sonner";

interface AmbassadorDetailProps {
  ambassador: Ambassador;
  onBackClick: () => void;
  onRefresh: () => void;
}

export default function AmbassadorDetail({ ambassador, onBackClick, onRefresh }: AmbassadorDetailProps) {
  const navigate = useNavigate();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "dd MMMM yyyy", { locale: fr });
    } catch (error) {
      return "Date invalide";
    }
  };

  const handleCreateAccount = async () => {
    if (!ambassador.email) {
      toast.error("Cet ambassadeur n'a pas d'adresse email");
      return;
    }
    
    setIsCreatingAccount(true);
    try {
      const success = await createUserAccount(ambassador, "ambassador");
      if (success) {
        onRefresh();
        toast.success("Compte ambassadeur créé et emails de configuration envoyés");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleResetPassword = async () => {
    if (!ambassador.email) {
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

  const hasUserAccount = Boolean(ambassador.has_user_account);

  return (
    <>
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBackClick} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold flex-1">{ambassador.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations de l'ambassadeur</CardTitle>
            <CardDescription>Détails et coordonnées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Email</h3>
                <p>{ambassador.email || "Non spécifié"}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Téléphone</h3>
                <p>{ambassador.phone || "Non spécifié"}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Région</h3>
                <p>{ambassador.region || "Non spécifiée"}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Statut</h3>
                <Badge variant={ambassador.status === "active" ? "success" : "secondary"}>
                  {ambassador.status === "active" ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <div>
                <h3 className="font-medium mb-2">Date de création</h3>
                <p>{formatDate(ambassador.created_at)}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Dernière mise à jour</h3>
                <p>{formatDate(ambassador.updated_at)}</p>
              </div>
            </div>

            {ambassador.notes && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">Notes</h3>
                <p className="whitespace-pre-line bg-muted/20 p-4 rounded-md text-sm">
                  {ambassador.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compte utilisateur</CardTitle>
            <CardDescription>Accès au portail ambassadeur</CardDescription>
          </CardHeader>
          <CardContent>
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
                    {isCreatingAccount ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      "Créer un compte ambassadeur"
                    )}
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md">
                    Une adresse email est nécessaire pour créer un compte utilisateur.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
