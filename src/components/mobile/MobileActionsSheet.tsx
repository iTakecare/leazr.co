import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  Trash2,
  Ban,
  RefreshCw,
  Calendar,
  Link2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface MobileActionsSheetProps {
  open: boolean;
  onClose: () => void;
  offerId?: string;
  onDelete?: () => void;
  onNoFollowUp?: () => void;
  onReactivate?: () => void;
  onEditDates?: () => void;
  onViewPublicLink?: () => void;
  showReactivate?: boolean;
}

const MobileActionsSheet: React.FC<MobileActionsSheetProps> = ({
  open,
  onClose,
  offerId,
  onDelete,
  onNoFollowUp,
  onReactivate,
  onEditDates,
  onViewPublicLink,
  showReactivate = false,
}) => {
  const handleCopyLink = () => {
    if (offerId) {
      const link = `${window.location.origin}/client/offer/${offerId}`;
      navigator.clipboard.writeText(link);
      toast.success("Lien copié dans le presse-papier");
      onClose();
    }
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Actions supplémentaires</DrawerTitle>
          <DrawerDescription>
            Gérer cette offre
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-2">
          {/* Lien public */}
          {onViewPublicLink && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={() => {
                onViewPublicLink();
                onClose();
              }}
            >
              <ExternalLink className="h-5 w-5 mr-3" />
              Voir le lien public
            </Button>
          )}

          {/* Copier le lien */}
          {offerId && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={handleCopyLink}
            >
              <Copy className="h-5 w-5 mr-3" />
              Copier le lien client
            </Button>
          )}

          {/* Modifier les dates */}
          {onEditDates && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={() => {
                onEditDates();
                onClose();
              }}
            >
              <Calendar className="h-5 w-5 mr-3" />
              Modifier les dates
            </Button>
          )}

          <Separator className="my-2" />

          {/* Réactiver - si applicable */}
          {showReactivate && onReactivate && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-primary"
              onClick={() => {
                onReactivate();
                onClose();
              }}
            >
              <RefreshCw className="h-5 w-5 mr-3" />
              Réactiver l'offre
            </Button>
          )}

          {/* Sans suite */}
          {onNoFollowUp && !showReactivate && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-muted-foreground"
              onClick={() => {
                onNoFollowUp();
                onClose();
              }}
            >
              <Ban className="h-5 w-5 mr-3" />
              Classer sans suite
            </Button>
          )}

          <Separator className="my-2" />

          {/* Supprimer */}
          {onDelete && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-destructive hover:text-destructive"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              <Trash2 className="h-5 w-5 mr-3" />
              Supprimer l'offre
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileActionsSheet;
