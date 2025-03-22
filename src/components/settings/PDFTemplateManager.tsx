
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Save, Upload, Eye, Trash, FileDown, Palette, Layout, Info, FileText, User, Building, ShoppingBag, Calendar, CreditCard, FileUp } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import PDFFieldsEditor from "./PDFFieldsEditor";
import PDFPreview from "./PDFPreview";
import PDFCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateUploader from "./PDFTemplateUploader";

const DEFAULT_TEMPLATE = {
  id: "default",
  name: "Modèle par défaut",
  companyName: "iTakeCare",
  companyAddress: "Avenue du Général Michel 1E, 6000 Charleroi, Belgique",
  companyContact: "Tel: +32 471 511 121 - Email: hello@itakecare.be",
  companySiret: "TVA: BE 0795.642.894",
  logoURL: "",
  primaryColor: "#2C3E50",
  secondaryColor: "#3498DB",
  headerText: "OFFRE N° OFF-{offer_id}",
  footerText: "Cette offre est valable 30 jours à compter de sa date d'émission. Cette offre est soumise à l'acceptation finale du bailleur.",
  templateImages: [],
  fields: [
    { id: "created_at", label: "Date", type: "date", category: "general", isVisible: true, position: { x: 170, y: 40 }, page: 0, value: "Date: {created_at}" },
    { id: "client_name", label: "Nom du client", type: "text", category: "client", isVisible: true, position: { x: 14, y: 60 }, page: 0, value: "Client: {client_name}" },
    { id: "client_email", label: "Email du client", type: "text", category: "client", isVisible: true, position: { x: 14, y: 70 }, page: 0, value: "Email: {client_email}" },
    { id: "client_company", label: "Société du client", type: "text", category: "client", isVisible: true, position: { x: 14, y: 80 }, page: 0, value: "Société: {clients.company}" },
    { id: "amount", label: "Montant total", type: "currency", category: "offer", isVisible: true, position: { x: 14, y: 100 }, page: 0, value: "Montant total: {amount}" },
    { id: "monthly_payment", label: "Mensualité", type: "currency", category: "offer", isVisible: true, position: { x: 14, y: 110 }, page: 0, value: "Mensualité: {monthly_payment}" },
    { id: "coefficient", label: "Coefficient", type: "number", category: "offer", isVisible: true, position: { x: 14, y: 120 }, page: 0, value: "Coefficient: {coefficient}" },
    { id: "equipment_table", label: "Tableau des équipements", type: "table", category: "equipment", isVisible: true, position: { x: 14, y: 140 }, page: 0, value: "Équipements" }
  ]
};

const PDFTemplateManager = () => {
  const [template, setTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("company");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseClient();
  
  const form = useForm({
    defaultValues: DEFAULT_TEMPLATE
  });
  
  // Récupérer le template depuis la base de données
  useEffect(() => {
    const fetchTemplate = async () => {
      setIsLoading(true);
      try {
        // Vérifier si la table existe
        const { data: tableExists } = await supabase.rpc('check_table_exists', { table_name: 'pdf_templates' });
        
        if (!tableExists) {
          // Créer la table si elle n'existe pas
          await supabase.rpc('execute_sql', {
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
                "templateImages" JSONB,
                fields JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
              );
            `
          });
          
          // Insérer le template par défaut
          await supabase
            .from('pdf_templates')
            .insert(DEFAULT_TEMPLATE);
            
          setTemplate(DEFAULT_TEMPLATE);
          form.reset(DEFAULT_TEMPLATE);
        } else {
          // Récupérer le template existant
          const { data, error } = await supabase
            .from('pdf_templates')
            .select('*')
            .eq('id', 'default')
            .single();
            
          if (error) {
            console.error("Erreur lors de la récupération du template:", error);
            toast.error("Erreur lors du chargement du modèle PDF");
            
            // En cas d'erreur, utiliser le template par défaut
            setTemplate(DEFAULT_TEMPLATE);
            form.reset(DEFAULT_TEMPLATE);
          } else if (data) {
            setTemplate(data);
            form.reset(data);
          } else {
            // Si aucun template n'existe, insérer le template par défaut
            await supabase
              .from('pdf_templates')
              .insert(DEFAULT_TEMPLATE);
              
            setTemplate(DEFAULT_TEMPLATE);
            form.reset(DEFAULT_TEMPLATE);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du template:", error);
        toast.error("Erreur lors du chargement du modèle PDF");
        setTemplate(DEFAULT_TEMPLATE);
        form.reset(DEFAULT_TEMPLATE);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplate();
  }, []);
  
  // Sauvegarder le template
  const handleSaveTemplate = async (formData) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('pdf_templates')
        .upsert({
          ...formData,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error("Erreur lors de la sauvegarde du template:", error);
        toast.error("Erreur lors de la sauvegarde du modèle PDF");
      } else {
        toast.success("Modèle PDF sauvegardé avec succès");
        setTemplate(formData);
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du template:", error);
      toast.error("Erreur lors de la sauvegarde du modèle PDF");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Lors du changement des champs par l'éditeur
  const handleFieldsChange = (newFields) => {
    form.setValue('fields', newFields);
  };
  
  // Lors de l'ajout de nouvelles images de template
  const handleTemplateImagesChange = (images) => {
    form.setValue('templateImages', images);
  };
  
  if (isLoading && !template) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion du modèle PDF</CardTitle>
          <CardDescription>
            Personnalisez l'apparence et le contenu des PDF générés pour vos offres commerciales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveTemplate)} className="space-y-6">
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4 grid grid-cols-5 sm:grid-cols-5">
                  <TabsTrigger value="company" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span className="hidden sm:inline">Entreprise</span>
                  </TabsTrigger>
                  <TabsTrigger value="design" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline">Design</span>
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex items-center gap-2">
                    <FileUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Modèles</span>
                  </TabsTrigger>
                  <TabsTrigger value="fields" className="flex items-center gap-2">
                    <Layout className="h-4 w-4" />
                    <span className="hidden sm:inline">Champs</span>
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Aperçu</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="company">
                  <PDFCompanyInfo form={form} />
                </TabsContent>
                
                <TabsContent value="design">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="headerText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titre de l'en-tête</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="OFFRE N° OFF-{offer_id}" />
                          </FormControl>
                          <FormDescription>
                            Vous pouvez utiliser {'{offer_id}'} pour afficher l'ID de l'offre.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couleur principale</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} type="color" className="w-12 h-10 p-1" />
                            </FormControl>
                            <Input 
                              value={field.value} 
                              onChange={(e) => field.onChange(e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couleur secondaire</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} type="color" className="w-12 h-10 p-1" />
                            </FormControl>
                            <Input 
                              value={field.value} 
                              onChange={(e) => field.onChange(e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="footerText"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Texte de pied de page</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={3}
                              placeholder="Cette offre est valable 30 jours à compter de sa date d'émission."
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="templates">
                  <PDFTemplateUploader 
                    templateImages={form.watch('templateImages') || []} 
                    onChange={handleTemplateImagesChange}
                  />
                </TabsContent>
                
                <TabsContent value="fields">
                  <PDFFieldsEditor 
                    fields={form.watch('fields')} 
                    onChange={handleFieldsChange} 
                  />
                </TabsContent>
                
                <TabsContent value="preview">
                  <PDFPreview template={form.getValues()} />
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => form.reset(DEFAULT_TEMPLATE)}
                >
                  Réinitialiser
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFTemplateManager;
