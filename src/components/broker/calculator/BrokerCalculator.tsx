import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Leaser } from '@/types/equipment';
import { BrokerEquipmentItem } from '@/types/brokerEquipment';
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
  const { companySlug, brokerSlug } = useParams<{ companySlug?: string; brokerSlug?: string }>();
  
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
  
  // State for equipment management
  const [equipmentList, setEquipmentList] = useState<BrokerEquipmentItem[]>([]);
  const [currentEquipment, setCurrentEquipment] = useState<Partial<BrokerEquipmentItem>>({
    quantity: 1,
    objectType: '',
    manufacturer: '',
    description: '',
    unitPrice: 0
  });
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  // Calculate results for all durations
  const { calculatedResults, durations } = useBrokerCalculator({
    calculationMode,
    inputAmount,
    selectedLeaser
  });

  // Get selected duration result
  const selectedResult = calculatedResults[selectedDuration];
  
  // Budget calculations
  const totalBudget = selectedResult ? selectedResult.purchasePrice : 0;
  const usedBudget = equipmentList.reduce((sum, eq) => sum + eq.totalPrice, 0);
  const remainingBudget = totalBudget - usedBudget;
  
  // Pré-remplir le prix unitaire avec le budget restant
  useEffect(() => {
    // Uniquement si on n'est PAS en mode édition
    if (!editingEquipmentId && currentEquipment.quantity && currentEquipment.quantity > 0) {
      // Si le prix unitaire n'est pas encore défini ou est à 0
      if (!currentEquipment.unitPrice || currentEquipment.unitPrice === 0) {
        const suggestedPrice = remainingBudget / currentEquipment.quantity;
        setCurrentEquipment(prev => ({
          ...prev,
          unitPrice: Math.round(suggestedPrice * 100) / 100 // Arrondir à 2 décimales
        }));
      }
    }
  }, [currentEquipment.quantity, editingEquipmentId]);
  
  // Calculate total margin (0 for now, can be added later)
  const totalMargin = 0;
  
  // Total monthly payment from equipment list
  const totalMonthlyPayment = selectedResult ? selectedResult.monthlyPayment : 0;
  
  // Calculate commission if ambassador offer
  const commission = useOfferCommissionCalculator({
    isInternalOffer: offerType === 'client',
    selectedAmbassadorId: offerType === 'ambassador' ? selectedAmbassadorId : undefined,
    commissionLevelId: commissionLevelId,
    totalMargin,
    equipmentListLength: equipmentList.length,
    totalMonthlyPayment: totalMonthlyPayment,
    totalPurchaseAmount: totalBudget
  });

  // Validation
  const isValid = useMemo(() => {
    if (!selectedLeaser) return false;
    if (!selectedClientId) return false;
    if (inputAmount <= 0) return false;
    if (!selectedResult) return false;
    if (equipmentList.length === 0) return false;
    if (offerType === 'ambassador' && !selectedAmbassadorId) return false;
    
    return true;
  }, [selectedLeaser, selectedClientId, inputAmount, selectedResult, equipmentList, offerType, selectedAmbassadorId]);

  const handleAddEquipment = () => {
    if (!currentEquipment.objectType || !currentEquipment.quantity || currentEquipment.quantity <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir les champs obligatoires (Type et Quantité)",
        variant: "destructive"
      });
      return;
    }
    
    // Utiliser le prix unitaire saisi par l'utilisateur
    const unitPrice = currentEquipment.unitPrice || 0;
    const totalPrice = currentEquipment.quantity * unitPrice;
    
    if (unitPrice <= 0) {
      toast({
        title: "Erreur",
        description: "Le prix unitaire doit être supérieur à 0",
        variant: "destructive"
      });
      return;
    }
    
    if (totalPrice > remainingBudget) {
      toast({
        title: "Erreur",
        description: "Le montant dépasse le budget restant",
        variant: "destructive"
      });
      return;
    }
    
    const newEquipment: BrokerEquipmentItem = {
      id: editingEquipmentId || crypto.randomUUID(),
      objectType: currentEquipment.objectType,
      manufacturer: currentEquipment.manufacturer || '',
      description: currentEquipment.description || '',
      quantity: currentEquipment.quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice
    };
    
    setEquipmentList([...equipmentList, newEquipment]);
    setCurrentEquipment({ quantity: 1, objectType: '', manufacturer: '', description: '', unitPrice: 0 });
    setEditingEquipmentId(null);
  };

  const handleRemoveEquipment = (id: string) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  const handleEditEquipment = (id: string) => {
    const equipmentToEdit = equipmentList.find(eq => eq.id === id);
    if (equipmentToEdit) {
      // Retirer l'équipement de la liste temporairement
      setEquipmentList(equipmentList.filter(eq => eq.id !== id));
      // Charger ses données dans le formulaire
      setCurrentEquipment(equipmentToEdit);
      setEditingEquipmentId(id);
    }
  };

  const prepareOfferData = async () => {
    if (!selectedResult || !selectedClientId) return null;

    try {
      // Récupérer le nom du client depuis la base de données
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('name')
        .eq('id', selectedClientId)
        .single();
      
      if (clientError) {
        console.error('Erreur lors de la récupération du client:', clientError);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les informations du client",
          variant: "destructive"
        });
        return null;
      }
      
      const clientName = clientData?.name || '';
      console.log('📋 Nom du client récupéré:', clientName);

      if (!clientName) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un client valide",
          variant: "destructive"
        });
        return null;
      }

      // Map equipment list to offer format
      const equipment = equipmentList.map(eq => ({
        title: `${eq.objectType}${eq.description ? ' - ' + eq.description : ''}`,
        purchasePrice: eq.unitPrice,
        quantity: eq.quantity,
        margin: 0,
        monthlyPayment: (eq.totalPrice / totalBudget) * selectedResult.monthlyPayment,
        manufacturer: eq.manufacturer || undefined
      }));

      // Get company_id and user_id from user
      let companyId = user?.company;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        toast({
          title: "Erreur",
          description: "Utilisateur non authentifié",
          variant: "destructive"
        });
        return null;
      }

      if (!companyId) {
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

      console.log('👤 User ID récupéré:', userId);

      return {
        user_id: userId,
        client_id: selectedClientId,
        client_name: clientName,
        ambassador_id: offerType === 'ambassador' ? selectedAmbassadorId : null,
        leaser_id: selectedLeaser?.id,
        duration: selectedDuration,
        amount: totalBudget,
        monthly_payment: selectedResult.monthlyPayment,
        financed_amount: totalBudget,
        coefficient: selectedResult.coefficient,
        commission: offerType === 'ambassador' ? commission.amount : 0,
        workflow_status: 'draft' as const,
        status: 'pending' as const,
        equipment: equipment,
        company_id: companyId,
        type: offerType
      };
    } catch (error) {
      console.error('Erreur dans prepareOfferData:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la préparation des données",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      const offerData = await prepareOfferData();
      if (!offerData) return;

      console.log('📤 ENVOI À createOffer:', {
        user_id: offerData.user_id,
        client_id: offerData.client_id,
        client_name: offerData.client_name,
        leaser_id: offerData.leaser_id,
        duration: offerData.duration,
        amount: offerData.amount,
        type: offerData.type,
        equipment_count: offerData.equipment?.length
      });

      const result = await createOffer(offerData);
      
      if (result.error) {
        toast({
          title: "Erreur",
          description: result.error.message || "Une erreur est survenue lors de la création de l'offre",
          variant: "destructive"
        });
        return;
      }

      console.log("✅ Offre créée:", result.data?.id);
      toast({
        title: "Succès",
        description: "Offre créée avec succès"
      });
      
      const targetOffersPath = brokerSlug
        ? `/${brokerSlug}/broker/offers`
        : companySlug
          ? `/${companySlug}/admin/offers`
          : '/dashboard';
      navigate(targetOffersPath);
    } catch (error) {
      console.error('Error creating offer:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la création de l'offre",
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
            totalBudget={totalBudget}
            usedBudget={usedBudget}
            remainingBudget={remainingBudget}
            equipmentList={equipmentList}
            currentEquipment={currentEquipment}
            onEquipmentChange={setCurrentEquipment}
            onAddEquipment={handleAddEquipment}
            onRemoveEquipment={handleRemoveEquipment}
            onEditEquipment={handleEditEquipment}
            editingEquipmentId={editingEquipmentId}
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
