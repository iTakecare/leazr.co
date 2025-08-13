import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, ChevronLeft, Package } from "lucide-react";
import { ContractEquipment } from "@/services/contractService";
import { Collaborator } from "@/types/client";
import { DeliverySite } from "@/types/deliverySite";
import { 
  EquipmentDeliveryConfig, 
  EquipmentDeliveryItem, 
  DeliveryMode 
} from "@/types/contractDelivery";
import { createContractEquipmentDeliveries } from "@/services/deliveryService";
import { createCollaborator, getClientCollaborators } from "@/services/clientService";
import { createDeliverySite, getClientDeliverySites } from "@/services/deliverySiteService";
import { toast } from "sonner";
import DeliveryModeStep from "./DeliveryModeStep";
import QuantityDivisionStep from "./QuantityDivisionStep";
import SerialNumberAssignmentStep from "./SerialNumberAssignmentStep";
import DeliveryDestinationStep from "./DeliveryDestinationStep";

interface IndividualDeliveryWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: ContractEquipment[];
  clientId: string;
  contractId: string;
  onComplete: () => void;
}

const IndividualDeliveryWizardModal: React.FC<IndividualDeliveryWizardModalProps> = ({
  open,
  onOpenChange,
  equipment,
  clientId,
  contractId,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [currentEquipmentIndex, setCurrentEquipmentIndex] = useState(0);
  const [deliveryConfigs, setDeliveryConfigs] = useState<EquipmentDeliveryConfig[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [deliverySites, setDeliverySites] = useState<DeliverySite[]>([]);
  const [loading, setLoading] = useState(false);

  const currentEquipment = equipment[currentEquipmentIndex];
  const currentConfig = deliveryConfigs.find(c => c.equipmentId === currentEquipment?.id);

  useEffect(() => {
    if (open) {
      resetWizard();
      loadExistingData();
    }
  }, [open, equipment]);

  const resetWizard = () => {
    setCurrentStep(1);
    setCurrentEquipmentIndex(0);
    
    // Initialiser les configurations pour chaque équipement
    const configs: EquipmentDeliveryConfig[] = equipment.map(eq => ({
      equipmentId: eq.id,
      equipmentTitle: eq.title,
      totalQuantity: eq.quantity,
      hasSerialNumbers: getSerialNumbers(eq).length > 0,
      serialNumbers: getSerialNumbers(eq),
      deliveryItems: []
    }));
    
    setDeliveryConfigs(configs);
  };

  const getSerialNumbers = (item: ContractEquipment): string[] => {
    if (!item.serial_number) return [];
    
    try {
      if (typeof item.serial_number === 'string') {
        const parsed = JSON.parse(item.serial_number);
        if (Array.isArray(parsed)) {
          return parsed.filter(sn => sn && sn.trim());
        }
      }
      return [];
    } catch {
      return [];
    }
  };

  const loadExistingData = async () => {
    try {
      const [collabData, sitesData] = await Promise.all([
        getClientCollaborators(clientId),
        getClientDeliverySites(clientId)
      ]);
      setCollaborators(collabData);
      setDeliverySites(sitesData);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    }
  };

  const updateCurrentConfig = (updates: Partial<EquipmentDeliveryConfig>) => {
    setDeliveryConfigs(prev => prev.map(config => 
      config.equipmentId === currentEquipment.id 
        ? { ...config, ...updates } 
        : config
    ));
  };

  const handleModeChange = (mode: DeliveryMode) => {
    const serialNumbers = getSerialNumbers(currentEquipment);
    let initialItems: EquipmentDeliveryItem[] = [];

    switch (mode) {
      case 'single':
        initialItems = [{
          quantity: currentEquipment.quantity,
          serialNumbers: serialNumbers,
          deliveryType: 'main_client',
          deliveryCountry: 'BE'
        }];
        break;
      case 'split_quantity':
        // Sera configuré dans QuantityDivisionStep
        initialItems = [];
        break;
      case 'individual_serial':
        // Sera configuré dans SerialNumberAssignmentStep
        initialItems = [];
        break;
    }

    updateCurrentConfig({ deliveryItems: initialItems });
  };

  const canProceedToNextStep = (): boolean => {
    if (!currentConfig) return false;

    switch (currentStep) {
      case 1: // Mode selection
        return currentConfig.deliveryItems.length > 0 || 
               (currentEquipment.quantity > 1 || currentConfig.hasSerialNumbers);
      
      case 2: // Item configuration
        if (currentConfig.deliveryItems.length === 0) return false;
        
        // Vérifier que les quantités correspondent
        const totalQuantity = currentConfig.deliveryItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQuantity !== currentEquipment.quantity) return false;
        
        // Vérifier les numéros de série si nécessaire
        if (currentConfig.hasSerialNumbers) {
          const allAssignedSerials = currentConfig.deliveryItems.flatMap(item => item.serialNumbers);
          return allAssignedSerials.length === currentConfig.serialNumbers.length &&
                 currentConfig.serialNumbers.every(sn => allAssignedSerials.includes(sn));
        }
        
        return true;
      
      case 3: // Destination configuration
        return currentConfig.deliveryItems.every(item => {
          switch (item.deliveryType) {
            case 'main_client':
              return true;
            case 'collaborator':
              return !!item.collaboratorId;
            case 'predefined_site':
              return !!item.deliverySiteId;
            case 'specific_address':
              return !!(item.deliveryAddress && item.deliveryCity);
            default:
              return false;
          }
        });
      
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Passer à l'équipement suivant ou terminer
      if (currentEquipmentIndex < equipment.length - 1) {
        setCurrentEquipmentIndex(prev => prev + 1);
        setCurrentStep(1);
      } else {
        // Tous les équipements sont configurés
        handleComplete();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      // Retour à l'équipement précédent
      if (currentEquipmentIndex > 0) {
        setCurrentEquipmentIndex(prev => prev - 1);
        setCurrentStep(3);
      }
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Créer toutes les livraisons individuelles
      for (const config of deliveryConfigs) {
        if (config.deliveryItems.length > 0) {
          await createContractEquipmentDeliveries(config);
        }
      }
      
      toast.success("Configuration des livraisons individuelles sauvegardée");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Mode de livraison";
      case 2: return "Configuration des livraisons";  
      case 3: return "Destinations";
      default: return "";
    }
  };

  const renderCurrentStep = () => {
    if (!currentEquipment || !currentConfig) return null;

    switch (currentStep) {
      case 1:
        return (
          <DeliveryModeStep
            equipment={currentEquipment}
            mode={currentConfig.deliveryItems.length === 1 && 
                  currentConfig.deliveryItems[0].quantity === currentEquipment.quantity ? 'single' : 
                  currentConfig.hasSerialNumbers ? 'individual_serial' : 'split_quantity'}
            onModeChange={handleModeChange}
          />
        );

      case 2:
        if (currentConfig.hasSerialNumbers && 
            !(currentConfig.deliveryItems.length === 1 && 
              currentConfig.deliveryItems[0].quantity === currentEquipment.quantity)) {
          return (
            <SerialNumberAssignmentStep
              equipment={currentEquipment}
              deliveryItems={currentConfig.deliveryItems}
              onDeliveryItemsChange={(items) => updateCurrentConfig({ deliveryItems: items })}
            />
          );
        } else if (currentEquipment.quantity > 1 && 
                   !(currentConfig.deliveryItems.length === 1 && 
                     currentConfig.deliveryItems[0].quantity === currentEquipment.quantity)) {
          return (
            <QuantityDivisionStep
              equipment={currentEquipment}
              deliveryItems={currentConfig.deliveryItems}
              onDeliveryItemsChange={(items) => updateCurrentConfig({ deliveryItems: items })}
            />
          );
        } else {
          // Mode simple, passer directement à l'étape 3
          setCurrentStep(3);
          return null;
        }

      case 3:
        return (
          <DeliveryDestinationStep
            deliveryItems={currentConfig.deliveryItems}
            onDeliveryItemsChange={(items) => updateCurrentConfig({ deliveryItems: items })}
            collaborators={collaborators}
            deliverySites={deliverySites}
          />
        );

      default:
        return null;
    }
  };

  if (!currentEquipment) return null;

  const totalSteps = 3;
  const totalEquipment = equipment.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Configuration individuelle des livraisons - {getStepTitle()}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Équipement {currentEquipmentIndex + 1} sur {totalEquipment}: {currentEquipment.title}
          </div>
        </DialogHeader>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : step < currentStep 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step}
                </div>
                {step < totalSteps && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />}
              </div>
            ))}
          </div>
          
          {/* Indicateur d'équipement */}
          <div className="flex items-center gap-1">
            {equipment.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentEquipmentIndex 
                    ? 'bg-primary' 
                    : index < currentEquipmentIndex 
                    ? 'bg-primary/60' 
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="min-h-[400px]">
          {renderCurrentStep()}
        </div>

        <Separator />

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 1 && currentEquipmentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          
          <Button 
            onClick={nextStep}
            disabled={!canProceedToNextStep() || loading}
          >
            {currentStep === totalSteps && currentEquipmentIndex === totalEquipment - 1 ? 
              (loading ? "Sauvegarde..." : "Terminer la configuration") :
              currentStep === totalSteps ?
              "Équipement suivant" :
              "Suivant"
            }
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IndividualDeliveryWizardModal;