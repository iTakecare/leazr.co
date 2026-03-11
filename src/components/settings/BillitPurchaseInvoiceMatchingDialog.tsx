import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Link2, Check, FileText, Building2, Euro, Calendar, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onComplete: () => void;
}

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  invoice_date: string;
  leaser_name: string;
  billing_data: {
    billit_supplier_name?: string;
    matched_supplier_id?: string | null;
    match_suggestions?: {
      equipment_id: string;
      equipment_title: string;
      contract_id: string;
      contract_number: string | null;
      client_name: string;
      equipment_total: number;
      score: number;
    }[];
  };
}

interface EquipmentOrder {
  id: string;
  title: string;
  quantity: number;
  purchase_price: number;
  supplier_price: number | null;
  supplier_id: string | null;
  contract_id: string;
  contract_number: string | null;
  client_name: string;
}

const BillitPurchaseInvoiceMatchingDialog: React.FC<Props> = ({
  open, onOpenChange, companyId, onComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOrder[]>([]);
  const [matches, setMatches] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (open && companyId) loadData();
  }, [open, companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load unmatched purchase invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, invoice_date, leaser_name, billing_data')
        .eq('company_id', companyId)
        .eq('invoice_type', 'purchase')
        .is('contract_id', null)
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Load contract equipment
      const { data: eqData, error: eqError } = await supabase
        .from('contract_equipment')
        .select(`
          id, title, quantity, purchase_price, supplier_price, supplier_id,
          contracts!inner(id, contract_number, client_name, company_id)
        `)
        .eq('contracts.company_id', companyId);

      if (eqError) throw eqError;

      const eqList: EquipmentOrder[] = (eqData || []).map((eq: any) => ({
        id: eq.id,
        title: eq.title,
        quantity: eq.quantity,
        purchase_price: eq.purchase_price,
        supplier_price: eq.supplier_price,
        supplier_id: eq.supplier_id,
        contract_id: eq.contracts?.id,
        contract_number: eq.contracts?.contract_number,
        client_name: eq.contracts?.client_name,
      }));

      setInvoices(invoicesData || []);
      setEquipment(eqList);

      // Init matches from suggestions
      const initialMatches: Record<string, string | null> = {};
      (invoicesData || []).forEach(inv => {
        const suggestions = inv.billing_data?.match_suggestions || [];
        const best = suggestions.find(s => s.score >= 60);
        initialMatches[inv.id] = best?.equipment_id || null;
      });
      setMatches(initialMatches);
    } catch (error) {
      console.error("Erreur chargement données:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleMatchChange = (invoiceId: string, equipmentId: string | null) => {
    setMatches(prev => ({ ...prev, [invoiceId]: equipmentId === "none" ? null : equipmentId }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const matchesToSave = Object.entries(matches).filter(([_, eqId]) => eqId !== null);
      let successCount = 0;
      let errorCount = 0;

      for (const [invoiceId, equipmentId] of matchesToSave) {
        const invoice = invoices.find(i => i.id === invoiceId);
        const eq = equipment.find(e => e.id === equipmentId);
        if (!invoice || !eq) continue;

        // Calculate actual unit price from invoice
        const actualUnitPrice = invoice.amount / eq.quantity;

        // Update contract_equipment with actual purchase price
        const { error: eqError } = await supabase
          .from('contract_equipment')
          .update({
            actual_purchase_price: actualUnitPrice,
            actual_purchase_date: invoice.invoice_date,
            supplier_price: actualUnitPrice,
          })
          .eq('id', equipmentId);

        if (eqError) {
          console.error(`Erreur update equipment ${equipmentId}:`, eqError);
          errorCount++;
          continue;
        }

        // Link invoice to the contract
        const { error: invError } = await supabase
          .from('invoices')
          .update({
            contract_id: eq.contract_id,
            billing_data: {
              ...invoice.billing_data,
              matched_equipment_id: equipmentId,
              matched_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);

        if (invError) {
          console.error(`Erreur update facture ${invoiceId}:`, invError);
          errorCount++;
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} facture(s) d'achat associée(s) — prix d'achat mis à jour`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erreur(s) lors de l'association`);
      }

      onComplete();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const getMatchScore = (invoice: PurchaseInvoice, equipmentId: string): number => {
    const suggestion = invoice.billing_data?.match_suggestions?.find(s => s.equipment_id === equipmentId);
    return suggestion?.score || 0;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500 text-white">Excellent ({score}%)</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500 text-white">Bon ({score}%)</Badge>;
    if (score >= 40) return <Badge variant="outline">Possible ({score}%)</Badge>;
    return null;
  };

  const getAvailableEquipment = (currentInvoiceId: string) => {
    const usedIds = new Set(
      Object.entries(matches)
        .filter(([invId, eqId]) => invId !== currentInvoiceId && eqId)
        .map(([_, eqId]) => eqId)
    );
    return equipment.filter(e => !usedIds.has(e.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Matching factures d'achat ↔ commandes fournisseurs
          </DialogTitle>
          <DialogDescription>
            Associez vos factures d'achat Billit avec vos commandes fournisseurs.
            Les prix d'achat réels seront automatiquement mis à jour.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune facture d'achat à matcher</p>
            <p className="text-sm">Toutes les factures sont déjà associées</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-4">
                {invoices.map(invoice => {
                  const available = getAvailableEquipment(invoice.id);
                  const selectedId = matches[invoice.id];
                  const matchScore = selectedId ? getMatchScore(invoice, selectedId) : 0;
                  const selectedEq = selectedId ? equipment.find(e => e.id === selectedId) : null;

                  return (
                    <Card key={invoice.id} className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium">{invoice.invoice_number || 'Sans numéro'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              <span className="font-medium text-foreground">{formatCurrency(invoice.amount)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('fr-FR') : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 col-span-2">
                              <Building2 className="h-3 w-3" />
                              <span>{invoice.billing_data?.billit_supplier_name || invoice.leaser_name}</span>
                            </div>
                          </div>
                          {invoice.billing_data?.match_suggestions && invoice.billing_data.match_suggestions.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Suggestions: </span>
                              {invoice.billing_data.match_suggestions.slice(0, 2).map((s, i) => (
                                <span key={s.equipment_id}>
                                  {i > 0 && ', '}
                                  {s.equipment_title} - {s.client_name} ({s.score}%)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <Select
                            value={selectedId || "none"}
                            onValueChange={(value) => handleMatchChange(invoice.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sélectionner une commande..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">Aucune commande</span>
                              </SelectItem>
                              {available.map(eq => {
                                const eqTotal = (eq.supplier_price || eq.purchase_price) * eq.quantity;
                                const score = getMatchScore(invoice, eq.id);
                                return (
                                  <SelectItem key={eq.id} value={eq.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{eq.title}</span>
                                      <span className="text-muted-foreground">- {eq.client_name}</span>
                                      <span className="text-muted-foreground">({formatCurrency(eqTotal)})</span>
                                      {score > 0 && <Badge variant="outline" className="text-xs">{score}%</Badge>}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>

                          {selectedId && matchScore > 0 && getScoreBadge(matchScore)}

                          {selectedEq && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Prix actuel: {formatCurrency((selectedEq.supplier_price || selectedEq.purchase_price) * selectedEq.quantity)}
                              {' → '}
                              <span className="font-medium text-foreground">{formatCurrency(invoice.amount)}</span>
                              <span className="text-primary">(unitaire: {formatCurrency(invoice.amount / selectedEq.quantity)})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {Object.values(matches).filter(Boolean).length} / {invoices.length} facture(s) associée(s)
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || Object.values(matches).filter(Boolean).length === 0}
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-2" />Valider et mettre à jour les prix</>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BillitPurchaseInvoiceMatchingDialog;
