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

  // Show for active or extended contracts (to terminate)
  const canTerminate = contract.status === contractStatuses.ACTIVE || 
                       contract.status === contractStatuses.EXTENDED;

  // Show for completed contracts with past end date (to reactivate as extended)
  const canReactivate = contract.status === contractStatuses.COMPLETED &&
                        contract.contract_end_date &&
                        new Date(contract.contract_end_date) < new Date();

  if (!canTerminate && !canReactivate) {
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

  const handleReactivate = async () => {
    try {
      setIsUpdating(true);
      
      const success = await updateContractStatus(
        contract.id,
        contractStatuses.EXTENDED,
        contract.status,
        'Contrat réactivé en statut prolongé'
      );

      if (success) {
        toast.success("Contrat réactivé en statut prolongé");
        onUpdate();
      } else {
        toast.error("Erreur lors de la réactivation du contrat");
      }
    } catch (error) {
      console.error("Erreur lors de la réactivation:", error);
      toast.error("Erreur lors de la réactivation du contrat");
    } finally {
      setIsUpdating(false);
    }
  };

  const isExtended = contract.status === contractStatuses.EXTENDED;

  // Reactivation mode for completed contracts
  if (canReactivate) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            Réactiver le contrat
          </CardTitle>
          <CardDescription>
            Ce contrat est marqué comme terminé mais sa date de fin est dépassée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleReactivate}
            disabled={isUpdating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isUpdating ? "En cours..." : "Réactiver en statut Prolongé"}
          </Button>
          <p className="text-xs text-blue-600 mt-2">
            Le contrat sera marqué comme "Prolongé" au lieu de "Terminé".
          </p>
        </CardContent>
      </Card>
    );
  }

  // Termination mode for active/extended contracts
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
