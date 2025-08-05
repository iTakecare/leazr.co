import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, Download, Save, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import HtmlTemplateService from '@/services/htmlTemplateService';
import { ITAKECARE_HTML_TEMPLATE, previewHtmlTemplate } from '@/utils/htmlPdfGenerator';
import { generateSamplePdf } from '@/services/offers/offerPdf';

interface HtmlTemplate {
  id: string;
  name: string;
  description: string;
  html_content: string;
  is_default: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

const HtmlTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<HtmlTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<HtmlTemplate | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isValidTemplate, setIsValidTemplate] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const templateService = HtmlTemplateService.getInstance();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    validateTemplate();
  }, [htmlContent]);

  const loadTemplates = async () => {
    try {
      // Ici on chargerait les templates depuis la base de données
      // Pour l'instant, on utilise le template iTakecare par défaut
      const defaultTemplate: HtmlTemplate = {
        id: 'itakecare-default',
        name: 'Template iTakecare par défaut',
        description: 'Template HTML complet pour les offres iTakecare',
        html_content: ITAKECARE_HTML_TEMPLATE,
        is_default: true,
        company_id: 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setTemplates([defaultTemplate]);
      setCurrentTemplate(defaultTemplate);
      setHtmlContent(defaultTemplate.html_content);
      setTemplateName(defaultTemplate.name);
      setTemplateDescription(defaultTemplate.description);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      toast.error('Erreur lors du chargement des templates');
    }
  };

  const validateTemplate = () => {
    if (!htmlContent.trim()) {
      setIsValidTemplate(true);
      setValidationError('');
      return;
    }

    const validation = templateService.validateTemplate(htmlContent);
    setIsValidTemplate(validation.valid);
    setValidationError(validation.error || '');
  };

  const handlePreview = () => {
    try {
      if (!isValidTemplate) {
        toast.error('Le template contient des erreurs de syntaxe');
        return;
      }

      previewHtmlTemplate(htmlContent);
      toast.success('Prévisualisation ouverte dans un nouvel onglet');
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const handleGeneratePdf = async () => {
    try {
      if (!isValidTemplate) {
        toast.error('Le template contient des erreurs de syntaxe');
        return;
      }

      setIsGeneratingPdf(true);
      
      // Créer des données d'exemple pour la génération PDF
      const sampleData = {
        id: 'demo-template',
        client_name: 'Jean Dupont (Démo)',
        client_company: 'ACME SA',
        client_email: 'jean.dupont@acme.com',
        amount: 10000,
        monthly_payment: 300,
        created_at: new Date().toISOString(),
        equipment_description: JSON.stringify([
          {
            title: 'Dell Latitude 5520',
            category: 'Ordinateur portable',
            purchasePrice: 1200,
            quantity: 2,
            margin: 15,
            monthlyPayment: 150
          },
          {
            title: 'Dell UltraSharp 24"',
            category: 'Écran',
            purchasePrice: 300,
            quantity: 2,
            margin: 15,
            monthlyPayment: 75
          }
        ])
      };

      const filename = await generateSamplePdf(sampleData);
      if (filename) {
        toast.success(`PDF de démonstration généré: ${filename}`);
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.error('Erreur lors de la génération du PDF de démonstration');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!isValidTemplate) {
        toast.error('Impossible de sauvegarder: le template contient des erreurs');
        return;
      }

      if (!templateName.trim()) {
        toast.error('Veuillez spécifier un nom pour le template');
        return;
      }

      setIsSaving(true);

      // Ici on sauvegarderait en base de données
      // Pour l'instant on simule la sauvegarde
      
      toast.success('Template sauvegardé avec succès');
      
      // Recharger la liste des templates
      await loadTemplates();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde du template');
    } finally {
      setIsSaving(false);
    }
  };

  const extractedVariables = htmlContent ? templateService.extractTemplateVariables(htmlContent) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des Templates HTML</h2>
        <p className="text-muted-foreground">
          Créez et gérez vos templates HTML pour la génération d'offres commerciales personnalisées.
        </p>
      </div>

      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor">Éditeur</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Éditeur HTML</CardTitle>
                      <CardDescription>
                        Modifiez votre template HTML avec support Handlebars
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isValidTemplate ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Valide
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Erreur
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Nom du template</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Ex: Template iTakecare personnalisé"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Input
                      id="template-description"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Description du template..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="html-content">Contenu HTML</Label>
                    <Textarea
                      id="html-content"
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder="Entrez votre template HTML avec des variables Handlebars..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                    {!isValidTemplate && validationError && (
                      <div className="text-sm text-red-600 mt-2">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Erreur de syntaxe: {validationError}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={handlePreview} variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Prévisualiser
                    </Button>
                    <Button 
                      onClick={handleGeneratePdf} 
                      variant="outline"
                      disabled={isGeneratingPdf}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isGeneratingPdf ? 'Génération...' : 'PDF Démo'}
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={!isValidTemplate || isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Variables détectées</CardTitle>
                  <CardDescription>
                    Variables Handlebars trouvées dans votre template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {extractedVariables.length > 0 ? (
                      extractedVariables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="mr-1 mb-1">
                          {`{{${variable}}}`}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune variable détectée
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Aide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <strong>Variables principales:</strong>
                    <ul className="mt-1 text-muted-foreground">
                      <li>• {"{{client_name}}"} - Nom du client</li>
                      <li>• {"{{company_name}}"} - Entreprise</li>
                      <li>• {"{{monthly_price}}"} - Mensualité</li>
                      <li>• {"{{contract_duration}}"} - Durée</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Boucles:</strong>
                    <code className="block mt-1 p-2 bg-muted rounded text-xs">
                      {`{{#each products}}`}<br />
                      {`  {{category}} - {{description}}`}<br />
                      {`{{/each}}`}
                    </code>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                setCurrentTemplate(template);
                setHtmlContent(template.html_content);
                setTemplateName(template.name);
                setTemplateDescription(template.description);
              }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.is_default && (
                      <Badge variant="default">Par défaut</Badge>
                    )}
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>HTML Template</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Variables disponibles</CardTitle>
              <CardDescription>
                Liste complète des variables que vous pouvez utiliser dans vos templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Informations client</h4>
                  <div className="space-y-2 text-sm">
                    <div><code>{"{{client_name}}"}</code> - Nom du client</div>
                    <div><code>{"{{company_name}}"}</code> - Nom de l'entreprise</div>
                    <div><code>{"{{client_address}}"}</code> - Adresse complète</div>
                    <div><code>{"{{offer_date}}"}</code> - Date de l'offre</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Informations financières</h4>
                  <div className="space-y-2 text-sm">
                    <div><code>{"{{monthly_price}}"}</code> - Mensualité totale</div>
                    <div><code>{"{{insurance}}"}</code> - Montant assurance</div>
                    <div><code>{"{{setup_fee}}"}</code> - Frais de dossier</div>
                    <div><code>{"{{contract_duration}}"}</code> - Durée du contrat</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Équipements</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <code>{"{{#each products}}"}</code> - Boucle sur les produits
                      <div className="ml-4 mt-1 space-y-1">
                        <div><code>{"{{category}}"}</code> - Catégorie</div>
                        <div><code>{"{{description}}"}</code> - Description</div>
                        <div><code>{"{{quantity}}"}</code> - Quantité</div>
                      </div>
                      <code>{"{{/each}}"}</code>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Helpers</h4>
                  <div className="space-y-2 text-sm">
                    <div><code>{"{{currency amount}}"}</code> - Formater en devise</div>
                    <div><code>{"{{date dateString}}"}</code> - Formater une date</div>
                    <div><code>{"{{number value}}"}</code> - Formater un nombre</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HtmlTemplateManager;