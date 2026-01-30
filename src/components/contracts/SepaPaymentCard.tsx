import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Euro
} from "lucide-react";
import { toast } from "sonner";
import { triggerSepaPayment, SepaPaymentData } from "@/utils/zapier";
import { useAuth } from "@/context/AuthContext";

interface SepaPaymentCardProps {
  contract: {
    id: string;
    client_name: string;
    client_email?: string | null;
    monthly_payment: number | null;
    contract_duration?: number | null;
    lease_duration?: number | null;
  };
  companyId: string;
  onSuccess?: () => void;
}

export default function SepaPaymentCard({ contract, companyId, onSuccess }: SepaPaymentCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: contract.client_email || "",
    iban: "",
    devise: "EUR",
    montant: contract.monthly_payment || 0,
    nombre_mois: contract.contract_duration || contract.lease_duration || 12,
    frais_dossiers: 0,
    assurance_materiel: 0,
  });

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
    if (!formData.iban.trim()) {
      toast.error("Veuillez renseigner l'IBAN");
      return;
    }
    if (formData.montant <= 0) {
      toast.error("Le montant mensuel doit être positif");
      return;
    }

    try {
      setSending(true);

      const paymentData: SepaPaymentData = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim(),
        iban: formData.iban.toUpperCase().replace(/\s/g, ""),
        devise: formData.devise,
        montant: Number(formData.montant),
        nombre_mois: Number(formData.nombre_mois),
        frais_dossiers: Number(formData.frais_dossiers),
        assurance_materiel: Number(formData.assurance_materiel),
      };

      const result = await triggerSepaPayment(companyId, paymentData);

      if (result.success) {
        setSuccess(true);
        toast.success("Demande de prélèvement SEPA envoyée ! Vérifiez Zapier et GoCardless.");
        onSuccess?.();
      } else {
        toast.error(result.error || "Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Error sending SEPA payment:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Demande envoyée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            La demande de prélèvement SEPA a été envoyée à Zapier. 
            Le client recevra les instructions de GoCardless pour valider son mandat.
          </p>
          <Button variant="outline" onClick={() => { setSuccess(false); setIsOpen(false); }}>
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
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Prélèvement SEPA</CardTitle>
                <CardDescription>
                  Configurer un prélèvement automatique via Zapier + GoCardless
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsOpen(true)} className="w-full">
            <CreditCard className="h-4 w-4 mr-2" />
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
          <CreditCard className="h-5 w-5" />
          Configuration du prélèvement SEPA
        </CardTitle>
        <CardDescription>
          Renseignez les informations bancaires du client pour créer le mandat SEPA
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

          <div className="space-y-2">
            <Label htmlFor="iban">IBAN *</Label>
            <Input
              id="iban"
              value={formData.iban}
              onChange={(e) => handleChange("iban", e.target.value.toUpperCase())}
              placeholder="FR14 2004 1010 0505 0001 3M02 606"
              required
            />
            <p className="text-xs text-muted-foreground">
              Format IBAN européen (ex: FR14 2004 1010 0505 0001 3M02 606)
            </p>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frais_dossiers">Frais de dossier (€)</Label>
              <Input
                id="frais_dossiers"
                type="number"
                step="0.01"
                min="0"
                max="75"
                value={formData.frais_dossiers}
                onChange={(e) => handleChange("frais_dossiers", parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Max 75€ HTVA</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assurance_materiel">Assurance matériel (€/an)</Label>
              <Input
                id="assurance_materiel"
                type="number"
                step="0.01"
                min="0"
                value={formData.assurance_materiel}
                onChange={(e) => handleChange("assurance_materiel", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Summary */}
          <Alert>
            <Euro className="h-4 w-4" />
            <AlertDescription>
              <strong>Récapitulatif :</strong><br />
              • Paiement principal : {formData.montant.toFixed(2)}€ × {formData.nombre_mois} mois = {(formData.montant * formData.nombre_mois).toFixed(2)}€<br />
              • Frais de dossier : {formData.frais_dossiers.toFixed(2)}€<br />
              • Assurance matériel : {formData.assurance_materiel.toFixed(2)}€/an
            </AlertDescription>
          </Alert>

          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cette action enverra les données à Zapier qui créera automatiquement le client, 
              le mandat SEPA et les prélèvements dans GoCardless.
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
              disabled={sending}
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Créer le prélèvement
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
