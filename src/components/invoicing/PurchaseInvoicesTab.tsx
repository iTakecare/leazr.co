import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShoppingCart, Search, Eye, MoreHorizontal, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface PurchaseInvoicesTabProps {
  companyId: string | null;
}

const PurchaseInvoicesTab: React.FC<PurchaseInvoicesTabProps> = ({ companyId }) => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (companyId) fetchPurchaseInvoices();
  }, [companyId]);

  const fetchPurchaseInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId!)
        .eq('invoice_type', 'purchase')
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching purchase invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = invoices;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(lower) ||
        inv.leaser_name?.toLowerCase().includes(lower) ||
        inv.billing_data?.billit_supplier_name?.toLowerCase().includes(lower)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(inv => inv.status === statusFilter);
    }

    return result;
  }, [invoices, searchTerm, statusFilter]);

  const counts = useMemo(() => ({
    all: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
  }), [invoices]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      draft: { label: "Brouillon", className: "" },
      sent: { label: "Envoyée", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100" },
      paid: { label: "Payée", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
    };
    const c = config[status] || { label: status, className: "" };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  return (
    <>
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="all">
            Toutes <Badge variant="outline" className="ml-1 text-xs">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="draft">
            Brouillons {counts.draft > 0 && <Badge variant="outline" className="ml-1 text-xs">{counts.draft}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Reçues {counts.sent > 0 && <Badge variant="outline" className="ml-1 text-xs">{counts.sent}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="paid">
            Payées {counts.paid > 0 && <Badge variant="outline" className="ml-1 text-xs">{counts.paid}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une facture d'achat..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Factures d'achat {filtered.length > 0 && `(${filtered.length})`}
          </CardTitle>
          <CardDescription>
            Factures liées à vos ventes directes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto" />
              <p className="mt-4 text-muted-foreground">Chargement...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune facture d'achat</h3>
              <p className="text-muted-foreground">
                Importez vos factures d'achat depuis les paramètres Billit.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Montant HTVA</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Commande liée</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(invoice => {
                  const hasMatch = !!invoice.billing_data?.matched_equipment_id;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number || `PUR-${invoice.id.slice(0, 8)}`}
                      </TableCell>
                      <TableCell>
                        {invoice.billing_data?.billit_supplier_name || invoice.leaser_name}
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        {hasMatch ? (
                          <Badge variant="outline" className="border-primary text-primary">
                            <Package className="h-3 w-3 mr-1" />
                            Liée
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Non liée</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoice_date || invoice.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/invoicing/${invoice.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir le détail
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default PurchaseInvoicesTab;
