
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Info } from "lucide-react";
import RichTextEditor from "@/components/ui/rich-text-editor";
import EmailTemplateControls from "./EmailTemplateControls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmailTemplate {
  id: number;
  type: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  active: boolean;
}

const EmailTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>("");
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { settings } = useSiteSettings();

  // Charger tous les templates disponibles
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setTemplates(data || []);
      
      // Si des modèles sont disponibles, sélectionner le premier par défaut
      if (data && data.length > 0) {
        setSelectedTemplateType(data[0].type);
        setCurrentTemplate(data[0]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des modèles:", error);
      toast.error("Impossible de charger les modèles d'email");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Charger les templates au chargement du composant
  useEffect(() => {
    loadTemplates();
  }, []);

  // Mettre à jour le modèle courant lorsque le type sélectionné change
  useEffect(() => {
    if (selectedTemplateType && templates.length > 0) {
      const template = templates.find(t => t.type === selectedTemplateType);
      if (template) {
        setCurrentTemplate(template);
      }
    }
  }, [selectedTemplateType, templates]);

  // Gérer le changement de modèle
  const handleTemplateChange = (type: string) => {
    setSelectedTemplateType(type);
  };

  // Mettre à jour le sujet
  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        subject: e.target.value
      });
    }
  };

  // Mettre à jour le contenu HTML
  const handleEditorChange = (content: string) => {
    if (currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        html_content: content
      });
    }
  };

  // Sauvegarder le modèle
  const saveTemplate = async () => {
    if (!currentTemplate) return;

    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: currentTemplate.subject,
          html_content: currentTemplate.html_content,
          updated_at: new Date()
        })
        .eq('id', currentTemplate.id);
      
      if (error) throw error;
      
      toast.success("Modèle d'email sauvegardé avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du modèle:", error);
      toast.error("Impossible de sauvegarder le modèle d'email");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmailTemplateControls onRefresh={loadTemplates} />
      
      {settings?.logo_url && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Le logo de votre entreprise sera automatiquement inclus dans tous les emails envoyés. 
            Vous pouvez utiliser la variable <code>{'{{site_logo}}'}</code> dans vos templates pour positionner le logo où vous le souhaitez.
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <img src={settings.logo_url} alt="Logo actuel" className="max-w-[100px] h-auto" />
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="templateType">Type de modèle</Label>
          <Select value={selectedTemplateType} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un modèle" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.type}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentTemplate && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Sujet de l'email</Label>
              <Input
                id="subject"
                value={currentTemplate.subject}
                onChange={handleSubjectChange}
                placeholder="Sujet de l'email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editor">Contenu de l'email</Label>
              <Card>
                <CardContent className="pt-6">
                  <RichTextEditor
                    value={currentTemplate.html_content}
                    onChange={handleEditorChange}
                    height={500}
                    isEmailEditor={true}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="pt-4">
              <h3 className="text-sm font-medium mb-2">Variables disponibles:</h3>
              <ScrollArea className="h-48 w-full rounded-md border p-4">
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-1 gap-2">
                    <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      {'{{site_logo}}'} - Logo de l'entreprise
                    </code>
                    <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      {'{{client_name}}'} - Nom du client
                    </code>
                    <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      {'{{equipment_description}}'} - Description de l'équipement
                    </code>
                    <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      {'{{amount}}'} - Montant total
                    </code>
                    <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      {'{{monthly_payment}}'} - Paiement mensuel
                    </code>
                    <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      {'{{date}}'} - Date actuelle
                    </code>
                    <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      {'{{account_creation_link}}'} - Lien pour la création de compte client
                    </code>
                    <code className="block p-2 bg-green-100 dark:bg-green-900 rounded font-medium">
                      {'{{upload_link}}'} - Lien d'upload des documents (pour demandes de documents)
                    </code>
                  </div>
                </div>
              </ScrollArea>
            </div>

            <Button 
              className="mt-4 w-full sm:w-auto" 
              onClick={saveTemplate}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
