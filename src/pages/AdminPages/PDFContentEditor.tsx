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
  const [activeMainTab, setActiveMainTab] = useState('offers');
  const [activeOfferSubTab, setActiveOfferSubTab] = useState('cover');

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
          page_name: pageName as 'cover' | 'equipment' | 'conditions' | 'offers' | 'contract',
          block_key: blockKey,
          content
        };
      });
      
      await upsertMultiplePDFContentBlocks(blocksToSave);
      
      toast({
        title: "Modifications enregistrées",
        description: "Les contenus ont été mis à jour avec succès."
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
            <h2 className="text-2xl font-bold">Contenu des offres et contrats</h2>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Contenu des offres et contrats - Paramètres</title>
        <meta name="description" content="Personnalisez les textes qui apparaissent dans vos offres et contrats PDF" />
      </Helmet>

      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">Contenu des offres et contrats</h2>
            <p className="text-muted-foreground">
              Personnalisez les textes qui apparaissent dans vos documents PDF
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
          aux prochains documents PDF générés.
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

      {/* Onglets principaux : Offres et Contrat */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="offers" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Offres
          </TabsTrigger>
          <TabsTrigger value="contract" className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Contrat
          </TabsTrigger>
        </TabsList>

        {/* Onglet Offres avec sous-onglets */}
        <TabsContent value="offers" className="space-y-4 mt-4">
          <Tabs value={activeOfferSubTab} onValueChange={setActiveOfferSubTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cover">Page de couverture</TabsTrigger>
              <TabsTrigger value="equipment">Page équipements</TabsTrigger>
              <TabsTrigger value="conditions">Conditions générales</TabsTrigger>
              <TabsTrigger value="offers-settings">Offres</TabsTrigger>
            </TabsList>

            {/* Sous-onglet Page de couverture */}
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
                    <Label>Salutation</Label>
                    <RichTextEditor
                      value={blocks.cover_greeting || ''}
                      onChange={(val) => updateBlock('cover', 'greeting', val)}
                      placeholder="Ex: Madame, Monsieur,"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Introduction</Label>
                    <RichTextEditor
                      value={blocks.cover_introduction || ''}
                      onChange={(val) => updateBlock('cover', 'introduction', val)}
                      placeholder="Texte d'introduction de l'offre..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Validité de l'offre</Label>
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

            {/* Sous-onglet Page équipements */}
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
                    <Label>Titre de la section</Label>
                    <RichTextEditor
                      value={blocks.equipment_title || ''}
                      onChange={(val) => updateBlock('equipment', 'title', val)}
                      placeholder="Ex: Détail des Équipements"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Note en bas du tableau</Label>
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

            {/* Sous-onglet Conditions générales */}
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
                    <Label>Conditions générales de leasing</Label>
                    <RichTextEditor
                      value={blocks.conditions_general_conditions || ''}
                      onChange={(val) => updateBlock('conditions', 'general_conditions', val)}
                      placeholder="Ex: Conditions générales du contrat de leasing..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Conditions générales de vente (Offres d'achat)</Label>
                    <RichTextEditor
                      value={blocks.conditions_sale_general_conditions || ''}
                      onChange={(val) => updateBlock('conditions', 'sale_general_conditions', val)}
                      placeholder="Ex: Conditions générales de vente directe..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Informations supplémentaires</Label>
                    <RichTextEditor
                      value={blocks.conditions_additional_info || ''}
                      onChange={(val) => updateBlock('conditions', 'additional_info', val)}
                      placeholder="Ex: Pour toute information complémentaire..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Informations de contact</Label>
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

            {/* Sous-onglet Offres (paramètres) */}
            <TabsContent value="offers-settings" className="space-y-6">
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
                    <Label>Introduction offre de leasing</Label>
                    <RichTextEditor
                      value={blocks.offers_leasing_introduction || ''}
                      onChange={(val) => updateBlock('offers', 'leasing_introduction', val)}
                      placeholder="Texte d'introduction spécifique aux offres de leasing..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Introduction offre d'achat</Label>
                    <RichTextEditor
                      value={blocks.offers_purchase_introduction || ''}
                      onChange={(val) => updateBlock('offers', 'purchase_introduction', val)}
                      placeholder="Texte d'introduction spécifique aux offres d'achat..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pied de page des offres</Label>
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
          </Tabs>
        </TabsContent>

        {/* Onglet Contrat */}
        <TabsContent value="contract" className="space-y-6 mt-4">
          <Alert>
            <ScrollText className="h-4 w-4" />
            <AlertDescription>
              <strong>Contrat de location :</strong> Ce template est utilisé pour les contrats 
              de location en propre (self-leasing). Utilisez les placeholders ci-dessous pour insérer 
              automatiquement les données du contrat.
            </AlertDescription>
          </Alert>

          {/* Placeholders disponibles */}
          <Card>
            <CardHeader>
              <CardTitle>Placeholders disponibles</CardTitle>
              <CardDescription>
                Ces variables seront remplacées par les données réelles lors de la génération du contrat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm font-mono">
                <Badge variant="outline">{"{{company_name}}"}</Badge>
                <Badge variant="outline">{"{{company_address}}"}</Badge>
                <Badge variant="outline">{"{{company_bce}}"}</Badge>
                <Badge variant="outline">{"{{company_capital}}"}</Badge>
                <Badge variant="outline">{"{{client_name}}"}</Badge>
                <Badge variant="outline">{"{{client_company}}"}</Badge>
                <Badge variant="outline">{"{{client_address}}"}</Badge>
                <Badge variant="outline">{"{{client_bce}}"}</Badge>
                <Badge variant="outline">{"{{client_email}}"}</Badge>
                <Badge variant="outline">{"{{client_iban}}"}</Badge>
                <Badge variant="outline">{"{{client_bic}}"}</Badge>
                <Badge variant="outline">{"{{monthly_payment}}"}</Badge>
                <Badge variant="outline">{"{{duration}}"}</Badge>
                <Badge variant="outline">{"{{contract_number}}"}</Badge>
                <Badge variant="outline">{"{{start_date}}"}</Badge>
                <Badge variant="outline">{"{{end_date}}"}</Badge>
                <Badge variant="outline">{"{{equipment_list}}"}</Badge>
                <Badge variant="outline">{"{{file_fee}}"}</Badge>
                <Badge variant="outline">{"{{admin_fee}}"}</Badge>
                <Badge variant="outline">{"{{residual_value}}"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Titre et en-tête */}
          <Card>
            <CardHeader>
              <CardTitle>1. Titre et identification des parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Titre du contrat</Label>
                <RichTextEditor
                  value={blocks.contract_title || ''}
                  onChange={(val) => updateBlock('contract', 'title', val)}
                  placeholder="Ex: CONTRAT DE LOCATION DE MATÉRIEL INFORMATIQUE AVEC OPTION D'ACHAT"
                />
              </div>

              <div className="space-y-2">
                <Label>Identification des parties</Label>
                <RichTextEditor
                  value={blocks.contract_parties || ''}
                  onChange={(val) => updateBlock('contract', 'parties', val)}
                  placeholder="Ex: Entre : [Le Bailleur] Et : [Le Locataire]..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Articles 1-4 */}
          <Card>
            <CardHeader>
              <CardTitle>2. Objet, Durée, Livraison et Loyers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Article 1 - Objet</Label>
                <RichTextEditor
                  value={blocks.contract_article_1 || ''}
                  onChange={(val) => updateBlock('contract', 'article_1', val)}
                  placeholder="Description de l'objet du contrat..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 2 - Durée</Label>
                <RichTextEditor
                  value={blocks.contract_article_2 || ''}
                  onChange={(val) => updateBlock('contract', 'article_2', val)}
                  placeholder="Conditions de durée du contrat..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 3 - Livraison / Mise à disposition</Label>
                <RichTextEditor
                  value={blocks.contract_article_3 || ''}
                  onChange={(val) => updateBlock('contract', 'article_3', val)}
                  placeholder="Conditions de livraison..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 4 - Loyers / Facturation</Label>
                <RichTextEditor
                  value={blocks.contract_article_4 || ''}
                  onChange={(val) => updateBlock('contract', 'article_4', val)}
                  placeholder="Conditions financières et facturation..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Articles 5-9 */}
          <Card>
            <CardHeader>
              <CardTitle>3. Assurance, Utilisation, Maintenance et Risques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Article 5 - Assurance / Risques / Sinistres</Label>
                <RichTextEditor
                  value={blocks.contract_article_5 || ''}
                  onChange={(val) => updateBlock('contract', 'article_5', val)}
                  placeholder="Conditions d'assurance..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 6 - Obligations du Locataire</Label>
                <RichTextEditor
                  value={blocks.contract_article_6 || ''}
                  onChange={(val) => updateBlock('contract', 'article_6', val)}
                  placeholder="Obligations du locataire..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 7 - Utilisation / Interdictions / Logiciels</Label>
                <RichTextEditor
                  value={blocks.contract_article_7 || ''}
                  onChange={(val) => updateBlock('contract', 'article_7', val)}
                  placeholder="Conditions d'utilisation..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 8 - Maintenance / Remplacement / Temps d'intervention</Label>
                <RichTextEditor
                  value={blocks.contract_article_8 || ''}
                  onChange={(val) => updateBlock('contract', 'article_8', val)}
                  placeholder="Conditions de maintenance..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 9 - Perte, vol, dommage total</Label>
                <RichTextEditor
                  value={blocks.contract_article_9 || ''}
                  onChange={(val) => updateBlock('contract', 'article_9', val)}
                  placeholder="Conditions en cas de perte ou vol..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Articles 10-14 */}
          <Card>
            <CardHeader>
              <CardTitle>4. Option d'achat, Protection des données, Restitution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Article 10 - Option d'achat en fin de contrat</Label>
                <RichTextEditor
                  value={blocks.contract_article_10 || ''}
                  onChange={(val) => updateBlock('contract', 'article_10', val)}
                  placeholder="Conditions de l'option d'achat..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 11 - Protection des données / Sécurité / Effacement</Label>
                <RichTextEditor
                  value={blocks.contract_article_11 || ''}
                  onChange={(val) => updateBlock('contract', 'article_11', val)}
                  placeholder="Conditions de protection des données..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 12 - Restitution / État de retour</Label>
                <RichTextEditor
                  value={blocks.contract_article_12 || ''}
                  onChange={(val) => updateBlock('contract', 'article_12', val)}
                  placeholder="Conditions de restitution..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 13 - Défaut d'exécution / Intérêts / Indemnités</Label>
                <RichTextEditor
                  value={blocks.contract_article_13 || ''}
                  onChange={(val) => updateBlock('contract', 'article_13', val)}
                  placeholder="Conditions en cas de défaut..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 14 - Transfert / Cession</Label>
                <RichTextEditor
                  value={blocks.contract_article_14 || ''}
                  onChange={(val) => updateBlock('contract', 'article_14', val)}
                  placeholder="Conditions de transfert..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Articles 15-18 et Annexes */}
          <Card>
            <CardHeader>
              <CardTitle>5. Dispositions diverses et Annexes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Article 15 - Force majeure</Label>
                <RichTextEditor
                  value={blocks.contract_article_15 || ''}
                  onChange={(val) => updateBlock('contract', 'article_15', val)}
                  placeholder="Conditions de force majeure..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 16 - Notifications / Preuve / Signature électronique</Label>
                <RichTextEditor
                  value={blocks.contract_article_16 || ''}
                  onChange={(val) => updateBlock('contract', 'article_16', val)}
                  placeholder="Conditions de notification..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 17 - Droit applicable / Juridiction / Médiation</Label>
                <RichTextEditor
                  value={blocks.contract_article_17 || ''}
                  onChange={(val) => updateBlock('contract', 'article_17', val)}
                  placeholder="Conditions juridiques..."
                />
              </div>

              <div className="space-y-2">
                <Label>Article 18 - Dispositions diverses</Label>
                <RichTextEditor
                  value={blocks.contract_article_18 || ''}
                  onChange={(val) => updateBlock('contract', 'article_18', val)}
                  placeholder="Autres dispositions..."
                />
              </div>

              <div className="space-y-2">
                <Label>Annexes</Label>
                <RichTextEditor
                  value={blocks.contract_annexes || ''}
                  onChange={(val) => updateBlock('contract', 'annexes', val)}
                  placeholder="Liste des annexes au contrat..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Bloc de signature */}
          <Card>
            <CardHeader>
              <CardTitle>6. Bloc de signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Bloc de signature</Label>
                <RichTextEditor
                  value={blocks.contract_signature || ''}
                  onChange={(val) => updateBlock('contract', 'signature', val)}
                  placeholder="Fait à __________, le __________, en deux exemplaires originaux..."
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
