
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Loader2, TrendingUp } from "lucide-react";
import { getAmbassadorCommissions } from "@/services/ambassadorCommissionService";

interface AmbassadorCommissionsSectionProps {
  ambassadorId: string;
}

const AmbassadorCommissionsSection = ({ ambassadorId }: AmbassadorCommissionsSectionProps) => {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCommissions, setTotalCommissions] = useState(0);

  useEffect(() => {
    const loadCommissions = async () => {
      try {
        const commissionsData = await getAmbassadorCommissions(ambassadorId);
        setCommissions(commissionsData);
        
        // Calculer le total des commissions
        const total = commissionsData.reduce((sum, commission) => {
          return sum + (commission.amount || 0);
        }, 0);
        setTotalCommissions(total);
      } catch (error) {
        console.error("Error loading ambassador commissions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (ambassadorId) {
      loadCommissions();
    }
  }, [ambassadorId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Payée</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Commissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement des commissions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Commissions ({commissions.length})
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          Total: {totalCommissions.toLocaleString('fr-FR')}€
        </div>
      </CardHeader>
      <CardContent>
        {commissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune commission trouvée pour cet ambassadeur
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-medium">
                      {commission.clientName || 'Client non spécifié'}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-green-600">
                        {commission.amount.toLocaleString('fr-FR')}€
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(commission.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(commission.date).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground truncate max-w-48">
                        {commission.description || 'Aucune description'}
                      </div>
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

export default AmbassadorCommissionsSection;
