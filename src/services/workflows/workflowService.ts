import { supabase } from "@/integrations/supabase/client";
import type { 
  WorkflowTemplate, 
  WorkflowStep, 
  WorkflowStepConfig, 
  OfferType,
  CreateWorkflowTemplate,
  CreateWorkflowStep,
  UpdateWorkflowTemplate,
  UpdateWorkflowStep
} from "@/types/workflow";

export const workflowService = {
  // Get workflow for specific offer type
  async getWorkflowForOfferType(companyId: string, offerType: OfferType): Promise<WorkflowStepConfig[]> {
    const { data, error } = await supabase
      .rpc('get_workflow_for_offer_type', {
        p_company_id: companyId,
        p_offer_type: offerType
      });

    if (error) {
      console.error('Error getting workflow for offer type:', error);
      throw error;
    }

    return data || [];
  },

  // Get workflow for contract type
  async getWorkflowForContractType(companyId: string, contractType: string = 'standard'): Promise<WorkflowStepConfig[]> {
    const { data, error } = await supabase
      .rpc('get_workflow_for_contract_type', {
        p_company_id: companyId,
        p_contract_type: contractType
      });

    if (error) {
      console.error('Error getting workflow for contract type:', error);
      throw error;
    }

    return data || [];
  },

  // Get all workflow templates for company
  async getWorkflowTemplates(companyId: string): Promise<WorkflowTemplate[]> {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('offer_type', { ascending: true })
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Error getting workflow templates:', error);
      throw error;
    }

    return data || [];
  },

  // Get workflow steps for template
  async getWorkflowSteps(templateId: string): Promise<WorkflowStep[]> {
    const { data, error } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_template_id', templateId)
      .order('step_order', { ascending: true });

    if (error) {
      console.error('Error getting workflow steps:', error);
      throw error;
    }

    return data || [];
  },

  // Create workflow template
  async createWorkflowTemplate(companyId: string, template: CreateWorkflowTemplate): Promise<WorkflowTemplate> {
    const { data, error } = await supabase
      .from('workflow_templates')
      .insert({
        company_id: companyId,
        ...template
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workflow template:', error);
      throw error;
    }

    return data;
  },

  // Update workflow template
  async updateWorkflowTemplate(templateId: string, updates: UpdateWorkflowTemplate): Promise<WorkflowTemplate> {
    const { data, error } = await supabase
      .from('workflow_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating workflow template:', error);
      throw error;
    }

    return data;
  },

  // Delete workflow template
  async deleteWorkflowTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('workflow_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting workflow template:', error);
      throw error;
    }
  },

  // Create workflow step
  async createWorkflowStep(templateId: string, step: CreateWorkflowStep): Promise<WorkflowStep> {
    const { data, error } = await supabase
      .from('workflow_steps')
      .insert({
        workflow_template_id: templateId,
        ...step
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workflow step:', error);
      throw error;
    }

    return data;
  },

  // Update workflow step
  async updateWorkflowStep(stepId: string, updates: UpdateWorkflowStep): Promise<WorkflowStep> {
    const { data, error } = await supabase
      .from('workflow_steps')
      .update(updates)
      .eq('id', stepId)
      .select()
      .single();

    if (error) {
      console.error('Error updating workflow step:', error);
      throw error;
    }

    return data;
  },

  // Delete workflow step
  async deleteWorkflowStep(stepId: string): Promise<void> {
    const { error } = await supabase
      .from('workflow_steps')
      .delete()
      .eq('id', stepId);

    if (error) {
      console.error('Error deleting workflow step:', error);
      throw error;
    }
  },

  // Reorder workflow steps
  async reorderWorkflowSteps(templateId: string, stepOrders: { stepId: string; order: number }[]): Promise<void> {
    const updates = stepOrders.map(({ stepId, order }) => 
      supabase
        .from('workflow_steps')
        .update({ step_order: order })
        .eq('id', stepId)
    );

    const results = await Promise.all(updates);
    
    for (const result of results) {
      if (result.error) {
        console.error('Error reordering workflow steps:', result.error);
        throw result.error;
      }
    }
  },

  // Get workflow template with steps
  async getWorkflowTemplateWithSteps(templateId: string): Promise<WorkflowTemplate & { steps: WorkflowStep[] }> {
    const { data: template, error: templateError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error('Error getting workflow template:', templateError);
      throw templateError;
    }

    const steps = await this.getWorkflowSteps(templateId);

    return {
      ...template,
      steps
    };
  },

  // Clone workflow template
  async cloneWorkflowTemplate(templateId: string, newName: string): Promise<WorkflowTemplate> {
    const original = await this.getWorkflowTemplateWithSteps(templateId);
    
    // Create new template
    const { data: newTemplate, error: templateError } = await supabase
      .from('workflow_templates')
      .insert({
        company_id: original.company_id,
        name: newName,
        description: `Clone of ${original.name}`,
        offer_type: original.offer_type,
        contract_type: original.contract_type,
        is_active: false, // Start inactive
        is_default: false
      })
      .select()
      .single();

    if (templateError) {
      console.error('Error cloning workflow template:', templateError);
      throw templateError;
    }

    // Create steps for new template
    if (original.steps.length > 0) {
      const newSteps = original.steps.map(step => ({
        workflow_template_id: newTemplate.id,
        step_key: step.step_key,
        step_label: step.step_label,
        step_description: step.step_description,
        step_order: step.step_order,
        is_required: step.is_required,
        is_visible: step.is_visible,
        icon_name: step.icon_name,
        color_class: step.color_class,
        conditions: step.conditions,
        notifications: step.notifications
      }));

      const { error: stepsError } = await supabase
        .from('workflow_steps')
        .insert(newSteps);

      if (stepsError) {
        console.error('Error cloning workflow steps:', stepsError);
        // Cleanup the template if steps creation failed
        await this.deleteWorkflowTemplate(newTemplate.id);
        throw stepsError;
      }
    }

    return newTemplate;
  }
};