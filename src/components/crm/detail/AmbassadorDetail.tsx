
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { Mail, Phone, MapPin, User, UsersRound, ReceiptEuro, AlertCircle } from "lucide-react";
import { Ambassador } from "@/services/ambassadorService";

interface AmbassadorDetailProps {
  isOpen: boolean;
  onClose: () => void;
  ambassador: Ambassador | null;
  onEdit: () => void;
}

const AmbassadorDetail = ({
  isOpen,
  onClose,
  ambassador,
  onEdit,
}: AmbassadorDetailProps) => {
  if (!ambassador) {
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-2xl">{ambassador.name}</SheetTitle>
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
                <span>{ambassador.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{ambassador.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{ambassador.region}</span>
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
                <div className="text-xl font-bold">{ambassador.clientsCount}</div>
              </div>
              
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <ReceiptEuro className="h-5 w-5 text-primary" />
                  <div className="font-medium">Commissions totales</div>
                </div>
                <div className="text-xl font-bold">{formatCurrency(ambassador.commissionsTotal)}</div>
              </div>
              
              {ambassador.lastCommission > 0 && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <ReceiptEuro className="h-5 w-5 text-green-500" />
                    <div className="font-medium">Dernière commission</div>
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(ambassador.lastCommission)}</div>
                </div>
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
