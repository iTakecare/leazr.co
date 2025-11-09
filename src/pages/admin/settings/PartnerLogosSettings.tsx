import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, CheckSquare, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { uploadTemplateImage, uploadMultipleTemplateImages } from "@/services/templateImageUploadService";
import { PartnerLogoDropzone } from "@/components/settings/PartnerLogoDropzone";
import { PartnerLogoCard } from "@/components/settings/PartnerLogoCard";
import { PartnerLogoEditDialog } from "@/components/settings/PartnerLogoEditDialog";

interface PartnerLogo {
  id: string;
  name: string;
  logo_url: string;
  display_order: number;
  is_active: boolean;
}

const PartnerLogosSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const [logos, setLogos] = useState<PartnerLogo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLogos, setSelectedLogos] = useState<Set<string>>(new Set());
  const [editingLogo, setEditingLogo] = useState<PartnerLogo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    try {
      const { data, error } = await supabase
        .from('company_partner_logos')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setLogos(data || []);
    } catch (error) {
      console.error('Error fetching logos:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les logos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultipleUpload = async (files: { file: File; name: string }[]) => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Upload all files
      const urls = await uploadMultipleTemplateImages(
        files.map(f => f.file),
        'company-assets'
      );

      // Create logo entries
      const newLogos = files.map((item, index) => ({
        company_id: profile.company_id,
        name: item.name,
        logo_url: urls[index],
        display_order: logos.length + index,
        is_active: true,
      }));

      const { error } = await supabase
        .from('company_partner_logos')
        .insert(newLogos);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${files.length} logo(s) uploadé(s)`,
      });

      fetchLogos();
    } catch (error) {
      console.error('Error uploading logos:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader les logos",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateLogo = (id: string, field: keyof PartnerLogo, value: any) => {
    setLogos(logos.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleEditLogo = (logo: PartnerLogo) => {
    setEditingLogo(logo);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedLogo = (updatedLogo: PartnerLogo) => {
    setLogos(logos.map(l => l.id === updatedLogo.id ? updatedLogo : l));
  };

  const handleUploadLogoInDialog = async (file: File): Promise<string> => {
    return await uploadTemplateImage(file, 'company-assets');
  };

  const handleDeleteLogo = async (id: string) => {
    if (id.startsWith('temp-')) {
      setLogos(logos.filter(l => l.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('company_partner_logos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setLogos(logos.filter(l => l.id !== id));
      toast({
        title: "Succès",
        description: "Logo supprimé",
      });
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le logo",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = (id: string, active: boolean) => {
    handleUpdateLogo(id, 'is_active', active);
  };

  const handleSelectLogo = (id: string, selected: boolean) => {
    setSelectedLogos((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLogos(new Set(logos.map(l => l.id)));
    } else {
      setSelectedLogos(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLogos.size === 0) return;

    try {
      const idsToDelete = Array.from(selectedLogos).filter(id => !id.startsWith('temp-'));
      
      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from('company_partner_logos')
          .delete()
          .in('id', idsToDelete);

        if (error) throw error;
      }

      setLogos(logos.filter(l => !selectedLogos.has(l.id)));
      setSelectedLogos(new Set());
      
      toast({
        title: "Succès",
        description: `${selectedLogos.size} logo(s) supprimé(s)`,
      });
    } catch (error) {
      console.error('Error deleting logos:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les logos",
        variant: "destructive",
      });
    }
  };

  const handleActivateSelected = () => {
    setLogos(logos.map(l => 
      selectedLogos.has(l.id) ? { ...l, is_active: true } : l
    ));
  };

  const handleDeactivateSelected = () => {
    setLogos(logos.map(l => 
      selectedLogos.has(l.id) ? { ...l, is_active: false } : l
    ));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(logos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    setLogos(updatedItems);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Only update existing logos (non-temp)
      const logosToUpdate = logos.filter(l => !l.id.startsWith('temp-'));
      
      for (const logo of logosToUpdate) {
        const { error } = await supabase
          .from('company_partner_logos')
          .update({
            name: logo.name,
            logo_url: logo.logo_url,
            display_order: logo.display_order,
            is_active: logo.is_active,
          })
          .eq('id', logo.id);
        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: "Logos sauvegardés",
      });
      fetchLogos();
    } catch (error) {
      console.error('Error saving logos:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les logos",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button onClick={handleSaveAll} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Sauvegarde..." : "Sauvegarder tout"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload multiple de logos</CardTitle>
          <CardDescription>
            Glissez plusieurs logos à la fois pour un upload rapide
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartnerLogoDropzone
            onUpload={handleMultipleUpload}
            isUploading={isUploading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logos partenaires ({logos.length})</CardTitle>
              <CardDescription>
                Gérez les logos affichés dans la page "Nos valeurs" de vos offres PDF
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mass actions toolbar */}
          {logos.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Checkbox
                checked={selectedLogos.size === logos.length && logos.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedLogos.size > 0
                  ? `${selectedLogos.size} sélectionné(s)`
                  : "Tout sélectionner"}
              </span>
              
              {selectedLogos.size > 0 && (
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleActivateSelected}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Activer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeactivateSelected}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Désactiver
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Logos grid */}
          {logos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun logo pour le moment</p>
              <p className="text-sm mt-2">Utilisez la zone d'upload ci-dessus pour ajouter des logos</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="logos">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  >
                    {logos.map((logo, index) => (
                      <Draggable key={logo.id} draggableId={logo.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <PartnerLogoCard
                              logo={logo}
                              isSelected={selectedLogos.has(logo.id)}
                              showCheckbox={true}
                              onSelect={handleSelectLogo}
                              onEdit={handleEditLogo}
                              onDelete={handleDeleteLogo}
                              onToggleActive={handleToggleActive}
                              dragHandleProps={provided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <PartnerLogoEditDialog
        logo={editingLogo}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEditedLogo}
        onUploadLogo={handleUploadLogoInDialog}
      />
    </div>
  );
};

export default PartnerLogosSettings;
