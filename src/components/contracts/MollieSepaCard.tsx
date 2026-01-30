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
  Euro,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { setupMollieSepa } from "@/utils/mollie";

interface MollieSepaCardProps {
  contract: {
    id: string;
    client_name: string;
    client_email?: string | null;
    monthly_payment: number | null;
    contract_duration?: number | null;
    lease_duration?: number | null;
  };
  companyId: string;
  onSuccess?: (customerId: string) => void;
}

export default function MollieSepaCard({ contract, companyId, onSuccess }: MollieSepaCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: contract.client_email || "",
    montant: contract.monthly_payment || 0,
    nombre_mois: contract.contract_duration || contract.lease_duration || 12,
    description: `Loyer mensuel - Contrat ${contract.id.substring(0, 8)}`,
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
    if (formData.montant <= 0) {
      toast.error("Le montant mensuel doit être positif");
      return;
    }

    try {
      setSending(true);

      const result = await setupMollieSepa(
        {
          name: `${formData.prenom} ${formData.nom}`,
          email: formData.email.trim(),
          contract_id: contract.id,
          company_id: companyId,
        },
        {
          amount: 0.01, // First payment for mandate authorization
          description: "Autorisation mandat SEPA - " + formData.description,
          contract_id: contract.id,
          company_id: companyId,
        }
      );

      if (result.success && result.redirectUrl) {
        setSuccess(true);
        setRedirectUrl(result.redirectUrl);
        toast.success("Client créé ! Envoyez le lien d'autorisation au client.");
        if (result.customerId) {
          onSuccess?.(result.customerId);
        }
      } else {
        toast.error(result.error || "Erreur lors de la configuration");
      }
    } catch (error) {
      console.error("Error setting up SEPA:", error);
      toast.error("Erreur lors de la configuration du prélèvement");
    } finally {
      setSending(false);
    }
  };

  const handleOpenMollie = () => {
    if (redirectUrl) {
      window.open(redirectUrl, "_blank");
    }
  };

  const handleCopyLink = async () => {
    if (redirectUrl) {
      await navigator.clipboard.writeText(redirectUrl);
      toast.success("Lien copié dans le presse-papier !");
    }
  };

  if (success && redirectUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Mandat SEPA prêt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Le client Mollie a été créé. Envoyez le lien ci-dessous au client pour qu'il autorise le prélèvement SEPA.
          </p>
          
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Lien d'autorisation :</p>
            <p className="text-sm break-all font-mono">{redirectUrl}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopyLink} variant="outline" className="flex-1">
              Copier le lien
            </Button>
            <Button onClick={handleOpenMollie} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir Mollie
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Une fois le client autorisé, vous pourrez créer les prélèvements récurrents.
            </AlertDescription>
          </Alert>

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
                <CreditCard className="h-5 w-5 text-primary" />
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
          Créez un client Mollie et générez un lien d'autorisation de mandat SEPA
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
              Cette action crée un client Mollie et génère un lien d'autorisation.
              Le client devra cliquer sur ce lien pour autoriser le prélèvement SEPA.
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
              Créer le client Mollie
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
