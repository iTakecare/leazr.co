
import React, { useState, useMemo } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, FileText, Plus, Search, Eye, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import InvoiceSortFilter, { InvoiceSortBy } from "@/components/invoicing/InvoiceSortFilter";

const InvoicingPage = () => {
  const navigate = useNavigate();
  const { invoices, loading } = useInvoices();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<InvoiceSortBy>('invoice_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = searchTerm.toLowerCase();
    const clientCompany = invoice.billing_data?.client_data?.company 
      || invoice.billing_data?.contract_data?.client_company || "";
    
    return invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      invoice.leaser_name.toLowerCase().includes(searchLower) ||
      invoice.billing_data?.contract_data?.client_name?.toLowerCase().includes(searchLower) ||
      clientCompany.toLowerCase().includes(searchLower);
  });

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'invoice_date':
          const dateA = new Date(a.invoice_date || a.created_at).getTime();
          const dateB = new Date(b.invoice_date || b.created_at).getTime();
          comparison = dateA - dateB;
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'client':
          const clientA = a.billing_data?.contract_data?.client_name || '';
          const clientB = b.billing_data?.contract_data?.client_name || '';
          comparison = clientA.localeCompare(clientB, 'fr');
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'invoice_number':
          const numA = a.invoice_number || '';
          const numB = b.invoice_number || '';
          comparison = numA.localeCompare(numB, 'fr', { numeric: true });
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredInvoices, sortBy, sortOrder]);

  const getStatusBadge = (invoice: typeof invoices[0]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Vérifier si la facture est en retard de paiement
    if (invoice.due_date && !invoice.paid_at) {
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800">
              Attente paiement
            </Badge>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">J-{diffDays}</span>
          </div>
        );
      }
    }
    
    const statusConfig = {
      draft: { label: "Brouillon", variant: "secondary" as const },
      sent: { label: "Envoyée", variant: "default" as const },
      paid: { label: "Payée", variant: "default" as const },
      overdue: { label: "En retard", variant: "destructive" as const }
    };
    
    const config = statusConfig[invoice.status as keyof typeof statusConfig] || { label: invoice.status, variant: "default" as const };
    return <Badge variant={config.variant} className={invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''}>{config.label}</Badge>;
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/admin/invoicing/${invoiceId}`);
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Facturation</h1>
                <p className="text-muted-foreground">Gérez vos factures et paiements</p>
              </div>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle facture
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une facture..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <InvoiceSortFilter
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortByChange={setSortBy}
              onSortOrderChange={setSortOrder}
            />
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Factures {filteredInvoices.length > 0 && `(${filteredInvoices.length})`}
                </CardTitle>
                <CardDescription>
                  Consultez et gérez vos factures
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Chargement des factures...</p>
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-8">
                    <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? "Aucune facture trouvée" : "Aucune facture"}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm 
                        ? "Aucune facture ne correspond à votre recherche."
                        : "Vous n'avez pas encore de factures. Elles apparaîtront ici une fois générées depuis les contrats."
                      }
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numéro</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Société</TableHead>
                        <TableHead>Bailleur / Destinataire</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date de facture</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedInvoices.map((invoice) => {
                        const isPurchase = invoice.invoice_type === 'purchase' || invoice.billing_data?.offer_data?.is_purchase;
                        const clientName = isPurchase 
                          ? (invoice.billing_data?.client_data?.name || invoice.billing_data?.contract_data?.client_name || "N/A")
                          : (invoice.billing_data?.contract_data?.client_name || "N/A");
                        const clientCompany = invoice.billing_data?.client_data?.company 
                          || invoice.billing_data?.contract_data?.client_company || "";
                        const recipientName = isPurchase ? '' : invoice.leaser_name;
                        
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isPurchase ? "outline" : "secondary"} className={isPurchase ? "border-emerald-500 text-emerald-600" : ""}>
                                {isPurchase ? "Achat" : "Leasing"}
                              </Badge>
                            </TableCell>
                            <TableCell>{clientName}</TableCell>
                            <TableCell className="text-muted-foreground">{clientCompany || "-"}</TableCell>
                            <TableCell>{recipientName}</TableCell>
                            <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell>{getStatusBadge(invoice)}</TableCell>
                            <TableCell>{formatDate(invoice.invoice_date || invoice.created_at)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewInvoice(invoice.id)}>
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
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default InvoicingPage;
