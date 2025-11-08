import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { uploadTemplateImage } from "@/services/templateImageUploadService";

interface CompanyValue {
  id: string;
  title: string;
  description: string;
  icon_url?: string;
  display_order: number;
  is_active: boolean;
}

const CompanyValuesSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const [values, setValues] = useState<CompanyValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchValues();
  }, []);

  const fetchValues = async () => {
    try {
      const { data, error } = await supabase
        .from('company_values')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setValues(data || []);
    } catch (error) {
      console.error('Error fetching values:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les valeurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddValue = () => {
    const newValue: CompanyValue = {
      id: `temp-${Date.now()}`,
      title: "",
      description: "",
      icon_url: undefined,
      display_order: values.length,
      is_active: true,
    };
    setValues([...values, newValue]);
  };

  const handleUpdateValue = (id: string, field: keyof CompanyValue, value: any) => {
    setValues(values.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleDeleteValue = async (id: string) => {
    if (id.startsWith('temp-')) {
      setValues(values.filter(v => v.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('company_values')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setValues(values.filter(v => v.id !== id));
      toast({
        title: "Succès",
        description: "Valeur supprimée",
      });
    } catch (error) {
      console.error('Error deleting value:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la valeur",
        variant: "destructive",
      });
    }
  };

  const handleIconUpload = async (id: string, file: File) => {
    try {
      const url = await uploadTemplateImage(file, 'company-assets');
      handleUpdateValue(id, 'icon_url', url);
      toast({
        title: "Succès",
        description: "Icône uploadée",
      });
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader l'icône",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(values);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    setValues(updatedItems);
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

      for (const value of values) {
        if (value.id.startsWith('temp-')) {
          const { error } = await supabase
            .from('company_values')
            .insert({
              company_id: profile.company_id,
              title: value.title,
              description: value.description,
              icon_url: value.icon_url,
              display_order: value.display_order,
              is_active: value.is_active,
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('company_values')
            .update({
              title: value.title,
              description: value.description,
              icon_url: value.icon_url,
              display_order: value.display_order,
              is_active: value.is_active,
            })
            .eq('id', value.id);
          if (error) throw error;
        }
      }

      toast({
        title: "Succès",
        description: "Valeurs sauvegardées",
      });
      fetchValues();
    } catch (error) {
      console.error('Error saving values:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les valeurs",
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
          <CardTitle>Valeurs de l'entreprise</CardTitle>
          <CardDescription>
            Définissez les valeurs affichées dans la page "Nos valeurs" de vos offres PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleAddValue} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une valeur
          </Button>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="values">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                  {values.map((value, index) => (
                    <Draggable key={value.id} draggableId={value.id} index={index}>
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
                                checked={value.is_active}
                                onCheckedChange={(checked) =>
                                  handleUpdateValue(value.id, 'is_active', checked)
                                }
                              />
                              <span className="text-sm">Actif</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteValue(value.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4">
                            <div>
                              <Label>Titre</Label>
                              <Input
                                value={value.title}
                                onChange={(e) =>
                                  handleUpdateValue(value.id, 'title', e.target.value)
                                }
                                placeholder="Ex: Evolution"
                              />
                            </div>

                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={value.description}
                                onChange={(e) =>
                                  handleUpdateValue(value.id, 'description', e.target.value)
                                }
                                placeholder="Description de la valeur..."
                                rows={3}
                              />
                            </div>

                            <div>
                              <Label>Icône (optionnel)</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleIconUpload(value.id, file);
                                }}
                              />
                              {value.icon_url && (
                                <img
                                  src={value.icon_url}
                                  alt="Icône"
                                  className="mt-2 w-12 h-12 object-contain"
                                />
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

export default CompanyValuesSettings;
