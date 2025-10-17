
import React, { useState } from "react";
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

const InvoicingPage = () => {
  const navigate = useNavigate();
  const { invoices, loading } = useInvoices();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.leaser_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.billing_data?.contract_data?.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Brouillon", variant: "secondary" as const },
      sent: { label: "Envoyée", variant: "default" as const },
      paid: { label: "Payée", variant: "default" as const },
      overdue: { label: "En retard", variant: "destructive" as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "default" as const };
    return <Badge variant={config.variant} className={status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''}>{config.label}</Badge>;
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
                        <TableHead>Client</TableHead>
                        <TableHead>Bailleur</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date de création</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                          </TableCell>
                          <TableCell>
                            {invoice.billing_data?.contract_data?.client_name || "N/A"}
                          </TableCell>
                          <TableCell>{invoice.leaser_name}</TableCell>
                          <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>{formatDate(invoice.created_at)}</TableCell>
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
                      ))}
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
