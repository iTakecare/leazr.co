
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Save, RefreshCcw, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmailTemplateData {
  id?: number;
  type: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface TemplatePreviewData {
  client_name: string;
  equipment_description: string;
  amount: number;
  monthly_payment: number;
}

const EMAIL_TEMPLATE_TYPES = [
  { value: "product_request", label: "Confirmation de demande de produit", description: "Envoyé au client après une demande de produit" },
  { value: "welcome", label: "Email de bienvenue", description: "Envoyé aux nouveaux utilisateurs" }
];

const VARIABLE_DESCRIPTIONS = {
  product_request: [
    { variable: "{{client_name}}", description: "Nom du client" },
    { variable: "{{equipment_description}}", description: "Description de l'équipement" },
    { variable: "{{amount}}", description: "Montant total" },
    { variable: "{{monthly_payment}}", description: "Paiement mensuel" }
  ],
  welcome: [
    { variable: "{{client_name}}", description: "Nom du client" }
  ]
};

const EmailTemplateEditor = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeType, setActiveType] = useState<string>("product_request");
  const [template, setTemplate] = useState<EmailTemplateData>({
    type: "product_request",
    name: "Confirmation de demande de produit",
    subject: "Bienvenue sur iTakecare - Confirmation de votre demande",
    html_content: "",
    active: true
  });
  const [previewData, setPreviewData] = useState<TemplatePreviewData>({
    client_name: "Jean Dupont",
    equipment_description: "MacBook Pro 16 M3 Pro / Max (87,95 €/mois) x 1 - Options: CPU: M3 Pro, Disque Dur: 512Go, Mémoire RAM: 18Go",
    amount: 3166.20,
    monthly_payment: 87.95
  });

  const [activeTab, setActiveTab] = useState("edit");

  // Chargement du template
  const fetchTemplate = async (type: string) => {
    try {
      setLoading(true);
      
      console.log("Chargement du template pour:", type);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', type)
        .eq('active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Erreur lors de la récupération du template:", error);
        toast.error("Erreur lors du chargement du template d'email");
        return;
      }

      if (data) {
        console.log("Template récupéré:", data);
        setTemplate(data);
      } else {
        // Utiliser un template par défaut si aucun n'existe
        const defaultTemplate = createDefaultTemplate(type);
        console.log("Utilisation du template par défaut:", defaultTemplate);
        setTemplate(defaultTemplate);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du template:", err);
      toast.error("Erreur lors du chargement du template d'email");
    } finally {
      setLoading(false);
    }
  };

  // Créer un template par défaut selon le type
  const createDefaultTemplate = (type: string): EmailTemplateData => {
    const typeInfo = EMAIL_TEMPLATE_TYPES.find(t => t.value === type);
    
    if (type === "product_request") {
      return {
        type,
        name: typeInfo?.label || "Confirmation de demande de produit",
        subject: "Bienvenue sur iTakecare - Confirmation de votre demande",
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bienvenue {{client_name}},</h2>
          <p>Votre demande d'équipement a été créée avec succès sur la plateforme iTakecare.</p>
          <p>Voici un récapitulatif de votre demande :</p>
          <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <li>Équipement : {{equipment_description}}</li>
            <li>Montant total : {{amount}} €</li>
            <li>Paiement mensuel estimé : {{monthly_payment}} €/mois</li>
          </ul>
          <p>Notre équipe va étudier votre demande et vous contactera rapidement.</p>
          <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      };
    } else if (type === "welcome") {
      return {
        type,
        name: typeInfo?.label || "Email de bienvenue",
        subject: "Bienvenue sur iTakecare",
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bienvenue {{client_name}} !</h2>
          <p>Nous sommes ravis de vous accueillir sur la plateforme iTakecare.</p>
          <p>Vous pouvez dès maintenant accéder à votre espace personnel.</p>
          <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      };
    } else {
      // Template générique
      return {
        type,
        name: typeInfo?.label || "Template d'email",
        subject: "Message d'iTakecare",
        html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bonjour {{client_name}},</h2>
          <p>Contenu de l'email.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe iTakecare</p>
        </div>
        `,
        active: true
      };
    }
  };

  // Chargement initial du template
  useEffect(() => {
    fetchTemplate(activeType);
  }, [activeType]);

  // Mise à jour du champ de formulaire
  const handleChange = (field: keyof EmailTemplateData, value: string | boolean) => {
    setTemplate(prev => ({
      ...prev,
      [field]: value,
      updated_at: new Date().toISOString()
    }));
  };

  // Enregistrement du template
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('email_templates')
        .upsert({
          ...template,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error("Erreur lors de l'enregistrement du template:", error);
        toast.error(`Erreur: ${error.message}`);
        return;
      }
      
      toast.success("Template d'email enregistré avec succès");
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement du template:", error);
      toast.error(`Erreur: ${error.message || "Erreur lors de l'enregistrement"}`);
    } finally {
      setSaving(false);
    }
  };

  // Réinitialisation du template
  const handleReset = () => {
    const defaultTemplate = createDefaultTemplate(activeType);
    setTemplate(prev => ({
      ...defaultTemplate,
      id: prev.id
    }));
    toast.info("Template réinitialisé avec les valeurs par défaut");
  };

  // Génère un aperçu du template avec les données
  const generatePreviewHtml = () => {
    let previewHtml = template.html_content;
    
    // Remplacer les variables
    previewHtml = previewHtml
      .replace(/{{client_name}}/g, previewData.client_name)
      .replace(/{{equipment_description}}/g, previewData.equipment_description)
      .replace(/{{amount}}/g, previewData.amount.toString())
      .replace(/{{monthly_payment}}/g, previewData.monthly_payment.toString());
    
    return previewHtml;
  };

  // Liste des variables disponibles selon le type
  const getVariablesList = () => {
    if (activeType in VARIABLE_DESCRIPTIONS) {
      return VARIABLE_DESCRIPTIONS[activeType as keyof typeof VARIABLE_DESCRIPTIONS];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Éditeur de modèles d'emails
            </CardTitle>
            <CardDescription>
              Personnalisez les modèles d'emails envoyés aux clients
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <Label>Type de modèle</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EMAIL_TEMPLATE_TYPES.map((type) => (
              <div
                key={type.value}
                className={`cursor-pointer border rounded-md p-4 transition-all ${
                  activeType === type.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setActiveType(type.value)}
              >
                <h3 className="font-medium">{type.label}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="edit">Édition</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-2 h-4 w-4" />
              Aperçu
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Objet de l'email</Label>
              <Input 
                id="subject" 
                value={template.subject} 
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder="Objet de l'email" 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="html_content">Contenu de l'email</Label>
                <span className="text-sm text-muted-foreground">Vous pouvez utiliser du HTML et les variables ci-dessous</span>
              </div>
              <RichTextEditor 
                value={template.html_content} 
                onChange={(value) => handleChange("html_content", value)}
                height={400}
              />
            </div>
            
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription>
                <h4 className="font-medium mb-2">Variables disponibles pour ce modèle :</h4>
                <ul className="list-disc space-y-1 pl-4">
                  {getVariablesList().map((item, index) => (
                    <li key={index}>
                      <code className="bg-blue-100 p-1 rounded">{item.variable}</code> - {item.description}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-medium">Aperçu de l'email</h3>
              <div className="border rounded-md p-4">
                <p className="font-medium mb-2">Objet: {template.subject.replace("{{client_name}}", previewData.client_name)}</p>
                <div className="border-t pt-4 mt-2">
                  <div dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }} />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Données d'aperçu</h3>
              <p className="text-sm text-muted-foreground">
                Vous pouvez modifier ces valeurs pour voir comment l'email s'affichera avec différentes données.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preview_name">Nom du client</Label>
                  <Input 
                    id="preview_name" 
                    value={previewData.client_name} 
                    onChange={(e) => setPreviewData({...previewData, client_name: e.target.value})}
                  />
                </div>
                
                {activeType === "product_request" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="preview_equipment">Description de l'équipement</Label>
                      <Input 
                        id="preview_equipment" 
                        value={previewData.equipment_description} 
                        onChange={(e) => setPreviewData({...previewData, equipment_description: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preview_amount">Montant total</Label>
                        <Input 
                          id="preview_amount" 
                          type="number"
                          value={previewData.amount} 
                          onChange={(e) => setPreviewData({...previewData, amount: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview_monthly">Paiement mensuel</Label>
                        <Input 
                          id="preview_monthly" 
                          type="number"
                          value={previewData.monthly_payment} 
                          onChange={(e) => setPreviewData({...previewData, monthly_payment: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateEditor;
