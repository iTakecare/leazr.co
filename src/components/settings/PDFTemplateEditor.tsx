
import React, { useState, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { AlertTriangle, Save, Upload, Download, FileText, ChevronsUpDown } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { getPDFTemplates, savePDFTemplate, deletePDFTemplate } from '../../services/leaserService';
import { getOfferById } from '../../services/offerService';
import { supabase } from '../../integrations/supabase/client';
import { formatCurrency } from '../../lib/utils';
import { generateOfferPdf } from '../../utils/pdfGenerator';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

type Template = {
  id?: string;
  name: string;
  content: string;
  type: 'offer' | 'contract';
  is_default?: boolean;
  variables?: string[];
  created_at?: string;
};

type Variable = {
  name: string;
  description: string;
  example: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'boolean';
};

const PDFTemplateEditor = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<Template>({
    name: '',
    content: defaultTemplate,
    type: 'offer',
    variables: [],
  });
  const [previewOffer, setPreviewOffer] = useState<any>(null);
  const [offerInput, setOfferInput] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const loadedTemplates = await getPDFTemplates();
      if (loadedTemplates && loadedTemplates.length > 0) {
        setTemplates(loadedTemplates);
        setCurrentTemplate(loadedTemplates[0]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les modèles de PDF',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplate.name) {
      toast({
        title: 'Erreur',
        description: 'Veuillez donner un nom au modèle',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const savedTemplate = await savePDFTemplate(currentTemplate);
      
      if (savedTemplate) {
        setCurrentTemplate(savedTemplate);
        await loadTemplates();
        toast({
          title: 'Succès',
          description: 'Le modèle a été enregistré avec succès',
        });
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer le modèle',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!currentTemplate.id) return;
    
    try {
      setIsDeleting(true);
      await deletePDFTemplate(currentTemplate.id);
      toast({
        title: 'Succès',
        description: 'Le modèle a été supprimé avec succès',
      });
      await loadTemplates();
      setConfirmDelete(false);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le modèle',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVariableClick = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBefore = currentTemplate.content.substring(0, cursorPos);
      const textAfter = currentTemplate.content.substring(cursorPos);
      const newContent = `${textBefore}{{${variable}}}${textAfter}`;
      setCurrentTemplate({ ...currentTemplate, content: newContent });
      
      // Set focus and cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = cursorPos + variable.length + 4; // +4 for the {{ and }}
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const loadOfferForPreview = async () => {
    if (!offerInput.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un ID d\'offre valide',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsPreviewLoading(true);
      const offerId = offerInput.trim();
      const offer = await getOfferById(offerId);
      
      if (!offer) {
        toast({
          title: 'Erreur',
          description: 'Offre non trouvée',
          variant: 'destructive',
        });
        return;
      }

      setPreviewOffer(offer);
      generateHtmlPreview(offer);
    } catch (error) {
      console.error('Error loading offer:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'offre',
        variant: 'destructive',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const generateHtmlPreview = (offer: any) => {
    try {
      // Process template with offer data
      let html = currentTemplate.content;
      
      // Replace variables
      OFFER_VARIABLES.forEach(variable => {
        const regex = new RegExp(`{{${variable.name}}}`, 'g');
        let value = '';
        
        // Get nested properties if needed
        const path = variable.name.split('.');
        let currentObj = offer;
        for (const prop of path) {
          if (currentObj && currentObj[prop] !== undefined) {
            currentObj = currentObj[prop];
          } else {
            currentObj = null;
            break;
          }
        }
        
        if (currentObj !== null) {
          value = currentObj;
          
          // Format based on variable type
          if (variable.type === 'currency' && typeof value === 'number') {
            value = formatCurrency(value);
          } else if (variable.type === 'date' && typeof value === 'string') {
            value = new Date(value).toLocaleDateString('fr-FR');
          }
        }
        
        html = html.replace(regex, value?.toString() || '');
      });
      
      // Replace equipment items if present
      if (offer.equipment_description) {
        let equipmentItems: any[] = [];
        try {
          equipmentItems = typeof offer.equipment_description === 'string' 
            ? JSON.parse(offer.equipment_description) 
            : offer.equipment_description;
        } catch (e) {
          console.error('Error parsing equipment:', e);
        }
        
        const equipmentPlaceholder = /{{#each equipment}}([\s\S]*?){{\/each}}/g;
        const equipmentMatch = equipmentPlaceholder.exec(html);
        
        if (equipmentMatch && equipmentMatch[1] && Array.isArray(equipmentItems)) {
          const itemTemplate = equipmentMatch[1];
          let equipmentHtml = '';
          
          equipmentItems.forEach(item => {
            let itemHtml = itemTemplate;
            itemHtml = itemHtml
              .replace(/{{title}}/g, item.title || '')
              .replace(/{{purchasePrice}}/g, formatCurrency(item.purchasePrice || 0))
              .replace(/{{quantity}}/g, item.quantity || 1)
              .replace(/{{margin}}/g, `${item.margin || 0}%`);
            
            equipmentHtml += itemHtml;
          });
          
          html = html.replace(equipmentPlaceholder, equipmentHtml);
        }
      }
      
      setPreviewHtml(html);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer l\'aperçu',
        variant: 'destructive',
      });
    }
  };

  const handleGeneratePdf = () => {
    if (!previewOffer) {
      toast({
        title: 'Erreur',
        description: 'Veuillez d\'abord charger une offre pour l\'aperçu',
        variant: 'destructive',
      });
      return;
    }

    try {
      const filename = generateOfferPdf(previewOffer, currentTemplate);
      toast({
        title: 'Succès',
        description: `Le PDF a été généré sous le nom ${filename}`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const processUploadedTemplate = () => {
    if (!uploadedFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (typeof e.target?.result === 'string') {
          setCurrentTemplate({ 
            ...currentTemplate, 
            content: e.target.result 
          });
          toast({
            title: 'Succès',
            description: 'Modèle importé avec succès',
          });
        }
      } catch (error) {
        console.error('Error processing template file:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de traiter le fichier',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(uploadedFile);
  };

  const downloadTemplate = () => {
    const element = document.createElement('a');
    const file = new Blob([currentTemplate.content], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `template-${currentTemplate.name.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleTemplateChange = (template: Template) => {
    setCurrentTemplate(template);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Éditer</TabsTrigger>
          <TabsTrigger value="preview">Aperçu</TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Éditeur de Modèle</CardTitle>
                  <CardDescription>
                    Créez et modifiez vos modèles PDF
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor="template-name">Nom du modèle</Label>
                        <Input 
                          id="template-name" 
                          value={currentTemplate.name} 
                          onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                          placeholder="Nom du modèle"
                        />
                      </div>
                      <div>
                        <Label htmlFor="template-type">Type</Label>
                        <select 
                          id="template-type" 
                          value={currentTemplate.type}
                          onChange={e => setCurrentTemplate({...currentTemplate, type: e.target.value as 'offer' | 'contract'})}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="offer">Offre</option>
                          <option value="contract">Contrat</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="template-content">Contenu HTML</Label>
                      <Textarea 
                        id="template-content" 
                        value={currentTemplate.content}
                        onChange={e => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                        className="font-mono text-sm h-96 overflow-auto"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={handleSaveTemplate}
                      disabled={isLoading}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </Button>
                    
                    <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          disabled={!currentTemplate.id || isDeleting}
                        >
                          Supprimer
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmer la suppression</DialogTitle>
                          <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action ne peut pas être annulée.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                            Annuler
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={handleDeleteTemplate}
                            disabled={isDeleting}
                          >
                            Supprimer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".html,.htm"
                      className="hidden"
                      id="template-upload"
                    />
                    <Label htmlFor="template-upload" className="cursor-pointer">
                      <Button variant="outline" type="button" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Importer
                        </span>
                      </Button>
                    </Label>
                    {uploadedFile && (
                      <Button onClick={processUploadedTemplate} variant="secondary">
                        Appliquer l'import
                      </Button>
                    )}
                    
                    <Button variant="outline" onClick={downloadTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Exporter
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Modèles</CardTitle>
                  <CardDescription>
                    Modèles disponibles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {templates.length === 0 && !isLoading ? (
                      <div className="text-center p-4 text-gray-500">
                        Aucun modèle disponible
                      </div>
                    ) : isLoading ? (
                      <div className="text-center p-4">
                        Chargement...
                      </div>
                    ) : (
                      templates.map(template => (
                        <Button 
                          key={template.id} 
                          variant={currentTemplate.id === template.id ? "default" : "outline"}
                          className="w-full justify-start text-left h-auto py-3"
                          onClick={() => handleTemplateChange(template)}
                        >
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-gray-500">
                              {template.type === 'offer' ? 'Offre' : 'Contrat'}
                              {template.is_default && ' (Défaut)'}
                            </div>
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <Collapsible
                    open={!isCollapsed}
                    onOpenChange={(open) => setIsCollapsed(!open)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle>Variables disponibles</CardTitle>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronsUpDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      Cliquez pour insérer dans le modèle
                    </CardDescription>
                    
                    <CollapsibleContent>
                      <div className="pt-4">
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-4">
                            {VARIABLE_CATEGORIES.map(category => (
                              <div key={category.name}>
                                <h3 className="font-medium text-sm mb-2">{category.name}</h3>
                                <div className="space-y-1">
                                  {OFFER_VARIABLES.filter(v => v.name.startsWith(category.prefix)).map(variable => (
                                    <Button
                                      key={variable.name}
                                      variant="outline"
                                      size="sm"
                                      className="mr-2 mb-2 text-xs"
                                      onClick={() => handleVariableClick(variable.name)}
                                    >
                                      {variable.name}
                                    </Button>
                                  ))}
                                </div>
                                <Separator className="my-2" />
                              </div>
                            ))}
                            
                            <div>
                              <h3 className="font-medium text-sm mb-2">Boucles</h3>
                              <div className="p-2 border rounded-md bg-slate-50 text-sm">
                                <pre className="whitespace-pre-wrap text-xs">
{`{{#each equipment}}
  <div>
    <h4>{{title}}</h4>
    <p>Prix: {{purchasePrice}}</p>
    <p>Quantité: {{quantity}}</p>
    <p>Marge: {{margin}}</p>
  </div>
{{/each}}`}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardHeader>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu du modèle</CardTitle>
              <CardDescription>
                Visualisez le rendu du modèle avec les données d'une offre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="ID de l'offre"
                    value={offerInput}
                    onChange={(e) => setOfferInput(e.target.value)}
                  />
                  <Button onClick={loadOfferForPreview} disabled={isPreviewLoading}>
                    Charger
                  </Button>
                </div>
                
                <div>
                  {previewOffer && (
                    <Button onClick={handleGeneratePdf} variant="outline">
                      <FileText className="mr-2 h-4 w-4" />
                      Générer PDF
                    </Button>
                  )}
                </div>
              </div>
              
              {isPreviewLoading ? (
                <div className="flex justify-center items-center h-96">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : previewOffer ? (
                <div className="mt-6 border rounded-md overflow-hidden">
                  <div className="bg-amber-50 p-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                    <span className="text-sm text-amber-800">Aperçu - Le rendu final peut varier</span>
                  </div>
                  <div className="bg-white p-6 min-h-[500px]">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} className="prose max-w-none"></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                  <FileText className="h-12 w-12 mb-4" />
                  <p>Veuillez charger une offre pour voir l'aperçu</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const VARIABLE_CATEGORIES = [
  { name: 'Offre', prefix: 'offer' },
  { name: 'Client', prefix: 'client' },
  { name: 'Entreprise', prefix: 'company' },
  { name: 'Leaser', prefix: 'leaser' },
];

const OFFER_VARIABLES: Variable[] = [
  { name: 'offer.id', description: 'ID de l\'offre', example: '6202f483-51a1-45a6-ba70-deab99633814', type: 'text' },
  { name: 'offer.amount', description: 'Montant total', example: '3210.22', type: 'currency' },
  { name: 'offer.monthly_payment', description: 'Mensualité', example: '116.85', type: 'currency' },
  { name: 'offer.coefficient', description: 'Coefficient', example: '3.28', type: 'number' },
  { name: 'offer.commission', description: 'Commission', example: '11.69', type: 'currency' },
  { name: 'offer.created_at', description: 'Date de création', example: '2025-03-14', type: 'date' },
  
  { name: 'client.name', description: 'Nom du client', example: 'Alain Dien', type: 'text' },
  { name: 'client.email', description: 'Email du client', example: 'client@exemple.com', type: 'text' },
  { name: 'client.company', description: 'Entreprise du client', example: 'ACME FRANCE SAS', type: 'text' },
  
  { name: 'company.name', description: 'Nom de votre entreprise', example: 'iTakeCare', type: 'text' },
  { name: 'company.address', description: 'Adresse de votre entreprise', example: '123 Rue de Paris', type: 'text' },
  { name: 'company.phone', description: 'Téléphone de votre entreprise', example: '01 23 45 67 89', type: 'text' },
  { name: 'company.email', description: 'Email de votre entreprise', example: 'contact@itakecare.com', type: 'text' },
  
  { name: 'leaser.name', description: 'Nom du bailleur', example: 'Grenke', type: 'text' },
  { name: 'leaser.logo', description: 'Logo du bailleur', example: 'https://example.com/logo.png', type: 'text' },
];

const defaultTemplate = `<!DOCTYPE html>
<html>
<head>
  <title>Offre de Financement</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      max-width: 200px;
      margin-bottom: 20px;
    }
    h1 {
      color: #2563eb;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .offer-details {
      margin-bottom: 30px;
    }
    .client-info {
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    table, th, td {
      border: 1px solid #ddd;
    }
    th, td {
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    .footer {
      margin-top: 50px;
      font-size: 12px;
      text-align: center;
      color: #666;
    }
    .financials {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .financials div {
      flex: 1;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 5px;
      margin: 0 10px;
      text-align: center;
    }
    .financials h3 {
      margin-top: 0;
      color: #4b5563;
      font-size: 14px;
    }
    .financials p {
      font-size: 20px;
      font-weight: bold;
      color: #2563eb;
      margin: 10px 0 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://itakecare.eu/images/logo/logo-simple.png" alt="Logo" class="logo">
    <h1>Offre de Financement</h1>
    <p>Référence: OFF-{{offer.id}}</p>
    <p>Date: {{offer.created_at}}</p>
  </div>
  
  <div class="client-info">
    <h2>Informations Client</h2>
    <p><strong>Nom/Société:</strong> {{client.name}}</p>
    <p><strong>Email:</strong> {{client.email}}</p>
    <p><strong>Entreprise:</strong> {{client.company}}</p>
  </div>
  
  <div class="offer-details">
    <h2>Détails de l'Offre</h2>
    
    <div class="financials">
      <div>
        <h3>MONTANT TOTAL</h3>
        <p>{{offer.amount}}</p>
      </div>
      <div>
        <h3>MENSUALITÉS</h3>
        <p>{{offer.monthly_payment}}</p>
      </div>
      <div>
        <h3>COEFFICIENT</h3>
        <p>{{offer.coefficient}}</p>
      </div>
    </div>
    
    <h3>Équipements</h3>
    <table>
      <tr>
        <th>Désignation</th>
        <th>Prix</th>
        <th>Quantité</th>
        <th>Marge</th>
      </tr>
      {{#each equipment}}
      <tr>
        <td>{{title}}</td>
        <td>{{purchasePrice}}</td>
        <td>{{quantity}}</td>
        <td>{{margin}}</td>
      </tr>
      {{/each}}
    </table>
  </div>
  
  <div class="footer">
    <p>Ce document est une offre de financement. Pour plus d'informations, veuillez nous contacter.</p>
    <p>{{company.name}} - {{company.address}} - {{company.phone}}</p>
  </div>
</body>
</html>`;

export default PDFTemplateEditor;
