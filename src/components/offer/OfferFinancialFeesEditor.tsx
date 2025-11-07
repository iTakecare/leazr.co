import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Check, X, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { updateOffer } from '@/services/offers/offerDetail';
import { calculateAnnualInsurance } from '@/utils/insuranceCalculator';
import { formatCurrency } from '@/utils/formatters';

interface OfferFinancialFeesEditorProps {
  offerId: string;
  currentFileFee?: number;
  currentAnnualInsurance?: number;
  totalMonthlyPayment: number;
  contractDuration: number;
  onUpdate?: () => void;
}

export const OfferFinancialFeesEditor: React.FC<OfferFinancialFeesEditorProps> = ({
  offerId,
  currentFileFee = 0,
  currentAnnualInsurance = 0,
  totalMonthlyPayment,
  contractDuration,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fileFee, setFileFee] = useState(currentFileFee);
  const [annualInsurance, setAnnualInsurance] = useState(currentAnnualInsurance);
  const [isSaving, setIsSaving] = useState(false);

  const handleRecalculateInsurance = () => {
    const calculatedInsurance = calculateAnnualInsurance(totalMonthlyPayment, contractDuration);
    setAnnualInsurance(calculatedInsurance);
    toast.success(`Assurance recalculée : ${formatCurrency(calculatedInsurance)}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateOffer(offerId, {
        file_fee: fileFee,
        annual_insurance: annualInsurance
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast.success('Frais mis à jour avec succès');
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des frais:', error);
      toast.error('Erreur lors de la mise à jour des frais');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFileFee(currentFileFee);
    setAnnualInsurance(currentAnnualInsurance);
    setIsEditing(false);
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
            Frais et assurance
          </CardTitle>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Modifier
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Frais de dossier */}
          <div className="space-y-2">
            <Label htmlFor="file-fee" className="text-sm font-medium text-gray-700">
              Frais de dossier (HTVA)
            </Label>
            {isEditing ? (
              <div className="relative">
                <Input
                  id="file-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fileFee}
                  onChange={(e) => setFileFee(parseFloat(e.target.value) || 0)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
              </div>
            ) : (
              <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(currentFileFee)}
                </span>
              </div>
            )}
          </div>

          {/* Assurance annuelle */}
          <div className="space-y-2">
            <Label htmlFor="annual-insurance" className="text-sm font-medium text-gray-700">
              Assurance annuelle
            </Label>
            {isEditing ? (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="annual-insurance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={annualInsurance}
                    onChange={(e) => setAnnualInsurance(parseFloat(e.target.value) || 0)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    €
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculateInsurance}
                  className="w-full flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Recalculer l'assurance
                </Button>
              </div>
            ) : (
              <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(currentAnnualInsurance)}
                </span>
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Formule de calcul :</strong> Mensualité × Durée × 3,5% (minimum 110€)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
