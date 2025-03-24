import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorPicker } from "@/components/ui/color-picker";
import { Switch } from "@/components/ui/switch";
import PDFTemplateImageUploader from "./PDFTemplateImageUploader";
import PDFTemplateFieldEditor from "./PDFTemplateFieldEditor";
import PDFPreview from "./pdf-preview/PDFPreview";
import { toast } from "sonner";
import { loadTemplate, saveTemplate, PDFTemplate } from "@/utils/templateManager";
import { generateSamplePdf } from "@/services/offers/offerPdf";
import { FileDown, Loader2, Save } from "lucide-react";
import OfferTemplate from "../offer/OfferTemplate";

interface PDFTemplateManagerProps {
  templateId?: string;
}

const PDFTemplateManager: React.FC<PDFTemplateManagerProps> = ({ 
  templateId = 'default'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [selectedPage, setSelectedPage] = useState(0);
  const [useOfferTemplate, setUseOfferTemplate] = useState(false);
  
  useEffect(() => {
    const fetchTemplate = async () => {
      setIsLoading(true);
      try {
        console.log("Chargement du template:", templateId);
        const loadedTemplate = await loadTemplate(templateId);
        console.log("Template chargé:", loadedTemplate);
        setTemplate(loadedTemplate);
        
        // Vérifier si le modèle utilise OfferTemplate
        setUseOfferTemplate(loadedTemplate.useOfferTemplate || false);
      } catch (error) {
        console.error("Erreur lors du chargement du template:", error);
        toast.error("Erreur lors du chargement du modèle");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplate();
  }, [templateId]);
  
  const handleSaveTemplate = async () => {
    if (!template) return;
    
    setIsSaving(true);
    try {
      // Mettre à jour le template avec l'option useOfferTemplate
      const updatedTemplate = {
        ...template,
        useOfferTemplate,
        updated_at: new Date().toISOString()
      };
      
      const success = await saveTemplate(updatedTemplate);
      
      if (success) {
        toast.success("Modèle enregistré avec succès");
        setTemplate(updatedTemplate);
      } else {
        toast.error("Erreur lors de l'enregistrement du modèle");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du template:", error);
      toast.error("Erreur lors de l'enregistrement du modèle");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleGeneratePDF = async () => {
    if (!template) return;
    
    setIsGenerating(true);
    try {
      // Données d'exemple pour le PDF
      const sampleData = {
        id: `sample-${Date.now()}`,
        offer_id: `OFR-${Math.floor(Math.random() * 9000) + 1000}`,
        client_name: "Société Exemple",
        client_email: "contact@exemple.com",
        client_company: "Société Exemple S.A.",
        equipment_description: JSON.stringify([
          {
            title: "MacBook Pro 16\" M2",
            purchasePrice: 2699, 
            quantity: 1,
            margin: 10,
            monthlyPayment: 75.00
          },
          {
            title: "Écran Dell 27\" UltraHD",
            purchasePrice: 499, 
            quantity: 2,
            margin: 15,
            monthlyPayment: 28.00
          }
        ]),
        amount: 3697,
        monthly_payment: 131,
        coefficient: 3.6,
        created_at: new Date().toISOString(),
      };
      
      const pdfFilename = await generateSamplePdf(sampleData, {
        ...template,
        useOfferTemplate
      });
      
      if (pdfFilename) {
        toast.success(`PDF d'exemple généré: ${pdfFilename}`);
      } else {
        toast.error("Erreur lors de la génération du PDF");
      }
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement du modèle...</span>
      </div>
    );
  }
  
  if (!template) {
    return (
      <div className="text-center p-8 border rounded-md bg-red-50 text-red-600">
        Impossible de charger le modèle
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Modèle: {template.name}
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleGeneratePDF}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Générer un PDF d'exemple
              </>
            )}
          </Button>
          <Button 
            onClick={handleSaveTemplate}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="pages">Pages</TabsTrigger>
              <TabsTrigger value="fields">Champs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Nom du modèle</Label>
                      <Input
                        type="text"
                        id="template-name"
                        value={template.name}
                        onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-id">ID du modèle</Label>
                      <Input
                        type="text"
                        id="template-id"
                        value={template.id}
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label htmlFor="use-offer-template" className="font-medium">
                          Utiliser le modèle d'offre
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Utiliser le composant OfferTemplate comme modèle au lieu des images
                        </p>
                      </div>
                      <Switch 
                        id="use-offer-template" 
                        checked={useOfferTemplate} 
                        onCheckedChange={setUseOfferTemplate}
                      />
                    </div>
                    
                    {useOfferTemplate && (
                      <div className="rounded-md border p-4 bg-slate-50">
                        <p className="text-sm">
                          Lorsque cette option est activée, le modèle utilisera le composant OfferTemplate 
                          au lieu des images de modèle. Les champs et positions configurés seront ignorés.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Informations de l'entreprise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nom de l'entreprise</Label>
                      <Input
                        type="text"
                        id="company-name"
                        value={template.companyName}
                        onChange={(e) => setTemplate({ ...template, companyName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-siret">Numéro de SIRET</Label>
                      <Input
                        type="text"
                        id="company-siret"
                        value={template.companySiret}
                        onChange={(e) => setTemplate({ ...template, companySiret: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-address">Adresse de l'entreprise</Label>
                    <Input
                      type="text"
                      id="company-address"
                      value={template.companyAddress}
                      onChange={(e) => setTemplate({ ...template, companyAddress: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-contact">Contact de l'entreprise</Label>
                    <Input
                      type="text"
                      id="company-contact"
                      value={template.companyContact}
                      onChange={(e) => setTemplate({ ...template, companyContact: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo-url">URL du logo</Label>
                    <Input
                      type="text"
                      id="logo-url"
                      value={template.logoURL}
                      onChange={(e) => setTemplate({ ...template, logoURL: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Apparence du document</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Couleur primaire</Label>
                      <ColorPicker
                        id="primary-color"
                        value={template.primaryColor}
                        onColorChange={(color) => setTemplate({ ...template, primaryColor: color })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Couleur secondaire</Label>
                      <ColorPicker
                        id="secondary-color"
                        value={template.secondaryColor}
                        onColorChange={(color) => setTemplate({ ...template, secondaryColor: color })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="header-text">Texte d'en-tête</Label>
                    <Input
                      type="text"
                      id="header-text"
                      value={template.headerText}
                      onChange={(e) => setTemplate({ ...template, headerText: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="footer-text">Texte de pied de page</Label>
                    <Input
                      type="text"
                      id="footer-text"
                      value={template.footerText}
                      onChange={(e) => setTemplate({ ...template, footerText: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pages">
              <Card>
                <CardHeader>
                  <CardTitle>Pages du modèle</CardTitle>
                  <CardDescription>
                    {useOfferTemplate 
                      ? "Le modèle utilisera le composant OfferTemplate. Les images ci-dessous seront ignorées."
                      : "Ajoutez les pages de votre modèle. L'ordre des pages correspond à l'ordre dans lequel elles apparaîtront dans le document."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {useOfferTemplate ? (
                    <div className="rounded-md border p-6 bg-slate-50">
                      <div className="text-center space-y-4">
                        <p className="text-sm">
                          Le modèle utilise actuellement le composant OfferTemplate comme modèle de document.
                          Les images de modèle sont ignorées.
                        </p>
                        <div className="flex justify-center">
                          <Button 
                            variant="outline" 
                            onClick={() => setUseOfferTemplate(false)}
                          >
                            Utiliser les images de modèle à la place
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <PDFTemplateImageUploader
                      templateImages={template.templateImages}
                      onChange={(images) => {
                        setTemplate({ ...template, templateImages: images });
                      }}
                      selectedPage={selectedPage}
                      onPageSelect={setSelectedPage}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="fields">
              <Card>
                <CardHeader>
                  <CardTitle>Champs du document</CardTitle>
                  <CardDescription>
                    {useOfferTemplate 
                      ? "Le modèle utilisera le composant OfferTemplate. Les champs ci-dessous seront ignorés."
                      : "Configurez les champs qui apparaîtront dans votre document."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {useOfferTemplate ? (
                    <div className="rounded-md border p-6 bg-slate-50">
                      <div className="text-center space-y-4">
                        <p className="text-sm">
                          Le modèle utilise actuellement le composant OfferTemplate comme modèle de document.
                          Les champs et positions configurés sont ignorés.
                        </p>
                        <div className="flex justify-center">
                          <Button 
                            variant="outline" 
                            onClick={() => setUseOfferTemplate(false)}
                          >
                            Utiliser les champs configurés à la place
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <PDFTemplateFieldEditor
                      templateFields={template.fields}
                      onChange={(fields) => {
                        setTemplate({ ...template, fields });
                      }}
                      selectedPage={selectedPage}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Aperçu du modèle</CardTitle>
              <CardDescription>
                Prévisualisation de la page {selectedPage + 1}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {useOfferTemplate ? (
                <div className="border rounded-md overflow-hidden bg-white">
                  <div className="bg-slate-100 p-2 text-xs text-center text-slate-500 border-b">
                    Aperçu du modèle d'offre (OfferTemplate)
                  </div>
                  <div className="p-4 max-h-[600px] overflow-auto">
                    <OfferTemplate
                      offerNumber="OFR-1234"
                      referenceNumber="REF-ABCD"
                      date={new Date().toISOString()}
                      clientName="Société Exemple"
                      clientCompany="Société Exemple S.A."
                      clientContact="contact@exemple.com"
                      equipment={[
                        {
                          designation: "MacBook Pro 16\" M2",
                          quantity: 1,
                          monthly_price: 75.00
                        },
                        {
                          designation: "Écran Dell 27\" UltraHD",
                          quantity: 2,
                          monthly_price: 28.00
                        }
                      ]}
                      totalMonthly={131}
                      companyInfo={{
                        name: template.companyName,
                        address: template.companyAddress,
                        taxId: template.companySiret,
                        contact: template.companyContact
                      }}
                      footerText={template.footerText}
                      logo={template.logoURL}
                    />
                  </div>
                </div>
              ) : (
                <PDFPreview
                  template={template}
                  pageIndex={selectedPage}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PDFTemplateManager;
