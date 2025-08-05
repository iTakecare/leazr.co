import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Library, 
  FileText, 
  Search, 
  Filter, 
  Upload, 
  Download, 
  Star, 
  BarChart3,
  Users,
  Eye,
  Edit,
  Share2
} from 'lucide-react';

import { TemplateLibrary } from './TemplateLibrary';
import { TemplateAnalytics } from './TemplateAnalytics';
import { PdfTemplateUploader } from '../templates/PdfTemplateUploader';
import { templateSharingService } from '@/services/templateSharingService';
import { templateAnalyticsService } from '@/services/templateAnalyticsService';
import customPdfTemplateService from '@/services/customPdfTemplateService';
import { CustomPdfTemplate } from '@/types/customPdfTemplate';
import { toast } from 'sonner';

interface AdvancedTemplateManagerProps {
  clientId?: string;
}

export function AdvancedTemplateManager({ clientId }: AdvancedTemplateManagerProps) {
  const [activeTab, setActiveTab] = useState('my-templates');
  const [companyAnalytics, setCompanyAnalytics] = useState<any>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [myTemplates, setMyTemplates] = useState<CustomPdfTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadCompanyAnalytics();
    loadMyTemplates();
  }, []);

  const loadMyTemplates = async () => {
    try {
      const templates = await customPdfTemplateService.getTemplatesByCompany();
      setMyTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadCompanyAnalytics = async () => {
    try {
      const analytics = await templateAnalyticsService.getCompanyAnalytics();
      setCompanyAnalytics(analytics);
    } catch (error) {
      console.error('Error loading company analytics:', error);
    }
  };

  const handleTemplateDownload = (template: CustomPdfTemplate) => {
    toast.success('Template téléchargé avec succès');
    // Recharger les templates de l'entreprise
    window.location.reload();
  };

  const handleTemplateUploaded = async (templateUrl: string, metadata: any) => {
    try {
      // Créer un nouveau template avec les données de l'upload
      const templateData = {
        name: metadata.original_name || `Template ${new Date().toLocaleDateString()}`,
        description: 'Template importé via la gestion avancée',
        original_pdf_url: templateUrl,
        field_mappings: {},
        template_metadata: {
          ...metadata,
          pages: []
        }
      };

      await customPdfTemplateService.createTemplate(templateData);
      toast.success('Template créé avec succès');
      setIsImportOpen(false);
      loadMyTemplates(); // Recharger la liste
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Erreur lors de la création du template');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header avec statistiques */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Gestionnaire de Templates Avancé
            </h1>
            <p className="text-muted-foreground">
              Gérez, partagez et analysez vos templates PDF personnalisés
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Library className="h-4 w-4 mr-2" />
                  Bibliothèque
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Bibliothèque de Templates</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto">
                  <TemplateLibrary 
                    clientId={clientId}
                    onTemplateDownload={handleTemplateDownload}
                  />
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Importer un Template PDF</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <PdfTemplateUploader onTemplateUploaded={handleTemplateUploaded} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistiques rapides */}
        {companyAnalytics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Templates</p>
                  <p className="text-2xl font-bold">{companyAnalytics.totalTemplates}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actifs</p>
                  <p className="text-2xl font-bold">{companyAnalytics.activeTemplates}</p>
                </div>
                <Eye className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usage Total</p>
                  <p className="text-2xl font-bold">{companyAnalytics.totalUsage}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score Perf.</p>
                  <p className="text-2xl font-bold">{companyAnalytics.averagePerformanceScore}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Top Template</p>
                  <p className="text-sm font-medium truncate">
                    {companyAnalytics.topTemplates[0]?.name || 'Aucun'}
                  </p>
                </div>
                <Share2 className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Filtres et recherche */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="invoice">Facture</SelectItem>
              <SelectItem value="contract">Contrat</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
              <SelectItem value="shared">Partagé</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Plus de filtres
          </Button>
        </div>
      </div>

      {/* Contenu principal avec onglets */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="my-templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Mes Templates
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Partagés
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              Bibliothèque
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-templates" className="h-full">
            <div className="space-y-6">
              {myTemplates.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Aucun template trouvé</h3>
                    <p className="text-muted-foreground mb-4">
                      Commencez par importer votre premier template PDF
                    </p>
                    <Button onClick={() => setIsImportOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importer un template
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myTemplates.map((template) => (
                    <Card key={template.id} className="relative">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          {template.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {template.description || 'Aucune description'}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="shared" className="h-full">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Templates Partagés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Fonctionnalité de partage en cours de développement</p>
                  <p className="text-sm mt-2">
                    Bientôt : visualisez et gérez les templates partagés avec votre équipe
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="h-full">
            <div className="space-y-6">
              {companyAnalytics && (
                <>
                  {/* Graphiques de tendances */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Templates les plus utilisés</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {companyAnalytics.topTemplates.slice(0, 5).map((template: any, index: number) => (
                            <div key={template.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{index + 1}</Badge>
                                <span className="font-medium">{template.name}</span>
                              </div>
                              <Badge>{template.usage_count} utilisations</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Évolution de l'usage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Graphique détaillé disponible dans l'éditeur de template</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="library" className="h-full">
            <TemplateLibrary 
              clientId={clientId}
              onTemplateDownload={handleTemplateDownload}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}