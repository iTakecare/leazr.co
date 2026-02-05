import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Euro,
  Landmark,
  Calendar,
  Pencil,
  Clock,
  XCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  setupMollieSepaComplete, 
  updateMollieSubscription, 
  getMollieSubscription, 
  getMolliePayments,
  createMolliePayment,
  MollieSubscriptionDetails,
  MolliePayment
} from "@/utils/mollie";
import IBANInput from "./IBANInput";

interface MollieSepaCardProps {
  contract: {
    id: string;
    client_name: string;
    client_email?: string | null;
    monthly_payment: number | null;
    contract_duration?: number | null;
    lease_duration?: number | null;
    // Mollie SEPA fields
    mollie_customer_id?: string | null;
    mollie_mandate_id?: string | null;
    mollie_mandate_status?: string | null;
    mollie_subscription_id?: string | null;
  };
  companyId: string;
  onSuccess?: (customerId: string) => void;
}

interface SepaInfo {
  mandateId: string;
  mandateStatus: string;
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
  firstPaymentDate?: string | null;
}

export default function MollieSepaCard({ contract, companyId, onSuccess }: MollieSepaCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sepaInfo, setSepaInfo] = useState<SepaInfo | null>(null);
  const [paymentDay, setPaymentDay] = useState<number>(1);
  const [editPaymentDayOpen, setEditPaymentDayOpen] = useState(false);
  const [newPaymentDay, setNewPaymentDay] = useState<number>(1);
  const [updatingPaymentDay, setUpdatingPaymentDay] = useState(false);
  
  // NEW: State for subscription details and payments
  const [subscriptionDetails, setSubscriptionDetails] = useState<MollieSubscriptionDetails | null>(null);
  const [recentPayments, setRecentPayments] = useState<MolliePayment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [retryingPaymentId, setRetryingPaymentId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: contract.client_email || "",
    iban: "",
    bic: "",
    montant: contract.monthly_payment || 0,
    nombre_mois: contract.contract_duration || contract.lease_duration || 12,
    description: `Loyer mensuel - Contrat ${contract.id.substring(0, 8)}`,
  });
  const [ibanValid, setIbanValid] = useState(false);

  // Fetch payment day from company settings
  useEffect(() => {
    const fetchPaymentDay = async () => {
      if (!companyId) return;
      try {
        const { data } = await supabase
          .from('company_customizations')
          .select('payment_day')
          .eq('company_id', companyId)
          .maybeSingle();
        if (data?.payment_day) {
          setPaymentDay(data.payment_day);
          setNewPaymentDay(data.payment_day);
        }
      } catch (error) {
        console.error('Error fetching payment day:', error);
      }
    };
    fetchPaymentDay();
  }, [companyId]);

  const handleUpdatePaymentDay = async () => {
    if (!contract.mollie_customer_id || !contract.mollie_subscription_id) {
      toast.error("Aucun abonnement Mollie configuré");
      return;
    }

    try {
      setUpdatingPaymentDay(true);

      // Calculate new start date based on new payment day
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, newPaymentDay);
      const newStartDate = nextMonth.toISOString().split("T")[0];

      const result = await updateMollieSubscription({
        customer_id: contract.mollie_customer_id,
        subscription_id: contract.mollie_subscription_id,
        new_start_date: newStartDate,
        contract_id: contract.id,
        company_id: companyId,
      });

      if (result.success) {
        // Update company settings with new payment day
        await supabase
          .from('company_customizations')
          .update({ payment_day: newPaymentDay })
          .eq('company_id', companyId);

        setPaymentDay(newPaymentDay);
        setEditPaymentDayOpen(false);
        toast.success(`Jour de prélèvement modifié au ${newPaymentDay === 1 ? '1er' : newPaymentDay} du mois`);
      } else {
        toast.error(result.error || "Erreur lors de la modification");
      }
    } catch (error) {
      console.error("Error updating payment day:", error);
      toast.error("Erreur lors de la modification du jour de prélèvement");
    } finally {
      setUpdatingPaymentDay(false);
    }
  };

  // Check for existing mandate on load
  React.useEffect(() => {
    if (contract.mollie_mandate_id && contract.mollie_mandate_status) {
      setSepaInfo({
        mandateId: contract.mollie_mandate_id,
        mandateStatus: contract.mollie_mandate_status,
        subscriptionId: contract.mollie_subscription_id,
        subscriptionStatus: contract.mollie_subscription_id ? "active" : null,
      });
      setSuccess(true);
    }
  }, [contract.mollie_mandate_id, contract.mollie_mandate_status, contract.mollie_subscription_id]);

  // NEW: Fetch subscription details and payment history from Mollie
  const fetchMollieDetails = async () => {
    if (!contract.mollie_customer_id) return;
    
    setLoadingDetails(true);
    try {
      // Fetch subscription and payments in parallel
      const [subResult, paymentsResult] = await Promise.all([
        contract.mollie_subscription_id 
          ? getMollieSubscription(contract.mollie_customer_id, contract.mollie_subscription_id)
          : Promise.resolve({ success: false as const, data: undefined, error: undefined }),
        getMolliePayments(contract.mollie_customer_id, 5)
      ]);

      if (subResult.success && subResult.data) {
        setSubscriptionDetails(subResult.data);
      }

      if (paymentsResult.success && paymentsResult.data) {
        setRecentPayments(paymentsResult.data);
      }
    } catch (error) {
      console.error("Error fetching Mollie details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch details when subscription exists
  useEffect(() => {
    if (contract.mollie_customer_id && (contract.mollie_subscription_id || contract.mollie_mandate_id)) {
      fetchMollieDetails();
    }
  }, [contract.mollie_customer_id, contract.mollie_subscription_id, contract.mollie_mandate_id]);

  // Handle retry payment for failed/expired/canceled payments
  const handleRetryPayment = async (payment: MolliePayment) => {
    if (!contract.mollie_customer_id) {
      toast.error("Aucun client Mollie configuré");
      return;
    }

    try {
      setRetryingPaymentId(payment.id);
      
      const result = await createMolliePayment({
        customer_id: contract.mollie_customer_id,
        mandate_id: contract.mollie_mandate_id || undefined,
        amount: parseFloat(payment.amount.value),
        description: payment.description || `Loyer mensuel - Contrat ${contract.id.substring(0, 8)}`,
        contract_id: contract.id,
        company_id: companyId,
      });

      if (result.success) {
        toast.success("Prélèvement relancé avec succès");
        // Refresh history
        await fetchMollieDetails();
      } else {
        toast.error(result.error || "Erreur lors de la relance");
      }
    } catch (error) {
      console.error("Retry payment error:", error);
      toast.error("Erreur lors de la relance du prélèvement");
    } finally {
      setRetryingPaymentId(null);
    }
  };

  // Extract first/last name from client_name
  React.useEffect(() => {
    if (contract.client_name) {
      const parts = contract.client_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        setFormData(prev => ({
          ...prev,
          prenom: parts[0],
          nom: parts.slice(1).join(" "),
        }));
      } else if (parts.length === 1) {
        setFormData(prev => ({
          ...prev,
          nom: parts[0],
        }));
      }
    }
  }, [contract.client_name]);

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIbanChange = (value: string, isValid: boolean) => {
    setFormData(prev => ({ ...prev, iban: value }));
    setIbanValid(isValid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.nom.trim() || !formData.prenom.trim()) {
      toast.error("Veuillez renseigner le nom et le prénom");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Veuillez renseigner l'email");
      return;
    }
    if (!formData.iban.trim() || !ibanValid) {
      toast.error("Veuillez saisir un IBAN valide");
      return;
    }
    if (formData.montant <= 0) {
      toast.error("Le montant mensuel doit être positif");
      return;
    }

    try {
      setSending(true);

      const result = await setupMollieSepaComplete({
        name: `${formData.prenom} ${formData.nom}`,
        email: formData.email.trim(),
        consumer_name: `${formData.prenom} ${formData.nom}`,
        iban: formData.iban,
        bic: formData.bic || undefined,
        amount: formData.montant,
        times: formData.nombre_mois,
        description: formData.description,
        contract_id: contract.id,
        company_id: companyId,
      });

      if (result.success && result.mandateId) {
        setSuccess(true);
        setSepaInfo({
          mandateId: result.mandateId,
          mandateStatus: result.mandateStatus || "pending",
          subscriptionId: result.subscriptionId,
          subscriptionStatus: result.subscriptionStatus,
          firstPaymentDate: result.firstPaymentDate,
        });
        
        if (result.subscriptionId) {
          toast.success("Mandat SEPA et abonnement créés avec succès !");
        } else if (result.subscriptionError) {
          toast.warning(`Mandat créé, mais l'abonnement a échoué : ${result.subscriptionError}`);
        } else {
          toast.success("Mandat SEPA créé avec succès !");
        }
        
        if (result.customerId) {
          onSuccess?.(result.customerId);
        }
      } else {
        toast.error(result.error || "Erreur lors de la création du mandat");
      }
    } catch (error) {
      console.error("Error setting up SEPA:", error);
      toast.error("Erreur lors de la configuration du prélèvement");
    } finally {
      setSending(false);
    }
  };

  const getMandateStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-emerald-600 hover:bg-emerald-600">Valide</Badge>;
      case "pending":
        return <Badge className="bg-amber-500 hover:bg-amber-500">En attente</Badge>;
      case "invalid":
        return <Badge variant="destructive">Invalide</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Payé
          </Badge>
        );
      case "pending":
      case "open":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-500 gap-1">
            <Clock className="h-3 w-3" />
            En cours
          </Badge>
        );
      case "failed":
      case "expired":
      case "canceled":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {status === "failed" ? "Échoué" : status === "expired" ? "Expiré" : "Annulé"}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  if (success && sepaInfo) {
    // Use contract values for display when loading existing data
    const displayAmount = contract.monthly_payment || formData.montant;
    const displayMonths = contract.contract_duration || contract.lease_duration || formData.nombre_mois;
    const totalAmount = displayAmount * displayMonths;
    const hasSubscription = sepaInfo.subscriptionId || contract.mollie_subscription_id;
    const subscriptionIdToDisplay = sepaInfo.subscriptionId || contract.mollie_subscription_id;
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Prélèvement SEPA configuré
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={fetchMollieDetails}
              disabled={loadingDetails}
              title="Rafraîchir les informations"
            >
              <RefreshCw className={`h-4 w-4 ${loadingDetails ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mandate info */}
          <div className="p-4 bg-muted rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mandat</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{sepaInfo.mandateId}</span>
                {getMandateStatusBadge(sepaInfo.mandateStatus)}
              </div>
            </div>
            {hasSubscription && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Abonnement</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{subscriptionIdToDisplay}</span>
                  <Badge className="bg-sky-600 hover:bg-sky-600">Actif</Badge>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Jour de prélèvement
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{paymentDay === 1 ? '1er' : paymentDay} du mois</span>
                {(sepaInfo.subscriptionId || contract.mollie_subscription_id) && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setEditPaymentDayOpen(true)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            {formData.iban && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">IBAN</span>
                <span className="font-mono text-sm">{formData.iban.substring(0, 4)}****{formData.iban.slice(-4)}</span>
              </div>
            )}
          </div>

          {/* NEW: Next payment section */}
          {hasSubscription && (subscriptionDetails || loadingDetails) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Prochain prélèvement
                </h4>
                {loadingDetails ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Chargement...</span>
                  </div>
                ) : subscriptionDetails?.nextPaymentDate ? (
                  <div className="p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        📅 {formatDate(subscriptionDetails.nextPaymentDate)}
                      </span>
                      <span className="font-semibold">
                        {parseFloat(subscriptionDetails.amount?.value || displayAmount.toString()).toFixed(2)} €
                      </span>
                    </div>
                    {subscriptionDetails.timesRemaining && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Prélèvements restants : {subscriptionDetails.timesRemaining}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun prélèvement programmé</p>
                )}
              </div>
            </>
          )}

          {/* NEW: Recent payments history */}
          {recentPayments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Historique récent
                </h4>
                <div className="space-y-2">
                  {recentPayments.slice(0, 5).map((payment) => (
                    <div 
                      key={payment.id} 
                      className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                    >
                      <span className="text-muted-foreground">
                        {formatDate(payment.createdAt)}
                      </span>
                      <span className="font-medium">
                        {parseFloat(payment.amount.value).toFixed(2)} €
                      </span>
                      <div className="flex items-center gap-2">
                        {getPaymentStatusBadge(payment.status)}
                        {/* Retry button for failed payments */}
                        {(payment.status === "failed" || payment.status === "expired" || payment.status === "canceled") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryPayment(payment)}
                            disabled={retryingPaymentId === payment.id}
                            className="h-6 px-2 text-xs"
                          >
                            {retryingPaymentId === payment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Relancer
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Subscription summary alert */}
          {hasSubscription && !subscriptionDetails && !loadingDetails && (
            <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                <p className="font-medium">Prélèvements récurrents activés</p>
                <p className="mt-1">
                  {displayAmount.toFixed(2)}€ × {displayMonths} mois = {totalAmount.toFixed(2)}€
                </p>
                {sepaInfo.firstPaymentDate && (
                  <p className="mt-1">
                    Premier prélèvement : {new Date(sepaInfo.firstPaymentDate).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!hasSubscription && sepaInfo.mandateStatus === "valid" && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Le mandat est valide mais l'abonnement n'a pas pu être créé automatiquement.
                Veuillez créer l'abonnement manuellement.
              </AlertDescription>
            </Alert>
          )}

          {!hasSubscription && sepaInfo.mandateStatus !== "valid" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Le mandat est en attente de validation. Les prélèvements seront activés une fois le mandat validé.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <p><strong>Client :</strong> {contract.client_name || `${formData.prenom} ${formData.nom}`}</p>
          </div>

          {/* Dialog for editing payment day */}
          <Dialog open={editPaymentDayOpen} onOpenChange={setEditPaymentDayOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier le jour de prélèvement</DialogTitle>
                <DialogDescription>
                  Choisissez le nouveau jour de prélèvement mensuel. L'abonnement Mollie sera mis à jour.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="payment-day-select">Jour du mois</Label>
                <Select 
                  value={newPaymentDay.toString()} 
                  onValueChange={(val) => setNewPaymentDay(parseInt(val))}
                >
                  <SelectTrigger id="payment-day-select" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day === 1 ? '1er' : day} du mois
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Le prochain prélèvement sera effectué le {newPaymentDay === 1 ? '1er' : newPaymentDay} du mois suivant.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditPaymentDayOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleUpdatePaymentDay} disabled={updatingPaymentDay}>
                  {updatingPaymentDay ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  Mettre à jour
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  if (!isOpen) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Prélèvement SEPA (Mollie)</CardTitle>
                <CardDescription>
                  Configurer un prélèvement automatique via Mollie
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsOpen(true)} className="w-full">
            <Landmark className="h-4 w-4 mr-2" />
            Configurer le prélèvement SEPA
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Configuration du prélèvement SEPA
        </CardTitle>
        <CardDescription>
          Saisissez l'IBAN du client pour créer le mandat de prélèvement SEPA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => handleChange("prenom", e.target.value)}
                placeholder="Jean"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => handleChange("nom", e.target.value)}
                placeholder="Dupont"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="jean.dupont@example.com"
              required
            />
          </div>

          {/* IBAN Input with validation */}
          <IBANInput
            value={formData.iban}
            onChange={handleIbanChange}
            label="IBAN du client"
            required
            showBIC
            bicValue={formData.bic}
            onBICChange={(value) => handleChange("bic", value)}
          />

          {/* Payment info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="montant">Montant mensuel (€) *</Label>
              <Input
                id="montant"
                type="number"
                step="0.01"
                min="0"
                value={formData.montant}
                onChange={(e) => handleChange("montant", parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre_mois">Nombre de mois *</Label>
              <Input
                id="nombre_mois"
                type="number"
                min="1"
                max="120"
                value={formData.nombre_mois}
                onChange={(e) => handleChange("nombre_mois", parseInt(e.target.value) || 12)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Loyer mensuel - Contrat XXX"
            />
          </div>

          {/* Summary */}
          <Alert>
            <Euro className="h-4 w-4" />
            <AlertDescription>
              <strong>Récapitulatif :</strong><br />
              • Client : {formData.prenom} {formData.nom}<br />
              • Paiement : {formData.montant.toFixed(2)}€ × {formData.nombre_mois} mois = {(formData.montant * formData.nombre_mois).toFixed(2)}€
            </AlertDescription>
          </Alert>

          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Le mandat SEPA sera créé directement avec l'IBAN fourni.
              Le client n'aura pas besoin de confirmer via un lien externe.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={sending || !ibanValid}
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Créer le mandat SEPA
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
