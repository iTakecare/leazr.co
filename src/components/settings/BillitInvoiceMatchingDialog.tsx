import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Link2, Check, X, FileText, Building2, Euro, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";

interface BillitInvoiceMatchingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onComplete: () => void;
}

interface UnmatchedInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  invoice_date: string;
  leaser_name: string;
  billing_data: {
    billit_customer_name?: string;
    match_suggestions?: {
      contract_id: string;
      contract_number: string | null;
      client_name: string;
      selling_price: number;
      score: number;
    }[];
  };
}

interface Contract {
  id: string;
  contract_number: string | null;
  client_name: string;
  estimated_selling_price: number;
  monthly_payment: number;
  created_at: string;
}

const BillitInvoiceMatchingDialog: React.FC<BillitInvoiceMatchingDialogProps> = ({
  open,
  onOpenChange,
  companyId,
  onComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<UnmatchedInvoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [matches, setMatches] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (open && companyId) {
      loadData();
    }
  }, [open, companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les factures sans contrat
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, invoice_date, leaser_name, billing_data')
        .eq('company_id', companyId)
        .is('contract_id', null)
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Charger les contrats disponibles (sans facture)
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('id, contract_number, client_name, estimated_selling_price, monthly_payment, created_at')
        .eq('company_id', companyId)
        .eq('invoice_generated', false)
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      setInvoices(invoicesData || []);
      setContracts(contractsData || []);

      // Initialiser les matches avec les suggestions automatiques (meilleur score > 60)
      const initialMatches: Record<string, string | null> = {};
      (invoicesData || []).forEach(invoice => {
        const suggestions = invoice.billing_data?.match_suggestions || [];
        const bestMatch = suggestions.find(s => s.score >= 60);
        initialMatches[invoice.id] = bestMatch?.contract_id || null;
      });
      setMatches(initialMatches);

    } catch (error) {
      console.error("Erreur chargement données:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleMatchChange = (invoiceId: string, contractId: string | null) => {
    setMatches(prev => ({
      ...prev,
      [invoiceId]: contractId === "none" ? null : contractId
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const matchesToSave = Object.entries(matches).filter(([_, contractId]) => contractId !== null);
      
      let successCount = 0;
      let errorCount = 0;

      for (const [invoiceId, contractId] of matchesToSave) {
        // Mettre à jour la facture avec le contract_id
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({ 
            contract_id: contractId,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId);

        if (invoiceError) {
          console.error(`Erreur update facture ${invoiceId}:`, invoiceError);
          errorCount++;
          continue;
        }

        // Marquer le contrat comme ayant une facture
        const { error: contractError } = await supabase
          .from('contracts')
          .update({ 
            invoice_generated: true,
            invoice_id: invoiceId
          })
          .eq('id', contractId);

        if (contractError) {
          console.error(`Erreur update contrat ${contractId}:`, contractError);
          // Rollback la facture
          await supabase
            .from('invoices')
            .update({ contract_id: null })
            .eq('id', invoiceId);
          errorCount++;
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} facture(s) associée(s) avec succès`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erreur(s) lors de l'association`);
      }

      onComplete();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde des associations");
    } finally {
      setSaving(false);
    }
  };

  const getMatchScore = (invoice: UnmatchedInvoice, contractId: string): number => {
    const suggestion = invoice.billing_data?.match_suggestions?.find(s => s.contract_id === contractId);
    return suggestion?.score || 0;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">Excellent ({score}%)</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Bon ({score}%)</Badge>;
    if (score >= 40) return <Badge variant="outline">Possible ({score}%)</Badge>;
    return null;
  };

  // Filtrer les contrats déjà utilisés dans d'autres matchs
  const getAvailableContracts = (currentInvoiceId: string) => {
    const usedContractIds = new Set(
      Object.entries(matches)
        .filter(([invId, contId]) => invId !== currentInvoiceId && contId)
        .map(([_, contId]) => contId)
    );
    return contracts.filter(c => !usedContractIds.has(c.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Matching des factures Billit
          </DialogTitle>
          <DialogDescription>
            Associez vos factures importées depuis Billit avec vos contrats existants.
            Les suggestions automatiques sont basées sur la proximité des montants.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune facture à matcher</p>
            <p className="text-sm">Toutes les factures sont déjà associées à des contrats</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-4">
                {invoices.map(invoice => {
                  const availableContracts = getAvailableContracts(invoice.id);
                  const selectedContractId = matches[invoice.id];
                  const matchScore = selectedContractId ? getMatchScore(invoice, selectedContractId) : 0;

                  return (
                    <Card key={invoice.id} className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Infos facture */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {invoice.invoice_number || 'Sans numéro'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              <span className="font-medium text-foreground">
                                {formatCurrency(invoice.amount)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {invoice.invoice_date 
                                  ? new Date(invoice.invoice_date).toLocaleDateString('fr-FR')
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 col-span-2">
                              <Building2 className="h-3 w-3" />
                              <span>{invoice.billing_data?.billit_customer_name || invoice.leaser_name}</span>
                            </div>
                          </div>

                          {/* Suggestions automatiques */}
                          {invoice.billing_data?.match_suggestions && invoice.billing_data.match_suggestions.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Suggestions: </span>
                              {invoice.billing_data.match_suggestions.slice(0, 2).map((s, i) => (
                                <span key={s.contract_id}>
                                  {i > 0 && ', '}
                                  {s.client_name} ({s.score}%)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sélection contrat */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Select
                              value={selectedContractId || "none"}
                              onValueChange={(value) => handleMatchChange(invoice.id, value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Sélectionner un contrat..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <span className="text-muted-foreground">Aucun contrat</span>
                                </SelectItem>
                                {availableContracts.map(contract => {
                                  const score = getMatchScore(invoice, contract.id);
                                  return (
                                    <SelectItem key={contract.id} value={contract.id}>
                                      <div className="flex items-center gap-2">
                                        <span>{contract.client_name}</span>
                                        <span className="text-muted-foreground">
                                          - {formatCurrency(contract.estimated_selling_price)}
                                        </span>
                                        {score > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            {score}%
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedContractId && matchScore > 0 && (
                            <div className="flex items-center gap-2">
                              {getScoreBadge(matchScore)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {Object.values(matches).filter(Boolean).length} / {invoices.length} facture(s) associée(s)
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || Object.values(matches).filter(Boolean).length === 0}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Valider les associations
                    </>
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

export default BillitInvoiceMatchingDialog;
