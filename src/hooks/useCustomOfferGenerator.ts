import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { createOffer } from '@/services/offers/createOffer';

export interface OfferFormData {
  // Client Information
  clientInfo: {
    name: string;
    email: string;
    company: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber: string;
    contactName: string;
  };
  
  // Business Profile
  businessProfile: {
    sector: string;
    teamSize: number;
    budget: number;
    workStyle: 'office' | 'remote' | 'hybrid';
    priority: 'performance' | 'mobility' | 'budget';
    specificNeeds: string[];
  };
  
  // Equipment Selection
  equipment: Array<{
    id: string;
    title: string;
    purchasePrice: number;
    quantity: number;
    margin: number;
    monthlyPayment: number;
    attributes?: Record<string, any>;
    specifications?: Record<string, any>;
  }>;
  
  // Financing Configuration
  financing: {
    leaserId: string;
    duration: number;
    coefficient: number;
    totalAmount: number;
    monthlyPayment: number;
    margin: number;
    commission: number;
  };
  
  // Additional Options
  options: {
    templateType: 'standard' | 'ambassador';
    includeMaintenance: boolean;
    includeInsurance: boolean;
    deliveryOptions: string;
    remarks: string;
  };
}

const initialFormData: OfferFormData = {
  clientInfo: {
    name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    vatNumber: '',
    contactName: '',
  },
  businessProfile: {
    sector: '',
    teamSize: 1,
    budget: 0,
    workStyle: 'office',
    priority: 'performance',
    specificNeeds: [],
  },
  equipment: [],
  financing: {
    leaserId: '',
    duration: 36,
    coefficient: 0,
    totalAmount: 0,
    monthlyPayment: 0,
    margin: 0,
    commission: 0,
  },
  options: {
    templateType: 'standard',
    includeMaintenance: false,
    includeInsurance: false,
    deliveryOptions: '',
    remarks: '',
  },
};

export const useCustomOfferGenerator = () => {
  const [currentStep, setCurrentStep] = useState<string>('client');
  const [formData, setFormData] = useState<OfferFormData>(initialFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateFormData = useCallback((section: keyof OfferFormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
  }, []);

  const validateStep = useCallback((step: string): boolean => {
    switch (step) {
      case 'client':
        return !!(
          formData.clientInfo.name &&
          formData.clientInfo.email &&
          formData.clientInfo.company
        );
      
      case 'profile':
        return !!(
          formData.businessProfile.sector &&
          formData.businessProfile.teamSize > 0 &&
          formData.businessProfile.budget > 0
        );
      
      case 'equipment':
        return formData.equipment.length > 0;
      
      case 'financing':
        return !!(
          formData.financing.leaserId &&
          formData.financing.coefficient > 0 &&
          formData.financing.monthlyPayment > 0
        );
      
      case 'preview':
        return true;
      
      default:
        return false;
    }
  }, [formData]);

  const calculateTotals = useCallback(() => {
    const totalPurchasePrice = formData.equipment.reduce((sum, eq) => 
      sum + (eq.purchasePrice * eq.quantity), 0
    );
    
    const totalMargin = formData.equipment.reduce((sum, eq) => 
      sum + (eq.purchasePrice * eq.quantity * eq.margin / 100), 0
    );
    
    const totalAmount = totalPurchasePrice + totalMargin;
    
    const totalMonthlyPayment = formData.equipment.reduce((sum, eq) => 
      sum + eq.monthlyPayment, 0
    );

    return {
      totalPurchasePrice,
      totalMargin,
      totalAmount,
      totalMonthlyPayment
    };
  }, [formData.equipment]);

  const generateOffer = useCallback(async (): Promise<string | null> => {
    setIsGenerating(true);
    setProgress(0);

    try {
      const totals = calculateTotals();
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Create client if needed
      let clientId = null;
      setProgress(30);
      
      // For now, we'll create the offer without creating a separate client
      // In a real implementation, you might want to create/find the client first
      
      setProgress(60);

      // Prepare offer data
      const offerData = {
        client_id: null, // Will be created or linked later
        company_id: null, // Will be set by createOffer
        client_name: formData.clientInfo.name,
        client_email: formData.clientInfo.email,
        equipment_description: JSON.stringify(formData.equipment),
        amount: totals.totalAmount,
        coefficient: formData.financing.coefficient,
        monthly_payment: totals.totalMonthlyPayment,
        margin: totals.totalMargin,
        financed_amount: totals.totalAmount,
        status: 'pending',
        workflow_status: 'draft',
        type: 'client_request',
        equipment: formData.equipment,
        remarks: formData.options.remarks,
      };

      setProgress(80);

      // Create the offer
      const { data, error } = await createOffer(offerData);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw new Error(error.message || 'Erreur lors de la création de l\'offre');
      }

      if (!data?.id) {
        throw new Error('Aucun ID d\'offre retourné');
      }

      toast.success('Offre générée avec succès !');
      return data.id;

    } catch (error) {
      console.error('Error generating offer:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération de l\'offre');
      return null;
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [formData, calculateTotals]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep('client');
  }, []);

  return {
    currentStep,
    setCurrentStep,
    formData,
    updateFormData,
    validateStep,
    generateOffer,
    isGenerating,
    progress,
    calculateTotals,
    resetForm,
  };
};