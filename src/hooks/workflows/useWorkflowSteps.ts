import { useState, useEffect } from 'react';
import { workflowService } from '@/services/workflows/workflowService';
import type { WorkflowStepConfig } from '@/types/workflow';

/**
 * Hook to fetch workflow steps for a specific template ID
 * Used when an offer has a specific workflow_template_id assigned
 */
export const useWorkflowSteps = (templateId?: string | null) => {
  const [steps, setSteps] = useState<WorkflowStepConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!templateId) {
      setSteps([]);
      setLoading(false);
      return;
    }

    const fetchSteps = async () => {
      setLoading(true);
      try {
        const data = await workflowService.getWorkflowSteps(templateId);
        
        // Transform WorkflowStep to WorkflowStepConfig
        const configSteps: WorkflowStepConfig[] = data.map(step => ({
          template_id: templateId,
          template_name: '',
          step_key: step.step_key,
          step_label: step.step_label,
          step_description: step.step_description || '',
          step_order: step.step_order,
          icon_name: step.icon_name || 'Circle',
          color_class: step.color_class || 'bg-gray-100',
          is_required: step.is_required,
          is_visible: step.is_visible,
          enables_scoring: step.enables_scoring || false,
          scoring_type: step.scoring_type,
          scoring_options: step.scoring_options,
          next_step_on_approval: step.next_step_on_approval || undefined,
          next_step_on_rejection: step.next_step_on_rejection || undefined,
          next_step_on_docs_requested: step.next_step_on_docs_requested || undefined
        }));
        
        setSteps(configSteps);
        console.log("📋 useWorkflowSteps loaded", configSteps.length, "steps for template:", templateId);
      } catch (error) {
        console.error('Error loading workflow steps:', error);
        setSteps([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [templateId]);

  return { steps, loading };
};
