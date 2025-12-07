export interface WorkflowTemplate {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  offer_type: OfferType;
  contract_type?: string;
  is_active: boolean;
  is_default: boolean;
  is_for_contracts: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_key: string;
  step_label: string;
  step_description?: string;
  step_order: number;
  is_required: boolean;
  is_visible: boolean;
  icon_name?: string;
  color_class?: string;
  conditions?: Record<string, any>;
  notifications?: Record<string, any>;
  created_at: string;
  updated_at: string;
  enables_scoring?: boolean;
  scoring_type?: 'internal' | 'leaser' | 'client';
  scoring_options?: {
    allow_approval: boolean;
    allow_rejection: boolean;
    allow_document_request: boolean;
  };
  next_step_on_approval?: string;
  next_step_on_rejection?: string;
  next_step_on_docs_requested?: string;
}

export interface WorkflowStepConfig {
  template_id: string;
  template_name: string;
  step_key: string;
  step_label: string;
  step_description?: string;
  step_order: number;
  icon_name?: string;
  color_class?: string;
  is_required: boolean;
  is_visible: boolean;
  enables_scoring?: boolean;
  scoring_type?: 'internal' | 'leaser' | 'client';
  scoring_options?: {
    allow_approval: boolean;
    allow_rejection: boolean;
    allow_document_request: boolean;
  };
  next_step_on_approval?: string;
  next_step_on_rejection?: string;
  next_step_on_docs_requested?: string;
}

export type OfferType = 
  | 'client_request' 
  | 'web_request'
  | 'custom_pack_request'
  | 'ambassador_offer'
  | 'purchase_request';

export interface CreateWorkflowTemplate {
  name: string;
  description?: string;
  offer_type: OfferType;
  contract_type?: string;
  is_default?: boolean;
}

export interface CreateWorkflowStep {
  step_key: string;
  step_label: string;
  step_description?: string;
  step_order: number;
  is_required?: boolean;
  is_visible?: boolean;
  icon_name?: string;
  color_class?: string;
  conditions?: Record<string, any>;
  notifications?: Record<string, any>;
}

export interface UpdateWorkflowTemplate {
  name?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface UpdateWorkflowStep {
  step_label?: string;
  step_description?: string;
  step_order?: number;
  is_required?: boolean;
  is_visible?: boolean;
  icon_name?: string;
  color_class?: string;
  conditions?: Record<string, any>;
  notifications?: Record<string, any>;
}