import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  Star, 
  StarOff, 
  Download, 
  Eye,
  FileText,
  Settings,
  Users,
  Crown
} from "lucide-react";
import { PDFTemplateService, PDFTemplate } from "@/services/pdfTemplateService";
import { useAuth } from "@/context/AuthContext";

interface ComprehensivePDFTemplateManagerProps {
  companyId?: string;
}

const TEMPLATE_TYPES = [
  { value: 'standard', label: 'Standard', icon: FileText, description: 'Template de base pour les offres classiques' },
  { value: 'ambassador', label: 'Ambassadeur', icon: Users, description: 'Template avec coordonnées ambassadeur' },
  { value: 'custom', label: 'Personnalisé', icon: Crown, description: 'Template avec graphisme personnalisé' }
];

const OFFER_TYPES = [
  { value: 'standard', label: 'Offre Standard' },
  { value: 'ambassador_offer', label: 'Offre Ambassadeur' },
  { value: 'client_request', label: 'Demande Client' },
  { value: 'internal_offer', label: 'Offre Interne' }
];

const ComprehensivePDFTemplateManager: React.FC<ComprehensivePDFTemplateManagerProps> = ({ 
  companyId 
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<PDFTemplate>>({
    name: '',
    template_type: 'standard',
    template_category: 'offer',
    supported_offer_types: ['standard'],
    is_active: true,
    is_default: false,
    companyName: '',
    companyAddress: '',
    companyContact: '',
    companySiret: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    headerText: '',
    footerText: '',
    field_mappings: {},
    fields: [],
    templateImages: []
  });

  useEffect(() => {
    loadTemplates();
  }, [companyId]);

  const loadTemplates = async () => {
    if (!companyId) return;
    
    try {
      setIsLoading(true);
      const data = await PDFTemplateService.getCompanyTemplates(companyId);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Erreur lors du chargement des templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!companyId || !newTemplate.name) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);
      
      // Créer le template
      const template = await PDFTemplateService.createTemplate({
        ...newTemplate,
        company_id: companyId
      });

      // Upload du fichier si présent
      if (templateFile) {
        const fileUrl = await PDFTemplateService.uploadTemplateFile(
          templateFile, 
          companyId, 
          template.id
        );
        
        await PDFTemplateService.updateTemplate(template.id, {
          template_file_url: fileUrl
        });
      }

      toast.success('Template créé avec succès');
      loadTemplates();
      setActiveTab("list");
      resetNewTemplate();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Erreur lors de la création du template');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = async (templateId: string, updates: Partial<PDFTemplate>) => {
    try {
      setSaving(true);
      await PDFTemplateService.updateTemplate(templateId, updates);
      toast.success('Template mis à jour');
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (template: PDFTemplate) => {
    try {
      await PDFTemplateService.setDefaultTemplate(
        template.id,
        template.company_id,
        template.template_type,
        template.template_category
      );
      toast.success('Template défini par défaut');
      loadTemplates();
    } catch (error) {
      console.error('Error setting default template:', error);
      toast.error('Erreur lors de la définition du template par défaut');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await PDFTemplateService.deleteTemplate(templateId);
      toast.success('Template supprimé');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetNewTemplate = () => {
    setNewTemplate({
      name: '',
      template_type: 'standard',
      template_category: 'offer',
      supported_offer_types: ['standard'],
      is_active: true,
      is_default: false,
      companyName: '',
      companyAddress: '',
      companyContact: '',
      companySiret: '',
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b',
      headerText: '',
      footerText: '',
      field_mappings: {},
      fields: [],
      templateImages: []
    });
    setTemplateFile(null);
  };

  const getTemplateTypeInfo = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type) || TEMPLATE_TYPES[0];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestion des Templates PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">Templates</TabsTrigger>
              <TabsTrigger value="create">Créer</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  Templates existants ({templates.length})
                </h3>
                <Button onClick={() => setActiveTab("create")} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Template
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => {
                    const typeInfo = getTemplateTypeInfo(template.template_type);
                    const TypeIcon = typeInfo.icon;
                    
                    return (
                      <Card key={template.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <h4 className="font-medium">{template.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {typeInfo.label}
                                </p>
                              </div>
                            </div>
                            {template.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Défaut
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Types supportés:</span>
                              <span className="font-medium">
                                {template.supported_offer_types?.length || 0}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Fichier:</span>
                              <span className={template.template_file_url ? "text-green-600" : "text-orange-600"}>
                                {template.template_file_url ? "✓ Uploadé" : "⚠ Manquant"}
                              </span>
                            </div>

                            <Separator />
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setActiveTab("create");
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              
                              {!template.is_default && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleSetDefault(template)}
                                >
                                  <StarOff className="h-3 w-3" />
                                </Button>
                              )}
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeleteTemplate(template.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  {selectedTemplate ? 'Modifier le template' : 'Créer un nouveau template'}
                </h3>
                {selectedTemplate && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedTemplate(null);
                      resetNewTemplate();
                    }}
                  >
                    Nouveau template
                  </Button>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-name">Nom du template *</Label>
                    <Input
                      id="template-name"
                      value={selectedTemplate?.name || newTemplate.name}
                      onChange={(e) => {
                        if (selectedTemplate) {
                          handleUpdateTemplate(selectedTemplate.id, { name: e.target.value });
                        } else {
                          setNewTemplate(prev => ({ ...prev, name: e.target.value }));
                        }
                      }}
                      placeholder="ex: Template Offre Standard"
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-type">Type de template *</Label>
                    <Select
                      value={selectedTemplate?.template_type || newTemplate.template_type}
                      onValueChange={(value) => {
                        const data = { template_type: value as 'standard' | 'ambassador' | 'custom' };
                        if (selectedTemplate) {
                          handleUpdateTemplate(selectedTemplate.id, data);
                        } else {
                          setNewTemplate(prev => ({ ...prev, ...data }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {type.description}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="template-file">Fichier template PDF</Label>
                    <Input
                      id="template-file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setTemplateFile(file);
                        }
                      }}
                    />
                    {(selectedTemplate?.template_file_url || templateFile) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {templateFile ? `Nouveau: ${templateFile.name}` : 'Fichier existant uploadé'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-default"
                      checked={selectedTemplate?.is_default || newTemplate.is_default}
                      onCheckedChange={(checked) => {
                        const data = { is_default: checked };
                        if (selectedTemplate) {
                          handleUpdateTemplate(selectedTemplate.id, data);
                        } else {
                          setNewTemplate(prev => ({ ...prev, ...data }));
                        }
                      }}
                    />
                    <Label htmlFor="is-default">Template par défaut</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-active"
                      checked={selectedTemplate?.is_active ?? newTemplate.is_active}
                      onCheckedChange={(checked) => {
                        const data = { is_active: checked };
                        if (selectedTemplate) {
                          handleUpdateTemplate(selectedTemplate.id, data);
                        } else {
                          setNewTemplate(prev => ({ ...prev, ...data }));
                        }
                      }}
                    />
                    <Label htmlFor="is-active">Template actif</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company-name">Nom de l'entreprise</Label>
                    <Input
                      id="company-name"
                      value={selectedTemplate?.companyName || newTemplate.companyName}
                      onChange={(e) => {
                        const data = { companyName: e.target.value };
                        if (selectedTemplate) {
                          handleUpdateTemplate(selectedTemplate.id, data);
                        } else {
                          setNewTemplate(prev => ({ ...prev, ...data }));
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="company-address">Adresse</Label>
                    <Input
                      id="company-address"
                      value={selectedTemplate?.companyAddress || newTemplate.companyAddress}
                      onChange={(e) => {
                        const data = { companyAddress: e.target.value };
                        if (selectedTemplate) {
                          handleUpdateTemplate(selectedTemplate.id, data);
                        } else {
                          setNewTemplate(prev => ({ ...prev, ...data }));
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="header-text">Texte d'en-tête</Label>
                    <Input
                      id="header-text"
                      value={selectedTemplate?.headerText || newTemplate.headerText}
                      onChange={(e) => {
                        const data = { headerText: e.target.value };
                        if (selectedTemplate) {
                          handleUpdateTemplate(selectedTemplate.id, data);
                        } else {
                          setNewTemplate(prev => ({ ...prev, ...data }));
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="footer-text">Texte de pied de page</Label>
                    <Input
                      id="footer-text"
                      value={selectedTemplate?.footerText || newTemplate.footerText}
                      onChange={(e) => {
                        const data = { footerText: e.target.value };
                        if (selectedTemplate) {
                          handleUpdateTemplate(selectedTemplate.id, data);
                        } else {
                          setNewTemplate(prev => ({ ...prev, ...data }));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {!selectedTemplate && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetNewTemplate}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateTemplate} disabled={isSaving}>
                    {isSaving ? 'Création...' : 'Créer le template'}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Paramètres généraux</h3>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Configuration globale du système de templates PDF.
                  </p>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Types d'offres supportés</h4>
                      <div className="space-y-2">
                        {OFFER_TYPES.map((type) => (
                          <div key={type.value} className="flex items-center justify-between">
                            <span className="text-sm">{type.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {templates.filter(t => 
                                t.supported_offer_types?.includes(type.value)
                              ).length} templates
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Statistiques</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total templates</span>
                          <Badge>{templates.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Templates actifs</span>
                          <Badge>{templates.filter(t => t.is_active).length}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Templates par défaut</span>
                          <Badge>{templates.filter(t => t.is_default).length}</Badge>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensivePDFTemplateManager;