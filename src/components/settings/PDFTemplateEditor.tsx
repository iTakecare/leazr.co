
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ImagePlus, Plus, Save, Trash2, AlertCircle, EyeIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";

interface PDFField {
  id: string;
  name: string;
  type: "text" | "date" | "currency" | "table";
  label: string;
  value: string;
  isVisible: boolean;
  position: { x: number; y: number };
}

interface PDFTemplate {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companySiret: string;
  logoURL: string | null;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  fields: PDFField[];
}

const defaultTemplate: PDFTemplate = {
  id: "default",
  name: "Modèle par défaut",
  companyName: "iTakeCare SAS",
  companyAddress: "123 Avenue de la République - 75011 Paris",
  companyContact: "contact@itakecare.fr - www.itakecare.fr",
  companySiret: "SIRET: 123 456 789 00011",
  logoURL: null,
  primaryColor: "#2C3E50",
  secondaryColor: "#3498DB",
  headerText: "OFFRE N° {offer_id}",
  footerText: "Cette offre est valable 30 jours à compter de sa date d'émission. Cette offre est soumise à l'acceptation finale du bailleur.",
  fields: [
    { id: "client_name", name: "client_name", type: "text", label: "Nom du client", value: "{client_name}", isVisible: true, position: { x: 14, y: 58 } },
    { id: "client_email", name: "client_email", type: "text", label: "Email du client", value: "{client_email}", isVisible: true, position: { x: 14, y: 65 } },
    { id: "client_company", name: "client_company", type: "text", label: "Société du client", value: "{client_company}", isVisible: true, position: { x: 14, y: 72 } },
    { id: "amount", name: "amount", type: "currency", label: "Montant total", value: "{amount}", isVisible: true, position: { x: 14, y: 98 } },
    { id: "monthly_payment", name: "monthly_payment", type: "currency", label: "Paiement mensuel", value: "{monthly_payment}", isVisible: true, position: { x: 14, y: 105 } },
    { id: "coefficient", name: "coefficient", type: "text", label: "Coefficient", value: "{coefficient}", isVisible: true, position: { x: 14, y: 112 } },
    { id: "equipment_table", name: "equipment_table", type: "table", label: "Tableau des équipements", value: "{equipment_table}", isVisible: true, position: { x: 14, y: 135 } },
    { id: "created_at", name: "created_at", type: "date", label: "Date de création", value: "{created_at}", isVisible: true, position: { x: 195, y: 30 } },
  ]
};

const PDFTemplateEditor = () => {
  const [template, setTemplate] = useState<PDFTemplate>(defaultTemplate);
  const [activeTab, setActiveTab] = useState("general");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const supabase = getSupabaseClient();

  const form = useForm({
    defaultValues: {
      companyName: template.companyName,
      companyAddress: template.companyAddress,
      companyContact: template.companyContact,
      companySiret: template.companySiret,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      headerText: template.headerText,
      footerText: template.footerText,
    }
  });

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      // Vérifier si la table pdf_templates existe
      const { data: tableExists, error: tableCheckError } = await supabase.rpc(
        'check_table_exists',
        { table_name: 'pdf_templates' }
      );

      if (tableCheckError) {
        console.error("Erreur lors de la vérification de la table:", tableCheckError);
        // Supposer que la table n'existe pas
      }

      // Si la table n'existe pas, la créer
      if (!tableExists) {
        await createPdfTemplatesTable();
        // Après avoir créé la table, insérer le modèle par défaut
        const { error: insertError } = await supabase
          .from('pdf_templates')
          .insert(defaultTemplate);

        if (insertError) {
          console.error("Erreur lors de l'insertion du modèle par défaut:", insertError);
          toast.error(`Erreur: ${insertError.message}`);
          return;
        }
        
        setTemplate(defaultTemplate);
        form.reset(defaultTemplate);
        return;
      }

      // Charger le modèle depuis la base de données
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', 'default')
        .single();

      if (error && error.code !== 'PGSQL_ERROR') {
        console.error("Erreur lors du chargement du modèle:", error);
        toast.error(`Erreur: ${error.message}`);
        return;
      }

      if (data) {
        setTemplate(data);
        form.reset({
          companyName: data.companyName,
          companyAddress: data.companyAddress,
          companyContact: data.companyContact,
          companySiret: data.companySiret,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          headerText: data.headerText,
          footerText: data.footerText,
        });

        if (data.logoURL) {
          setLogoPreview(data.logoURL);
        }
      } else {
        // Si aucun modèle n'existe, créer le modèle par défaut
        const { error: insertError } = await supabase
          .from('pdf_templates')
          .insert(defaultTemplate);

        if (insertError) {
          console.error("Erreur lors de l'insertion du modèle par défaut:", insertError);
          toast.error(`Erreur: ${insertError.message}`);
          return;
        }
        
        setTemplate(defaultTemplate);
        form.reset(defaultTemplate);
      }
    } catch (error: any) {
      console.error("Erreur lors du chargement du modèle:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const createPdfTemplatesTable = async () => {
    try {
      // Créer la table pdf_templates
      const { error } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.pdf_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            "companyName" TEXT NOT NULL,
            "companyAddress" TEXT NOT NULL,
            "companyContact" TEXT NOT NULL,
            "companySiret" TEXT NOT NULL,
            "logoURL" TEXT,
            "primaryColor" TEXT NOT NULL,
            "secondaryColor" TEXT NOT NULL,
            "headerText" TEXT NOT NULL,
            "footerText" TEXT NOT NULL,
            fields JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );
        `
      });

      if (error) {
        console.error("Erreur lors de la création de la table pdf_templates:", error);
        toast.error(`Erreur lors de la création de la table: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Erreur lors de la création de la table pdf_templates:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFieldVisibilityChange = (fieldId: string, isVisible: boolean) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, isVisible } : field
      )
    }));
  };

  const handlePositionChange = (fieldId: string, axis: 'x' | 'y', value: number) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId 
          ? { 
              ...field, 
              position: { 
                ...field.position, 
                [axis]: value 
              } 
            } 
          : field
      )
    }));
  };

  const handleSaveTemplate = async (formData: any) => {
    setIsSaving(true);
    try {
      let logoURL = template.logoURL;

      // Create storage bucket if it doesn't exist
      try {
        const { error: storageError } = await supabase.storage.createBucket('pdfs', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        });
        
        if (storageError && !storageError.message.includes('already exists')) {
          console.error("Erreur lors de la création du bucket:", storageError);
        }
      } catch (storageErr) {
        console.warn("Le bucket existe probablement déjà:", storageErr);
      }

      // Upload logo if changed
      if (logoFile) {
        const fileName = `logos/${Date.now()}_${logoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, logoFile, {
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('pdfs')
          .getPublicUrl(fileName);

        logoURL = urlData.publicUrl;
      }

      // Update template
      const updatedTemplate = {
        ...template,
        ...formData,
        logoURL,
      };

      // Vérifier si la table existe avant d'essayer d'insérer
      const { data: tableExists, error: tableCheckError } = await supabase.rpc(
        'check_table_exists',
        { table_name: 'pdf_templates' }
      );

      if (tableCheckError || !tableExists) {
        await createPdfTemplatesTable();
      }

      // Insérer ou mettre à jour le modèle
      const { error } = await supabase
        .from('pdf_templates')
        .upsert(updatedTemplate);

      if (error) throw error;

      setTemplate(updatedTemplate);
      toast.success("Modèle PDF enregistré avec succès");
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement du modèle:", error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser tous les paramètres du modèle PDF ?")) {
      setTemplate(defaultTemplate);
      setLogoPreview(null);
      setLogoFile(null);
      form.reset({
        companyName: defaultTemplate.companyName,
        companyAddress: defaultTemplate.companyAddress,
        companyContact: defaultTemplate.companyContact,
        companySiret: defaultTemplate.companySiret,
        primaryColor: defaultTemplate.primaryColor,
        secondaryColor: defaultTemplate.secondaryColor,
        headerText: defaultTemplate.headerText,
        footerText: defaultTemplate.footerText,
      });
      toast.info("Modèle réinitialisé aux paramètres par défaut");
    }
  };

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Modèle de PDF</span>
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={togglePreviewMode}
                className="flex items-center gap-2"
              >
                <EyeIcon className="h-4 w-4" />
                {previewMode ? "Éditer" : "Aperçu"}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={resetToDefault}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Réinitialiser
              </Button>
            </div>
          </div>
          <CardDescription>
            Personnalisez l'apparence et le contenu des PDF d'offres générés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {previewMode ? (
            <div className="border rounded-md p-4 bg-white min-h-[500px] flex flex-col items-center">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Aperçu du PDF</h3>
                <p className="text-sm text-muted-foreground">
                  Voici une représentation visuelle de votre modèle PDF.
                </p>
              </div>
              <div 
                className="w-full max-w-[595px] h-[842px] border shadow-md bg-white relative overflow-auto"
                style={{ 
                  color: template.primaryColor, 
                }}
              >
                {/* Header */}
                <div className="p-6 border-b" style={{ borderColor: template.secondaryColor }}>
                  <div className="flex items-center justify-between">
                    {logoPreview && (
                      <img 
                        src={logoPreview} 
                        alt="Logo"
                        className="h-16 object-contain" 
                      />
                    )}
                    <div className="text-right">
                      {template.fields.find(f => f.id === 'created_at')?.isVisible && (
                        <div className="text-sm">Date: 01/01/2023</div>
                      )}
                    </div>
                  </div>
                  <div className="text-center mt-4 text-xl font-bold" style={{ color: template.primaryColor }}>
                    {template.headerText.replace('{offer_id}', 'OFF-12345678')}
                  </div>
                </div>
                
                {/* Client info */}
                {(template.fields.find(f => f.id === 'client_name')?.isVisible || 
                  template.fields.find(f => f.id === 'client_email')?.isVisible || 
                  template.fields.find(f => f.id === 'client_company')?.isVisible) && (
                  <div className="p-6">
                    <h3 className="font-bold mb-2" style={{ color: template.primaryColor }}>CLIENT</h3>
                    <div className="ml-4 space-y-1">
                      {template.fields.find(f => f.id === 'client_name')?.isVisible && (
                        <div className="text-sm">Nom: Entreprise Exemple</div>
                      )}
                      {template.fields.find(f => f.id === 'client_email')?.isVisible && (
                        <div className="text-sm">Email: contact@exemple.fr</div>
                      )}
                      {template.fields.find(f => f.id === 'client_company')?.isVisible && (
                        <div className="text-sm">Société: Exemple SARL</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Offer details */}
                {(template.fields.find(f => f.id === 'amount')?.isVisible || 
                  template.fields.find(f => f.id === 'monthly_payment')?.isVisible || 
                  template.fields.find(f => f.id === 'coefficient')?.isVisible) && (
                  <div className="p-6">
                    <h3 className="font-bold mb-2" style={{ color: template.primaryColor }}>DÉTAILS DE L'OFFRE</h3>
                    <div className="ml-4 space-y-1">
                      {template.fields.find(f => f.id === 'amount')?.isVisible && (
                        <div className="text-sm">Montant total: 10 000,00 €</div>
                      )}
                      {template.fields.find(f => f.id === 'monthly_payment')?.isVisible && (
                        <div className="text-sm">Paiement mensuel: 350,00 €</div>
                      )}
                      {template.fields.find(f => f.id === 'coefficient')?.isVisible && (
                        <div className="text-sm">Coefficient: 1.05</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Equipment table */}
                {template.fields.find(f => f.id === 'equipment_table')?.isVisible && (
                  <div className="p-6">
                    <h3 className="font-bold mb-2" style={{ color: template.primaryColor }}>ÉQUIPEMENTS</h3>
                    <div className="w-full border border-collapse mt-2">
                      <div className="grid grid-cols-5 border-b" style={{ backgroundColor: template.primaryColor }}>
                        <div className="py-2 px-3 text-white text-sm font-medium">Désignation</div>
                        <div className="py-2 px-3 text-white text-sm font-medium text-right">Prix unitaire</div>
                        <div className="py-2 px-3 text-white text-sm font-medium text-center">Quantité</div>
                        <div className="py-2 px-3 text-white text-sm font-medium text-center">Marge</div>
                        <div className="py-2 px-3 text-white text-sm font-medium text-right">Total</div>
                      </div>
                      <div className="grid grid-cols-5 border-b">
                        <div className="py-2 px-3 text-sm">Équipement exemple 1</div>
                        <div className="py-2 px-3 text-sm text-right">3 000,00 €</div>
                        <div className="py-2 px-3 text-sm text-center">2</div>
                        <div className="py-2 px-3 text-sm text-center">10%</div>
                        <div className="py-2 px-3 text-sm text-right">6 600,00 €</div>
                      </div>
                      <div className="grid grid-cols-5">
                        <div className="py-2 px-3 text-sm">Équipement exemple 2</div>
                        <div className="py-2 px-3 text-sm text-right">1 000,00 €</div>
                        <div className="py-2 px-3 text-sm text-center">1</div>
                        <div className="py-2 px-3 text-sm text-center">8%</div>
                        <div className="py-2 px-3 text-sm text-right">1 080,00 €</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                  <div className="text-xs mb-2">{template.footerText}</div>
                  <div className="border-t pt-2 text-xs" style={{ borderColor: template.secondaryColor }}>
                    <div>{template.companyName} - {template.companyAddress}</div>
                    <div>{template.companySiret} - {template.companyContact}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="company">Entreprise</TabsTrigger>
                <TabsTrigger value="fields">Champs</TabsTrigger>
              </TabsList>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveTemplate)}>
                  <TabsContent value="general">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="headerText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Titre du document</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="OFFRE N° {offer_id}" />
                            </FormControl>
                            <FormDescription>
                              Utilisez {offer_id} pour insérer le numéro de l'offre
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="primaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Couleur principale</FormLabel>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-8 h-8 rounded-md border" 
                                  style={{ backgroundColor: field.value }}
                                />
                                <FormControl>
                                  <Input {...field} type="text" />
                                </FormControl>
                              </div>
                              <FormDescription>
                                Utilisée pour les titres et en-têtes
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="secondaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Couleur secondaire</FormLabel>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-8 h-8 rounded-md border" 
                                  style={{ backgroundColor: field.value }}
                                />
                                <FormControl>
                                  <Input {...field} type="text" />
                                </FormControl>
                              </div>
                              <FormDescription>
                                Utilisée pour les accents et bordures
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="footerText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Texte de pied de page</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Cette offre est valable 30 jours..." 
                                className="min-h-[80px]"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="company">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="logo">Logo de l'entreprise</Label>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="border rounded-md h-20 w-40 flex items-center justify-center overflow-hidden bg-gray-50">
                            {logoPreview ? (
                              <img 
                                src={logoPreview} 
                                alt="Logo aperçu" 
                                className="h-full object-contain" 
                              />
                            ) : (
                              <ImagePlus className="h-8 w-8 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <Input
                              id="logo"
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="max-w-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Recommandation: image PNG de 200x100px avec fond transparent
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom de l'entreprise</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="companyAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adresse</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companyContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="email - site web" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="companySiret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SIRET</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="fields">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Champs à inclure dans le PDF</h4>
                      <div className="border rounded-md divide-y">
                        {template.fields.map((field) => (
                          <div key={field.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`field-${field.id}`}
                                  checked={field.isVisible}
                                  onCheckedChange={(checked) => handleFieldVisibilityChange(field.id, checked)}
                                />
                                <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {field.value}
                              </div>
                            </div>
                            
                            {field.isVisible && (
                              <div className="grid grid-cols-2 gap-4 mt-3 pl-7">
                                <div>
                                  <Label htmlFor={`pos-x-${field.id}`} className="text-xs">Position X</Label>
                                  <div className="flex items-center mt-1">
                                    <Input
                                      id={`pos-x-${field.id}`}
                                      type="number"
                                      value={field.position.x}
                                      onChange={(e) => handlePositionChange(field.id, 'x', parseInt(e.target.value))}
                                      className="w-20"
                                    />
                                    <span className="ml-1 text-xs text-muted-foreground">px</span>
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor={`pos-y-${field.id}`} className="text-xs">Position Y</Label>
                                  <div className="flex items-center mt-1">
                                    <Input
                                      id={`pos-y-${field.id}`}
                                      type="number"
                                      value={field.position.y}
                                      onChange={(e) => handlePositionChange(field.id, 'y', parseInt(e.target.value))}
                                      className="w-20"
                                    />
                                    <span className="ml-1 text-xs text-muted-foreground">px</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <div className="mt-6 flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Enregistrement..." : "Enregistrer le modèle"}
                    </Button>
                  </div>
                </form>
              </Form>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFTemplateEditor;
