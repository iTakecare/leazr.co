import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Client } from "@/types/client";
import { Edit } from "lucide-react";
import UnifiedClientView from "@/components/clients/UnifiedClientView";

interface AmbassadorClientDetailDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const AmbassadorClientDetailDialog = ({
  client,
  open,
  onOpenChange,
  onEdit,
}: AmbassadorClientDetailDialogProps) => {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Détails du client</DialogTitle>
            <Button onClick={onEdit} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
        </DialogHeader>

        <UnifiedClientView 
          client={client} 
          onClientUpdate={(updatedClient) => {
            // Le client sera mis à jour via le parent
            onEdit(); // Déclenche une actualisation
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AmbassadorClientDetailDialog;