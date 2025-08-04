import { supabase } from "@/integrations/supabase/client";
import { TemplateVersion, TemplateChange, CustomPdfTemplate } from "@/types/customPdfTemplate";

// Service de gestion des versions de templates PDF
export class TemplateVersioningService {
  
  // Récupérer toutes les versions d'un template
  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    const { data, error } = await supabase
      .from('custom_pdf_template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching template versions:', error);
      throw error;
    }

    return data || [];
  }

  // Récupérer une version spécifique
  async getVersion(versionId: string): Promise<TemplateVersion | null> {
    const { data, error } = await supabase
      .from('custom_pdf_template_versions')
      .select('*')
      .eq('id', versionId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching version:', error);
      throw error;
    }

    return data;
  }

  // Créer une nouvelle version
  async createVersion(
    templateId: string, 
    fieldMappings: Record<string, any>,
    templateMetadata: Record<string, any>,
    changesDescription?: string,
    isMajorVersion: boolean = false
  ): Promise<TemplateVersion> {
    const { data, error } = await supabase
      .from('custom_pdf_template_versions')
      .insert({
        template_id: templateId,
        field_mappings: fieldMappings,
        template_metadata: templateMetadata,
        changes_description: changesDescription,
        is_major_version: isMajorVersion
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating version:', error);
      throw error;
    }

    return data;
  }

  // Restaurer une version
  async restoreVersion(templateId: string, versionId: string): Promise<CustomPdfTemplate> {
    // Récupérer la version à restaurer
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Mettre à jour le template principal
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .update({
        field_mappings: version.field_mappings,
        template_metadata: version.template_metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error restoring version:', error);
      throw error;
    }

    // Logger la restauration
    await this.logChange(templateId, versionId, 'metadata_changed', undefined, {
      action: 'restore_version',
      restored_from: versionId
    }, {}, `Restored to version ${version.version_number}`);

    return data;
  }

  // Comparer deux versions
  async compareVersions(versionId1: string, versionId2: string): Promise<{
    version1: TemplateVersion;
    version2: TemplateVersion;
    changes: TemplateChange[];
  }> {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2)
    ]);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    // Récupérer les changements entre les deux versions
    const { data: changes, error } = await supabase
      .from('custom_pdf_template_changes')
      .select('*')
      .eq('template_id', version1.template_id)
      .gte('created_at', version1.created_at)
      .lte('created_at', version2.created_at)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching changes:', error);
      throw error;
    }

    return {
      version1,
      version2,
      changes: changes || []
    };
  }

  // Logger un changement
  async logChange(
    templateId: string,
    versionId: string | undefined,
    changeType: TemplateChange['change_type'],
    fieldPath?: string,
    oldValue?: any,
    newValue?: any,
    description?: string
  ): Promise<TemplateChange> {
    const { data, error } = await supabase
      .from('custom_pdf_template_changes')
      .insert({
        template_id: templateId,
        version_id: versionId,
        change_type: changeType,
        field_path: fieldPath,
        old_value: oldValue,
        new_value: newValue,
        description: description
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging change:', error);
      throw error;
    }

    return data;
  }

  // Récupérer l'historique des changements
  async getChangeHistory(templateId: string, limit: number = 50): Promise<TemplateChange[]> {
    const { data, error } = await supabase
      .from('custom_pdf_template_changes')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching change history:', error);
      throw error;
    }

    return data || [];
  }

  // Supprimer les anciennes versions (garder seulement les N dernières)
  async cleanupOldVersions(templateId: string, keepCount: number = 10): Promise<void> {
    const versions = await this.getTemplateVersions(templateId);
    
    if (versions.length <= keepCount) {
      return; // Pas besoin de nettoyer
    }

    const versionsToDelete = versions.slice(keepCount);
    const versionIds = versionsToDelete.map(v => v.id);

    const { error } = await supabase
      .from('custom_pdf_template_versions')
      .delete()
      .in('id', versionIds);

    if (error) {
      console.error('Error cleaning up old versions:', error);
      throw error;
    }
  }

  // Créer une branche à partir d'une version
  async createBranch(
    baseVersionId: string, 
    branchName: string,
    description?: string
  ): Promise<TemplateVersion> {
    const baseVersion = await this.getVersion(baseVersionId);
    if (!baseVersion) {
      throw new Error('Base version not found');
    }

    // Créer une nouvelle version marquée comme branche
    const { data, error } = await supabase
      .from('custom_pdf_template_versions')
      .insert({
        template_id: baseVersion.template_id,
        field_mappings: baseVersion.field_mappings,
        template_metadata: {
          ...baseVersion.template_metadata,
          is_branch: true,
          branch_name: branchName,
          base_version_id: baseVersionId
        },
        changes_description: description || `Branch created from version ${baseVersion.version_number}`,
        parent_version_id: baseVersionId,
        is_major_version: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating branch:', error);
      throw error;
    }

    return data;
  }

  // Fusionner une branche dans la version principale
  async mergeBranch(
    branchVersionId: string,
    targetTemplateId: string,
    mergeDescription?: string
  ): Promise<CustomPdfTemplate> {
    const branchVersion = await this.getVersion(branchVersionId);
    if (!branchVersion) {
      throw new Error('Branch version not found');
    }

    // Créer une nouvelle version de fusion
    await this.createVersion(
      targetTemplateId,
      branchVersion.field_mappings,
      branchVersion.template_metadata,
      mergeDescription || `Merged branch from version ${branchVersion.version_number}`,
      true
    );

    // Mettre à jour le template principal
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .update({
        field_mappings: branchVersion.field_mappings,
        template_metadata: branchVersion.template_metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetTemplateId)
      .select()
      .single();

    if (error) {
      console.error('Error merging branch:', error);
      throw error;
    }

    return data;
  }
}

// Instance singleton
export const templateVersioningService = new TemplateVersioningService();

// Export des fonctions individuelles
export const getTemplateVersions = templateVersioningService.getTemplateVersions.bind(templateVersioningService);
export const getVersion = templateVersioningService.getVersion.bind(templateVersioningService);
export const createVersion = templateVersioningService.createVersion.bind(templateVersioningService);
export const restoreVersion = templateVersioningService.restoreVersion.bind(templateVersioningService);
export const compareVersions = templateVersioningService.compareVersions.bind(templateVersioningService);
export const logChange = templateVersioningService.logChange.bind(templateVersioningService);
export const getChangeHistory = templateVersioningService.getChangeHistory.bind(templateVersioningService);
export const cleanupOldVersions = templateVersioningService.cleanupOldVersions.bind(templateVersioningService);
export const createBranch = templateVersioningService.createBranch.bind(templateVersioningService);
export const mergeBranch = templateVersioningService.mergeBranch.bind(templateVersioningService);

export default templateVersioningService;