import { useState, useEffect } from 'react';
import { workflowService } from '@/services/workflows/workflowService';
import type { 
  WorkflowTemplate, 
  WorkflowStep, 
  WorkflowStepConfig, 
  OfferType 
} from '@/types/workflow';
import { useToast } from '@/hooks/use-toast';

export const useWorkflows = (companyId?: string) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      loadTemplates();
    }
  }, [companyId]);

  const loadTemplates = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const data = await workflowService.getWorkflowTemplates(companyId);
      setTemplates(data);
      setError(null);
    } catch (err) {
      console.error('Error loading workflows:', err);
      setError('Erreur lors du chargement des workflows');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les workflows"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: any) => {
    if (!companyId) return;
    
    try {
      const newTemplate = await workflowService.createWorkflowTemplate(companyId, template);
      setTemplates(prev => [...prev, newTemplate]);
      toast({
        title: "Succès",
        description: "Template de workflow créé avec succès"
      });
      return newTemplate;
    } catch (err) {
      console.error('Error creating template:', err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer le template"
      });
      throw err;
    }
  };

  const updateTemplate = async (templateId: string, updates: any) => {
    try {
      const updatedTemplate = await workflowService.updateWorkflowTemplate(templateId, updates);
      setTemplates(prev => 
        prev.map(t => t.id === templateId ? updatedTemplate : t)
      );
      toast({
        title: "Succès",
        description: "Template mis à jour avec succès"
      });
      return updatedTemplate;
    } catch (err) {
      console.error('Error updating template:', err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le template"
      });
      throw err;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      await workflowService.deleteWorkflowTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast({
        title: "Succès",
        description: "Template supprimé avec succès"
      });
    } catch (err) {
      console.error('Error deleting template:', err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le template"
      });
      throw err;
    }
  };

  const cloneTemplate = async (templateId: string, newName: string) => {
    if (!companyId) return;
    
    try {
      const clonedTemplate = await workflowService.cloneWorkflowTemplate(templateId, newName);
      setTemplates(prev => [...prev, clonedTemplate]);
      toast({
        title: "Succès",
        description: `Workflow "${newName}" créé avec succès`
      });
      return clonedTemplate;
    } catch (err) {
      console.error('Error cloning template:', err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de dupliquer le workflow"
      });
      throw err;
    }
  };

  return {
    templates,
    loading,
    error,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    cloneTemplate
  };
};

export const useWorkflowForOfferType = (companyId?: string, offerType?: OfferType) => {
  const [steps, setSteps] = useState<WorkflowStepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId && offerType) {
      loadWorkflowSteps();
    }
  }, [companyId, offerType]);

  const loadWorkflowSteps = async () => {
    if (!companyId || !offerType) return;
    
    try {
      setLoading(true);
      const data = await workflowService.getWorkflowForOfferType(companyId, offerType);
      setSteps(data);
      setError(null);
    } catch (err) {
      console.error('Error loading workflow steps:', err);
      setError('Erreur lors du chargement du workflow');
      // Fallback to default steps if database fails
      setSteps(getDefaultStepsForOfferType(offerType));
    } finally {
      setLoading(false);
    }
  };

  return {
    steps,
    loading,
    error,
    loadWorkflowSteps
  };
};

export const useWorkflowForContractType = (companyId?: string, contractType: string = 'standard') => {
  const [steps, setSteps] = useState<WorkflowStepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId && contractType) {
      loadWorkflowSteps();
    }
  }, [companyId, contractType]);

  const loadWorkflowSteps = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const data = await workflowService.getWorkflowForContractType(companyId, contractType);
      setSteps(data);
      setError(null);
    } catch (err) {
      console.error('Error loading contract workflow steps:', err);
      setError('Erreur lors du chargement du workflow');
      // Fallback to default steps if database fails
      setSteps(getDefaultStepsForContractType());
    } finally {
      setLoading(false);
    }
  };

  return {
    steps,
    loading,
    error,
    loadWorkflowSteps
  };
};

// Fallback default steps for contracts if database is not available
const getDefaultStepsForContractType = (): WorkflowStepConfig[] => {
  return [
    {
      template_id: '',
      template_name: 'Default',
      step_key: 'contract_sent',
      step_label: 'Envoyé',
      step_description: 'Contrat envoyé au client',
      step_order: 1,
      icon_name: 'Send',
      color_class: 'bg-blue-500',
      is_required: true,
      is_visible: true
    },
    {
      template_id: '',
      template_name: 'Default',
      step_key: 'contract_signed',
      step_label: 'Signé',
      step_description: 'Contrat signé par le client',
      step_order: 2,
      icon_name: 'CheckCircle',
      color_class: 'bg-green-500',
      is_required: true,
      is_visible: true
    },
    {
      template_id: '',
      template_name: 'Default',
      step_key: 'equipment_ordered',
      step_label: 'Commandé',
      step_description: 'Équipement commandé',
      step_order: 3,
      icon_name: 'Package',
      color_class: 'bg-orange-500',
      is_required: true,
      is_visible: true
    },
    {
      template_id: '',
      template_name: 'Default',
      step_key: 'delivered',
      step_label: 'Livré',
      step_description: 'Équipement livré',
      step_order: 4,
      icon_name: 'Truck',
      color_class: 'bg-green-500',
      is_required: true,
      is_visible: true
    }
  ];
};

// Fallback default steps if database is not available
const getDefaultStepsForOfferType = (offerType: OfferType): WorkflowStepConfig[] => {
  const baseSteps = {
    draft: { step_key: 'draft', step_label: 'Brouillon', step_order: 1, icon_name: 'Circle', color_class: 'bg-gray-100' },
    sent: { step_key: 'sent', step_label: 'Offre envoyée', step_order: 2, icon_name: 'Clock', color_class: 'bg-blue-500' },
    internal_review: { step_key: 'internal_review', step_label: 'Analyse interne', step_order: 3, icon_name: 'Clock', color_class: 'bg-orange-500' },
    leaser_review: { step_key: 'leaser_review', step_label: 'Analyse Leaser', step_order: 4, icon_name: 'Clock', color_class: 'bg-purple-500' },
    validated: { step_key: 'validated', step_label: 'Offre validée', step_order: 5, icon_name: 'CheckCircle', color_class: 'bg-green-500' }
  };

  switch (offerType) {
    case 'client_request':
      return [
        { ...baseSteps.draft, template_id: '', template_name: 'Default', is_required: true, is_visible: true },
        { ...baseSteps.internal_review, step_order: 2, template_id: '', template_name: 'Default', is_required: true, is_visible: true },
        { ...baseSteps.leaser_review, step_order: 3, template_id: '', template_name: 'Default', is_required: true, is_visible: true },
        { ...baseSteps.validated, step_order: 4, step_label: 'Contrat prêt', template_id: '', template_name: 'Default', is_required: true, is_visible: true }
      ];
    
    case 'ambassador_offer':
    default:
      return [
        { ...baseSteps.draft, template_id: '', template_name: 'Default', is_required: true, is_visible: true },
        { ...baseSteps.sent, template_id: '', template_name: 'Default', is_required: true, is_visible: true },
        { ...baseSteps.internal_review, template_id: '', template_name: 'Default', is_required: true, is_visible: true },
        { ...baseSteps.leaser_review, template_id: '', template_name: 'Default', is_required: true, is_visible: true },
        { ...baseSteps.validated, template_id: '', template_name: 'Default', is_required: true, is_visible: true }
      ];
  }
};