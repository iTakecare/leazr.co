import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ArrowLeft, Edit, FileDown, Euro, Calendar, Building2, CheckCircle, Clock, Mail, Trash2, Pencil } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { getCompanyInvoices, updateInvoiceStatus, deleteInvoice, sendInvoiceToBillit, downloadBillitInvoicePdf, updateInvoicePaidDate, updateInvoiceDate, updateInvoiceDueDate, type Invoice } from "@/services/invoiceService";
import { formatCurrency, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import EditableBillingDataTable from "@/components/invoices/EditableBillingDataTable";

const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToAdmin } = useRoleNavigation();
  const { companyId } = useMultiTenant();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [isSendingToBillit, setIsSendingToBillit] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [paidDate, setPaidDate] = useState<Date | undefined>(undefined);
  const [isUpdatingInvoiceDate, setIsUpdatingInvoiceDate] = useState(false);
  const [isUpdatingDueDate, setIsUpdatingDueDate] = useState(false);
  const [isUpdatingPaidDate, setIsUpdatingPaidDate] = useState(false);

  // Synchroniser les dates avec invoice
  useEffect(() => {
    if (invoice?.invoice_date) {
      setInvoiceDate(new Date(invoice.invoice_date));
    } else if (invoice?.created_at) {
      setInvoiceDate(new Date(invoice.created_at));
    }
    if (invoice?.due_date) {
      setDueDate(new Date(invoice.due_date));
    }
    if (invoice?.paid_at) {
      setPaidDate(new Date(invoice.paid_at));
    }
  }, [invoice?.invoice_date, invoice?.due_date, invoice?.paid_at, invoice?.created_at]);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) return;
      
      try {
        const invoices = await getCompanyInvoices(companyId);
        const foundInvoice = invoices.find(inv => inv.id === id);
        
        if (foundInvoice) {
          setInvoice(foundInvoice);
        } else {
          toast.error("Facture non trouvée");
          navigateToAdmin("invoicing");
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la facture:", error);
        toast.error("Erreur lors du chargement de la facture");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id, companyId, navigate]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Brouillon", variant: "secondary" as const, icon: Edit },
      sent: { label: "Envoyée", variant: "default" as const, icon: Mail },
      paid: { label: "Payée", variant: "default" as const, icon: CheckCircle },
      cancelled: { label: "Annulée", variant: "destructive" as const, icon: Trash2 }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;

    setIsUpdatingStatus(true);
    try {
      const paidAt = newStatus === 'paid' ? new Date().toISOString() : undefined;
      await updateInvoiceStatus(invoice.id, newStatus, paidAt);
      
      setInvoice({ ...invoice, status: newStatus as any, paid_at: paidAt });
      toast.success("Statut mis à jour avec succès");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!invoice) return;

    setIsGeneratingPdf(true);
    try {
      toast.info("Téléchargement PDF en cours...");
      
      await downloadBillitInvoicePdf(invoice.id);
      
      toast.success("PDF téléchargé avec succès");
    } catch (error) {
      console.error("Erreur lors du téléchargement du PDF:", error);
      toast.error("Erreur lors du téléchargement du PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendToBillit = async () => {
    if (!invoice) return;

    setIsSendingToBillit(true);
    try {
      const updatedInvoice = await sendInvoiceToBillit(invoice.id);
      toast.success("Facture envoyée vers Billit avec succès !");
      
      // Mettre à jour la facture locale
      setInvoice({ 
        ...invoice, 
        status: 'sent',
        external_invoice_id: updatedInvoice.external_invoice_id,
        sent_at: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Erreur lors de l'envoi vers Billit:", error);
      toast.error(error.message || "Erreur lors de l'envoi vers Billit");
    } finally {
      setIsSendingToBillit(false);
    }
  };

  const handleBillingDataUpdate = async (updatedData: any) => {
    if (!invoice) return;

    try {
      const { updateInvoiceBillingData } = await import('@/services/invoiceService');
      await updateInvoiceBillingData(invoice.id, updatedData);
      
      setInvoice({ ...invoice, billing_data: updatedData });
      toast.success("Données de facturation mises à jour");
    } catch (error) {
      console.error("Erreur lors de la mise à jour des données de facturation:", error);
      toast.error("Erreur lors de la mise à jour des données");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;

    setIsDeletingInvoice(true);
    try {
      await deleteInvoice(invoice.id);
      toast.success("Facture supprimée avec succès");
      navigateToAdmin("invoicing");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleInvoiceDateChange = async (date: Date | undefined) => {
    if (!date || !invoice) return;
    
    setIsUpdatingInvoiceDate(true);
    try {
      await updateInvoiceDate(invoice.id, format(date, 'yyyy-MM-dd'));
      
      setInvoiceDate(date);
      setInvoice({ ...invoice, invoice_date: date.toISOString() });
      toast.success('Date de facture mise à jour');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdatingInvoiceDate(false);
    }
  };

  const handleDueDateChange = async (date: Date | undefined) => {
    if (!date || !invoice) return;
    
    setIsUpdatingDueDate(true);
    try {
      await updateInvoiceDueDate(invoice.id, format(date, 'yyyy-MM-dd'));
      
      setDueDate(date);
      setInvoice({ ...invoice, due_date: date.toISOString() });
      toast.success('Date d\'échéance mise à jour');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdatingDueDate(false);
    }
  };

  const handlePaidDateChange = async (date: Date | undefined) => {
    if (!date || !invoice) return;
    
    setIsUpdatingPaidDate(true);
    try {
      await updateInvoicePaidDate(invoice.id, format(date, 'yyyy-MM-dd'));
      
      setPaidDate(date);
      setInvoice({ ...invoice, paid_at: date.toISOString() });
      toast.success('Date de paiement mise à jour');
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdatingPaidDate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Facture non trouvée</h2>
          <Button variant="outline" onClick={() => navigateToAdmin("invoicing")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux factures
            </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigateToAdmin("invoicing")} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux factures
          </button>
          <h1 className="text-3xl font-bold tracking-tight">
            Facture {invoice.invoice_number || `FAC-${invoice.id.slice(0, 8)}`}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(invoice.status)}
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              Créée le {formatDate(invoice.created_at)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Générer PDF
          </Button>
          
          <Button variant="outline" onClick={() => navigateToAdmin(`invoicing/${invoice.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations de base */}
          {(() => {
            const isPurchase = (invoice as any).invoice_type === 'purchase' || invoice.billing_data?.offer_data?.is_purchase;
            const clientData = invoice.billing_data?.client_data;
            
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Informations de facturation
                    {isPurchase && (
                      <Badge variant="outline" className="ml-2 border-emerald-500 text-emerald-600">
                        Achat direct
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {isPurchase ? "Client facturé" : "Bailleur"}
                      </label>
                      <p className="font-medium">
                        {isPurchase ? (clientData?.name || "Client") : invoice.leaser_name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ID externe</label>
                      <p className="font-mono text-sm">{invoice.external_invoice_id || "N/A"}</p>
                    </div>
                  </div>
                  
                  {/* Afficher les coordonnées client pour les factures d'achat */}
                  {isPurchase && clientData && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                          <p className="text-sm">{clientData.address || "Non renseignée"}</p>
                          <p className="text-sm">{clientData.postal_code} {clientData.city}</p>
                          <p className="text-sm">{clientData.country || "Belgique"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Contact</label>
                          <p className="text-sm">{clientData.email || "Non renseigné"}</p>
                          <p className="text-sm">{clientData.phone || "Non renseigné"}</p>
                          {clientData.vat_number && (
                            <p className="text-sm font-medium mt-1">TVA: {clientData.vat_number}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type d'intégration</label>
                      <p className="capitalize">{invoice.integration_type}</p>
                    </div>
                    {/* Afficher le lien vers le contrat uniquement pour les factures de leasing */}
                    {!isPurchase && invoice.contract_id && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contrat</label>
                        <Link 
                          to={(() => {
                            const companySlug = location.pathname.match(/^\/([^\/]+)\/(admin|client|ambassador)/)?.[1];
                            return companySlug 
                              ? `/${companySlug}/admin/contracts/${invoice.contract_id}`
                              : `/contracts/${invoice.contract_id}`;
                          })()}
                          className="text-primary hover:underline"
                        >
                          Voir le contrat
                        </Link>
                      </div>
                    )}
                    {/* Afficher le lien vers l'offre pour les factures d'achat */}
                    {isPurchase && invoice.billing_data?.offer_data?.id && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Offre d'achat</label>
                        <Link 
                          to={(() => {
                            const companySlug = location.pathname.match(/^\/([^\/]+)\/(admin|client|ambassador)/)?.[1];
                            return companySlug 
                              ? `/${companySlug}/admin/offers/${invoice.billing_data.offer_data.id}`
                              : `/offers/${invoice.billing_data.offer_data.id}`;
                          })()}
                          className="text-primary hover:underline"
                        >
                          Voir l'offre
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Détails financiers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Détails financiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Montant total */}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(invoice.amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Montant total</div>
                </div>

                {/* Date de facture - ÉDITABLE */}
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group">
                      <div className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center justify-center gap-2">
                        {invoiceDate 
                          ? format(invoiceDate, "dd/MM/yyyy", { locale: fr })
                          : "Non définie"}
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-500">Date de facture</div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="single"
                      selected={invoiceDate}
                      onSelect={handleInvoiceDateChange}
                      locale={fr}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={isUpdatingInvoiceDate}
                    />
                  </PopoverContent>
                </Popover>

                {/* Date d'échéance - ÉDITABLE */}
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors group">
                      <div className="text-lg font-semibold text-orange-700 dark:text-orange-400 flex items-center justify-center gap-2">
                        {dueDate 
                          ? format(dueDate, "dd/MM/yyyy", { locale: fr })
                          : "Non définie"}
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-sm text-orange-600 dark:text-orange-500">Date d'échéance</div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={handleDueDateChange}
                      locale={fr}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={isUpdatingDueDate}
                    />
                  </PopoverContent>
                </Popover>

                {/* Date de paiement - ÉDITABLE (visible uniquement si payée) */}
                {invoice.status === 'paid' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group">
                        <div className="text-lg font-semibold text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
                          {paidDate 
                            ? format(paidDate, "dd/MM/yyyy", { locale: fr })
                            : "Non définie"}
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-sm text-green-600 dark:text-green-500">Date de paiement</div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <CalendarComponent
                        mode="single"
                        selected={paidDate}
                        onSelect={handlePaidDateChange}
                        locale={fr}
                        initialFocus
                        className="pointer-events-auto"
                        disabled={isUpdatingPaidDate}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Données de facturation */}
          {invoice.billing_data && Object.keys(invoice.billing_data).length > 0 && (
            <EditableBillingDataTable
              billingData={invoice.billing_data}
              invoiceId={invoice.id}
              onUpdate={handleBillingDataUpdate}
            />
          )}
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.status === 'draft' && (
                <>
                  <Button 
                    className="w-full" 
                    onClick={handleSendToBillit}
                    disabled={isSendingToBillit}
                  >
                    {isSendingToBillit ? (
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Envoyer vers Billit
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full" 
                    onClick={() => handleStatusChange('sent')}
                    disabled={isUpdatingStatus}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Marquer manuellement comme envoyée
                  </Button>
                </>
              )}
              
              {invoice.status === 'sent' && (
                <Button 
                  className="w-full" 
                  onClick={() => handleStatusChange('paid')}
                  disabled={isUpdatingStatus}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marquer comme payée
                </Button>
              )}
              
              {invoice.status !== 'cancelled' && (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isUpdatingStatus}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Annuler la facture
                </Button>
              )}

              <Separator />

              {/* Bouton de suppression avec confirmation */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    disabled={isDeletingInvoice || invoice.status === 'paid'}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer définitivement
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer la facture</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer définitivement cette facture ? 
                      Cette action est irréversible et détachera le contrat associé.
                      {invoice.status === 'paid' && (
                        <span className="text-red-600 font-medium block mt-2">
                          Les factures payées ne peuvent pas être supprimées.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteInvoice}
                      disabled={isDeletingInvoice || invoice.status === 'paid'}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeletingInvoice ? "Suppression..." : "Supprimer définitivement"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Chronologie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Chronologie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div>
                  <p className="text-sm font-medium">Facture créée</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(invoice.created_at)}
                  </p>
                </div>
              </div>
              
              {invoice.generated_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">Facture générée</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(invoice.generated_at)}
                    </p>
                  </div>
                </div>
              )}
              
              {invoice.sent_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">Facture envoyée</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(invoice.sent_at)}
                    </p>
                  </div>
                </div>
              )}
              
              {invoice.paid_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">Facture payée</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(invoice.paid_at)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;