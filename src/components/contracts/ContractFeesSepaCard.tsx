/**
 * ContractFeesSepaCard
 *
 * Prélèvements SEPA pour :
 *  • frais de dossier (ponctuel, optionnel)
 *  • frais d'assurance annuelle (abonnement Mollie 12 mois)
 *
 * Réutilise le mandat SEPA existant (self-leasing) si disponible,
 * sinon propose la saisie d'un IBAN dédié.
 */
import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createMollieCustomer,
  createDirectMollieMandate,
  createMollieSubscription,
} from "@/utils/mollie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Shield,
  Euro,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
  Building2,
  KeyRound,
  Calendar,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ContractFeesSepaCardProps {
  contract: {
    id: string;
    client_name: string;
    client_email?: string | null;
    // Mandat self-leasing existant (réutilisable)
    mollie_customer_id?: string | null;
    mollie_mandate_id?: string | null;
    mollie_mandate_status?: string | null;
    // Mandat dédié aux frais (peut être identique)
    fees_customer_id?: string | null;
    fees_mandate_id?: string | null;
    fees_iban?: string | null;
    fees_bic?: string | null;
    // Frais de dossier
    dossier_fee_amount?: number | null;
    dossier_fee_status?: string | null;
    dossier_fee_mollie_id?: string | null;
    dossier_fee_paid_at?: string | null;
    // Assurance annuelle
    insurance_fee_amount?: number | null;
    insurance_fee_active?: boolean | null;
    insurance_fee_mollie_id?: string | null;
    insurance_fee_next_date?: string | null;
  };
  companyId: string;
  onSuccess?: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const maskIban = (iban: string) =>
  iban.length > 8
    ? `${iban.slice(0, 4)} **** **** ${iban.slice(-4)}`
    : iban;

async function updateContract(contractId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("contracts").update(patch).eq("id", contractId);
  if (error) throw error;
}

async function createMolliePaymentDirect(payload: {
  customer_id: string;
  amount: number;
  description: string;
  contract_id: string;
  company_id: string;
}) {
  const { data, error } = await supabase.functions.invoke("mollie-sepa", {
    body: { action: "create_payment", ...payload },
  });
  if (error) throw new Error(error.message);
  return data;
}

// ── component ─────────────────────────────────────────────────────────────────
const ContractFeesSepaCard: React.FC<ContractFeesSepaCardProps> = ({
  contract,
  companyId,
  onSuccess,
}) => {
  // ── Détecter le mandat réutilisable ──────────────────────────────────────
  // Le mandat self-leasing est valide et peut être réutilisé pour les frais
  const existingMandateValid =
    !!contract.mollie_customer_id &&
    !!contract.mollie_mandate_id &&
    (contract.mollie_mandate_status === "valid" ||
      contract.mollie_mandate_status === "pending");

  // Le mandat dédié aux frais est configuré
  const feesMandate = !!contract.fees_customer_id && !!contract.fees_mandate_id;

  // Le mandat effectif = dédié OR self-leasing existant
  const hasActiveMandateForFees = feesMandate || existingMandateValid;

  // Si on utilise le mandat self-leasing, récupérer les bons IDs
  const effectiveCustomerId =
    contract.fees_customer_id || contract.mollie_customer_id || null;
  const effectiveMandateId =
    contract.fees_mandate_id || contract.mollie_mandate_id || null;

  // Auto-synchroniser les IDs fees depuis le mandat self-leasing si pas encore fait
  useEffect(() => {
    if (existingMandateValid && !feesMandate) {
      // Marquer silencieusement que le mandat self-leasing est utilisé pour les frais
      updateContract(contract.id, {
        fees_customer_id: contract.mollie_customer_id,
        fees_mandate_id: contract.mollie_mandate_id,
      }).catch(console.error);
    }
  }, [existingMandateValid, feesMandate, contract.id]);

  // IBAN setup (seulement si pas de mandat du tout)
  const [showIbanDialog, setShowIbanDialog] = useState(false);
  const [ibanInput, setIbanInput] = useState(contract.fees_iban || "");
  const [bicInput, setBicInput] = useState(contract.fees_bic || "");
  const [ibanLoading, setIbanLoading] = useState(false);

  // Frais de dossier
  const [dossierEnabled, setDossierEnabled] = useState(
    !!contract.dossier_fee_amount && contract.dossier_fee_amount > 0
  );
  const [dossierAmount, setDossierAmount] = useState<string>(
    contract.dossier_fee_amount ? String(contract.dossier_fee_amount) : "250"
  );
  const [dossierLoading, setDossierLoading] = useState(false);

  // Assurance annuelle
  const [insuranceEnabled, setInsuranceEnabled] = useState(
    !!contract.insurance_fee_amount && contract.insurance_fee_amount > 0
  );
  const [insuranceAmount, setInsuranceAmount] = useState<string>(
    contract.insurance_fee_amount ? String(contract.insurance_fee_amount) : "200"
  );
  const [insuranceStartDate, setInsuranceStartDate] = useState<string>(
    contract.insurance_fee_next_date ||
      new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0]
  );
  const [insuranceLoading, setInsuranceLoading] = useState(false);

  const dossierIsPaid = contract.dossier_fee_status === "paid";
  const insuranceIsActive = contract.insurance_fee_active;

  // ── Setup IBAN dédié (contrats non self-leasing) ─────────────────────────
  const handleSetupIban = useCallback(async () => {
    const rawIban = ibanInput.replace(/\s/g, "").toUpperCase();
    if (rawIban.length < 15) {
      toast.error("IBAN invalide");
      return;
    }
    setIbanLoading(true);
    try {
      const custResult = await createMollieCustomer({
        name: contract.client_name,
        email: contract.client_email || "",
        contract_id: contract.id,
        company_id: companyId,
      });
      if (!custResult.success || !(custResult.data as any)?.id) {
        throw new Error(custResult.error || "Échec création client Mollie");
      }
      const customerId = (custResult.data as any).id as string;

      const mandateResult = await createDirectMollieMandate({
        customer_id: customerId,
        consumer_name: contract.client_name,
        iban: rawIban,
        bic: bicInput.trim() || undefined,
        contract_id: contract.id,
        company_id: companyId,
      });
      if (!mandateResult.success || !(mandateResult.data as any)?.id) {
        throw new Error(mandateResult.error || "Échec création mandat SEPA");
      }
      const mandateId = (mandateResult.data as any).id as string;

      await updateContract(contract.id, {
        fees_customer_id: customerId,
        fees_mandate_id: mandateId,
        fees_iban: rawIban,
        fees_bic: bicInput.trim() || null,
      });

      toast.success("Mandat SEPA configuré avec succès");
      setShowIbanDialog(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la configuration SEPA");
    } finally {
      setIbanLoading(false);
    }
  }, [ibanInput, bicInput, contract, companyId, onSuccess]);

  // ── Prélèvement frais de dossier ─────────────────────────────────────────
  const handleTriggerDossierFee = useCallback(async () => {
    const amount = parseFloat(dossierAmount);
    if (!amount || amount <= 0) { toast.error("Montant invalide"); return; }
    if (!effectiveCustomerId) { toast.error("Aucun mandat SEPA disponible"); return; }

    setDossierLoading(true);
    try {
      await updateContract(contract.id, {
        dossier_fee_amount: amount,
        dossier_fee_status: "pending",
      });

      const result = await createMolliePaymentDirect({
        customer_id: effectiveCustomerId,
        amount,
        description: `Frais de dossier — Contrat ${contract.id.slice(0, 8)}`,
        contract_id: contract.id,
        company_id: companyId,
      });

      if (!result?.success) throw new Error(result?.error || "Échec du prélèvement");

      await updateContract(contract.id, {
        dossier_fee_mollie_id: result?.data?.id || null,
        dossier_fee_status: "paid",
        dossier_fee_paid_at: new Date().toISOString(),
      });

      toast.success(`Frais de dossier de ${amount}€ prélevés avec succès`);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du prélèvement");
      await updateContract(contract.id, { dossier_fee_status: "failed" }).catch(() => {});
    } finally {
      setDossierLoading(false);
    }
  }, [dossierAmount, effectiveCustomerId, contract, companyId, onSuccess]);

  // ── Activation assurance annuelle ────────────────────────────────────────
  const handleActivateInsurance = useCallback(async () => {
    const amount = parseFloat(insuranceAmount);
    if (!amount || amount <= 0) { toast.error("Montant invalide"); return; }
    if (!effectiveCustomerId) { toast.error("Aucun mandat SEPA disponible"); return; }

    setInsuranceLoading(true);
    try {
      await updateContract(contract.id, { insurance_fee_amount: amount, insurance_fee_active: false });

      const subResult = await createMollieSubscription({
        customer_id: effectiveCustomerId,
        amount,
        interval: "12 months",
        start_date: insuranceStartDate,
        description: `Assurance annuelle — Contrat ${contract.id.slice(0, 8)}`,
        contract_id: contract.id,
        company_id: companyId,
      });

      if (!subResult.success || !(subResult.data as any)?.id) {
        throw new Error(subResult.error || "Échec création abonnement assurance");
      }

      const subId = (subResult.data as any).id as string;
      const nextDate = (subResult.data as any).nextPaymentDate || insuranceStartDate;

      await updateContract(contract.id, {
        insurance_fee_mollie_id: subId,
        insurance_fee_active: true,
        insurance_fee_next_date: nextDate,
      });

      toast.success(`Assurance annuelle de ${amount}€ activée`);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'activation");
    } finally {
      setInsuranceLoading(false);
    }
  }, [insuranceAmount, insuranceStartDate, effectiveCustomerId, contract, companyId, onSuccess]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Prélèvements SEPA
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Frais de dossier et assurance prélevés directement sur le compte client
          </p>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* ── Statut du mandat ──────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Mandat SEPA</span>
              </div>
              {hasActiveMandateForFees ? (
                <Badge className="bg-emerald-100 text-emerald-700 text-[11px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Prêt
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Non configuré
                </Badge>
              )}
            </div>

            {hasActiveMandateForFees ? (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  {existingMandateValid && !feesMandate ? (
                    <>
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        Mandat self-leasing réutilisé
                        <span className="ml-1 font-mono text-[10px] opacity-60">
                          ({effectiveMandateId?.slice(0, 16)}…)
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground">
                        {contract.fees_iban ? maskIban(contract.fees_iban) : "IBAN configuré"}
                      </span>
                    </>
                  )}
                </div>
                {!existingMandateValid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground px-2 shrink-0"
                    onClick={() => setShowIbanDialog(true)}
                  >
                    Modifier
                  </Button>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                className="w-full h-9 text-xs"
                onClick={() => setShowIbanDialog(true)}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Configurer le mandat SEPA (IBAN)
              </Button>
            )}
          </div>

          <Separator />

          {/* ── Frais de dossier ──────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Frais de dossier</span>
                <Badge variant="outline" className="text-[10px]">Optionnel</Badge>
              </div>
              {dossierIsPaid ? (
                <Badge className="bg-emerald-100 text-emerald-700 text-[11px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Prélevé
                </Badge>
              ) : (
                <Switch
                  checked={dossierEnabled}
                  onCheckedChange={setDossierEnabled}
                  disabled={!hasActiveMandateForFees}
                />
              )}
            </div>

            {dossierIsPaid ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-medium">
                  {contract.dossier_fee_amount}€ prélevés
                </span>
                {contract.dossier_fee_paid_at && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(contract.dossier_fee_paid_at), "dd MMM yyyy", { locale: fr })}
                  </span>
                )}
              </div>
            ) : dossierEnabled && hasActiveMandateForFees ? (
              <div className="space-y-2 pl-1">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Montant (€)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={dossierAmount}
                    onChange={(e) => setDossierAmount(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="250"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full h-9 text-xs"
                  onClick={handleTriggerDossierFee}
                  disabled={dossierLoading}
                >
                  {dossierLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    : <Euro className="h-3.5 w-3.5 mr-1.5" />}
                  Prélever {dossierAmount ? `${dossierAmount}€` : ""} maintenant
                </Button>
              </div>
            ) : !hasActiveMandateForFees && dossierEnabled ? (
              <Alert className="py-2 border-amber-200 bg-amber-50">
                <Info className="h-3.5 w-3.5 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700 ml-1">
                  Configurez d'abord le mandat SEPA
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <Separator />

          {/* ── Assurance annuelle ────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Assurance annuelle</span>
              </div>
              {insuranceIsActive ? (
                <Badge className="bg-blue-100 text-blue-700 text-[11px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              ) : (
                <Switch
                  checked={insuranceEnabled}
                  onCheckedChange={setInsuranceEnabled}
                  disabled={!hasActiveMandateForFees}
                />
              )}
            </div>

            {insuranceIsActive ? (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-700">
                    {contract.insurance_fee_amount}€ / an
                  </span>
                  <span className="text-[11px] text-blue-500 font-mono">
                    {contract.insurance_fee_mollie_id?.slice(0, 16)}…
                  </span>
                </div>
                {contract.insurance_fee_next_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Prochain prélèvement :{" "}
                    {format(new Date(contract.insurance_fee_next_date), "dd MMMM yyyy", { locale: fr })}
                  </div>
                )}
              </div>
            ) : insuranceEnabled && hasActiveMandateForFees ? (
              <div className="space-y-2 pl-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Montant annuel (€)</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={insuranceAmount}
                      onChange={(e) => setInsuranceAmount(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Date de début</Label>
                    <Input
                      type="date"
                      value={insuranceStartDate}
                      onChange={(e) => setInsuranceStartDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Prélèvement automatique tous les 12 mois via le même mandat
                </p>
                <Button
                  size="sm"
                  className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleActivateInsurance}
                  disabled={insuranceLoading}
                >
                  {insuranceLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    : <Shield className="h-3.5 w-3.5 mr-1.5" />}
                  Activer l'assurance annuelle
                </Button>
              </div>
            ) : !hasActiveMandateForFees && insuranceEnabled ? (
              <Alert className="py-2 border-amber-200 bg-amber-50">
                <Info className="h-3.5 w-3.5 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700 ml-1">
                  Configurez d'abord le mandat SEPA
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

        </CardContent>
      </Card>

      {/* ── Dialog: saisie IBAN (contrats sans mandat existant) ──────────── */}
      <Dialog open={showIbanDialog} onOpenChange={setShowIbanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Configurer le prélèvement SEPA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-3.5 w-3.5 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700 ml-1">
                Un mandat SEPA sera créé au nom de{" "}
                <strong>{contract.client_name}</strong> via Mollie. Utilisé
                uniquement pour les frais de dossier et l'assurance.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">
                  IBAN du client <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={ibanInput}
                  onChange={(e) =>
                    setIbanInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                  }
                  placeholder="BE68539007547034"
                  className="mt-1 font-mono tracking-wider"
                  maxLength={34}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">BIC/SWIFT (optionnel)</Label>
                <Input
                  value={bicInput}
                  onChange={(e) => setBicInput(e.target.value.toUpperCase())}
                  placeholder="GEBABEBB"
                  className="mt-1 font-mono uppercase"
                  maxLength={11}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowIbanDialog(false)} disabled={ibanLoading}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSetupIban} disabled={ibanLoading || ibanInput.length < 15}>
              {ibanLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Configuration...</>
                : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Créer le mandat SEPA</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContractFeesSepaCard;
