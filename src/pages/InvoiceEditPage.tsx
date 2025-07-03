import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, X } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { getCompanyInvoices, type Invoice } from "@/services/invoiceService";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const InvoiceEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId } = useMultiTenant();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    invoice_number: "",
    amount: "",
    status: "draft" as "draft" | "sent" | "paid" | "cancelled",
    due_date: "",
    leaser_name: "",
    notes: ""
  });

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) return;
      
      try {
        const invoices = await getCompanyInvoices(companyId);
        const foundInvoice = invoices.find(inv => inv.id === id);
        
        if (foundInvoice) {
          setInvoice(foundInvoice);
          setFormData({
            invoice_number: foundInvoice.invoice_number || "",
            amount: foundInvoice.amount.toString(),
            status: foundInvoice.status,
            due_date: foundInvoice.due_date || "",
            leaser_name: foundInvoice.leaser_name,
            notes: (foundInvoice.billing_data as any)?.notes || ""
          });
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!invoice) return;

    setSaving(true);
    try {
      const updatedBillingData = {
        ...invoice.billing_data,
        notes: formData.notes
      };

      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_number: formData.invoice_number || null,
          amount: parseFloat(formData.amount),
          status: formData.status,
          due_date: formData.due_date || null,
          leaser_name: formData.leaser_name,
          billing_data: updatedBillingData,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (error) {
        throw error;
      }

      toast.success("Facture mise à jour avec succès");
      navigate(`/admin/invoicing/${invoice.id}`);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde de la facture");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/admin/invoicing/${id}`);
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
          <Link 
            to={`/admin/invoicing/${invoice.id}`} 
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour au détail
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier la facture {invoice.invoice_number || `FAC-${invoice.id.slice(0, 8)}`}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire principal */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Numéro de facture</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => handleInputChange("invoice_number", e.target.value)}
                    placeholder="FAC-2024-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="sent">Envoyée</SelectItem>
                      <SelectItem value="paid">Payée</SelectItem>
                      <SelectItem value="cancelled">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Date d'échéance</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange("due_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaser_name">Nom du bailleur</Label>
                <Input
                  id="leaser_name"
                  value={formData.leaser_name}
                  onChange={(e) => handleInputChange("leaser_name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Notes additionnelles..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Informations non modifiables */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations système</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">ID de la facture</Label>
                <p className="font-mono text-sm mt-1">{invoice.id}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">ID externe</Label>
                <p className="font-mono text-sm mt-1">{invoice.external_invoice_id || "N/A"}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Type d'intégration</Label>
                <p className="capitalize mt-1">{invoice.integration_type}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Date de création</Label>
                <p className="mt-1">{formatDate(invoice.created_at)}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Dernière modification</Label>
                <p className="mt-1">{formatDate(invoice.updated_at)}</p>
              </div>
              
              {invoice.generated_at && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date de génération</Label>
                  <p className="mt-1">{formatDate(invoice.generated_at)}</p>
                </div>
              )}
              
              {invoice.sent_at && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date d'envoi</Label>
                  <p className="mt-1">{formatDate(invoice.sent_at)}</p>
                </div>
              )}
              
              {invoice.paid_at && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date de paiement</Label>
                  <p className="mt-1">{formatDate(invoice.paid_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contrat associé</CardTitle>
            </CardHeader>
            <CardContent>
              <Link 
                to={`/contracts/${invoice.contract_id}`}
                className="text-primary hover:underline"
              >
                Voir le contrat →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditPage;