import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Receipt, CreditCard } from "lucide-react";

// Valeurs Billit (champ PaymentMethod de l'Order) — cf. docs.billit.be types.
export const BILLIT_PAYMENT_METHODS = [
  { value: 'Wired', label: 'Virement bancaire' },
  { value: 'Domiciliation', label: 'Domiciliation (prélèvement)' },
  { value: 'Bancontact', label: 'Bancontact' },
  { value: 'Visa', label: 'Carte (Visa)' },
  { value: 'Online', label: 'Paiement en ligne' },
  { value: 'Contant', label: 'Espèces' },
  { value: 'PrivateAccount', label: 'Compte privé' },
  { value: 'Other', label: 'Autre' },
];

interface LeaserBillingSettingsProps {
  billingFrequency: string;
  contractStartRule: string;
  paymentMethod: string;
  dueDays: string;
  onBillingFrequencyChange: (value: string) => void;
  onContractStartRuleChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onDueDaysChange: (value: string) => void;
}

const LeaserBillingSettings: React.FC<LeaserBillingSettingsProps> = ({
  billingFrequency,
  contractStartRule,
  paymentMethod,
  dueDays,
  onBillingFrequencyChange,
  onContractStartRuleChange,
  onPaymentMethodChange,
  onDueDaysChange
}) => {
  const billingFrequencyOptions = [
    { value: 'monthly', label: 'Mensuelle' },
    { value: 'quarterly', label: 'Trimestrielle' },
    { value: 'semi-annual', label: 'Semestrielle' },
    { value: 'annual', label: 'Annuelle' }
  ];

  const contractStartRuleOptions = [
    { value: 'next_month_first', label: '1er du mois suivant la livraison' },
    { value: 'next_quarter_first', label: '1er du trimestre suivant la livraison' },
    { value: 'next_semester_first', label: '1er du semestre suivant la livraison' },
    { value: 'next_year_first', label: '1er de l\'année suivante' },
    { value: 'delivery_date', label: 'Date de livraison exacte' },
    { value: 'delivery_date_plus_15', label: 'Date de livraison + 15 jours' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Paramètres de facturation
        </CardTitle>
        <CardDescription>
          Configurez la fréquence de facturation et la règle de démarrage des contrats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="billing_frequency">Fréquence de facturation</Label>
          <Select value={billingFrequency} onValueChange={onBillingFrequencyChange}>
            <SelectTrigger id="billing_frequency">
              <SelectValue placeholder="Sélectionner la fréquence" />
            </SelectTrigger>
            <SelectContent>
              {billingFrequencyOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contract_start_rule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Règle de démarrage du contrat
          </Label>
          <Select value={contractStartRule} onValueChange={onContractStartRuleChange}>
            <SelectTrigger id="contract_start_rule">
              <SelectValue placeholder="Sélectionner la règle" />
            </SelectTrigger>
            <SelectContent>
              {contractStartRuleOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Facturation au bailleur (Billit) : mode de paiement + échéance */}
        <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_payment_method" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Mode de paiement (facture)
            </Label>
            <Select value={paymentMethod || undefined} onValueChange={onPaymentMethodChange}>
              <SelectTrigger id="invoice_payment_method">
                <SelectValue placeholder="Sélectionner le mode" />
              </SelectTrigger>
              <SelectContent>
                {BILLIT_PAYMENT_METHODS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_due_days" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Délai de paiement (jours)
            </Label>
            <Input
              id="invoice_due_days"
              type="number"
              min={0}
              placeholder="ex. 30"
              value={dueDays}
              onChange={(e) => onDueDaysChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Date d'échéance = date de facture + ce nombre de jours.
            </p>
          </div>
        </div>

        {/* Aide visuelle */}
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium mb-1">Exemple :</p>
          <p className="text-muted-foreground">
            {contractStartRule === 'next_quarter_first' 
              ? "Livraison le 15 mars → Début de contrat le 1er avril (trimestre suivant)"
              : contractStartRule === 'next_month_first'
              ? "Livraison le 15 mars → Début de contrat le 1er avril (mois suivant)"
              : "Sélectionnez une règle pour voir un exemple"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaserBillingSettings;
