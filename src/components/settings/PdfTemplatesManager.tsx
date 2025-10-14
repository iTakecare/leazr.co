import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { FileText, Upload, Eye, Save, Trash2 } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PDFTemplate {
  id: string;
  company_id: string;
  name: string;
  page_number: number;
  page_name: string;
  html_content: string;
  css_styles: string;
  is_active: boolean;
  display_order: number;
  variables: string[];
}

const PdfTemplatesManager = () => {
  const { user } = useAuth();
  const companyId = user?.company;
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState('1');
  const [editingTemplate, setEditingTemplate] = useState<PDFTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');

  const pageNames = [
    "Page d'entête",
    "Vision",
    "Fonctionnement",
    "Solution",
    "Valeurs",
    "Modalités",
    "Page de fin"
  ];

  useEffect(() => {
    if (companyId) {
      loadTemplates();
    }
  }, [companyId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('page_number', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setTemplates(data);
      } else {
        // Créer les templates par défaut
        await createDefaultTemplates();
      }
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      const defaultTemplates = pageNames.map((name, index) => ({
        company_id: companyId,
        name: `Template iTakecare - ${name}`,
        page_number: index + 1,
        page_name: name,
        html_content: `<div class="page-${index + 1}">
          <h1>${name}</h1>
          <p>Contenu de la page ${index + 1}</p>
          <p>Client: {client_name}</p>
        </div>`,
        css_styles: `.page-${index + 1} { padding: 40px; min-height: 297mm; }`,
        is_active: true,
        display_order: index + 1,
        variables: ['client_name', 'offer_amount', 'monthly_payment']
      }));

      const { data, error } = await supabase
        .from('pdf_templates')
        .insert(defaultTemplates)
        .select();

      if (error) throw error;
      
      setTemplates(data || []);
      toast.success('Templates par défaut créés avec succès');
    } catch (error: any) {
      console.error('Error creating default templates:', error);
      toast.error('Erreur lors de la création des templates');
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from('pdf_templates')
        .update({
          html_content: editingTemplate.html_content,
          css_styles: editingTemplate.css_styles,
          is_active: editingTemplate.is_active
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      toast.success('Template sauvegardé avec succès');
      await loadTemplates();
      setEditingTemplate(null);
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handlePreview = (template: PDFTemplate) => {
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${template.css_styles}</style>
        </head>
        <body>
          ${template.html_content}
        </body>
      </html>
    `;
    setPreviewHtml(fullHtml);
  };

  const handleUploadImage = async (templateId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${templateId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('pdf-templates-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('pdf-templates-assets')
        .getPublicUrl(fileName);

      toast.success('Image uploadée avec succès');
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'upload de l\'image');
      return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des templates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentTemplate = templates.find(t => t.page_number === parseInt(selectedPage));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestion des Templates PDF Professionnels
          </CardTitle>
          <CardDescription>
            Personnalisez vos templates d'offres professionnelles (7 pages Canva)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPage} onValueChange={setSelectedPage}>
            <TabsList className="grid grid-cols-7 w-full">
              {pageNames.map((name, index) => (
                <TabsTrigger key={index + 1} value={String(index + 1)}>
                  {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {pageNames.map((name, index) => {
              const template = templates.find(t => t.page_number === index + 1);
              
              return (
                <TabsContent key={index + 1} value={String(index + 1)} className="space-y-4">
                  {template && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={template.is_active}
                              onCheckedChange={(checked) => {
                                setEditingTemplate({...template, is_active: checked});
                              }}
                            />
                            <Label>Active</Label>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Contenu HTML</Label>
                          <Textarea
                            value={editingTemplate?.id === template.id ? editingTemplate.html_content : template.html_content}
                            onChange={(e) => setEditingTemplate({...template, html_content: e.target.value})}
                            className="font-mono text-sm h-48"
                            placeholder="Contenu HTML de la page..."
                          />
                        </div>

                        <div>
                          <Label>Styles CSS</Label>
                          <Textarea
                            value={editingTemplate?.id === template.id ? editingTemplate.css_styles : template.css_styles}
                            onChange={(e) => setEditingTemplate({...template, css_styles: e.target.value})}
                            className="font-mono text-sm h-32"
                            placeholder="Styles CSS de la page..."
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handlePreview(template)}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Prévisualiser
                          </Button>
                          
                          <Button 
                            onClick={handleSaveTemplate}
                            disabled={!editingTemplate || editingTemplate.id !== template.id}
                            className="flex items-center gap-2"
                          >
                            <Save className="h-4 w-4" />
                            Sauvegarder
                          </Button>

                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await handleUploadImage(template.id, file);
                                if (url) {
                                  console.log('Image URL:', url);
                                }
                              }
                            }}
                            className="hidden"
                            id={`upload-${template.id}`}
                          />
                          <Button 
                            variant="outline"
                            onClick={() => document.getElementById(`upload-${template.id}`)?.click()}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Upload Image
                          </Button>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <p className="font-semibold mb-2">Variables disponibles :</p>
                          <div className="flex flex-wrap gap-2">
                            {['client_name', 'client_email', 'client_company', 'offer_amount', 'monthly_payment', 'ambassador_name', 'current_date', 'equipment_rows'].map(v => (
                              <code key={v} className="bg-muted px-2 py-1 rounded">{`{${v}}`}</code>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          {previewHtml && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Prévisualisation</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[600px] border rounded"
                  title="Preview"
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PdfTemplatesManager;