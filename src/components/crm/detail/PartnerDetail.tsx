
import React from "react";
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
import { Mail, Phone, Building2, User, BadgePercent, KeyRound, UserPlus } from "lucide-react";
import { resetPassword } from "@/services/accountService";

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
  if (!partner) return null;

  const hasUserAccount = Boolean(partner.has_user_account);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-2xl">{partner.name}</SheetTitle>
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
                <span>{partner.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{partner.contactName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{partner.type}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Informations de contact</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{partner.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{partner.phone}</span>
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
              <div className="text-xl font-bold">{formatCurrency(partner.commissionsTotal)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Accès utilisateur</h3>
            <div className="bg-muted/20 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Status du compte</span>
                <Badge variant={hasUserAccount ? "default" : "outline"} className={
                  hasUserAccount ? "bg-green-100 text-green-800 border-green-300" : ""
                }>
                  {hasUserAccount ? "Actif" : "Non créé"}
                </Badge>
              </div>
              
              {hasUserAccount ? (
                <Button 
                  variant="outline" 
                  className="w-full flex gap-2 items-center"
                  onClick={onResetPassword}
                  disabled={isResettingPassword}
                >
                  <KeyRound className="h-4 w-4" />
                  {isResettingPassword ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  className="w-full flex gap-2 items-center"
                  onClick={onCreateAccount}
                  disabled={!partner.email || isCreatingAccount}
                >
                  <UserPlus className="h-4 w-4" />
                  {isCreatingAccount ? "Création en cours..." : "Créer un compte"}
                </Button>
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
