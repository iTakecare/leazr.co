-- Suppression complète des tables custom templates PDF

-- Supprimer les tables de collaboration et partage
DROP TABLE IF EXISTS template_collaborators CASCADE;
DROP TABLE IF EXISTS template_sharing CASCADE;
DROP TABLE IF EXISTS template_usage_stats CASCADE;

-- Supprimer les tables de versioning et changes
DROP TABLE IF EXISTS custom_pdf_template_changes CASCADE;

-- Supprimer la table principale des custom templates
DROP TABLE IF EXISTS custom_pdf_templates CASCADE;

-- Tables liées supplémentaires qui pourraient exister
DROP TABLE IF EXISTS template_versions CASCADE;
DROP TABLE IF EXISTS template_comments CASCADE;
DROP TABLE IF EXISTS template_approvals CASCADE;
DROP TABLE IF EXISTS template_library CASCADE;
DROP TABLE IF EXISTS template_categories CASCADE;
DROP TABLE IF EXISTS template_performance_metrics CASCADE;