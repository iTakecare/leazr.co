import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditNote } from "@/services/creditNoteService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Calendar, Euro, MessageSquare, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreditNoteDetailDialogProps {
  creditNote: CreditNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreditNoteDetailDialog = ({ creditNote, open, onOpenChange }: CreditNoteDetailDialogProps) => {
  const navigate = useNavigate();

  if (!creditNote) return null;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge className="bg-green-100 text-green-800">Appliquée</Badge>;
      case 'draft':
        return <Badge variant="outline">Brouillon</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewInvoice = () => {
    onOpenChange(false);
    navigate(`/admin/invoicing/${creditNote.invoice_id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Note de crédit {creditNote.credit_note_number || creditNote.id.slice(0, 8)}
          </DialogTitle>
          <DialogDescription>
            Détails de la note de crédit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Statut et montant */}
          <div className="flex items-center justify-between">
            {getStatusBadge(creditNote.status)}
            <span className="text-2xl font-bold text-red-600">
              -{formatAmount(creditNote.amount)}
            </span>
          </div>

          <Separator />

          {/* Facture liée */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Facture liée</label>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {creditNote.invoice?.invoice_number || creditNote.invoice_id.substring(0, 8)}
              </span>
              <Button variant="ghost" size="sm" onClick={handleViewInvoice}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            {creditNote.invoice?.leaser_name && (
              <p className="text-sm text-muted-foreground">
                Bailleur: {creditNote.invoice.leaser_name}
              </p>
            )}
          </div>

          <Separator />

          {/* Raison */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Raison
            </label>
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm whitespace-pre-wrap">
                {creditNote.reason || "Aucune raison spécifiée"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Date d'émission
              </label>
              <p className="font-medium">
                {creditNote.issued_at 
                  ? format(new Date(creditNote.issued_at), 'dd MMMM yyyy', { locale: fr })
                  : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Créée le</label>
              <p className="font-medium">
                {format(new Date(creditNote.created_at), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {/* Montant original de la facture */}
          {creditNote.invoice?.amount && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Montant original de la facture</span>
                <span className="font-medium">{formatAmount(creditNote.invoice.amount)}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
