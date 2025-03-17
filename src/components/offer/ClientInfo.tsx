
import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User } from "lucide-react";
import { Equipment, Leaser } from "@/types/equipment";

interface ClientInfoProps {
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  remarks: string;
  setRemarks: (remarks: string) => void;
  onOpenClientSelector: () => void;
  handleSaveOffer: () => void;
  isSubmitting: boolean;
  selectedLeaser: Leaser | null;
  equipmentList: Equipment[];
  hideSubmitButton?: boolean;
}

const ClientInfo: React.FC<ClientInfoProps> = ({
  clientId,
  clientName,
  clientEmail,
  clientCompany,
  remarks,
  setRemarks,
  onOpenClientSelector,
  handleSaveOffer,
  isSubmitting,
  selectedLeaser,
  equipmentList,
  hideSubmitButton = false,
}) => {
  const totalAmount = equipmentList.reduce(
    (sum, eq) => sum + eq.purchasePrice * eq.quantity,
    0
  );

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <h3 className="text-lg font-medium mb-4">Informations client</h3>
        
        <div className="space-y-4">
          <Button
            variant="outline"
            type="button"
            className="w-full flex items-center justify-center"
            onClick={onOpenClientSelector}
          >
            <User className="mr-2 h-4 w-4" />
            Sélectionner un client
          </Button>

          {clientName && (
            <div className="bg-muted/30 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <p className="font-medium">{clientName}</p>
                </div>
                {clientEmail && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{clientEmail}</p>
                  </div>
                )}
                {clientCompany && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Société</Label>
                    <p className="font-medium">{clientCompany}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarques</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Informations supplémentaires..."
              rows={3}
            />
          </div>

          <div className="bg-primary/5 p-4 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Financement total :</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span className="font-medium">Mensualité totale :</span>
              <span className="font-bold">{formatCurrency(equipmentList.reduce(
                (sum, eq) => sum + (eq.monthlyPayment || 0) * eq.quantity,
                0
              ))}</span>
            </div>
          </div>

          {!hideSubmitButton && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleSaveOffer}
              disabled={isSubmitting || !clientName || !clientEmail || equipmentList.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde en cours...
                </>
              ) : (
                "Enregistrer l'offre"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientInfo;
