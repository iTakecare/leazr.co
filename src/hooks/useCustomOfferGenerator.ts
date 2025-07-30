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
  
  // États pour la sélection de clients
  const [clientSelectionMode, setClientSelectionMode] = useState<'new' | 'existing'>('new');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);

  const updateFormData = useCallback((section: keyof OfferFormData, data: any) => {
    try {
      setFormData(prev => ({
        ...prev,
        [section]: Array.isArray(data) ? data : { ...prev[section], ...data }
      }));
    } catch (error) {
      console.error('Error updating form data:', error);
      toast.error('Erreur lors de la mise à jour des données');
    }
  }, []);

  const validateStep = useCallback((step: string): boolean => {
    console.log(`🔍 DEBUG - Validating step: ${step}`, formData);
    
    switch (step) {
      case 'client':
        const clientValid = !!(
          formData.clientInfo.name &&
          formData.clientInfo.email &&
          formData.clientInfo.company
        );
        console.log(`📋 Client step validation:`, { 
          valid: clientValid, 
          name: formData.clientInfo.name,
          email: formData.clientInfo.email,
          company: formData.clientInfo.company 
        });
        return clientValid;
      
      case 'profile':
        const profileValid = !!(
          formData.businessProfile.sector &&
          formData.businessProfile.teamSize > 0 &&
          formData.businessProfile.budget > 0
        );
        console.log(`🏢 Profile step validation:`, { 
          valid: profileValid, 
          sector: formData.businessProfile.sector,
          teamSize: formData.businessProfile.teamSize,
          budget: formData.businessProfile.budget 
        });
        return profileValid;
      
      case 'equipment':
        const equipmentValid = formData.equipment.length > 0;
        console.log(`💻 Equipment step validation:`, { 
          valid: equipmentValid, 
          count: formData.equipment.length,
          equipment: formData.equipment 
        });
        return equipmentValid;
      
      case 'financing':
        const financingValid = !!(
          formData.financing.leaserId &&
          formData.financing.coefficient > 0 &&
          formData.financing.monthlyPayment > 0
        );
        console.log(`💰 Financing step validation:`, { 
          valid: financingValid, 
          leaserId: formData.financing.leaserId,
          coefficient: formData.financing.coefficient,
          monthlyPayment: formData.financing.monthlyPayment,
          financing: formData.financing 
        });
        return financingValid;
      
      case 'preview':
        console.log(`📋 Preview step validation: always true`);
        return true;
      
      default:
        console.log(`❌ Unknown step: ${step}`);
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

  // Fonction pour charger les données d'un client sélectionné
  const loadClientData = useCallback((client: {
    id: string;
    name: string;
    email?: string;
    company?: string;
    companyName?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    vat_number?: string;
    contact_name?: string;
  }) => {
    console.log('Loading client data:', client);
    
    updateFormData('clientInfo', {
      name: client.name || '',
      email: client.email || '',
      company: client.company || client.companyName || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      postalCode: client.postal_code || '',
      country: client.country || 'France',
      vatNumber: client.vat_number || '',
      contactName: client.contact_name || '',
    });
    
    setSelectedClientId(client.id);
    setIsClientSelectorOpen(false);
    toast.success(`Client ${client.name} sélectionné`);
  }, [updateFormData]);

  // Fonction pour basculer entre nouveau/existant
  const toggleClientMode = useCallback((mode: 'new' | 'existing') => {
    setClientSelectionMode(mode);
    if (mode === 'new') {
      // Reset client data
      setSelectedClientId(null);
      updateFormData('clientInfo', {
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
      });
    }
  }, [updateFormData]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep('client');
    setClientSelectionMode('new');
    setSelectedClientId(null);
    setIsClientSelectorOpen(false);
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
    // Client selection
    clientSelectionMode,
    selectedClientId,
    isClientSelectorOpen,
    setIsClientSelectorOpen,
    loadClientData,
    toggleClientMode,
  };
};