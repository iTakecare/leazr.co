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
  const companyId = user?.company_id;
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState('1');
  const [editingTemplate, setEditingTemplate] = useState<PDFTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingRef, setIsLoadingRef] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Record<string, string[]>>({});
  const [lastUploadedUrl, setLastUploadedUrl] = useState<Record<string, string>>({});

  console.log('🎨 PdfTemplatesManager - Render', {
    hasUser: !!user,
    companyId,
    loading,
    templatesCount: templates.length
  });

  const pageNames = [
    "Page d'entête",
    "Vision",
    "Fonctionnement",
    "Solution",
    "Valeurs",
    "Modalités",
    "Page de fin"
  ];

  const loadTemplates = async () => {
    if (!companyId || companyId.length !== 36) {
      console.log('❌ PdfTemplatesManager - Invalid company ID:', companyId);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 PdfTemplatesManager - Loading templates for company:', companyId);
      console.log('🔍 Company ID length:', companyId.length, 'format valid:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId));
      
      const { data, error } = await supabase
        .from('professional_pdf_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('page_number', { ascending: true });

      if (error) {
        console.error('❌ PdfTemplatesManager - Error loading templates:', error);
        throw error;
      }

      console.log('✅ PdfTemplatesManager - Templates loaded:', data?.length || 0, data);

      if (data && data.length > 0) {
        console.log('📋 PdfTemplatesManager - Using existing templates');
        setTemplates(data);
      } else {
        console.log('📝 PdfTemplatesManager - No templates found, creating defaults');
        await createDefaultTemplates();
      }
    } catch (error: any) {
      console.error('❌ PdfTemplatesManager - Error in loadTemplates:', error);
      toast.error('Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId && !isLoadingRef) {
      console.log('🔄 PdfTemplatesManager - useEffect triggered, loading templates');
      setIsLoadingRef(true);
      loadTemplates().finally(() => setIsLoadingRef(false));
    } else if (!companyId) {
      console.log('⏸️ PdfTemplatesManager - No companyId yet, waiting...');
      setLoading(false);
    }
  }, [companyId]);

  const createDefaultTemplates = async () => {
    try {
      console.log('📝 Creating default templates for company:', companyId);
      
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
        .from('professional_pdf_templates')
        .insert(defaultTemplates)
        .select();

      if (error) {
        // Check if it's a duplicate key error (templates already exist)
        if (error.code === '23505') {
          console.log('📋 Templates already exist, loading them instead');
          await loadTemplates();
          return;
        }
        throw error;
      }
      
      console.log('✅ Default templates created successfully:', data?.length);
      setTemplates(data || []);
      toast.success('Templates par défaut créés avec succès');
    } catch (error: any) {
      console.error('❌ Error creating default templates:', error);
      toast.error('Erreur lors de la création des templates');
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from('professional_pdf_templates')
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

  const handleUploadImage = async (templateId: string, file: File, inputElement?: HTMLInputElement) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${templateId}/${Date.now()}.${fileExt}`;

      console.log('📤 Upload Image - Starting', { fileName, fileSize: file.size, fileType: file.type, bucket: 'pdf-templates-assets' });

      const { error: uploadError } = await supabase.storage
        .from('pdf-templates-assets')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Upload Error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('pdf-templates-assets')
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;
      console.log('✅ Upload Success - Public URL:', publicUrl);

      // Update state
      setUploadedImages(prev => ({ 
        ...prev, 
        [templateId]: [publicUrl, ...(prev[templateId] || [])].slice(0, 4) 
      }));
      setLastUploadedUrl(prev => ({ ...prev, [templateId]: publicUrl }));

      // Copy to clipboard
      try {
        await navigator.clipboard?.writeText(publicUrl);
        toast.success('Image uploadée. URL copiée dans le presse-papiers.');
      } catch (clipError) {
        console.warn('⚠️ Clipboard copy failed:', clipError);
        toast.success('Image uploadée avec succès');
      }

      // Reset input for re-upload
      if (inputElement) {
        inputElement.value = '';
      }

      // Test image loading
      const testImg = new Image();
      testImg.onload = () => console.log('✅ Image loads successfully:', publicUrl);
      testImg.onerror = (e) => console.error('❌ Image failed to load:', publicUrl, e);
      testImg.src = publicUrl;

      return publicUrl;
    } catch (error: any) {
      console.error('❌ Error uploading image:', error);
      const errorMsg = error.statusCode ? `Erreur ${error.statusCode}: ${error.message}` : 'Erreur lors de l\'upload de l\'image';
      toast.error(errorMsg);
      return null;
    }
  };

  const insertImageTag = (template: PDFTemplate, url: string) => {
    const imgTag = `<img src="${url}" alt="image" style="max-width:100%;height:auto;" />`;
    const currentContent = editingTemplate?.id === template.id 
      ? editingTemplate.html_content 
      : template.html_content;
    
    setEditingTemplate({ 
      ...template, 
      html_content: currentContent + '\n' + imgTag 
    });
    
    toast.info('Balise <img> ajoutée au HTML (non sauvegardé)');
  };

  const copyUrlToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copiée dans le presse-papiers');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Erreur lors de la copie');
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
                                await handleUploadImage(template.id, file, e.target);
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

                        {uploadedImages[template.id] && uploadedImages[template.id].length > 0 && (
                          <div className="border rounded-lg p-4 bg-muted/30">
                            <p className="text-sm font-semibold mb-3">Images récemment uploadées :</p>
                            <div className="grid grid-cols-2 gap-3">
                              {uploadedImages[template.id].map((url, idx) => (
                                <div key={idx} className="border rounded-lg p-2 bg-background">
                                  <img 
                                    src={url} 
                                    alt={`Upload ${idx + 1}`}
                                    className="w-full h-24 object-cover rounded mb-2"
                                    onError={(e) => {
                                      console.error('❌ Failed to load image:', url);
                                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                                    }}
                                  />
                                  <div className="flex gap-1">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => copyUrlToClipboard(url)}
                                      className="flex-1 text-xs"
                                    >
                                      Copier URL
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="default" 
                                      onClick={() => insertImageTag(template, url)}
                                      className="flex-1 text-xs"
                                    >
                                      Insérer
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              💡 Cliquez sur "Insérer" pour ajouter l'image au HTML, puis "Prévisualiser" et "Sauvegarder"
                            </p>
                          </div>
                        )}

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