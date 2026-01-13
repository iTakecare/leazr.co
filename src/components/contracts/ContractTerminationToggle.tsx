import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Contract, contractStatuses, updateContractStatus } from "@/services/contractService";
import { toast } from "sonner";

interface ContractTerminationToggleProps {
  contract: Contract;
  onUpdate: () => void;
}

const ContractTerminationToggle: React.FC<ContractTerminationToggleProps> = ({ 
  contract, 
  onUpdate 
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Only show for active or extended contracts
  const canTerminate = contract.status === contractStatuses.ACTIVE || 
                       contract.status === contractStatuses.EXTENDED;

  if (!canTerminate) {
    return null;
  }

  const handleTerminate = async () => {
    try {
      setIsUpdating(true);
      
      const success = await updateContractStatus(
        contract.id,
        contractStatuses.COMPLETED,
        contract.status,
        reason || 'Contrat terminé manuellement par l\'administrateur'
      );

      if (success) {
        toast.success("Contrat marqué comme terminé");
        setDialogOpen(false);
        setReason('');
        onUpdate();
      } else {
        toast.error("Erreur lors de la terminaison du contrat");
      }
    } catch (error) {
      console.error("Erreur lors de la terminaison:", error);
      toast.error("Erreur lors de la terminaison du contrat");
    } finally {
      setIsUpdating(false);
    }
  };

  const isExtended = contract.status === contractStatuses.EXTENDED;

  return (
    <>
      <Card className={isExtended ? "border-amber-200 bg-amber-50/50" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isExtended ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            )}
            Terminer le contrat
          </CardTitle>
          <CardDescription>
            {isExtended 
              ? "Ce contrat est prolongé au-delà de sa date de fin prévue." 
              : "Marquer ce contrat comme terminé."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="terminate-contract" className="text-sm">
              Marquer comme terminé
            </Label>
            <Switch
              id="terminate-contract"
              checked={false}
              onCheckedChange={() => setDialogOpen(true)}
            />
          </div>
          {isExtended && (
            <p className="text-xs text-amber-600 mt-2">
              Le contrat a dépassé sa date de fin prévue 
              {contract.contract_end_date && ` (${new Date(contract.contract_end_date).toLocaleDateString('fr-FR')})`}.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmer la terminaison du contrat
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir terminer ce contrat ? Cette action marquera le contrat comme "Terminé".
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="termination-reason" className="text-sm font-medium">
              Raison de la terminaison (optionnel)
            </Label>
            <Textarea
              id="termination-reason"
              placeholder="Ex: Fin de contrat normale, équipement retourné..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={isUpdating}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleTerminate}
              disabled={isUpdating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isUpdating ? "En cours..." : "Confirmer la terminaison"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContractTerminationToggle;
