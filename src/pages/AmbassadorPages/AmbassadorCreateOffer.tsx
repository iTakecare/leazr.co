
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import ClientSelector from "@/components/ui/ClientSelector";
import LeaserSelector from "@/components/ui/LeaserSelector";
import EquipmentForm from "@/components/offer/EquipmentForm";
import { EquipmentFormData } from "@/types/equipment";
import { Calculator, FileText, User, Building, Euro, CalendarDays, Package } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";
import AmbassadorCommissionPreview from "@/components/ambassador/AmbassadorCommissionPreview";
import { Badge } from "@/components/ui/badge";

interface OfferData {
  client_id: string;
  leaser_id: string;
  duration: number;
  equipment: EquipmentFormData[];
  notes?: string;
  offer_type: string;
  ambassador_id?: string;
  total_monthly_price: number;
  total_purchase_price: number;
}

const AmbassadorCreateOffer: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedLeaserId, setSelectedLeaserId] = useState<string>("");
  const [equipment, setEquipment] = useState<EquipmentFormData[]>([]);
  const [duration, setDuration] = useState<number>(36);
  const [notes, setNotes] = useState<string>("");
  const [totalMonthlyPrice, setTotalMonthlyPrice] = useState<number>(0);
  const [totalPurchasePrice, setTotalPurchasePrice] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [ambassadorId, setAmbassadorId] = useState<string>("");
  const [commissionLevelId, setCommissionLevelId] = useState<string>("");

  useEffect(() => {
    const fetchAmbassadorProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('ambassador_id, user_type')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Erreur lors de la récupération du profil:", error);
          return;
        }

        if (profile?.ambassador_id) {
          setAmbassadorId(profile.ambassador_id);
          
          // Fetch commission level
          const { data: ambassador, error: ambError } = await supabase
            .from('ambassadors')
            .select('commission_level_id')
            .eq('id', profile.ambassador_id)
            .single();
            
          if (ambassador?.commission_level_id) {
            setCommissionLevelId(ambassador.commission_level_id);
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement du profil:", err);
      }
    };

    fetchAmbassadorProfile();
  }, [user]);

  // Calculate commission using the hook
  const commission = useCommissionCalculator(
    totalMonthlyPrice,
    ambassadorId,
    commissionLevelId,
    equipment.length
  );

  // Calculate totals whenever equipment or duration changes
  useEffect(() => {
    const monthlyTotal = equipment.reduce((sum, item) => {
      return sum + ((item.monthly_price || 0) * (item.quantity || 1));
    }, 0);
    
    const purchaseTotal = equipment.reduce((sum, item) => {
      return sum + ((item.purchase_price || 0) * (item.quantity || 1));
    }, 0);
    
    setTotalMonthlyPrice(monthlyTotal);
    setTotalPurchasePrice(purchaseTotal);
  }, [equipment]);

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return selectedClientId !== "";
      case 2:
        return selectedLeaserId !== "";
      case 3:
        return equipment.length > 0 && equipment.every(item => 
          item.name && item.monthly_price > 0 && item.quantity > 0
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast.error("Veuillez vérifier toutes les informations");
      return;
    }

    setIsSubmitting(true);

    try {
      const offerData: OfferData = {
        client_id: selectedClientId,
        leaser_id: selectedLeaserId,
        duration: duration,
        equipment: equipment,
        notes: notes,
        offer_type: "leasing",
        ambassador_id: ambassadorId,
        total_monthly_price: totalMonthlyPrice,
        total_purchase_price: totalPurchasePrice
      };

      const { data, error } = await supabase
        .from('offers')
        .insert([offerData])
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de l\'offre:', error);
        toast.error("Erreur lors de la création de l'offre");
        return;
      }

      // Insert equipment details
      if (equipment.length > 0) {
        const equipmentData = equipment.map(item => ({
          offer_id: data.id,
          name: item.name,
          description: item.description,
          brand: item.brand,
          model: item.model,
          quantity: item.quantity,
          monthly_price: item.monthly_price,
          purchase_price: item.purchase_price,
          category: item.category,
          specifications: item.specifications
        }));

        const { error: equipmentError } = await supabase
          .from('offer_equipment')
          .insert(equipmentData);

        if (equipmentError) {
          console.error('Erreur lors de l\'ajout des équipements:', equipmentError);
          toast.error("Erreur lors de l'ajout des équipements");
          return;
        }
      }

      // Insert commission record if there's a commission
      if (commission.amount > 0 && ambassadorId) {
        const { error: commissionError } = await supabase
          .from('ambassador_commissions')
          .insert([{
            ambassador_id: ambassadorId,
            offer_id: data.id,
            amount: commission.amount,
            commission_rate: commission.rate,
            status: 'pending'
          }]);

        if (commissionError) {
          console.error('Erreur lors de l\'enregistrement de la commission:', commissionError);
          // Non-blocking error, continue with success flow
        }
      }

      toast.success("Offre créée avec succès!");
      navigate(`/ambassador/offers/${data.id}`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    "Sélection du client",
    "Sélection du bailleur", 
    "Configuration des équipements",
    "Récapitulatif et validation"
  ];

  const stepIcons = [User, Building, Package, FileText];

  const renderStepIndicator = () => (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {stepTitles.map((title, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;
          const Icon = stepIcons[index];
          
          return (
            <div key={stepNumber} className="flex flex-col items-center relative">
              <div className={cn(
                "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors mb-2",
                isActive ? "border-indigo-600 bg-indigo-600 text-white" :
                isCompleted ? "border-green-600 bg-green-600 text-white" :
                "border-gray-300 bg-white text-gray-400"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-sm font-medium text-center max-w-24",
                isActive ? "text-indigo-600" :
                isCompleted ? "text-green-600" :
                "text-gray-400"
              )}>
                {title}
              </span>
              {index < stepTitles.length - 1 && (
                <div className={cn(
                  "absolute top-6 left-12 w-full h-0.5 -z-10",
                  currentStep > stepNumber ? "bg-green-600" : "bg-gray-300"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Sélection du client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClientSelector
                selectedClientId={selectedClientId}
                onClientSelect={setSelectedClientId}
                showCreateOption={true}
              />
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Sélection du bailleur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaserSelector
                selectedLeaser={selectedLeaserId}
                onSelect={setSelectedLeaserId}
              />
              <div className="mt-4">
                <Label htmlFor="duration">Durée du contrat (mois)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 36)}
                  min="12"
                  max="60"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Configuration des équipements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquipmentForm
                equipment={equipment as any}
                onEquipmentChange={setEquipment as any}
                duration={duration}
              />
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* Récapitulatif de l'offre */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Récapitulatif de l'offre
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informations générales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Durée du contrat</Label>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gray-500" />
                      <span>{duration} mois</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Type d'offre</Label>
                    <Badge variant="outline">Leasing</Badge>
                  </div>
                </div>

                <Separator />

                {/* Équipements */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Équipements ({equipment.length} article{equipment.length > 1 ? 's' : ''})
                  </Label>
                  <div className="space-y-3">
                    {equipment.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            {item.brand && (
                              <p className="text-sm text-gray-600">Marque: {item.brand}</p>
                            )}
                            {item.model && (
                              <p className="text-sm text-gray-600">Modèle: {item.model}</p>
                            )}
                            <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-indigo-600">
                              {formatCurrency((item.monthly_price || 0) * (item.quantity || 1))}/mois
                            </div>
                            <div className="text-sm text-gray-500">
                              Prix d'achat: {formatCurrency((item.purchase_price || 0) * (item.quantity || 1))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totaux */}
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Total mensuel</span>
                    <span className="text-xl font-bold text-indigo-600">
                      {formatCurrency(totalMonthlyPrice)}/mois
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Prix d'achat total</span>
                    <span>{formatCurrency(totalPurchasePrice)}</span>
                  </div>
                </div>

                {/* Commission Preview */}
                {ambassadorId && (
                  <>
                    <Separator />
                    <AmbassadorCommissionPreview
                      totalMonthlyPayment={totalMonthlyPrice}
                      ambassadorId={ambassadorId}
                      commissionLevelId={commissionLevelId}
                      equipmentList={equipment}
                    />
                  </>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                    Notes additionnelles (optionnel)
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ajoutez des notes ou commentaires concernant cette offre..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Création d'une nouvelle offre
        </h1>
        <p className="text-gray-600">
          Suivez les étapes pour créer une offre de leasing personnalisée
        </p>
      </div>

      {renderStepIndicator()}

      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2"
        >
          Précédent
        </Button>

        <div className="text-sm text-gray-500">
          Étape {currentStep} sur {stepTitles.length}
        </div>

        {currentStep < stepTitles.length ? (
          <Button
            onClick={nextStep}
            disabled={!validateStep(currentStep)}
            className="flex items-center gap-2"
          >
            Suivant
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !validateStep(currentStep)}
            className="flex items-center gap-2"
          >
            {isSubmitting ? "Création..." : "Créer l'offre"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AmbassadorCreateOffer;
