import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Receipt } from "lucide-react";

interface LeaserBillingSettingsProps {
  billingFrequency: string;
  contractStartRule: string;
  onBillingFrequencyChange: (value: string) => void;
  onContractStartRuleChange: (value: string) => void;
}

const LeaserBillingSettings: React.FC<LeaserBillingSettingsProps> = ({
  billingFrequency,
  contractStartRule,
  onBillingFrequencyChange,
  onContractStartRuleChange
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

  const getExampleText = () => {
    switch (contractStartRule) {
      case 'next_quarter_first':
        return "Exemple : Livraison le 15 mars → Début de contrat le 1er avril (trimestre suivant)";
      case 'next_month_first':
        return "Exemple : Livraison le 15 mars → Début de contrat le 1er avril (mois suivant)";
      case 'next_semester_first':
        return "Exemple : Livraison le 15 mars → Début de contrat le 1er juillet (semestre suivant)";
      case 'next_year_first':
        return "Exemple : Livraison le 15 mars 2024 → Début de contrat le 1er janvier 2025";
      case 'delivery_date':
        return "Exemple : Livraison le 15 mars → Début de contrat le 15 mars";
      case 'delivery_date_plus_15':
        return "Exemple : Livraison le 15 mars → Début de contrat le 30 mars";
      default:
        return "Sélectionnez une règle pour voir un exemple";
    }
  };

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

        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium mb-1">Exemple :</p>
          <p className="text-muted-foreground">
            {getExampleText()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaserBillingSettings;
