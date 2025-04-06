import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  FileDown,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPartnerCommissions, updateCommissionStatus, PartnerCommission, calculateTotalCommissions } from "@/services/partnerCommissionService";

interface PartnerCommissionsTableProps {
  partnerId?: string;
  refreshTrigger?: number; // Added refreshTrigger prop
}

const PartnerCommissionsTable: React.FC<PartnerCommissionsTableProps> = ({ partnerId, refreshTrigger = 0 }) => {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ pending: 0, paid: 0, total: 0 });

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      if (!partnerId && !user) return;

      const partnerIdToUse = partnerId || user?.id;
      
      if (!partnerIdToUse) {
        toast.error("ID de partenaire introuvable");
        return;
      }

      const commissionsData = await getPartnerCommissions(partnerIdToUse);
      setCommissions(commissionsData);

      const totalsData = await calculateTotalCommissions(partnerIdToUse);
      setTotals(totalsData);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      toast.error("Erreur lors du chargement des commissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [partnerId, user, refreshTrigger]); // Added refreshTrigger to the dependency array

  const exportCommissions = () => {
    // Cette fonction exporterait les commissions en CSV/Excel
    toast.info("Fonctionnalité d'export en cours de développement");
  };

  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'paid' | 'cancelled') => {
    try {
      const updated = await updateCommissionStatus(id, newStatus);
      if (updated) {
        setCommissions(prev => 
          prev.map(comm => 
            comm.id === id ? { ...comm, status: newStatus } : comm
          )
        );
        
        // Mettre à jour les totaux
        fetchCommissions();
      }
    } catch (error) {
      console.error("Error updating commission status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Payée
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Annulée
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Commissions</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchCommissions} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={exportCommissions}>
              <FileDown className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(totals.pending)}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500 opacity-80" />
          </div>
          <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Payées</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.paid)}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
          </div>
          <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.total)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500 opacity-80" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Chargement des commissions...</p>
          </div>
        ) : commissions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Aucune commission trouvée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(commission.date), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {commission.clientName}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {commission.description || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(commission.amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(commission.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            •••
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {commission.status !== 'paid' && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(commission.id, 'paid')}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marquer comme payée
                            </DropdownMenuItem>
                          )}
                          {commission.status !== 'pending' && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(commission.id, 'pending')}
                              className="text-amber-600"
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Marquer comme en attente
                            </DropdownMenuItem>
                          )}
                          {commission.status !== 'cancelled' && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(commission.id, 'cancelled')}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Annuler
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PartnerCommissionsTable;
