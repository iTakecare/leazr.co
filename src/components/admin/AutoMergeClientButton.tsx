import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Merge, AlertTriangle, Loader2 } from "lucide-react";
import { Client } from "@/types/client";
import { prepareMergeOperations, bulkMergeClients, MergeOperation } from "@/services/clientMergeService";
import { toast } from "sonner";

interface AutoMergeClientButtonProps {
  duplicateGroups: Array<{ clients: Client[]; reason: string; confidence: number }>;
  onMergeComplete: () => void;
}

const AutoMergeClientButton = ({ duplicateGroups, onMergeComplete }: AutoMergeClientButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOperations, setSelectedOperations] = useState<Set<number>>(new Set());
  const [operations, setOperations] = useState<MergeOperation[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const handleOpenDialog = () => {
    // Préparer les opérations de fusion
    const mergeOps = prepareMergeOperations(duplicateGroups);
    setOperations(mergeOps);
    
    // Sélectionner toutes les opérations par défaut
    setSelectedOperations(new Set(mergeOps.map((_, index) => index)));
    
    setShowDialog(true);
  };

  const toggleOperation = (index: number) => {
    const newSelected = new Set(selectedOperations);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedOperations(newSelected);
  };

  const handleConfirmMerge = async () => {
    if (selectedOperations.size === 0) {
      toast.error("Veuillez sélectionner au moins une fusion");
      return;
    }

    setIsMerging(true);

    try {
      const selectedOps = operations.filter((_, index) => selectedOperations.has(index));
      const result = await bulkMergeClients(selectedOps);

      if (result.success > 0) {
        toast.success(`${result.success} client(s) fusionné(s) avec succès`);
        onMergeComplete();
        setShowDialog(false);
      }

      if (result.failed > 0) {
        toast.error(`${result.failed} fusion(s) échouée(s)`);
      }
    } catch (error) {
      console.error("Erreur lors de la fusion en masse:", error);
      toast.error("Erreur lors de la fusion");
    } finally {
      setIsMerging(false);
    }
  };

  if (duplicateGroups.length === 0) {
    return null;
  }

  return (
    <>
      <Button onClick={handleOpenDialog} className="gap-2">
        <Merge className="h-4 w-4" />
        Fusionner automatiquement ({duplicateGroups.length})
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Fusion automatique des doublons
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les fusions à effectuer. Les clients sources seront fusionnés dans les clients cibles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {operations.map((operation, index) => {
              const group = duplicateGroups.find(g => 
                g.clients.some(c => c.id === operation.sourceId) && 
                g.clients.some(c => c.id === operation.targetId)
              );
              
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <Checkbox
                    checked={selectedOperations.has(index)}
                    onCheckedChange={() => toggleOperation(index)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={group && group.confidence >= 90 ? "default" : "secondary"}>
                        {group?.confidence || 0}% confiance
                      </Badge>
                      {group && group.confidence >= 90 && (
                        <span className="text-xs text-muted-foreground">Doublon certain</span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Source:</span>
                        <span className="font-medium">{operation.sourceName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-primary">
                        <span className="text-muted-foreground">→ Cible:</span>
                        <span className="font-medium">{operation.targetName}</span>
                      </div>
                    </div>
                    
                    {group && (
                      <div className="text-xs text-muted-foreground">
                        {group.reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-xs text-warning">
              <strong>Attention :</strong> Cette opération est irréversible. Les clients sources seront marqués comme doublons
              et leurs offres/contrats seront transférés vers les clients cibles.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isMerging}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmMerge}
              disabled={selectedOperations.size === 0 || isMerging}
              className="gap-2"
            >
              {isMerging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fusion en cours...
                </>
              ) : (
                <>
                  <Merge className="h-4 w-4" />
                  Fusionner {selectedOperations.size} client(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AutoMergeClientButton;
