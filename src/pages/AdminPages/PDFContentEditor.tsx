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
import { FileText, Save, Info } from 'lucide-react';

const PDFContentEditor: React.FC = () => {
  const { toast } = useToast();
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('cover');

  // Chargement du company_id au montage
  useEffect(() => {
    const loadCompanyId = async () => {
      try {
        const id = await getCurrentUserCompanyId();
        setCompanyId(id);
      } catch (error) {
        console.error('Erreur lors de la récupération du company_id:', error);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les informations de l'entreprise",
          variant: "destructive"
        });
      }
    };
    loadCompanyId();
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

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cover">Page de couverture</TabsTrigger>
          <TabsTrigger value="equipment">Page équipements</TabsTrigger>
          <TabsTrigger value="conditions">Conditions générales</TabsTrigger>
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
                <Label htmlFor="conditions-general">Conditions générales</Label>
                <RichTextEditor
                  value={blocks.conditions_general_conditions || ''}
                  onChange={(val) => updateBlock('conditions', 'general_conditions', val)}
                  placeholder="Ex: Conditions générales du contrat..."
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
      </Tabs>
    </div>
  );
};

export default PDFContentEditor;
