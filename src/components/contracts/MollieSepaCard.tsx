import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Euro,
  Landmark,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setupMollieSepaComplete } from "@/utils/mollie";
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
        }
      } catch (error) {
        console.error('Error fetching payment day:', error);
      }
    };
    fetchPaymentDay();
  }, [companyId]);

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
        return <Badge className="bg-green-600">Valide</Badge>;
      case "pending":
        return <Badge className="bg-yellow-600">En attente</Badge>;
      case "invalid":
        return <Badge variant="destructive">Invalide</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Prélèvement SEPA configuré
          </CardTitle>
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
                  <Badge className="bg-blue-600">Actif</Badge>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Jour de prélèvement
              </span>
              <span className="font-medium">{paymentDay === 1 ? '1er' : paymentDay} du mois</span>
            </div>
            {formData.iban && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">IBAN</span>
                <span className="font-mono text-sm">{formData.iban.substring(0, 4)}****{formData.iban.slice(-4)}</span>
              </div>
            )}
          </div>

          {/* Subscription details */}
          {hasSubscription && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
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
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
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
            <p><strong>Client :</strong> {formData.prenom} {formData.nom}</p>
          </div>

          <Button variant="ghost" onClick={() => { setSuccess(false); setIsOpen(false); }}>
            Fermer
          </Button>
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
