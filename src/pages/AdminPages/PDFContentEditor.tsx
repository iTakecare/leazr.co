import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserCompanyId } from '@/services/multiTenantService';
import { 
  getPDFContentBlocks, 
  upsertMultiplePDFContentBlocks, 
  initializeDefaultPDFContent 
} from '@/services/pdfContentService';
import { ScrollText, ShoppingBag } from 'lucide-react';
import { FileText, Save, Info, Sparkles, BarChart3, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const PDFContentEditor: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companySlug, setCompanySlug] = useState<string>('');
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('cover');

  // Chargement du company_id et company_slug au montage
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const id = await getCurrentUserCompanyId();
        setCompanyId(id);
        
        // Récupérer le slug de l'entreprise
        if (id) {
          const { data } = await supabase
            .from('companies')
            .select('slug')
            .eq('id', id)
            .single();
          
          if (data?.slug) {
            setCompanySlug(data.slug);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du company_id:', error);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les informations de l'entreprise",
          variant: "destructive"
        });
      }
    };
    loadCompanyData();
  }, [toast]);

  // Chargement des blocs de contenu
  const { data: contentBlocks, isLoading, refetch } = useQuery({
    queryKey: ['pdf-content-blocks', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const blocks = await getPDFContentBlocks(companyId);
      
      // Si aucun bloc n'existe, initialiser avec les valeurs par défaut
      if (blocks.length === 0) {
        await initializeDefaultPDFContent(companyId);
        return await getPDFContentBlocks(companyId);
      }
      
      return blocks;
    },
    enabled: !!companyId
  });

  // Conversion des blocs en map pour faciliter l'édition
  useEffect(() => {
    if (contentBlocks) {
      const blocksMap: Record<string, string> = {};
      contentBlocks.forEach(block => {
        blocksMap[`${block.page_name}_${block.block_key}`] = block.content;
      });
      setBlocks(blocksMap);
    }
  }, [contentBlocks]);

  // Mise à jour d'un bloc
  const updateBlock = (pageName: string, blockKey: string, content: string) => {
    const key = `${pageName}_${blockKey}`;
    setBlocks(prev => ({ ...prev, [key]: content }));
    setHasChanges(true);
  };

  // Sauvegarde de tous les blocs
  const saveBlocks = async () => {
    if (!companyId) return;
    
    setIsSaving(true);
    try {
      const blocksToSave = Object.entries(blocks).map(([key, content]) => {
        const [pageName, ...blockKeyParts] = key.split('_');
        const blockKey = blockKeyParts.join('_');
        return {
          company_id: companyId,
          page_name: pageName as 'cover' | 'equipment' | 'conditions',
          block_key: blockKey,
          content
        };
      });
      
      await upsertMultiplePDFContentBlocks(blocksToSave);
      
      toast({
        title: "Modifications enregistrées",
        description: "Les textes de l'offre PDF ont été mis à jour avec succès."
      });
      
      setHasChanges(false);
      refetch();
    } catch (error: any) {
      console.error('Error saving blocks:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer les modifications",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">Contenu des offres PDF</h2>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Contenu des offres PDF - Paramètres</title>
        <meta name="description" content="Personnalisez les textes qui apparaissent dans vos offres commerciales PDF" />
      </Helmet>

      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">Contenu des offres PDF</h2>
            <p className="text-muted-foreground">
              Personnalisez les textes qui apparaissent dans vos offres commerciales PDF
            </p>
          </div>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Modifications non sauvegardées</Badge>
            <Button onClick={saveBlocks} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Enregistrement..." : "Enregistrer tout"}
            </Button>
          </div>
        )}
      </div>

      {/* Message d'aide */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Conseil :</strong> Vous pouvez utiliser la mise en forme (gras, italique, listes) 
          pour rendre vos textes plus professionnels. Les modifications seront appliquées automatiquement 
          aux prochaines offres PDF générées.
        </AlertDescription>
      </Alert>

      {/* Section de gestion du contenu de la page Valeurs */}
      <Card>
        <CardHeader>
          <CardTitle>Contenu de la page "Nos valeurs"</CardTitle>
          <CardDescription>
            Gérez les valeurs, métriques et logos qui apparaissent dans vos offres PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-start gap-3"
              onClick={() => navigate(`/${companySlug}/admin/settings/company-values`)}
            >
              <Sparkles className="h-8 w-8 text-primary" />
              <div className="text-left">
                <div className="font-semibold text-base">Valeurs de l'entreprise</div>
                <div className="text-sm text-muted-foreground">
                  Définissez les valeurs affichées dans vos PDFs
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-start gap-3"
              onClick={() => navigate(`/${companySlug}/admin/settings/company-metrics`)}
            >
              <BarChart3 className="h-8 w-8 text-primary" />
              <div className="text-left">
                <div className="font-semibold text-base">Métriques</div>
                <div className="text-sm text-muted-foreground">
                  Satisfaction client, CO2 économisé, appareils gérés...
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-start gap-3"
              onClick={() => navigate(`/${companySlug}/admin/settings/partner-logos`)}
            >
              <Building2 className="h-8 w-8 text-primary" />
              <div className="text-left">
                <div className="font-semibold text-base">Logos partenaires</div>
                <div className="text-sm text-muted-foreground">
                  Ajoutez les logos de vos clients pour la preuve sociale
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cover">Page de couverture</TabsTrigger>
          <TabsTrigger value="equipment">Page équipements</TabsTrigger>
          <TabsTrigger value="conditions">Conditions générales</TabsTrigger>
          <TabsTrigger value="offers" className="flex items-center gap-1">
            <ShoppingBag className="h-3 w-3" />
            Offres
          </TabsTrigger>
          <TabsTrigger value="contract" className="flex items-center gap-1">
            <ScrollText className="h-3 w-3" />
            Contrat
          </TabsTrigger>
        </TabsList>

        {/* Onglet Page de couverture */}
        <TabsContent value="cover" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Textes de la page de couverture</CardTitle>
              <CardDescription>
                Ces textes apparaissent sur la première page de l'offre PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cover-greeting">Salutation</Label>
                <RichTextEditor
                  value={blocks.cover_greeting || ''}
                  onChange={(val) => updateBlock('cover', 'greeting', val)}
                  placeholder="Ex: Madame, Monsieur,"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover-introduction">Introduction</Label>
                <RichTextEditor
                  value={blocks.cover_introduction || ''}
                  onChange={(val) => updateBlock('cover', 'introduction', val)}
                  placeholder="Texte d'introduction de l'offre..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover-validity">Validité de l'offre</Label>
                <RichTextEditor
                  value={blocks.cover_validity || ''}
                  onChange={(val) => updateBlock('cover', 'validity', val)}
                  placeholder="Ex: Cette offre est valable 30 jours..."
                />
              </div>

              <Button 
                onClick={saveBlocks} 
                disabled={isSaving || !hasChanges}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Enregistrement..." : "Enregistrer la page de couverture"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Page équipements */}
        <TabsContent value="equipment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Textes de la page équipements</CardTitle>
              <CardDescription>
                Ces textes apparaissent sur la page détaillant les équipements proposés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="equipment-title">Titre de la section</Label>
                <RichTextEditor
                  value={blocks.equipment_title || ''}
                  onChange={(val) => updateBlock('equipment', 'title', val)}
                  placeholder="Ex: Détail des Équipements"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment-footer-note">Note en bas du tableau</Label>
                <RichTextEditor
                  value={blocks.equipment_footer_note || ''}
                  onChange={(val) => updateBlock('equipment', 'footer_note', val)}
                  placeholder="Ex: Tous les prix sont exprimés en euros hors taxes..."
                />
              </div>

              <Button 
                onClick={saveBlocks} 
                disabled={isSaving || !hasChanges}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Enregistrement..." : "Enregistrer la page équipements"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Conditions générales */}
        <TabsContent value="conditions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conditions générales et informations de contact</CardTitle>
              <CardDescription>
                Ces textes apparaissent sur la dernière page de l'offre PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="conditions-general">Conditions générales de leasing</Label>
                <RichTextEditor
                  value={blocks.conditions_general_conditions || ''}
                  onChange={(val) => updateBlock('conditions', 'general_conditions', val)}
                  placeholder="Ex: Conditions générales du contrat de leasing..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditions-sale">Conditions générales de vente (Offres d'achat)</Label>
                <RichTextEditor
                  value={blocks.conditions_sale_general_conditions || ''}
                  onChange={(val) => updateBlock('conditions', 'sale_general_conditions', val)}
                  placeholder="Ex: Conditions générales de vente directe..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditions-additional">Informations supplémentaires</Label>
                <RichTextEditor
                  value={blocks.conditions_additional_info || ''}
                  onChange={(val) => updateBlock('conditions', 'additional_info', val)}
                  placeholder="Ex: Pour toute information complémentaire..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditions-contact">Informations de contact</Label>
                <RichTextEditor
                  value={blocks.conditions_contact_info || ''}
                  onChange={(val) => updateBlock('conditions', 'contact_info', val)}
                  placeholder="Ex: Email, téléphone, adresse..."
                />
              </div>

              <Button 
                onClick={saveBlocks} 
                disabled={isSaving || !hasChanges}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Enregistrement..." : "Enregistrer les conditions générales"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Offres */}
        <TabsContent value="offers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Templates d'offres
              </CardTitle>
              <CardDescription>
                Personnalisez les templates utilisés pour les offres de leasing et d'achat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="offers-leasing-intro">Introduction offre de leasing</Label>
                <RichTextEditor
                  value={blocks.offers_leasing_introduction || ''}
                  onChange={(val) => updateBlock('offers', 'leasing_introduction', val)}
                  placeholder="Texte d'introduction spécifique aux offres de leasing..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offers-purchase-intro">Introduction offre d'achat</Label>
                <RichTextEditor
                  value={blocks.offers_purchase_introduction || ''}
                  onChange={(val) => updateBlock('offers', 'purchase_introduction', val)}
                  placeholder="Texte d'introduction spécifique aux offres d'achat..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offers-footer">Pied de page des offres</Label>
                <RichTextEditor
                  value={blocks.offers_footer || ''}
                  onChange={(val) => updateBlock('offers', 'footer', val)}
                  placeholder="Texte apparaissant en bas de toutes les offres..."
                />
              </div>

              <Button 
                onClick={saveBlocks} 
                disabled={isSaving || !hasChanges}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Enregistrement..." : "Enregistrer les templates d'offres"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Contrat */}
        <TabsContent value="contract" className="space-y-6">
          <Alert>
            <ScrollText className="h-4 w-4" />
            <AlertDescription>
              <strong>Template de contrat de location :</strong> Ce template est utilisé pour les contrats 
              de location en propre (self-leasing). Utilisez les placeholders ci-dessous pour insérer 
              automatiquement les données du contrat.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Contrat de location
              </CardTitle>
              <CardDescription>
                Template du contrat de location pour les offres en propre (self-leasing)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Placeholders disponibles :</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm font-mono">
                  <Badge variant="outline">{"{{client_name}}"}</Badge>
                  <Badge variant="outline">{"{{client_company}}"}</Badge>
                  <Badge variant="outline">{"{{client_address}}"}</Badge>
                  <Badge variant="outline">{"{{client_email}}"}</Badge>
                  <Badge variant="outline">{"{{client_iban}}"}</Badge>
                  <Badge variant="outline">{"{{client_bic}}"}</Badge>
                  <Badge variant="outline">{"{{monthly_payment}}"}</Badge>
                  <Badge variant="outline">{"{{duration}}"}</Badge>
                  <Badge variant="outline">{"{{contract_number}}"}</Badge>
                  <Badge variant="outline">{"{{start_date}}"}</Badge>
                  <Badge variant="outline">{"{{end_date}}"}</Badge>
                  <Badge variant="outline">{"{{equipment_list}}"}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-header">En-tête du contrat</Label>
                <RichTextEditor
                  value={blocks.contract_header || ''}
                  onChange={(val) => updateBlock('contract', 'header', val)}
                  placeholder="Ex: CONTRAT DE LOCATION LONGUE DURÉE - Entre les soussignés..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-parties">Identification des parties</Label>
                <RichTextEditor
                  value={blocks.contract_parties || ''}
                  onChange={(val) => updateBlock('contract', 'parties', val)}
                  placeholder="Ex: Le Bailleur : {{company_name}} / Le Locataire : {{client_name}}..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-object">Objet du contrat</Label>
                <RichTextEditor
                  value={blocks.contract_object || ''}
                  onChange={(val) => updateBlock('contract', 'object', val)}
                  placeholder="Ex: Le présent contrat a pour objet la location des équipements suivants : {{equipment_list}}..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-terms">Conditions financières</Label>
                <RichTextEditor
                  value={blocks.contract_terms || ''}
                  onChange={(val) => updateBlock('contract', 'terms', val)}
                  placeholder="Ex: Mensualité : {{monthly_payment}}€ / Durée : {{duration}} mois..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-clauses">Clauses générales</Label>
                <RichTextEditor
                  value={blocks.contract_clauses || ''}
                  onChange={(val) => updateBlock('contract', 'clauses', val)}
                  placeholder="Ex: Article 1 - Obligations du locataire..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-signature">Bloc de signature</Label>
                <RichTextEditor
                  value={blocks.contract_signature || ''}
                  onChange={(val) => updateBlock('contract', 'signature', val)}
                  placeholder="Ex: Fait à __________, le __________..."
                />
              </div>

              <Button 
                onClick={saveBlocks} 
                disabled={isSaving || !hasChanges}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Enregistrement..." : "Enregistrer le template de contrat"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PDFContentEditor;
