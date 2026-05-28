import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { computeRemainingMonths, computeBuybackValue } from "@/utils/contractBuyback";

interface BuybackContract {
  id: string;
  client_name?: string;
  monthly_payment: number;
  contract_duration?: number | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  leaser_id?: string | null;
  leaser_name?: string | null;
  offer_id?: string | null;
  financed_amount?: number | null;
  amount?: number | null;
}

export interface BuybackLine {
  title: string;
  value: number;
  sourceContractId: string;
  remainingMonths: number;
  rentSum: number;
  residualValue: number;
  residualPercentage: number;
}

interface ContractBuybackModalProps {
  open: boolean;
  onClose: () => void;
  clientId?: string | null;
  /** Appelé quand l'utilisateur valide l'imputation. Doit gérer l'ajout de la ligne. */
  onImpute: (line: BuybackLine) => void | Promise<void>;
  isImputing?: boolean;
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);

const ContractBuybackModal: React.FC<ContractBuybackModalProps> = ({
  open,
  onClose,
  clientId,
  onImpute,
  isImputing = false,
}) => {
  const { services } = useMultiTenant();
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<BuybackContract[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [financedAmount, setFinancedAmount] = useState<number>(0);
  const [residualPercentage, setResidualPercentage] = useState<number>(3);
  const [remainingMonths, setRemainingMonths] = useState<number>(0);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedId),
    [contracts, selectedId]
  );

  // Charger les contrats du client à l'ouverture
  useEffect(() => {
    if (!open) return;
    if (!clientId) {
      setContracts([]);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await services.contracts
          .query()
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setContracts((data || []) as BuybackContract[]);
      } catch (e: any) {
        console.error("Erreur chargement contrats pour rachat:", e);
        toast.error("Impossible de charger les contrats du client");
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, clientId, services]);

  // Réinitialiser à la fermeture
  useEffect(() => {
    if (!open) {
      setSelectedId("");
      setFinancedAmount(0);
      setResidualPercentage(3);
      setRemainingMonths(0);
    }
  }, [open]);

  // Charger les détails financiers du contrat sélectionné
  useEffect(() => {
    if (!selectedContract) return;
    const loadDetails = async () => {
      setDetailsLoading(true);
      try {
        // Mois restants (auto, modifiable ensuite)
        setRemainingMonths(
          computeRemainingMonths({
            contractStartDate: selectedContract.contract_start_date,
            contractEndDate: selectedContract.contract_end_date,
            contractDuration: selectedContract.contract_duration,
          })
        );

        // Montant financé : priorité au contrat, fallback sur l'offre liée
        let financed =
          selectedContract.financed_amount ?? selectedContract.amount ?? 0;
        if ((!financed || financed <= 0) && selectedContract.offer_id) {
          const { data: offer } = await services.offers
            .query()
            .select("financed_amount, amount")
            .eq("id", selectedContract.offer_id)
            .single();
          financed = (offer as any)?.financed_amount ?? (offer as any)?.amount ?? 0;
        }
        setFinancedAmount(Number(financed) || 0);

        // Pourcentage de valeur résiduelle depuis le leaser du contrat
        if (selectedContract.leaser_id) {
          const { data: leaser } = await services.leasers
            .query()
            .select("residual_value_percentage")
            .eq("id", selectedContract.leaser_id)
            .single();
          setResidualPercentage(Number((leaser as any)?.residual_value_percentage ?? 3));
        } else {
          setResidualPercentage(3);
        }
      } catch (e) {
        console.error("Erreur chargement détails contrat:", e);
      } finally {
        setDetailsLoading(false);
      }
    };
    loadDetails();
  }, [selectedContract, services]);

  const buyback = useMemo(
    () =>
      computeBuybackValue({
        remainingMonths,
        monthlyPayment: selectedContract?.monthly_payment || 0,
        financedAmount,
        residualPercentage,
      }),
    [remainingMonths, selectedContract, financedAmount, residualPercentage]
  );

  const handleImpute = async () => {
    if (!selectedContract) return;
    if (buyback.total <= 0) {
      toast.error("La valeur de rachat calculée est nulle");
      return;
    }
    const shortId = selectedContract.id.slice(0, 8);
    await onImpute({
      title: `Rachat contrat #${shortId}`,
      value: buyback.total,
      sourceContractId: selectedContract.id,
      remainingMonths,
      rentSum: buyback.rentSum,
      residualValue: buyback.residualValue,
      residualPercentage,
    });
  };

  const contractLabel = (c: BuybackContract) => {
    const parts = [`#${c.id.slice(0, 8)}`];
    if (c.leaser_name) parts.push(c.leaser_name);
    parts.push(`${formatPrice(c.monthly_payment)}/mois`);
    return parts.join(" — ");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Rachat de contrat</DialogTitle>
          <DialogDescription>
            Sélectionnez le contrat à racheter pour calculer sa valeur résiduelle et l'imputer
            à la demande en cours.
          </DialogDescription>
        </DialogHeader>

        {!clientId ? (
          <div className="py-6 text-sm text-muted-foreground text-center">
            Veuillez d'abord sélectionner un client pour cette demande.
          </div>
        ) : loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground text-center">
            Aucun contrat trouvé pour ce client.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contrat à racheter</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un contrat" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {contractLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedContract && (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                {detailsLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Chargement des détails…
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="remaining-months" className="text-xs">
                      Mois restants
                    </Label>
                    <Input
                      id="remaining-months"
                      type="number"
                      min="0"
                      value={remainingMonths}
                      onChange={(e) => setRemainingMonths(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Loyer mensuel</Label>
                    <div className="h-10 flex items-center px-3 text-sm font-mono rounded-md border bg-background">
                      {formatPrice(selectedContract.monthly_payment)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Loyers restants ({remainingMonths} × {formatPrice(selectedContract.monthly_payment)})
                    </span>
                    <span className="font-mono">{formatPrice(buyback.rentSum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Valeur résiduelle ({residualPercentage}% × {formatPrice(financedAmount)})
                    </span>
                    <span className="font-mono">{formatPrice(buyback.residualValue)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2 text-base">
                    <span>Valeur de rachat</span>
                    <span className="font-mono text-primary">{formatPrice(buyback.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isImputing}>
            Annuler
          </Button>
          <Button
            onClick={handleImpute}
            disabled={!selectedContract || buyback.total <= 0 || isImputing || detailsLoading}
          >
            {isImputing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Imputer la valeur résiduelle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractBuybackModal;
