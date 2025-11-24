import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Copy, Settings } from 'lucide-react';
import { useWorkflows } from '@/hooks/workflows/useWorkflows';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { WorkflowTemplateForm } from './WorkflowTemplateForm';
import { WorkflowStepsManager } from './WorkflowStepsManager';
import type { WorkflowTemplate } from '@/types/workflow';

const WorkflowManagement: React.FC = () => {
  const { companyId, loading: companyLoading } = useMultiTenant();
  const { templates, loading: templatesLoading, createTemplate, updateTemplate, deleteTemplate, cloneTemplate } = useWorkflows(companyId || undefined);
  
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');

  const handleCreateTemplate = async (templateData: any) => {
    await createTemplate(templateData);
    setShowCreateForm(false);
  };

  const handleEditTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setActiveTab('steps');
  };

  const handleDeleteTemplate = async (template: WorkflowTemplate) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le workflow "${template.name}" ?`)) {
      await deleteTemplate(template.id);
    }
  };

  const handleCloneTemplate = async (template: WorkflowTemplate) => {
    const newName = prompt(`Dupliquer le workflow "${template.name}".\n\nNom du nouveau workflow :`, `${template.name} (copie)`);
    
    if (newName && newName.trim()) {
      try {
        await cloneTemplate(template.id, newName.trim());
      } catch (err) {
        // Error already handled in the hook
      }
    }
  };

  const getOfferTypeLabel = (offerType: string) => {
    const labels: Record<string, string> = {
      'client_request': 'Demande Client',
      'web_request': 'Demande Web',
      'ambassador_offer': 'Offre Ambassadeur',
      'internal_offer': 'Offre Interne',
      'partner_offer': 'Offre Partenaire',
      'standard': 'Standard'
    };
    return labels[offerType] || offerType;
  };

  const getOfferTypeColor = (offerType: string) => {
    const colors: Record<string, string> = {
      'client_request': 'bg-blue-100 text-blue-800 border-blue-200',
      'web_request': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'ambassador_offer': 'bg-green-100 text-green-800 border-green-200',
      'internal_offer': 'bg-purple-100 text-purple-800 border-purple-200',
      'partner_offer': 'bg-orange-100 text-orange-800 border-orange-200',
      'standard': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[offerType] || colors.standard;
  };

  if (companyLoading || templatesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Accès non autorisé</h3>
          <p className="text-muted-foreground">Vous devez être associé à une entreprise pour gérer les workflows.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Workflows</h2>
          <p className="text-muted-foreground">
            Configurez les étapes de vos processus de demandes et de contrats par type de demande
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Workflow
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          {selectedTemplate && (
            <TabsTrigger value="steps">
              Étapes - {selectedTemplate.name}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Créer un nouveau workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowTemplateForm
                  onSubmit={handleCreateTemplate}
                  onCancel={() => setShowCreateForm(false)}
                />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge 
                          variant="outline"
                          className={getOfferTypeColor(template.offer_type)}
                        >
                          {getOfferTypeLabel(template.offer_type)}
                        </Badge>
                        {template.is_default && (
                          <Badge variant="secondary">Par défaut</Badge>
                        )}
                        {!template.is_active && (
                          <Badge variant="destructive">Inactif</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {template.description && (
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Configurer
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCloneTemplate(template)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template)}
                      disabled={template.is_default}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Settings className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun workflow configuré</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Créez votre premier workflow pour commencer à personnaliser vos processus.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un workflow
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {selectedTemplate && (
          <TabsContent value="steps">
            <WorkflowStepsManager 
              template={selectedTemplate}
              onBack={() => {
                setSelectedTemplate(null);
                setActiveTab('templates');
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default WorkflowManagement;