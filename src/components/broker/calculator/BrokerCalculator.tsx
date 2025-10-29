import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Leaser } from '@/types/equipment';
import { useToast } from '@/hooks/use-toast';
import { useBrokerCalculator } from '@/hooks/useBrokerCalculator';
import { useOfferCommissionCalculator } from '@/hooks/useOfferCommissionCalculator';
import { createOffer } from '@/services/offers/createOffer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LeaserSelector from '@/components/ui/LeaserSelector';
import ClientSelector from '@/components/ui/ClientSelector';
import { AmbassadorSelectorAmbassador } from '@/components/ui/AmbassadorSelector';
import BrokerCalculationMode from './BrokerCalculationMode';
import BrokerDurationResults from './BrokerDurationResults';
import BrokerOfferTypeSelector from './BrokerOfferTypeSelector';
import BrokerAdditionalDetailsForm from './BrokerAdditionalDetailsForm';
import BrokerCalculatorActions from './BrokerCalculatorActions';
import { Calculator } from 'lucide-react';

const BrokerCalculator: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State for calculation
  const [calculationMode, setCalculationMode] = useState<'purchase_price' | 'rent'>('purchase_price');
  const [inputAmount, setInputAmount] = useState<number>(0);
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(36);
  const [isLeaserSelectorOpen, setIsLeaserSelectorOpen] = useState(false);
  
  // State for offer details
  const [offerType, setOfferType] = useState<'client' | 'ambassador'>('client');
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState<string | null>(null);
  const [selectedAmbassadorName, setSelectedAmbassadorName] = useState<string>('');
  const [commissionLevelId, setCommissionLevelId] = useState<string | undefined>(undefined);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // State for additional details
  const [quantity, setQuantity] = useState<number>(1);
  const [objectType, setObjectType] = useState<string>('');
  const [manufacturer, setManufacturer] = useState<string>('');
  const [sirenNumber, setSirenNumber] = useState<string>('');
  
  const [isSaving, setIsSaving] = useState(false);

  // Calculate results for all durations
  const { calculatedResults, durations } = useBrokerCalculator({
    calculationMode,
    inputAmount,
    selectedLeaser
  });

  // Get selected duration result
  const selectedResult = calculatedResults[selectedDuration];
  
  // Calculate financed amount
  const financedAmount = selectedResult ? selectedResult.purchasePrice * quantity : 0;
  
  // Calculate total margin (0 for now, can be added later)
  const totalMargin = 0;
  
  // Calculate commission if ambassador offer
  const commission = useOfferCommissionCalculator({
    isInternalOffer: offerType === 'client',
    selectedAmbassadorId: offerType === 'ambassador' ? selectedAmbassadorId : undefined,
    commissionLevelId: commissionLevelId,
    totalMargin,
    equipmentListLength: quantity,
    totalMonthlyPayment: selectedResult ? selectedResult.monthlyPayment * quantity : 0,
    totalPurchaseAmount: financedAmount
  });

  // Validation
  const isValid = useMemo(() => {
    if (!selectedLeaser) return false;
    if (!selectedClientId) return false;
    if (inputAmount <= 0) return false;
    if (!selectedResult) return false;
    if (quantity <= 0) return false;
    if (!objectType.trim()) return false;
    if (offerType === 'ambassador' && !selectedAmbassadorId) return false;
    
    // Validate SIREN format (9 digits)
    const sirenDigits = sirenNumber.replace(/\s/g, '');
    if (sirenDigits && !/^\d{9}$/.test(sirenDigits)) return false;
    
    return true;
  }, [selectedLeaser, selectedClientId, inputAmount, selectedResult, quantity, objectType, offerType, selectedAmbassadorId, sirenNumber]);

  const handleFieldChange = (field: string, value: string | number) => {
    switch (field) {
      case 'quantity':
        setQuantity(value as number);
        break;
      case 'objectType':
        setObjectType(value as string);
        break;
      case 'manufacturer':
        setManufacturer(value as string);
        break;
      case 'sirenNumber':
        setSirenNumber(value as string);
        break;
    }
  };

  const prepareOfferData = async () => {
    if (!selectedResult || !selectedClientId) return null;

    const equipment = [{
      title: objectType,
      purchasePrice: selectedResult.purchasePrice,
      quantity: quantity,
      margin: 0,
      monthlyPayment: selectedResult.monthlyPayment,
      manufacturer: manufacturer || undefined
    }];

    // Get company_id from user
    let companyId = user?.company;
    if (!companyId) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', userData.user.id)
          .single();
        companyId = profile?.company_id;
      }
    }

    if (!companyId) {
      throw new Error('Company ID not found');
    }

    return {
      client_id: selectedClientId,
      client_name: '', // Will be filled by createOffer
      ambassador_id: offerType === 'ambassador' ? selectedAmbassadorId : null,
      leaser_id: selectedLeaser?.id,
      duration: selectedDuration,
      amount: financedAmount, // Required by OfferData
      monthly_payment: selectedResult.monthlyPayment * quantity,
      financed_amount: financedAmount,
      coefficient: selectedResult.coefficient,
      commission: offerType === 'ambassador' ? commission.amount : 0,
      workflow_status: 'draft' as const,
      status: 'pending' as const,
      equipment: equipment,
      company_id: companyId, // Required by OfferData
      remarks: sirenNumber ? `SIREN: ${sirenNumber}` : undefined
    };
  };

  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      const offerData = await prepareOfferData();
      if (!offerData) return;

      const result = await createOffer(offerData);
      
      if ('error' in result) {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Succès",
        description: "Offre créée avec succès"
      });
      
      navigate('/broker/offers');
    } catch (error) {
      console.error('Error creating offer:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création de l'offre",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateOffer = async () => {
    // For now, same as save - can be enhanced later with PDF generation
    await handleSave();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculateur Broker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Leaser and Client Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Leaser</Label>
              <button
                onClick={() => setIsLeaserSelectorOpen(true)}
                className="w-full px-3 py-2 text-left border rounded-md hover:bg-muted transition-colors"
              >
                {selectedLeaser ? selectedLeaser.name : 'Sélectionner un leaser'}
              </button>
            </div>
            
            <div className="space-y-2">
              <Label>Client</Label>
              <ClientSelector
                selectedClientId={selectedClientId}
                onClientSelect={setSelectedClientId}
              />
            </div>
          </div>

          {/* Calculation Mode */}
          <BrokerCalculationMode
            mode={calculationMode}
            onModeChange={setCalculationMode}
          />

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              {calculationMode === 'purchase_price' ? 'Prix d\'achat (HT)' : 'Loyer mensuel'}
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={inputAmount || ''}
              onChange={(e) => setInputAmount(parseFloat(e.target.value) || 0)}
              placeholder="Saisir le montant"
              disabled={!selectedLeaser}
            />
          </div>
        </CardContent>
      </Card>

      {/* Duration Results */}
      {Object.keys(calculatedResults).length > 0 && (
        <BrokerDurationResults
          results={calculatedResults}
          selectedDuration={selectedDuration}
          onSelectDuration={setSelectedDuration}
          calculationMode={calculationMode}
        />
      )}

      {/* Offer Type Selector */}
      {selectedResult && (
        <>
          <BrokerOfferTypeSelector
            offerType={offerType}
            onTypeChange={setOfferType}
            selectedAmbassadorId={selectedAmbassadorId}
            selectedAmbassadorName={selectedAmbassadorName}
            onAmbassadorSelect={(ambassador: AmbassadorSelectorAmbassador) => {
              setSelectedAmbassadorId(ambassador.id);
              setSelectedAmbassadorName(ambassador.name);
              setCommissionLevelId(ambassador.commission_level_id);
            }}
            calculatedCommission={commission}
          />

          {/* Additional Details */}
          <BrokerAdditionalDetailsForm
            quantity={quantity}
            financedAmount={financedAmount}
            objectType={objectType}
            manufacturer={manufacturer}
            sirenNumber={sirenNumber}
            onFieldChange={handleFieldChange}
          />

          {/* Actions */}
          <BrokerCalculatorActions
            onSave={handleSave}
            onPrint={handlePrint}
            onGenerateOffer={handleGenerateOffer}
            isValid={isValid}
            isSaving={isSaving}
          />
        </>
      )}

      {/* Leaser Selector Modal */}
      <LeaserSelector
        isOpen={isLeaserSelectorOpen}
        onClose={() => setIsLeaserSelectorOpen(false)}
        selectedLeaser={selectedLeaser}
        onSelect={setSelectedLeaser}
      />
    </div>
  );
};

export default BrokerCalculator;
