import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Check, Zap } from 'lucide-react';
import { useCustomOfferGenerator } from '@/hooks/useCustomOfferGenerator';
import ClientInfoStep from './generator/ClientInfoStep';
import BusinessProfileStep from './generator/BusinessProfileStep';
import EquipmentSelectionStep from './generator/EquipmentSelectionStep';
import FinancingConfigurationStep from './generator/FinancingConfigurationStep';
import OfferPreviewStep from './generator/OfferPreviewStep';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomOfferGeneratorProps {
  onComplete?: (offerId: string) => void;
  className?: string;
}

const STEPS = [
  { id: 'client', title: 'Informations client', icon: '👤' },
  { id: 'profile', title: 'Profil d\'activité', icon: '🏢' },
  { id: 'equipment', title: 'Sélection équipements', icon: '💻' },
  { id: 'financing', title: 'Configuration financière', icon: '💰' },
  { id: 'preview', title: 'Aperçu & Génération', icon: '📋' }
];

export const CustomOfferGenerator: React.FC<CustomOfferGeneratorProps> = ({
  onComplete,
  className = ''
}) => {
  const {
    currentStep,
    setCurrentStep,
    formData,
    updateFormData,
    validateStep,
    generateOffer,
    isGenerating,
    progress,
    // Client selection
    clientSelectionMode,
    selectedClientId,
    isClientSelectorOpen,
    setIsClientSelectorOpen,
    loadClientData,
    toggleClientMode,
  } = useCustomOfferGenerator();

  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
  const progressPercentage = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canProceed = validateStep(currentStep);
  const isLastStep = currentStep === 'preview';

  const handleNext = async () => {
    if (isLastStep) {
      try {
        const offerId = await generateOffer();
        if (offerId && onComplete) {
          onComplete(offerId);
        }
      } catch (error) {
        console.error('Error generating offer:', error);
      }
    } else {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < STEPS.length) {
        setCurrentStep(STEPS[nextIndex].id);
      }
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'client':
        return (
          <ClientInfoStep 
            formData={formData} 
            updateFormData={updateFormData}
            clientSelectionMode={clientSelectionMode}
            selectedClientId={selectedClientId}
            isClientSelectorOpen={isClientSelectorOpen}
            setIsClientSelectorOpen={setIsClientSelectorOpen}
            loadClientData={loadClientData}
            toggleClientMode={toggleClientMode}
          />
        );
      case 'profile':
        return (
          <BusinessProfileStep 
            formData={formData} 
            updateFormData={updateFormData} 
          />
        );
      case 'equipment':
        return (
          <EquipmentSelectionStep 
            formData={formData} 
            updateFormData={updateFormData} 
          />
        );
      case 'financing':
        return (
          <FinancingConfigurationStep 
            formData={formData} 
            updateFormData={updateFormData} 
          />
        );
      case 'preview':
        return (
          <OfferPreviewStep 
            formData={formData} 
            updateFormData={updateFormData} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Générateur d'Offres Personnalisé</h1>
        </div>
        <p className="text-muted-foreground">
          Créez votre offre sur mesure en quelques étapes simples
        </p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Étape {currentStepIndex + 1} sur {STEPS.length}
            </span>
            <Badge variant="outline">
              {Math.round(progressPercentage)}% completé
            </Badge>
          </div>
          <Progress value={progressPercentage} className="mb-4" />
          
          {/* Steps Navigation */}
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div 
                key={step.id}
                className={`flex flex-col items-center space-y-1 cursor-pointer transition-opacity ${
                  index <= currentStepIndex ? 'opacity-100' : 'opacity-50'
                }`}
                onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index < currentStepIndex 
                    ? 'bg-primary text-primary-foreground' 
                    : index === currentStepIndex 
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index < currentStepIndex ? <Check className="h-4 w-4" /> : step.icon}
                </div>
                <span className="text-xs text-center max-w-20 leading-tight">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed || isGenerating}
        >
          {isLastStep ? (
            isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Génération en cours... ({progress}%)
              </>
            ) : (
              'Générer l\'offre'
            )
          ) : (
            <>
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CustomOfferGenerator;