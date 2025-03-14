
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ReceiptEuro, User } from "lucide-react";
import { formatCurrency, formatDateToFrench } from "@/utils/formatters";

interface CommissionsViewProps {
  isOpen: boolean;
  onClose: () => void;
  owner: { id: string; name: string; type: "ambassador" | "partner" };
  commissions: Array<{
    id: string;
    amount: number;
    status: "pending" | "paid";
    client?: string;
    date: string;
    description?: string;
  }>;
}

const CommissionsView = ({
  isOpen,
  onClose,
  owner,
  commissions,
}: CommissionsViewProps) => {
  const title = owner.type === "ambassador" 
    ? `Commissions de ${owner.name}` 
    : `Commissions du partenaire ${owner.name}`;
    
  const totalCommissions = commissions.reduce((sum, item) => sum + item.amount, 0);
  const pendingCommissions = commissions
    .filter(c => c.status === "pending")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pb-6">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Historique des commissions
          </SheetDescription>
        </SheetHeader>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="flex flex-col rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Total des commissions</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(totalCommissions)}</span>
          </div>
          <div className="flex flex-col rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Commissions en attente</span>
            <span className="text-lg font-bold text-amber-500">{formatCurrency(pendingCommissions)}</span>
          </div>
        </div>

        {commissions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>
                    {formatDateToFrench(new Date(commission.date))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {commission.client || "Client non spécifié"}
                    </div>
                    {commission.description && (
                      <div className="text-xs text-muted-foreground">
                        {commission.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {formatCurrency(commission.amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'} className={
                      commission.status === 'paid' 
                        ? "bg-green-100 text-green-800 hover:bg-green-100" 
                        : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                    }>
                      {commission.status === 'paid' ? 'Payée' : 'En attente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <ReceiptEuro className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-muted-foreground mt-2">Aucune commission enregistrée</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CommissionsView;
