import { useState } from "react";
import { CreditNote, deleteCreditNote } from "@/services/creditNoteService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Loader2, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditNoteDetailDialog } from "./CreditNoteDetailDialog";
import { toast } from "sonner";

interface CreditNotesListProps {
  creditNotes: CreditNote[];
  loading: boolean;
  onRefresh?: () => void;
}

export const CreditNotesList = ({ creditNotes, loading, onRefresh }: CreditNotesListProps) => {
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [creditNoteToDelete, setCreditNoteToDelete] = useState<CreditNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleDelete = async () => {
    if (!creditNoteToDelete) return;
    
    try {
      setIsDeleting(true);
      const success = await deleteCreditNote(creditNoteToDelete.id);
      if (success) {
        toast.success("Note de crédit supprimée");
        onRefresh?.();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setCreditNoteToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (creditNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-foreground">Aucune note de crédit</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Les notes de crédit créées apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numéro</TableHead>
            <TableHead>Facture liée</TableHead>
            <TableHead>Montant crédité</TableHead>
            <TableHead>Raison</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date d'émission</TableHead>
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creditNotes.map((creditNote) => (
            <TableRow 
              key={creditNote.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedCreditNote(creditNote)}
            >
              <TableCell className="font-medium">
                {creditNote.credit_note_number || '-'}
              </TableCell>
              <TableCell>
                {creditNote.invoice?.invoice_number || creditNote.invoice_id.substring(0, 8)}
              </TableCell>
              <TableCell className="text-red-600 font-medium">
                -{formatAmount(creditNote.amount)}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {creditNote.reason || '-'}
              </TableCell>
              <TableCell>
                {getStatusBadge(creditNote.status)}
              </TableCell>
              <TableCell>
                {creditNote.issued_at 
                  ? format(new Date(creditNote.issued_at), 'dd/MM/yyyy', { locale: fr })
                  : '-'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCreditNote(creditNote);
                    }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir le détail
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCreditNote(creditNote);
                    }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreditNoteToDelete(creditNote);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreditNoteDetailDialog
        creditNote={selectedCreditNote}
        open={!!selectedCreditNote}
        onOpenChange={(open) => !open && setSelectedCreditNote(null)}
        onRefresh={onRefresh}
      />

      <AlertDialog open={!!creditNoteToDelete} onOpenChange={(open) => !open && setCreditNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la note de crédit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La facture liée sera remise à son état "en attente" et le montant crédité sera annulé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};