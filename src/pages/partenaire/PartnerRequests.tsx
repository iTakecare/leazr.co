import React, { useEffect, useState } from 'react';
import { Link } from "react-router";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FilePlus2, FileText } from 'lucide-react';
import { useFinancingPartner } from '@/components/layout/FinancingPartnerLayout';
import { getMyRequests, PartnerRequestSummary } from '@/services/financingPartnerService';
import { getPartnerStatusInfo } from './partnerStatus';
import { formatCurrency } from '@/utils/formatters';

const PartnerRequests: React.FC = () => {
  const { basePrefix, partner } = useFinancingPartner();
  const [requests, setRequests] = useState<PartnerRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRequests()
      .then(setRequests)
      .catch((e) => {
        console.error(e);
        toast.error(`Erreur de chargement : ${e.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mes demandes de financement</h1>
            <p className="text-sm text-muted-foreground">{partner.name}</p>
          </div>
        </div>
        <Button asChild>
          <Link to={`${basePrefix}/new-request`}>
            <FilePlus2 className="h-4 w-4 mr-2" /> Nouvelle demande
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client final</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Mensualité</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Aucune demande — déposez votre première demande de financement.
                  </TableCell>
                </TableRow>
              ) : requests.map((r) => {
                const status = getPartnerStatusInfo(r.workflow_status);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link to={`${basePrefix}/requests/${r.id}`} className="font-medium text-primary hover:underline">
                        {r.client_name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatCurrency(r.amount)}</TableCell>
                    <TableCell>{formatCurrency(r.monthly_payment)}/mois</TableCell>
                    <TableCell>{r.duration} mois</TableCell>
                    <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('fr-BE')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerRequests;
