import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, FileDown, Euro, Calendar, Building2, CheckCircle, Clock, Mail, Trash2 } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { getCompanyInvoices, updateInvoiceStatus, deleteInvoice, type Invoice } from "@/services/invoiceService";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId } = useMultiTenant();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

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
          navigate("/admin/invoicing");
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
      toast.info("Génération PDF en cours...");
      
      const { generateAndDownloadInvoicePdf } = await import('@/services/invoiceService');
      await generateAndDownloadInvoicePdf(invoice.id);
      
      toast.success("PDF généré avec succès");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;

    setIsDeletingInvoice(true);
    try {
      await deleteInvoice(invoice.id);
      toast.success("Facture supprimée avec succès");
      navigate("/admin/invoicing");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setIsDeletingInvoice(false);
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
        <Link to="/admin/invoicing">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux factures
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/invoicing" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux factures
          </Link>
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
          
          <Link to={`/admin/invoicing/${invoice.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations de base */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations de facturation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bailleur</label>
                  <p className="font-medium">{invoice.leaser_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID externe</label>
                  <p className="font-mono text-sm">{invoice.external_invoice_id || "N/A"}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type d'intégration</label>
                  <p className="capitalize">{invoice.integration_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contrat</label>
                  <Link 
                    to={`/contracts/${invoice.contract_id}`}
                    className="text-primary hover:underline"
                  >
                    Voir le contrat
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Détails financiers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Détails financiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(invoice.amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Montant total</div>
                </div>
                
                {invoice.due_date && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">
                      {formatDate(invoice.due_date)}
                    </div>
                    <div className="text-sm text-muted-foreground">Date d'échéance</div>
                  </div>
                )}
                
                {invoice.paid_at && (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-700">
                      {formatDate(invoice.paid_at)}
                    </div>
                    <div className="text-sm text-green-600">Date de paiement</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Données de facturation */}
          {invoice.billing_data && Object.keys(invoice.billing_data).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Données de facturation</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                  {JSON.stringify(invoice.billing_data, null, 2)}
                </pre>
              </CardContent>
            </Card>
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
                <Button 
                  className="w-full" 
                  onClick={() => handleStatusChange('sent')}
                  disabled={isUpdatingStatus}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Marquer comme envoyée
                </Button>
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