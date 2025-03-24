
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Edit, Plus, Save, Trash2 } from "lucide-react";
import PDFTemplateWithFields from "@/components/settings/PDFTemplateWithFields";
import { PDFTemplate, listTemplates, loadTemplate, saveTemplate, DEFAULT_TEMPLATE } from "@/utils/templateManager";
import { v4 as uuidv4 } from "uuid";
import { generateSamplePdf } from "@/services/offers/offerPdf";

const NewPDFTemplateManager = () => {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Charger la liste des modèles
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const templatesList = await listTemplates();
      setTemplates(templatesList);
      
      // Sélectionner le premier modèle par défaut
      if (templatesList.length > 0 && !selectedTemplate) {
        const template = await loadTemplate(templatesList[0].id);
        setSelectedTemplate(template);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des modèles:", error);
      toast.error("Erreur lors du chargement des modèles");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Sélectionner un modèle
  const handleSelectTemplate = async (templateId: string) => {
    if (templateId === selectedTemplate?.id) return;
    
    try {
      setIsLoading(true);
      const template = await loadTemplate(templateId);
      setSelectedTemplate(template);
      setActiveTab("general");
    } catch (error) {
      console.error("Erreur lors du chargement du modèle:", error);
      toast.error("Erreur lors du chargement du modèle");
    } finally {
      setIsLoading(false);
    }
  };

  // Créer un nouveau modèle
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Veuillez entrer un nom pour le modèle");
      return;
    }
    
    try {
      setIsCreating(true);
      
      const newTemplate: PDFTemplate = {
        ...DEFAULT_TEMPLATE,
        id: uuidv4(),
        name: newTemplateName,
        templateImages: [],
        fields: []
      };
      
      await saveTemplate(newTemplate);
      await loadTemplates();
      setSelectedTemplate(newTemplate);
      setNewTemplateName("");
      toast.success("Nouveau modèle créé avec succès");
    } catch (error) {
      console.error("Erreur lors de la création du modèle:", error);
      toast.error("Erreur lors de la création du modèle");
    } finally {
      setIsCreating(false);
    }
  };

  // Sauvegarder les modifications du modèle
  const handleSaveTemplate = async (updatedTemplate: PDFTemplate) => {
    if (!updatedTemplate) return;
    
    try {
      setIsSaving(true);
      
      await saveTemplate(updatedTemplate);
      setSelectedTemplate(updatedTemplate);
      await loadTemplates();
      
      toast.success("Modèle sauvegardé avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du modèle:", error);
      toast.error("Erreur lors de la sauvegarde du modèle");
    } finally {
      setIsSaving(false);
    }
  };

  // Mettre à jour un champ du modèle
  const handleTemplateChange = (field: keyof PDFTemplate, value: any) => {
    if (!selectedTemplate) return;
    
    setSelectedTemplate({
      ...selectedTemplate,
      [field]: value
    });
  };

  // Générer un aperçu PDF
  const handlePreview = async () => {
    if (!selectedTemplate) return;
    
    try {
      setIsPreviewLoading(true);
      
      // Données d'exemple pour l'aperçu
      const sampleData = {
        client_name: "Client Exemple",
        client_email: "exemple@email.com",
        client_company: "Société Exemple",
        client_phone: "01 23 45 67 89",
        client_address: "15 rue Exemple",
        client_postal_code: "75000",
        client_city: "Paris",
        client_vat_number: "FR12345678901",
        offer_id: "OFR-1234",
        amount: 10000,
        monthly_payment: 300,
        created_at: new Date().toISOString(),
        equipment_list: "- MacBook Pro 16\" M2\n- Écran Dell 27\" UltraHD (x2)"
      };
      
      // Générer le PDF
      await generateSamplePdf(sampleData, selectedTemplate);
      toast.success("Aperçu PDF généré avec succès");
    } catch (error) {
      console.error("Erreur lors de la génération de l'aperçu PDF:", error);
      toast.error("Erreur lors de la génération de l'aperçu PDF");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des modèles PDF</CardTitle>
          <CardDescription>
            Créez et modifiez les modèles PDF pour les offres et contrats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Panneau de gauche: Liste des modèles */}
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="new-template-name">Créer un nouveau modèle</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-template-name"
                    placeholder="Nom du modèle"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    disabled={isCreating}
                  />
                  <Button onClick={handleCreateTemplate} disabled={isCreating}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-md">
                <div className="px-3 py-2 border-b bg-muted">
                  <h3 className="font-medium">Modèles disponibles</h3>
                </div>
                <div className="p-2">
                  {isLoading ? (
                    <p className="p-2 text-sm text-muted-foreground">Chargement...</p>
                  ) : templates.length > 0 ? (
                    <div className="space-y-1">
                      {templates.map((template) => (
                        <Button
                          key={template.id}
                          variant={selectedTemplate?.id === template.id ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleSelectTemplate(template.id)}
                        >
                          <Edit className="h-4 w-4 mr-2 text-muted-foreground" />
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="p-2 text-sm text-muted-foreground">Aucun modèle disponible</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Panneau de droite: Éditeur de modèle */}
            <div className="md:col-span-2">
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">{selectedTemplate.name}</h2>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handlePreview}
                        disabled={isPreviewLoading}
                      >
                        {isPreviewLoading ? "Génération..." : "Aperçu PDF"}
                      </Button>
                      <Button 
                        onClick={() => handleSaveTemplate(selectedTemplate)}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                      </Button>
                    </div>
                  </div>
                  
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="general">Informations générales</TabsTrigger>
                      <TabsTrigger value="template">Pages et champs</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general" className="space-y-4 mt-4">
                      {/* Informations de l'entreprise */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="companyName">Nom de l'entreprise</Label>
                          <Input
                            id="companyName"
                            value={selectedTemplate.companyName}
                            onChange={(e) => handleTemplateChange("companyName", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="companySiret">SIRET/TVA</Label>
                          <Input
                            id="companySiret"
                            value={selectedTemplate.companySiret}
                            onChange={(e) => handleTemplateChange("companySiret", e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="companyAddress">Adresse</Label>
                          <Input
                            id="companyAddress"
                            value={selectedTemplate.companyAddress}
                            onChange={(e) => handleTemplateChange("companyAddress", e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="companyContact">Coordonnées</Label>
                          <Input
                            id="companyContact"
                            value={selectedTemplate.companyContact}
                            onChange={(e) => handleTemplateChange("companyContact", e.target.value)}
                            placeholder="Tél, Email, etc."
                          />
                        </div>
                        <div>
                          <Label htmlFor="headerText">Texte d'en-tête</Label>
                          <Input
                            id="headerText"
                            value={selectedTemplate.headerText}
                            onChange={(e) => handleTemplateChange("headerText", e.target.value)}
                            placeholder="Ex: OFFRE N° {offer_id}"
                          />
                        </div>
                        <div>
                          <Label htmlFor="footerText">Texte de pied de page</Label>
                          <Input
                            id="footerText"
                            value={selectedTemplate.footerText}
                            onChange={(e) => handleTemplateChange("footerText", e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {/* Couleurs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div>
                          <Label htmlFor="primaryColor">Couleur principale</Label>
                          <div className="flex gap-2">
                            <Input
                              id="primaryColor"
                              value={selectedTemplate.primaryColor}
                              onChange={(e) => handleTemplateChange("primaryColor", e.target.value)}
                              placeholder="Ex: #2C3E50"
                            />
                            <div 
                              className="w-10 h-10 rounded border"
                              style={{ backgroundColor: selectedTemplate.primaryColor }}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                          <div className="flex gap-2">
                            <Input
                              id="secondaryColor"
                              value={selectedTemplate.secondaryColor}
                              onChange={(e) => handleTemplateChange("secondaryColor", e.target.value)}
                              placeholder="Ex: #3498DB"
                            />
                            <div 
                              className="w-10 h-10 rounded border"
                              style={{ backgroundColor: selectedTemplate.secondaryColor }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Logo */}
                      <div className="pt-4">
                        <Label htmlFor="logoURL">URL du logo</Label>
                        <Input
                          id="logoURL"
                          value={selectedTemplate.logoURL || ""}
                          onChange={(e) => handleTemplateChange("logoURL", e.target.value)}
                          placeholder="https://exemple.com/logo.png"
                        />
                        {selectedTemplate.logoURL && (
                          <div className="mt-2 p-2 border rounded">
                            <img 
                              src={selectedTemplate.logoURL} 
                              alt="Logo" 
                              className="max-h-20 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                toast.error("Impossible de charger l'image du logo");
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="template" className="mt-4">
                      <PDFTemplateWithFields 
                        template={selectedTemplate} 
                        onSave={(updatedTemplate) => setSelectedTemplate(updatedTemplate)}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 border border-dashed rounded-md">
                  <h3 className="text-lg font-medium mb-2">Aucun modèle sélectionné</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sélectionnez un modèle existant ou créez-en un nouveau pour commencer.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewPDFTemplateManager;
