import React, { useState, useMemo, useEffect } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, FileText, Plus, Search, Eye, MoreHorizontal, Receipt, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/SortableTableHead";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useInvoices } from "@/hooks/useInvoices";
import { useCreditNotes } from "@/hooks/useCreditNotes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import InvoiceSortFilter, { InvoiceSortBy } from "@/components/invoicing/InvoiceSortFilter";
import { CreditNotesList } from "@/components/invoicing/CreditNotesList";
import { NewInvoiceDialog } from "@/components/invoicing/NewInvoiceDialog";
import { InvoiceDateRangeFilter } from "@/components/invoicing/InvoiceDateRangeFilter";
import { AccountingReportTab } from "@/components/invoicing/AccountingReportTab";

const InvoicingPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { invoices, loading, fetchInvoices } = useInvoices();
  const { creditNotes, loading: creditNotesLoading, fetchCreditNotes } = useCreditNotes();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<InvoiceSortBy>('invoice_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Gérer l'onglet actif via URL
  const tabFromUrl = searchParams.get('tab');
  const validTabs = ['invoices', 'credit-notes', 'accounting-report'];
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(tabFromUrl || '') ? tabFromUrl! : 'invoices'
  );
  
  // Sous-filtre pour les statuts de factures
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");

  // Synchroniser l'onglet avec l'URL
  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl) && activeTab !== tabFromUrl) {
      setActiveTab(tabFromUrl);
      if (tabFromUrl === 'credit-notes') {
        fetchCreditNotes();
      }
    }
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'credit-notes') {
      setSearchParams({ tab: 'credit-notes' });
      fetchCreditNotes();
    } else if (value === 'accounting-report') {
      setSearchParams({ tab: 'accounting-report' });
    } else {
      setSearchParams({});
    }
  };

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter(invoice => {
      const searchLower = searchTerm.toLowerCase();
      const clientCompany = invoice.billing_data?.client_data?.company 
        || invoice.billing_data?.contract_data?.client_company || "";
      
      const matchesSearch = invoice.invoice_number?.toLowerCase().includes(searchLower) ||
        invoice.leaser_name.toLowerCase().includes(searchLower) ||
        invoice.billing_data?.contract_data?.client_name?.toLowerCase().includes(searchLower) ||
        clientCompany.toLowerCase().includes(searchLower);

      // Filtre par plage de dates
      if (startDate || endDate) {
        const invoiceDate = new Date(invoice.invoice_date || invoice.created_at);
        invoiceDate.setHours(0, 0, 0, 0);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (invoiceDate < start) return false;
        }
        
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (invoiceDate > end) return false;
        }
      }

      return matchesSearch;
    });

    // Filtrer par statut de facture
    const isCredited = (inv: typeof invoices[0]) => 
      inv.status === 'credited' || (inv as any).credited_amount > 0;

    if (invoiceStatusFilter === "credited") {
      filtered = filtered.filter(inv => isCredited(inv));
    } else if (invoiceStatusFilter === "all") {
      // Exclure les factures créditées de "Toutes"
      filtered = filtered.filter(inv => !isCredited(inv));
    } else {
      // Filtrer par statut spécifique et exclure les créditées
      filtered = filtered.filter(inv => 
        inv.status === invoiceStatusFilter && !isCredited(inv)
      );
    }

    return filtered;
  }, [invoices, invoiceStatusFilter, searchTerm, startDate, endDate]);

  // Compteur pour chaque statut
  const invoiceCounts = useMemo(() => {
    const isCredited = (inv: typeof invoices[0]) => 
      inv.status === 'credited' || (inv as any).credited_amount > 0;
    
    return {
      all: invoices.filter(inv => !isCredited(inv)).length,
      draft: invoices.filter(inv => inv.status === 'draft' && !isCredited(inv)).length,
      sent: invoices.filter(inv => inv.status === 'sent' && !isCredited(inv)).length,
      paid: invoices.filter(inv => inv.status === 'paid' && !isCredited(inv)).length,
      credited: invoices.filter(inv => isCredited(inv)).length,
    };
  }, [invoices]);

  const handleSort = (column: InvoiceSortBy) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

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
    
    // Si la facture est créditée
    if (invoice.status === 'credited' || (invoice as any).credited_amount > 0) {
      return (
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-800">
          Créditée
        </Badge>
      );
    }
    
    // Vérifier si la facture est en attente de paiement (avec date d'échéance)
    if (invoice.due_date && !invoice.paid_at && invoice.status !== 'paid') {
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate <= today) {
        // Échéance dépassée : badge rouge J-X
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
      } else {
        // Échéance à venir : badge orange J+X
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-800">
              Attente paiement
            </Badge>
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">J+{diffDays}</span>
          </div>
        );
      }
    }
    
    const statusConfig = {
      draft: { label: "Brouillon", variant: "secondary" as const },
      sent: { label: "Envoyée", variant: "default" as const },
      paid: { label: "Payée", variant: "default" as const },
      overdue: { label: "En retard", variant: "destructive" as const },
      partial_credit: { label: "Crédit partiel", variant: "outline" as const }
    };
    
    const config = statusConfig[invoice.status as keyof typeof statusConfig] || { label: invoice.status, variant: "default" as const };
    return <Badge variant={config.variant} className={invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''}>{config.label}</Badge>;
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/admin/invoicing/${invoiceId}`);
  };

  const handleNewInvoiceSuccess = () => {
    fetchInvoices();
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
                <p className="text-muted-foreground">Gérez vos factures et notes de crédit</p>
              </div>
            </div>
            <Button onClick={() => setNewInvoiceOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle facture
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Factures
                {invoices.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{invoiceCounts.all}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="credit-notes" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Notes de crédit
                {creditNotes.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{creditNotes.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="accounting-report" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Rapport comptable
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoices" className="mt-6">
              {/* Sous-onglets pour filtrer par statut */}
              <Tabs value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter} className="mb-4">
                <TabsList className="bg-muted/60">
                  <TabsTrigger value="all">
                    Toutes
                    <Badge variant="outline" className="ml-1 text-xs">{invoiceCounts.all}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="draft">
                    Brouillons
                    {invoiceCounts.draft > 0 && <Badge variant="outline" className="ml-1 text-xs">{invoiceCounts.draft}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="sent">
                    Envoyées
                    {invoiceCounts.sent > 0 && <Badge variant="outline" className="ml-1 text-xs">{invoiceCounts.sent}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="paid">
                    Payées
                    {invoiceCounts.paid > 0 && <Badge variant="outline" className="ml-1 text-xs">{invoiceCounts.paid}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="credited" className="text-purple-600">
                    Créditées
                    {invoiceCounts.credited > 0 && <Badge className="ml-1 text-xs bg-purple-100 text-purple-700">{invoiceCounts.credited}</Badge>}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une facture..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <InvoiceDateRangeFilter
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
                <InvoiceSortFilter
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortByChange={setSortBy}
                  onSortOrderChange={setSortOrder}
                />
              </div>

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
                          : "Vous n'avez pas encore de factures. Cliquez sur \"Nouvelle facture\" pour en créer une."
                        }
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableTableHead
                            column="invoice_number"
                            label="Numéro"
                            currentSort={sortBy}
                            direction={sortOrder}
                            onSort={handleSort}
                          />
                          <TableHead>Type</TableHead>
                          <SortableTableHead
                            column="client"
                            label="Client"
                            currentSort={sortBy}
                            direction={sortOrder}
                            onSort={handleSort}
                          />
                          <TableHead>Société</TableHead>
                          <TableHead>Bailleur / Destinataire</TableHead>
                          <SortableTableHead
                            column="amount"
                            label="Montant"
                            currentSort={sortBy}
                            direction={sortOrder}
                            onSort={handleSort}
                          />
                          <SortableTableHead
                            column="status"
                            label="Statut"
                            currentSort={sortBy}
                            direction={sortOrder}
                            onSort={handleSort}
                          />
                          <SortableTableHead
                            column="invoice_date"
                            label="Date de facture"
                            currentSort={sortBy}
                            direction={sortOrder}
                            onSort={handleSort}
                          />
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
                            || invoice.billing_data?.contract_data?.client_company 
                            || (invoice as any).contracts?.clients?.company
                            || "";
                          const recipientName = isPurchase ? '' : invoice.leaser_name;
                          const isCredited = invoice.status === 'credited' || (invoice as any).credited_amount > 0;
                          
                          return (
                            <TableRow key={invoice.id} className={isCredited ? "opacity-60" : ""}>
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
                              <TableCell className={isCredited ? "line-through text-muted-foreground" : ""}>
                                {formatCurrency(invoice.amount)}
                              </TableCell>
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
            </TabsContent>

            <TabsContent value="credit-notes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Notes de crédit
                  </CardTitle>
                  <CardDescription>
                    Consultez les notes de crédit émises
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CreditNotesList 
                    creditNotes={creditNotes} 
                    loading={creditNotesLoading}
                    onRefresh={fetchCreditNotes}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="accounting-report" className="mt-6">
              <AccountingReportTab />
            </TabsContent>
          </Tabs>
        </div>

        <NewInvoiceDialog
          open={newInvoiceOpen}
          onOpenChange={setNewInvoiceOpen}
          onSuccess={handleNewInvoiceSuccess}
        />
      </Container>
    </PageTransition>
  );
};

export default InvoicingPage;
