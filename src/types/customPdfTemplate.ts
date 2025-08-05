// Phase 5: Extended types for advanced features
export interface CustomPdfTemplate {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  original_pdf_url: string;
  field_mappings: Record<string, any>;
  template_metadata: {
    pages_count?: number;
    file_size?: number;
    file_type?: string;
    upload_date?: string;
    pages_data?: Array<{
      page_number: number;
      image_url?: string;
      width?: number;
      height?: number;
      dimensions?: { width: number; height: number };
    }>;
  };
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  // Phase 5: Versioning & Collaboration
  version_number?: number;
  is_locked?: boolean;
  locked_by?: string;
  locked_at?: string | Date;
  auto_save_data?: Record<string, any>;
  collaboration_settings?: {
    real_time_editing: boolean;
    require_approval: boolean;
  };
}

// Phase 5: Template Versioning
export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  field_mappings: Record<string, any>;
  template_metadata: Record<string, any>;
  changes_description?: string;
  created_by?: string;
  created_at: string | Date;
  is_major_version: boolean;
  parent_version_id?: string;
}

// Phase 5: Template Changes Log
export interface TemplateChange {
  id: string;
  template_id: string;
  version_id?: string;
  change_type: 'field_added' | 'field_modified' | 'field_deleted' | 'metadata_changed';
  field_path?: string;
  old_value?: any;
  new_value?: any;
  user_id?: string;
  created_at: string | Date;
  description?: string;
}

// Phase 5: Template Library
export interface TemplateLibraryItem {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  original_template_id?: string;
  field_mappings: Record<string, any>;
  template_metadata: Record<string, any>;
  preview_image_url?: string;
  download_count: number;
  rating_average: number;
  rating_count: number;
  is_public: boolean;
  is_featured: boolean;
  created_by?: string;
  created_at: string | Date;
  updated_at: string | Date;
  tags: string[];
}

// Phase 5: Template Categories
export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  parent_category_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string | Date;
}

// Phase 5: Template Sharing
export interface TemplateSharing {
  id: string;
  template_id: string;
  shared_by: string;
  shared_with_company_id?: string;
  shared_with_user_id?: string;
  permission_level: 'view' | 'edit' | 'copy';
  expires_at?: string | Date;
  is_active: boolean;
  created_at: string | Date;
  message?: string;
}

// Phase 5: Template Collaborators
export interface TemplateCollaborator {
  id: string;
  template_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer' | 'reviewer';
  added_by?: string;
  added_at: string | Date;
  last_active_at?: string | Date;
  is_active: boolean;
}

// Phase 5: Template Comments
export interface TemplateComment {
  id: string;
  template_id: string;
  field_id?: string;
  position_x?: number;
  position_y?: number;
  content: string;
  comment_type: 'general' | 'suggestion' | 'issue' | 'approval';
  status: 'open' | 'resolved' | 'archived';
  created_by: string;
  created_at: string | Date;
  updated_at: string | Date;
  parent_comment_id?: string;
  resolved_by?: string;
  resolved_at?: string | Date;
}

// Phase 5: Template Approvals
export interface TemplateApproval {
  id: string;
  template_id: string;
  version_id?: string;
  workflow_step: number;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approval_date?: string | Date;
  comments?: string;
  requested_by?: string;
  requested_at: string | Date;
  due_date?: string | Date;
}

// Phase 5: Template Usage Stats
export interface TemplateUsageStats {
  id: string;
  template_id: string;
  user_id?: string;
  company_id?: string;
  action_type: 'view' | 'edit' | 'generate' | 'copy' | 'share';
  session_id?: string;
  metadata: Record<string, any>;
  created_at: string | Date;
  duration_seconds?: number;
}

// Phase 5: Template Performance Metrics
export interface TemplatePerformanceMetric {
  id: string;
  template_id: string;
  metric_type: 'generation_time' | 'error_rate' | 'usage_frequency';
  metric_value: number;
  measurement_date: string | Date;
  additional_data: Record<string, any>;
  created_at: string | Date;
}

export interface CreateCustomPdfTemplateData {
  name: string;
  description?: string;
  original_pdf_url: string;
  field_mappings?: Record<string, any>;
  template_metadata?: Record<string, any>;
  is_active?: boolean;
}