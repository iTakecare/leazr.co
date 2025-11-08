import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { uploadTemplateImage } from "@/services/templateImageUploadService";

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

  const handleAddLogo = () => {
    const newLogo: PartnerLogo = {
      id: `temp-${Date.now()}`,
      name: "",
      logo_url: "",
      display_order: logos.length,
      is_active: true,
    };
    setLogos([...logos, newLogo]);
  };

  const handleUpdateLogo = (id: string, field: keyof PartnerLogo, value: any) => {
    setLogos(logos.map(l => l.id === id ? { ...l, [field]: value } : l));
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

  const handleLogoUpload = async (id: string, file: File) => {
    try {
      const url = await uploadTemplateImage(file, 'company-assets');
      handleUpdateLogo(id, 'logo_url', url);
      toast({
        title: "Succès",
        description: "Logo uploadé",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le logo",
        variant: "destructive",
      });
    }
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

      for (const logo of logos) {
        if (logo.id.startsWith('temp-')) {
          const { error } = await supabase
            .from('company_partner_logos')
            .insert({
              company_id: profile.company_id,
              name: logo.name,
              logo_url: logo.logo_url,
              display_order: logo.display_order,
              is_active: logo.is_active,
            });
          if (error) throw error;
        } else {
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
          <CardTitle>Logos partenaires</CardTitle>
          <CardDescription>
            Gérez les logos de vos partenaires/clients affichés dans la page "Nos valeurs" de vos offres PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleAddLogo} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un logo
          </Button>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="logos">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="grid gap-4 md:grid-cols-2">
                  {logos.map((logo, index) => (
                    <Draggable key={logo.id} draggableId={logo.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="border rounded-lg p-4 space-y-4 bg-card"
                        >
                          <div className="flex items-center justify-between">
                            <div {...provided.dragHandleProps} className="cursor-move">
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={logo.is_active}
                                onCheckedChange={(checked) =>
                                  handleUpdateLogo(logo.id, 'is_active', checked)
                                }
                              />
                              <span className="text-sm">Actif</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLogo(logo.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <Label>Nom du partenaire</Label>
                              <Input
                                value={logo.name}
                                onChange={(e) =>
                                  handleUpdateLogo(logo.id, 'name', e.target.value)
                                }
                                placeholder="Ex: Microsoft"
                              />
                            </div>

                            <div>
                              <Label>Logo</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleLogoUpload(logo.id, file);
                                }}
                              />
                              {logo.logo_url && (
                                <div className="mt-2 p-4 border rounded-lg bg-muted flex items-center justify-center">
                                  <img
                                    src={logo.logo_url}
                                    alt={logo.name}
                                    className="max-w-[120px] max-h-[60px] object-contain"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerLogosSettings;
