import { useState } from "react";
import { CreditNote } from "@/services/creditNoteService";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditNoteDetailDialog } from "./CreditNoteDetailDialog";

interface CreditNotesListProps {
  creditNotes: CreditNote[];
  loading: boolean;
}

export const CreditNotesList = ({ creditNotes, loading }: CreditNotesListProps) => {
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);

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
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreditNoteDetailDialog
        creditNote={selectedCreditNote}
        open={!!selectedCreditNote}
        onOpenChange={(open) => !open && setSelectedCreditNote(null)}
      />
    </>
  );
};
