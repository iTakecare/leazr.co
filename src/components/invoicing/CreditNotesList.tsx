import { CreditNote } from "@/services/creditNoteService";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface CreditNotesListProps {
  creditNotes: CreditNote[];
  loading: boolean;
}

export const CreditNotesList = ({ creditNotes, loading }: CreditNotesListProps) => {
  const navigate = useNavigate();

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Numéro</TableHead>
          <TableHead>Facture liée</TableHead>
          <TableHead>Montant crédité</TableHead>
          <TableHead>Raison</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date d'émission</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {creditNotes.map((creditNote) => (
          <TableRow key={creditNote.id}>
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
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/admin/invoicing/${creditNote.invoice_id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
