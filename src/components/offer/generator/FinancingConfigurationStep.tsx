import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, CreditCard, TrendingUp, Info } from 'lucide-react';
import { OfferFormData } from '@/hooks/useCustomOfferGenerator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FinancialSummary from '@/components/offer/FinancialSummary';

interface FinancingConfigurationStepProps {
  formData: OfferFormData;
  updateFormData: (section: keyof OfferFormData, data: any) => void;
}

const DURATION_OPTIONS = [
  { value: 12, label: '12 mois', description: 'Court terme' },
  { value: 24, label: '24 mois', description: 'Moyen terme' },
  { value: 36, label: '36 mois', description: 'Standard' },
  { value: 48, label: '48 mois', description: 'Long terme' },
  { value: 60, label: '60 mois', description: 'Très long terme' }
];

export const FinancingConfigurationStep: React.FC<FinancingConfigurationStepProps> = ({
  formData,
  updateFormData
}) => {
  const { financing, equipment } = formData;
  const [selectedLeaser, setSelectedLeaser] = useState<any>(null);

  // Fetch leasers
  const { data: leasers = [], isLoading: leasersLoading, error: leasersError } = useQuery({
    queryKey: ['leasers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leasers')
        .select(`
          *,
          leaser_ranges (*)
        `);

      if (error) throw error;
      return data || [];
    }
  });

  // Calculate totals
  const totalPurchasePrice = equipment.reduce((sum, eq) => 
    sum + (eq.purchasePrice * eq.quantity), 0
  );

  const totalMargin = equipment.reduce((sum, eq) => 
    sum + (eq.purchasePrice * eq.quantity * eq.margin / 100), 0
  );

  // Le montant financé est le montant total qui sera financé (prix d'achat + marge)
  const totalFinancedAmount = totalPurchasePrice + totalMargin;

  // Calculate monthly payment based on coefficient and duration
  const calculateMonthlyPayment = (financedAmount: number, coefficient: number) => {
    if (!coefficient || coefficient <= 0) return 0;
    return (financedAmount * coefficient) / 100;
  };

  // Update financing when values change
  useEffect(() => {
    const monthlyPayment = calculateMonthlyPayment(totalFinancedAmount, financing.coefficient);
    
    updateFormData('financing', {
      ...financing,
      totalAmount: totalFinancedAmount, // Maintenant c'est le montant financé
      monthlyPayment,
      margin: totalMargin
    });

    // Update equipment monthly payments
    const updatedEquipment = equipment.map(eq => {
      const equipmentFinancedAmount = eq.purchasePrice * eq.quantity * (1 + eq.margin / 100);
      return {
        ...eq,
        monthlyPayment: calculateMonthlyPayment(equipmentFinancedAmount, financing.coefficient)
      };
    });
    
    updateFormData('equipment', updatedEquipment);
  }, [totalFinancedAmount, financing.coefficient, financing.duration]);

  const handleLeaserChange = (leaserId: string) => {
    const leaser = leasers.find(l => l.id === leaserId);
    setSelectedLeaser(leaser);
    
    // Find appropriate coefficient based on financed amount
    let coefficient = 0;
    if (leaser?.leaser_ranges) {
      const range = leaser.leaser_ranges.find((r: any) => 
        totalFinancedAmount >= r.min && totalFinancedAmount <= r.max
      );
      if (range) {
        coefficient = range.coefficient;
      }
    }

    updateFormData('financing', {
      ...financing,
      leaserId,
      coefficient
    });
  };

  const handleDurationChange = (duration: number) => {
    updateFormData('financing', {
      ...financing,
      duration
    });
  };

  const handleCoefficientChange = (coefficient: number) => {
    updateFormData('financing', {
      ...financing,
      coefficient
    });
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Configuration Financière
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configurez les paramètres de financement et calculez les mensualités
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Résumé des équipements */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Résumé Financier
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Prix d'achat</p>
                <p className="font-medium">{totalPurchasePrice.toLocaleString('fr-FR')} €</p>
              </div>
              <div>
                <p className="text-muted-foreground">Marge totale</p>
                <p className="font-medium text-green-600">+{totalMargin.toLocaleString('fr-FR')} €</p>
              </div>
              <div>
                <p className="text-muted-foreground">Montant financé</p>
                <p className="font-bold text-primary">{totalFinancedAmount.toLocaleString('fr-FR')} €</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mensualité</p>
                <p className="font-bold text-lg">
                  {financing.monthlyPayment > 0 
                    ? `${financing.monthlyPayment.toFixed(2)} €/mois`
                    : 'À calculer'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sélection du bailleur */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Bailleur de Financement
          </h3>
          <div className="space-y-2">
            <Label htmlFor="leaser">Sélectionner un bailleur *</Label>
            <Select
              value={financing.leaserId}
              onValueChange={handleLeaserChange}
              disabled={leasersLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  leasersLoading ? "Chargement..." : 
                  leasers.length === 0 ? "Aucun bailleur disponible" :
                  "Choisir un bailleur"
                } />
              </SelectTrigger>
              <SelectContent>
                {leasers.map((leaser) => (
                  <SelectItem key={leaser.id} value={leaser.id}>
                    <div className="flex items-center gap-2">
                      {leaser.logo_url && (
                        <img 
                          src={leaser.logo_url} 
                          alt={leaser.name}
                          className="w-6 h-6 object-contain"
                        />
                      )}
                      {leaser.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {leasersError && (
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                Erreur lors du chargement des bailleurs. Veuillez réessayer.
              </div>
            )}
            
            {!leasersLoading && leasers.length === 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                Aucun bailleur de financement configuré. Contactez votre administrateur.
              </div>
            )}
            
            {selectedLeaser && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">{selectedLeaser.name}</p>
                    <p className="text-blue-700">
                      Coefficient automatiquement calculé selon le montant
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Durée de financement */}
        <div className="space-y-4">
          <h3 className="font-medium">Durée de Financement</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {DURATION_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={financing.duration === option.value ? 'default' : 'outline'}
                className="h-auto p-3 flex flex-col items-center text-center"
                onClick={() => handleDurationChange(option.value)}
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Coefficient personnalisé */}
        <div className="space-y-4">
          <h3 className="font-medium">Coefficient de Financement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coefficient">Coefficient</Label>
              <Input
                id="coefficient"
                type="number"
                min="0"
                step="0.001"
                value={financing.coefficient}
                onChange={(e) => handleCoefficientChange(parseFloat(e.target.value) || 0)}
                placeholder="36.500"
              />
              <p className="text-xs text-muted-foreground">
                Plus le coefficient est élevé, plus la mensualité est faible
              </p>
            </div>
            
            {financing.coefficient > 0 && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Calcul Mensualité</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p>{totalFinancedAmount.toLocaleString('fr-FR')} € × {financing.coefficient}% =</p>
                  <p className="font-bold text-lg">
                    {financing.monthlyPayment.toFixed(2)} € / mois
                  </p>
                  <p className="text-xs">
                    sur {financing.duration} mois
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Simulation */}
        {financing.monthlyPayment > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary">Simulation de Financement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {financing.monthlyPayment.toFixed(2)} €
                  </p>
                  <p className="text-sm text-muted-foreground">Mensualité</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {financing.duration}
                  </p>
                  <p className="text-sm text-muted-foreground">Mois de financement</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {totalMargin.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-sm text-muted-foreground">Marge totale</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>

    {/* Récapitulatif financier */}
    {totalFinancedAmount > 0 && financing.monthlyPayment > 0 && (
      <FinancialSummary 
        offerData={{
          totalPurchasePrice,
          totalFinancedAmount,
          totalMargin,
          monthlyPayment: financing.monthlyPayment,
          coefficient: financing.coefficient
        }}
        useGlobalAdjustment={false}
        onToggleAdjustment={() => {}}
      />
     )}
   </div>
  );
};

export default FinancingConfigurationStep;