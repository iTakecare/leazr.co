
import React, { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { Mail, Phone, MapPin, User, UsersRound, ReceiptEuro, AlertCircle, KeyRound, UserPlus, Loader2 } from "lucide-react";
import { Ambassador } from "@/services/ambassadorService";
import { adminSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AmbassadorDetailProps {
  isOpen: boolean;
  onClose: () => void;
  ambassador: Ambassador | null;
  onEdit: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  isResettingPassword?: boolean;
  isCreatingAccount?: boolean;
}

const AmbassadorDetail = ({
  isOpen,
  onClose,
  ambassador,
  onEdit,
  onResetPassword,
  onCreateAccount,
  isResettingPassword = false,
  isCreatingAccount = false,
}: AmbassadorDetailProps) => {
  const [refreshedAmbassador, setRefreshedAmbassador] = React.useState<Ambassador | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [refreshCounter, setRefreshCounter] = React.useState(0);

  // Fonction de rafraîchissement des données
  const fetchFreshAmbassadorData = async () => {
    if (!ambassador?.id) return;
    
    setIsLoading(true);
    try {
      console.log("Récupération des données fraîches de l'ambassadeur avec ID:", ambassador.id);
      
      // Utiliser adminSupabase pour garantir des données fraîches sans mise en cache
      const { data, error } = await adminSupabase
        .from('ambassadors')
        .select('*')
        .eq('id', ambassador.id)
        .single();
      
      if (error) {
        console.error("Erreur lors de la récupération des données de l'ambassadeur:", error);
        toast.error("Erreur lors du chargement des données de l'ambassadeur");
        return;
      }
      
      console.log("Données fraîches de l'ambassadeur depuis la base de données:", data);
      console.log("Statut du compte utilisateur:", {
        has_user_account: data.has_user_account,
        user_account_created_at: data.user_account_created_at
      });
      
      setRefreshedAmbassador(data);
    } catch (err) {
      console.error("Exception lors de la récupération des données de l'ambassadeur:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Rafraîchir les données quand l'ambassadeur change, le modal s'ouvre, ou après création de compte
  useEffect(() => {
    if (isOpen && ambassador?.id) {
      fetchFreshAmbassadorData();
    }
  }, [isOpen, ambassador?.id, refreshCounter, isCreatingAccount]);
  
  // Rafraîchir les données après un délai suivant la création de compte
  useEffect(() => {
    if (!isCreatingAccount && ambassador?.id) {
      const timer = setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isCreatingAccount]);

  // Utiliser les données rafraîchies si disponibles, sinon utiliser les données originales
  const currentAmbassador = refreshedAmbassador || ambassador;

  if (!currentAmbassador) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-2xl">Ambassadeur introuvable</SheetTitle>
            <SheetDescription>
              L'ambassadeur demandé n'existe pas ou n'est plus disponible.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <p className="text-muted-foreground">Désolé, nous n'avons pas pu trouver cet ambassadeur.</p>
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // S'assurer d'utiliser une valeur booléenne
  // Conversion explicite en booléen pour éviter les problèmes de type
  const hasUserAccount = Boolean(refreshedAmbassador?.has_user_account);
  
  console.log("AmbassadorDetail - Statut du compte après traitement:", { 
    hasUserAccount,
    has_user_account_raw: currentAmbassador.has_user_account,
    user_account_created_at: currentAmbassador.user_account_created_at,
    isRefreshedData: !!refreshedAmbassador
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-2xl">{currentAmbassador.name}</SheetTitle>
          <SheetDescription>
            Détails de l'ambassadeur
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Informations de contact</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{currentAmbassador.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{currentAmbassador.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{currentAmbassador.region}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Performance</h3>
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-5 w-5 text-primary" />
                  <div className="font-medium">Clients</div>
                </div>
                <div className="text-xl font-bold">{currentAmbassador.clientsCount}</div>
              </div>
              
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <ReceiptEuro className="h-5 w-5 text-primary" />
                  <div className="font-medium">Commissions totales</div>
                </div>
                <div className="text-xl font-bold">{formatCurrency(currentAmbassador.commissionsTotal)}</div>
              </div>
              
              {currentAmbassador.lastCommission > 0 && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <ReceiptEuro className="h-5 w-5 text-green-500" />
                    <div className="font-medium">Dernière commission</div>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(currentAmbassador.lastCommission)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Accès utilisateur</h3>
            <div className="bg-muted/20 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Status du compte</span>
                <Badge 
                  variant={hasUserAccount ? "default" : "outline"} 
                  className={
                    hasUserAccount ? "bg-green-100 text-green-800 border-green-300" : ""
                  }
                >
                  {hasUserAccount ? "Actif" : "Non créé"}
                </Badge>
              </div>
              
              {isLoading && (
                <div className="p-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des données...
                </div>
              )}
              
              {!isLoading && hasUserAccount ? (
                <Button 
                  variant="outline" 
                  className="w-full flex gap-2 items-center"
                  onClick={onResetPassword}
                  disabled={isResettingPassword}
                >
                  <KeyRound className="h-4 w-4" />
                  {isResettingPassword ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
                </Button>
              ) : !isLoading && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="text-amber-700 text-sm">Cet ambassadeur n'a pas encore de compte utilisateur</span>
                  </div>
                  <Button 
                    variant="default" 
                    className="w-full flex gap-2 items-center"
                    onClick={onCreateAccount}
                    disabled={!currentAmbassador.email || isCreatingAccount}
                  >
                    <UserPlus className="h-4 w-4" />
                    {isCreatingAccount ? "Création en cours..." : "Créer un compte"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={onEdit}>
              Modifier l'ambassadeur
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AmbassadorDetail;
