import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, Download, Save, FileText, AlertCircle, CheckCircle, BarChart3, Image, Upload, Trash2 } from 'lucide-react';
import HtmlTemplateService from '@/services/htmlTemplateService';
import { previewHtmlTemplate } from '@/utils/htmlPdfGenerator';
import { generateSamplePdf } from '@/services/offers/offerPdf';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { uploadFileMultiTenant } from '@/services/multiTenantStorageService';

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

interface CompanyStats {
  clients_count: number;
  devices_count: number;
  co2_saved: number;
  started_year: number;
}

interface ClientLogo {
  id: string;
  name: string;
  url: string;
  file: File | null;
}

const HtmlTemplateManager: React.FC = () => {
  const { user } = useAuth();
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
  
  // Stats & Logos states
  const [companyStats, setCompanyStats] = useState<CompanyStats>({
    clients_count: 0,
    devices_count: 0,
    co2_saved: 0,
    started_year: new Date().getFullYear()
  });
  const [clientLogos, setClientLogos] = useState<ClientLogo[]>([]);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingStats, setIsSavingStats] = useState(false);

  const templateService = HtmlTemplateService.getInstance();

  useEffect(() => {
    loadTemplates();
    loadCompanyStats();
    loadClientLogos();
  }, []);

  useEffect(() => {
    validateTemplate();
  }, [htmlContent]);

  const loadTemplates = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return;

      // Charger les templates de l'entreprise depuis la base de données
      const savedTemplates = await templateService.loadCompanyTemplates(profile.company_id);
      
      // Les templates sont maintenant exclusivement gérés via la base de données
      setTemplates(savedTemplates);

      // Charger le dernier template modifié s'il y en a un
      if (savedTemplates.length > 0) {
        const templateToLoad = savedTemplates[0];
        setCurrentTemplate(templateToLoad);
        setHtmlContent(templateToLoad.html_content);
        setTemplateName(templateToLoad.name);
        setTemplateDescription(templateToLoad.description);
      } else {
        // Aucun template trouvé - initialiser avec le template utilisateur
        const userTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposition Commerciale iTakecare - Leasing IT reconditionné </title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Montserrat', 'Segoe UI', sans-serif;
            background: #e8e8e8;
            padding: 20px;
            color: #333;
        }
        
        .page {
            width: 210mm;
            min-height: 297mm;
            background: white;
            margin: 0 auto 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
            position: relative;
            overflow: hidden;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .page {
                box-shadow: none;
                page-break-after: always;
                margin: 0;
            }
            
            .page:last-child {
                page-break-after: auto;
            }
            
            .template-field {
                background: transparent;
                font-family: inherit;
                font-size: inherit;
                padding: 0;
            }
            
            /* Hide template guide on print */
            .template-guide {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <!-- Votre template de 7 pages ici -->
    <div class="page">
        <h1>{{client_name}} - {{company_name}}</h1>
        <p>Créez votre template personnalisé en utilisant les variables disponibles.</p>
    </div>
</body>
</html>`;
        
        setCurrentTemplate(null);
        setHtmlContent(userTemplate);
        setTemplateName('Nouveau Template');
        setTemplateDescription('Template créé à partir du modèle iTakecare');
      }
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

  const handlePreview = async () => {
    try {
      if (!isValidTemplate) {
        toast.error('Le template contient des erreurs de syntaxe');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      const compiledHtml = await templateService.previewTemplate(htmlContent, profile?.company_id);
      
      // Ouvrir dans un nouvel onglet avec une approche plus sécurisée
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        // Utiliser une approche plus sécurisée avec un Blob URL
        const blob = new Blob([compiledHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        newWindow.location.href = url;
        
        // Nettoyer l'URL après un délai pour éviter les fuites mémoire
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }
      
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
      
      // Obtenir le company_id pour charger les vraies données
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      const companyId = profile?.company_id;

      // Charger les stats de l'entreprise
      let companyStatsData = {
        clients_count: 150,
        devices_count: 2500,
        co2_saved: 45.5,
        started_year: 2020
      };
      let clientLogos: Array<{ url: string; name: string }> = [];

      if (companyId) {
        try {
          const { data: company } = await supabase
            .from('companies')
            .select('clients_count, devices_count, co2_saved, started_year')
            .eq('id', companyId)
            .single();

          if (company) {
            companyStatsData = {
              clients_count: company.clients_count || 150,
              devices_count: company.devices_count || 2500,
              co2_saved: company.co2_saved || 45.5,
              started_year: company.started_year || 2020
            };
          }

          // Charger les logos clients
          const { data: files } = await supabase.storage
            .from('client-logos')
            .list(`company-${companyId}/`, { limit: 10 });

          if (files && files.length > 0) {
            clientLogos = files.map(file => ({
              url: `${SUPABASE_URL}/storage/v1/object/public/client-logos/company-${companyId}/${file.name}`,
              name: file.name.replace(/client-.*?-logo\..*$/, '').replace(/^.*-/, '') || file.name
            }));
          }
        } catch (error) {
          console.warn('Impossible de charger les données réelles, utilisation des données d\'exemple');
        }
      }

      // Créer les données template (même format que generatePreviewData)
      const { convertOfferToTemplateData } = await import('@/services/htmlTemplateService');
      
      // Créer des données d'offre brutes pour la conversion
      const sampleOfferData = {
        id: 'demo-template',
        offer_id: 'ITC-2025-OFF-0001',
        client_name: 'Jean Dupont',
        client_company: 'ACME SA',
        client_email: 'jean.dupont@acme.com',
        client_address: '123 Rue de la Paix',
        client_city: 'Bruxelles',
        client_postal_code: '1000',
        amount: 10000,
        monthly_payment: 300,
        financed_amount: 10000,
        created_at: new Date().toISOString(),
        equipment_description: JSON.stringify([
          {
            title: 'Dell Latitude 5520 - Intel i5, 16GB RAM, 512GB SSD',
            category: 'Ordinateur portable',
            purchasePrice: 1200,
            quantity: 2,
            margin: 15,
            monthlyPayment: 150,
            monthly_payment: 150
          },
          {
            title: 'Dell UltraSharp 24" Full HD',
            category: 'Écran',
            purchasePrice: 300,
            quantity: 2,
            margin: 15,
            monthlyPayment: 75,
            monthly_payment: 75
          }
        ])
      };

      // Convertir en données template et ajouter les stats/logos
      const templateData = convertOfferToTemplateData(sampleOfferData);
      templateData.company_stats_clients = companyStatsData.clients_count.toString();
      templateData.company_stats_devices = companyStatsData.devices_count.toString();
      templateData.company_stats_co2 = `${companyStatsData.co2_saved} tonnes`;
      templateData.company_started_year = companyStatsData.started_year.toString();
      
      // Générer le HTML des logos - SANS images externes placeholder
      let clientLogosHtml = '';
      if (clientLogos.length > 0) {
        templateData.client_logos_count = clientLogos.length.toString();
        const logosHtml = clientLogos.map(logo => `
          <div style="text-align: center; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <img src="${logo.url}" alt="${logo.name}" style="max-width: 100%; height: auto; max-height: 60px;"/>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">${logo.name.replace(/\.[^/.]+$/, '')}</p>
          </div>
        `).join('\n');
        clientLogosHtml = `<div class="client-logos-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 20px; margin: 20px 0;">${logosHtml}</div>`;
      } else {
        // Pas de logos = section vide, pas d'images externes
        templateData.client_logos_count = '0';
        clientLogosHtml = '<div style="padding: 20px; text-align: center; color: #999; border: 1px dashed #ddd; border-radius: 8px;">Aucun logo client configuré</div>';
      }
      templateData.client_logos = clientLogosHtml;

      // Compiler le template avec les données
      const compiledHtml = templateService.compileTemplate(htmlContent, templateData);
      
      console.log('📄 Template compilé - longueur:', compiledHtml.length);

      // Générer le PDF à partir du HTML compilé via IFRAME
      const html2pdf = (await import('html2pdf.js')).default;

      // Créer un iframe hors-écran
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed; top:0; left:0; opacity:0; pointer-events:none; border:0;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Impossible d\'accéder au document de l\'iframe');
      }

      // Écrire le HTML complet dans l'iframe (avec <head>, <style>, etc.)
      iframeDoc.open();
      iframeDoc.write(compiledHtml);
      iframeDoc.close();

      console.log('🚀 Iframe créé, attente du chargement...');

      // Attendre que le document soit complètement chargé
      await new Promise<void>((resolve) => {
        if (iframeDoc.readyState === 'complete') {
          resolve();
        } else {
          iframe.onload = () => resolve();
        }
      });

      console.log('📚 Document chargé, attente des polices...');

      // Attendre les polices Google Fonts
      if (iframeDoc.fonts && 'ready' in iframeDoc.fonts) {
        await iframeDoc.fonts.ready;
        console.log('✅ Polices chargées');
      }

      // Attendre que toutes les images soient chargées
      const images = iframeDoc.getElementsByTagName('img');
      console.log('🖼️ Nombre d\'images:', images.length);
      
      if (images.length > 0) {
        const imagePromises = Array.from(images).map((img, index) => {
          if (img.complete && img.naturalHeight > 0) {
            console.log(`✅ Image ${index} déjà chargée`);
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            img.onload = () => {
              console.log(`✅ Image ${index} chargée`);
              resolve();
            };
            img.onerror = () => {
              console.warn(`⚠️ Erreur image ${index}`);
              resolve(); // Continuer même si erreur
            };
            setTimeout(() => {
              console.warn(`⏱️ Timeout image ${index}`);
              resolve();
            }, 15000);
          });
        });
        
        await Promise.all(imagePromises);
      }

      // Mesure du contenu et redimensionnement de l'iframe
      const bodyEl = iframeDoc.body;
      const htmlEl = iframeDoc.documentElement;
      const contentWidth = Math.max(bodyEl.scrollWidth, htmlEl.scrollWidth, bodyEl.offsetWidth, htmlEl.offsetWidth);
      const contentHeight = Math.max(bodyEl.scrollHeight, htmlEl.scrollHeight, bodyEl.offsetHeight, htmlEl.offsetHeight);
      iframe.style.width = contentWidth + 'px';
      iframe.style.height = contentHeight + 'px';
      console.log('📦 Dimensions contenu:', { contentWidth, contentHeight });
      console.log('📐 iframe size:', iframe.style.width, iframe.style.height);

      console.log('🎨 Début de la conversion HTML vers PDF...');

      // Options PDF optimisées
      const pdfOptions = {
        margin: [10, 10, 10, 10],
        filename: `template-demo-${Date.now()}.pdf`,
        image: { 
          type: 'jpeg', 
          quality: 0.98 
        },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: true,
          imageTimeout: 30000,
          removeContainer: true,
          foreignObjectRendering: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: contentWidth,
          windowHeight: contentHeight,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as 'portrait',
          compress: true,
          precision: 16
        },
        pagebreak: { 
          mode: ['css'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['.avoid-break']
        }
      };

      try {
        console.log('🎯 Élément source:', 'documentElement');
        await html2pdf()
          .from(iframeDoc.documentElement)
          .set(pdfOptions)
          .toPdf()
          .get('pdf')
          .then((pdf: any) => {
            console.log('✅ PDF généré - pages:', pdf.internal.getNumberOfPages());
          })
          .save();

        console.log('✅ PDF téléchargé avec succès');
        toast.success('PDF généré avec succès');
      } catch (pdfError) {
        console.error('❌ Erreur génération PDF:', pdfError);
        toast.error('Erreur lors de la génération du PDF');
      } finally {
        // Nettoyer l'iframe
        document.body.removeChild(iframe);
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        toast.error('Impossible de déterminer l\'entreprise');
        return;
      }

      if (currentTemplate && currentTemplate.id !== 'itakecare-default') {
        // Mise à jour d'un template existant
        await templateService.updateTemplate(currentTemplate.id, {
          name: templateName,
          description: templateDescription,
          html_content: htmlContent
        });
      } else {
        // Création d'un nouveau template
        const newTemplateId = await templateService.saveTemplate({
          name: templateName,
          description: templateDescription,
          html_content: htmlContent,
          company_id: profile.company_id
        });

        // Mettre à jour l'état local avec le nouveau template
        const newTemplate: HtmlTemplate = {
          id: newTemplateId,
          name: templateName,
          description: templateDescription,
          html_content: htmlContent,
          is_default: false,
          company_id: profile.company_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setCurrentTemplate(newTemplate);
      }
      
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

  const loadCompanyStats = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('clients_count, devices_count, co2_saved, started_year')
          .eq('id', profile.company_id)
          .single();

        if (company) {
          setCompanyStats({
            clients_count: company.clients_count || 0,
            devices_count: company.devices_count || 0,
            co2_saved: company.co2_saved || 0,
            started_year: company.started_year || new Date().getFullYear()
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  const loadClientLogos = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profile?.company_id) {
        const { data: files, error } = await supabase.storage
          .from('Client Logos')
          .list(`company-${profile.company_id}/`, {
            limit: 100,
            offset: 0
          });

        if (files && !error) {
          const logos = files.map(file => ({
            id: file.id || file.name,
            name: file.name,
            url: `${SUPABASE_URL}/storage/v1/object/public/Client%20Logos/company-${profile.company_id}/${file.name}`,
            file: null
          }));
          setClientLogos(logos);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des logos:', error);
    }
  };

  const handleStatsChange = (field: keyof CompanyStats, value: number) => {
    setCompanyStats(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveStats = async () => {
    try {
      setIsSavingStats(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profile?.company_id) {
        const { error } = await supabase
          .from('companies')
          .update({
            clients_count: companyStats.clients_count,
            devices_count: companyStats.devices_count,
            co2_saved: companyStats.co2_saved,
            started_year: companyStats.started_year
          })
          .eq('id', profile.company_id);

        if (error) throw error;

        toast.success('Statistiques sauvegardées avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des stats:', error);
      toast.error('Erreur lors de la sauvegarde des statistiques');
    } finally {
      setIsSavingStats(false);
    }
  };

  const handleLogoUpload = async (files: FileList) => {
    if (!files.length) return;

    try {
      setIsUploadingLogo(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return;

      for (const file of Array.from(files)) {
        // Générer un nom de fichier unique pour éviter les collisions
        const fileName = `client-logo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const uploadedUrl = await uploadFileMultiTenant(file, 'Client Logos', fileName);
        
        if (!uploadedUrl) {
          throw new Error('Échec de l\'upload du logo');
        }

        const displayName = file.name;
        const newLogo: ClientLogo = {
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: displayName,
          url: uploadedUrl,
          file: null
        };

        setClientLogos(prev => [...prev, newLogo]);
      }

      toast.success('Logos uploadés avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'upload des logos:', error);
      toast.error('Erreur lors de l\'upload des logos');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async (logoId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return;

      const logo = clientLogos.find(l => l.id === logoId);
      if (!logo) return;

      const { error } = await supabase.storage
        .from('Client Logos')
        .remove([`company-${profile.company_id}/${logo.name}`]);

      if (error) throw error;

      setClientLogos(prev => prev.filter(l => l.id !== logoId));
      toast.success('Logo supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du logo:', error);
      toast.error('Erreur lors de la suppression du logo');
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
          <TabsTrigger value="data-logos">Données & Logos</TabsTrigger>
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
                  <h4 className="font-medium mb-3">Statistiques d'entreprise</h4>
                  <div className="space-y-2 text-sm">
                    <div><code>{"{{company_stats_clients}}"}</code> - Nombre de clients satisfaits</div>
                    <div><code>{"{{company_stats_devices}}"}</code> - Appareils dont nous prenons soin</div>
                    <div><code>{"{{company_stats_co2}}"}</code> - CO2e économisée (en tonnes)</div>
                    <div><code>{"{{company_started_year}}"}</code> - Année de début d'activité</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Logos clients</h4>
                  <div className="space-y-2 text-sm">
                    <div><code>{"{{client_logos}}"}</code> - Grille HTML des logos clients</div>
                    <div><code>{"{{client_logos_count}}"}</code> - Nombre de logos disponibles</div>
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

        <TabsContent value="data-logos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statistiques d'entreprise */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Statistiques d'entreprise
                </CardTitle>
                <CardDescription>
                  Gérez les données chiffrées de votre entreprise pour les templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clients-count">Nombre de clients satisfaits</Label>
                  <Input
                    id="clients-count"
                    type="number"
                    value={companyStats.clients_count}
                    onChange={(e) => handleStatsChange('clients_count', parseInt(e.target.value) || 0)}
                    placeholder="Ex: 150"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="devices-count">Appareils dont nous prenons soin</Label>
                  <Input
                    id="devices-count"
                    type="number"
                    value={companyStats.devices_count}
                    onChange={(e) => handleStatsChange('devices_count', parseInt(e.target.value) || 0)}
                    placeholder="Ex: 2500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="co2-saved">Quantité de CO2e économisée (tonnes)</Label>
                  <Input
                    id="co2-saved"
                    type="number"
                    step="0.1"
                    value={companyStats.co2_saved}
                    onChange={(e) => handleStatsChange('co2_saved', parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 45.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="started-year">Année de début de l'aventure</Label>
                  <Input
                    id="started-year"
                    type="number"
                    value={companyStats.started_year}
                    onChange={(e) => handleStatsChange('started_year', parseInt(e.target.value) || new Date().getFullYear())}
                    placeholder="Ex: 2020"
                  />
                </div>

                <Button 
                  onClick={handleSaveStats} 
                  disabled={isSavingStats}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingStats ? 'Sauvegarde...' : 'Sauvegarder les statistiques'}
                </Button>
              </CardContent>
            </Card>

            {/* Gestion des logos clients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Logos clients
                </CardTitle>
                <CardDescription>
                  Uploadez les logos de vos clients pour les intégrer dans vos templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Zone d'upload */}
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Cliquez pour uploader des logos clients
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, SVG jusqu'à 5MB
                  </p>
                  <input
                    id="logo-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleLogoUpload(e.target.files)}
                  />
                </div>

                {/* Liste des logos */}
                <div className="space-y-2">
                  <Label>Logos uploadés ({clientLogos.length})</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {clientLogos.length > 0 ? (
                      clientLogos.map((logo) => (
                        <div key={logo.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <img 
                              src={logo.url} 
                              alt={logo.name}
                              className="w-8 h-8 object-contain"
                            />
                            <span className="text-sm truncate">{logo.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLogo(logo.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun logo uploadé
                      </p>
                    )}
                  </div>
                </div>

                {isUploadingLogo && (
                  <div className="text-sm text-muted-foreground text-center">
                    Upload en cours...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Aperçu des variables générées */}
          <Card>
            <CardHeader>
              <CardTitle>Variables générées</CardTitle>
              <CardDescription>
                Aperçu des variables disponibles basées sur vos données
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Statistiques</h4>
                  <div className="space-y-1 text-muted-foreground">
                    <div><code>{"{{company_stats_clients}}"}</code> → {companyStats.clients_count.toLocaleString()}</div>
                    <div><code>{"{{company_stats_devices}}"}</code> → {companyStats.devices_count.toLocaleString()}</div>
                    <div><code>{"{{company_stats_co2}}"}</code> → {companyStats.co2_saved.toLocaleString()} tonnes</div>
                    <div><code>{"{{company_started_year}}"}</code> → {companyStats.started_year}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Logos</h4>
                  <div className="space-y-1 text-muted-foreground">
                    <div><code>{"{{client_logos_count}}"}</code> → {clientLogos.length} logos</div>
                    <div><code>{"{{client_logos}}"}</code> → Grille HTML générée</div>
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