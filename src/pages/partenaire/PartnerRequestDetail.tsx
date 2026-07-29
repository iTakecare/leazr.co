import React, { useEffect, useState } from 'react';
import { Link, useParams } from "react-router";
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, FileText } from 'lucide-react';
import { useFinancingPartner } from '@/components/layout/FinancingPartnerLayout';
import { getMyRequestDetail } from '@/services/financingPartnerService';
import { getPartnerStatusInfo } from './partnerStatus';
import { formatCurrency } from '@/utils/formatters';

const PartnerRequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { basePrefix } = useFinancingPartner();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getMyRequestDetail>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getMyRequestDetail(id)
      .then(setDetail)
      .catch((e) => toast.error(`Erreur : ${e.message}`))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!detail?.offer) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Demande introuvable.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to={`${basePrefix}/requests`}><ArrowLeft className="h-4 w-4 mr-2" />Retour</Link>
        </Button>
      </div>
    );
  }

  const { offer, equipment } = detail;
  const status = getPartnerStatusInfo(offer.workflow_status);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`${basePrefix}/requests`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{offer.client_name}</h1>
            <p className="text-sm text-muted-foreground">
              Demande du {new Date(offer.created_at).toLocaleDateString('fr-BE')}
            </p>
          </div>
        </div>
        <Badge variant={status.variant} className="text-sm px-3 py-1">{status.label}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Montant financé</p>
            <p className="text-2xl font-bold">{formatCurrency(offer.amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Mensualité</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(offer.monthly_payment)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Durée</p>
            <p className="text-2xl font-bold">{offer.duration} mois</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Équipements</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((eq: any) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-medium">{eq.title}</TableCell>
                  <TableCell className="text-right">{formatCurrency(eq.purchase_price)}</TableCell>
                  <TableCell className="text-right">{eq.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(eq.purchase_price * eq.quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {offer.remarks && (
        <Card>
          <CardHeader><CardTitle className="text-base">Remarques</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{offer.remarks}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerRequestDetail;
