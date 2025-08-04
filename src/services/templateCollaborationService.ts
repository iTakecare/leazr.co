import { supabase } from "@/integrations/supabase/client";
import { 
  TemplateCollaborator, 
  TemplateComment, 
  TemplateApproval,
  CustomPdfTemplate 
} from "@/types/customPdfTemplate";

// Service de gestion de la collaboration sur les templates
export class TemplateCollaborationService {

  // === COLLABORATORS ===

  // Ajouter un collaborateur à un template
  async addCollaborator(
    templateId: string,
    userId: string,
    role: TemplateCollaborator['role'] = 'editor'
  ): Promise<TemplateCollaborator> {
    const { data, error } = await supabase
      .from('template_collaborators')
      .insert({
        template_id: templateId,
        user_id: userId,
        role
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }

    return data;
  }

  // Récupérer les collaborateurs d'un template
  async getCollaborators(templateId: string): Promise<TemplateCollaborator[]> {
    const { data, error } = await supabase
      .from('template_collaborators')
      .select(`
        *,
        profiles(first_name, last_name, email)
      `)
      .eq('template_id', templateId)
      .eq('is_active', true)
      .order('added_at', { ascending: true });

    if (error) {
      console.error('Error fetching collaborators:', error);
      throw error;
    }

    return data || [];
  }

  // Modifier le rôle d'un collaborateur
  async updateCollaboratorRole(
    collaboratorId: string,
    newRole: TemplateCollaborator['role']
  ): Promise<void> {
    const { error } = await supabase
      .from('template_collaborators')
      .update({ role: newRole })
      .eq('id', collaboratorId);

    if (error) {
      console.error('Error updating collaborator role:', error);
      throw error;
    }
  }

  // Supprimer un collaborateur
  async removeCollaborator(collaboratorId: string): Promise<void> {
    const { error } = await supabase
      .from('template_collaborators')
      .update({ is_active: false })
      .eq('id', collaboratorId);

    if (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  }

  // Mettre à jour l'activité d'un collaborateur
  async updateLastActivity(templateId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('template_collaborators')
      .update({ last_active_at: new Date().toISOString() })
      .eq('template_id', templateId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating last activity:', error);
      // Ne pas lever d'erreur pour cette opération non-critique
    }
  }

  // === COMMENTS ===

  // Ajouter un commentaire
  async addComment(
    templateId: string,
    content: string,
    commentType: TemplateComment['comment_type'] = 'general',
    fieldId?: string,
    positionX?: number,
    positionY?: number,
    parentCommentId?: string
  ): Promise<TemplateComment> {
    const { data, error } = await supabase
      .from('template_comments')
      .insert({
        template_id: templateId,
        field_id: fieldId,
        position_x: positionX,
        position_y: positionY,
        content,
        comment_type: commentType,
        parent_comment_id: parentCommentId
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }

    return data;
  }

  // Récupérer les commentaires d'un template
  async getComments(
    templateId: string,
    fieldId?: string,
    status?: TemplateComment['status']
  ): Promise<TemplateComment[]> {
    let query = supabase
      .from('template_comments')
      .select(`
        *,
        profiles(first_name, last_name, email),
        replies:template_comments(*, profiles(first_name, last_name, email))
      `)
      .eq('template_id', templateId)
      .is('parent_comment_id', null); // Seulement les commentaires de niveau supérieur

    if (fieldId) {
      query = query.eq('field_id', fieldId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }

    return data || [];
  }

  // Résoudre un commentaire
  async resolveComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('template_comments')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) {
      console.error('Error resolving comment:', error);
      throw error;
    }
  }

  // Archiver un commentaire
  async archiveComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('template_comments')
      .update({ status: 'archived' })
      .eq('id', commentId);

    if (error) {
      console.error('Error archiving comment:', error);
      throw error;
    }
  }

  // Modifier un commentaire
  async updateComment(commentId: string, newContent: string): Promise<void> {
    const { error } = await supabase
      .from('template_comments')
      .update({
        content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  // === APPROVALS ===

  // Demander une approbation
  async requestApproval(
    templateId: string,
    approverIds: string[],
    versionId?: string,
    comments?: string,
    dueDate?: Date
  ): Promise<TemplateApproval[]> {
    const approvals: TemplateApproval[] = [];

    for (let i = 0; i < approverIds.length; i++) {
      const { data, error } = await supabase
        .from('template_approvals')
        .insert({
          template_id: templateId,
          version_id: versionId,
          workflow_step: i + 1,
          approver_id: approverIds[i],
          comments,
          due_date: dueDate?.toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error requesting approval:', error);
        throw error;
      }

      approvals.push(data);
    }

    return approvals;
  }

  // Approuver ou rejeter une demande
  async processApproval(
    approvalId: string,
    status: 'approved' | 'rejected',
    comments?: string
  ): Promise<TemplateApproval> {
    const { data, error } = await supabase
      .from('template_approvals')
      .update({
        status,
        approval_date: new Date().toISOString(),
        comments
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) {
      console.error('Error processing approval:', error);
      throw error;
    }

    // Si approuvé, vérifier si c'est la dernière étape
    if (status === 'approved') {
      await this.checkWorkflowCompletion(data.template_id, data.version_id);
    }

    return data;
  }

  // Récupérer les approbations d'un template
  async getApprovals(templateId: string, versionId?: string): Promise<TemplateApproval[]> {
    let query = supabase
      .from('template_approvals')
      .select(`
        *,
        profiles(first_name, last_name, email)
      `)
      .eq('template_id', templateId);

    if (versionId) {
      query = query.eq('version_id', versionId);
    }

    const { data, error } = await query
      .order('workflow_step', { ascending: true });

    if (error) {
      console.error('Error fetching approvals:', error);
      throw error;
    }

    return data || [];
  }

  // Récupérer les approbations en attente pour un utilisateur
  async getPendingApprovals(userId: string): Promise<TemplateApproval[]> {
    const { data, error } = await supabase
      .from('template_approvals')
      .select(`
        *,
        custom_pdf_templates(name, description)
      `)
      .eq('approver_id', userId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }

    return data || [];
  }

  // Vérifier si le workflow d'approbation est terminé
  private async checkWorkflowCompletion(
    templateId: string, 
    versionId?: string
  ): Promise<void> {
    const approvals = await this.getApprovals(templateId, versionId);
    
    const allApproved = approvals.every(approval => 
      approval.status === 'approved' || approval.status === 'skipped'
    );

    if (allApproved && approvals.length > 0) {
      // Mettre à jour le template comme approuvé
      const { error } = await supabase
        .from('custom_pdf_templates')
        .update({
          collaboration_settings: {
            ...{}, // Current settings
            workflow_approved: true,
            approved_at: new Date().toISOString()
          }
        })
        .eq('id', templateId);

      if (error) {
        console.error('Error updating template approval status:', error);
      }
    }
  }

  // === LOCKING ===

  // Verrouiller un template pour édition
  async lockTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_pdf_templates')
      .update({
        is_locked: true,
        locked_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('is_locked', false); // Seulement si pas déjà verrouillé

    if (error) {
      console.error('Error locking template:', error);
      throw error;
    }
  }

  // Déverrouiller un template
  async unlockTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_pdf_templates')
      .update({
        is_locked: false,
        locked_by: null,
        locked_at: null
      })
      .eq('id', templateId);

    if (error) {
      console.error('Error unlocking template:', error);
      throw error;
    }
  }

  // Vérifier si un template est verrouillé
  async isTemplateLocked(templateId: string): Promise<{
    isLocked: boolean;
    lockedBy?: string;
    lockedAt?: string;
  }> {
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .select('is_locked, locked_by, locked_at')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error checking template lock:', error);
      throw error;
    }

    return {
      isLocked: data?.is_locked || false,
      lockedBy: data?.locked_by,
      lockedAt: data?.locked_at
    };
  }

  // === REAL-TIME COLLABORATION ===

  // Sauvegarder automatiquement les modifications
  async autoSave(
    templateId: string,
    fieldMappings: Record<string, any>,
    templateMetadata: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('custom_pdf_templates')
      .update({
        auto_save_data: {
          field_mappings: fieldMappings,
          template_metadata: templateMetadata,
          saved_at: new Date().toISOString()
        }
      })
      .eq('id', templateId);

    if (error) {
      console.error('Error auto-saving:', error);
      // Ne pas lever d'erreur pour l'auto-save
    }
  }

  // Récupérer les données auto-sauvegardées
  async getAutoSaveData(templateId: string): Promise<any> {
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .select('auto_save_data')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching auto-save data:', error);
      return null;
    }

    return data?.auto_save_data;
  }
}

// Instance singleton
export const templateCollaborationService = new TemplateCollaborationService();

// Export des fonctions individuelles
export const addCollaborator = templateCollaborationService.addCollaborator.bind(templateCollaborationService);
export const getCollaborators = templateCollaborationService.getCollaborators.bind(templateCollaborationService);
export const updateCollaboratorRole = templateCollaborationService.updateCollaboratorRole.bind(templateCollaborationService);
export const removeCollaborator = templateCollaborationService.removeCollaborator.bind(templateCollaborationService);
export const updateLastActivity = templateCollaborationService.updateLastActivity.bind(templateCollaborationService);
export const addComment = templateCollaborationService.addComment.bind(templateCollaborationService);
export const getComments = templateCollaborationService.getComments.bind(templateCollaborationService);
export const resolveComment = templateCollaborationService.resolveComment.bind(templateCollaborationService);
export const archiveComment = templateCollaborationService.archiveComment.bind(templateCollaborationService);
export const updateComment = templateCollaborationService.updateComment.bind(templateCollaborationService);
export const requestApproval = templateCollaborationService.requestApproval.bind(templateCollaborationService);
export const processApproval = templateCollaborationService.processApproval.bind(templateCollaborationService);
export const getApprovals = templateCollaborationService.getApprovals.bind(templateCollaborationService);
export const getPendingApprovals = templateCollaborationService.getPendingApprovals.bind(templateCollaborationService);
export const lockTemplate = templateCollaborationService.lockTemplate.bind(templateCollaborationService);
export const unlockTemplate = templateCollaborationService.unlockTemplate.bind(templateCollaborationService);
export const isTemplateLocked = templateCollaborationService.isTemplateLocked.bind(templateCollaborationService);
export const autoSave = templateCollaborationService.autoSave.bind(templateCollaborationService);
export const getAutoSaveData = templateCollaborationService.getAutoSaveData.bind(templateCollaborationService);

export default templateCollaborationService;