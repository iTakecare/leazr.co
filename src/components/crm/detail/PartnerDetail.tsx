
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
import { Mail, Phone, Building2, User, BadgePercent, KeyRound, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { resetPassword } from "@/services/accountService";
import { adminSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PartnerDetailProps {
  isOpen: boolean;
  onClose: () => void;
  partner: any;
  onEdit: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  isResettingPassword?: boolean;
  isCreatingAccount?: boolean;
}

const PartnerDetail = ({
  isOpen,
  onClose,
  partner,
  onEdit,
  onResetPassword,
  onCreateAccount,
  isResettingPassword = false,
  isCreatingAccount = false,
}: PartnerDetailProps) => {
  const [refreshedPartner, setRefreshedPartner] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [refreshCounter, setRefreshCounter] = React.useState(0);

  // Fonction de rafraîchissement des données
  const fetchFreshPartnerData = async () => {
    if (!partner?.id) return;
    
    setIsLoading(true);
    try {
      console.log("Récupération des données fraîches du partenaire avec ID:", partner.id);
      
      // Utiliser adminSupabase pour garantir des données fraîches sans mise en cache
      const { data, error } = await adminSupabase
        .from('partners')
        .select('*')
        .eq('id', partner.id)
        .single();
      
      if (error) {
        console.error("Erreur lors de la récupération des données du partenaire:", error);
        toast.error("Erreur lors du chargement des données du partenaire");
        return;
      }
      
      console.log("Données fraîches du partenaire depuis la base de données:", data);
      console.log("Statut du compte utilisateur:", {
        has_user_account: data.has_user_account,
        user_account_created_at: data.user_account_created_at
      });
      
      setRefreshedPartner(data);
    } catch (err) {
      console.error("Exception lors de la récupération des données du partenaire:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Rafraîchir les données quand le partner change, le modal s'ouvre, ou après création de compte
  useEffect(() => {
    if (isOpen && partner?.id) {
      fetchFreshPartnerData();
    }
  }, [isOpen, partner?.id, refreshCounter, isCreatingAccount]);
  
  // Rafraîchir les données après un délai suivant la création de compte
  useEffect(() => {
    if (!isCreatingAccount && partner?.id) {
      const timer = setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isCreatingAccount]);

  // Utiliser les données rafraîchies si disponibles, sinon utiliser les données originales
  const currentPartner = refreshedPartner || partner;

  if (!currentPartner) return null;

  // S'assurer d'utiliser une valeur booléenne
  // Conversion explicite en booléen pour éviter les problèmes de type
  const hasUserAccount = Boolean(refreshedPartner?.has_user_account);
  
  console.log("PartnerDetail - Statut du compte après traitement:", { 
    hasUserAccount,
    has_user_account_raw: currentPartner.has_user_account,
    user_account_created_at: currentPartner.user_account_created_at,
    isRefreshedData: !!refreshedPartner
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-2xl">{currentPartner.name}</SheetTitle>
          <SheetDescription>
            Détails du partenaire
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Informations générales</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{currentPartner.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{currentPartner.contactName || currentPartner.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currentPartner.type}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Informations de contact</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{currentPartner.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{currentPartner.phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Performance</h3>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-primary" />
                <div className="font-medium">Commissions totales</div>
              </div>
              <div className="text-xl font-bold">{formatCurrency(currentPartner.commissionsTotal || currentPartner.commissions_total || 0)}</div>
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
                    <span className="text-amber-700 text-sm">Ce partenaire n'a pas encore de compte utilisateur</span>
                  </div>
                  <Button 
                    variant="default" 
                    className="w-full flex gap-2 items-center"
                    onClick={onCreateAccount}
                    disabled={!currentPartner.email || isCreatingAccount}
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
              Modifier le partenaire
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PartnerDetail;
