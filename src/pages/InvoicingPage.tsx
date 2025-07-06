import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Calendar, Euro, Building2 } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { getCompanyInvoices, Invoice } from "@/services/invoiceService";
import { formatCurrency, formatDate } from "@/lib/utils";

const InvoicingPage = () => {
  const { companyId } = useMultiTenant();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        console.log('Chargement des factures, companyId:', companyId);
        // On n'a plus besoin de vérifier companyId, la fonction getCompanyInvoices le gère
        const data = await getCompanyInvoices(companyId);
        console.log('Factures chargées:', data);
        setInvoices(data);
      } catch (error) {
        console.error("Erreur lors du chargement des factures:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [companyId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Brouillon", variant: "secondary" as const },
      sent: { label: "Envoyée", variant: "default" as const },
      paid: { label: "Payée", variant: "default" as const },
      cancelled: { label: "Annulée", variant: "destructive" as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturation</h1>
          <p className="text-muted-foreground">
            Gérez vos factures de leasing automatisées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{invoices.length} facture(s)</span>
        </div>
      </div>

      <div className="grid gap-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune facture</h3>
                <p className="text-muted-foreground">
                  Les factures générées automatiquement apparaîtront ici.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = `/admin/invoicing/${invoice.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <span className="font-semibold">
                        {invoice.invoice_number || `FAC-${invoice.id.slice(0, 8)}`}
                      </span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {invoice.leaser_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(invoice.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-semibold">
                      <Euro className="h-4 w-4" />
                      {formatCurrency(invoice.amount)}
                    </div>
                    {invoice.due_date && (
                      <div className="text-xs text-muted-foreground">
                        Échéance: {formatDate(invoice.due_date)}
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/admin/invoicing/${invoice.id}`;
                      }}
                    >
                      Voir détails
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default InvoicingPage;