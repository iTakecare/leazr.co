
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  DollarSign
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";

const PartnerCommissionsTable = () => {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // For now, we'll use the offers table to calculate commissions
      // In a full implementation, we'd have a dedicated commissions table
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          created_at,
          client_name,
          equipment_description,
          amount,
          monthly_payment,
          status,
          commission
        `)
        .eq('user_id', user.id)
        .eq('type', 'partner_offer')
        .not('commission', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform offers into commission records
      const commissionRecords = (data || []).map(offer => ({
        id: offer.id,
        date: offer.created_at,
        client: offer.client_name,
        equipment: offer.equipment_description,
        amount: offer.amount,
        commission: offer.commission,
        status: offer.status === 'accepted' ? 'En attente' : 'Provisoire',
        isPaid: false // In a full implementation, track payment status
      }));
      
      setCommissions(commissionRecords);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      toast.error("Erreur lors du chargement des commissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [user]);

  const exportCommissions = () => {
    // This would export commissions to Excel/CSV
    toast.info("Export des commissions...");
  };

  return (
    <div className="bg-white rounded-md border">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-medium">Mes commissions</h3>
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
                <TableHead>Matériel</TableHead>
                <TableHead className="text-right">Montant offre</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(item.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {item.client}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {item.equipment?.substring(0, 30)}
                    {item.equipment?.length > 30 ? '...' : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.amount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.commission)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isPaid ? "success" : "outline"} className={
                      item.isPaid 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }>
                      {item.isPaid ? "Payée" : item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default PartnerCommissionsTable;
