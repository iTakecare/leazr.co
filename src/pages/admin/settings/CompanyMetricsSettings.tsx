import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, GripVertical, Trash2, Save } from "lucide-react";
import * as icons from 'lucide-react';
import { IconPickerDialog } from '@/components/ui/icon-picker-dialog';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";

interface CompanyMetric {
  id: string;
  metric_key: string;
  label: string;
  value: string;
  icon_name?: string;
  display_order: number;
  is_active: boolean;
}

const CompanyMetricsSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const [metrics, setMetrics] = useState<CompanyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('company_metrics')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les métriques",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMetric = () => {
    const newMetric: CompanyMetric = {
      id: `temp-${Date.now()}`,
      metric_key: "",
      label: "",
      value: "",
      icon_name: undefined,
      display_order: metrics.length,
      is_active: true,
    };
    setMetrics([...metrics, newMetric]);
  };

  const handleUpdateMetric = (id: string, field: keyof CompanyMetric, value: any) => {
    setMetrics(metrics.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleDeleteMetric = async (id: string) => {
    if (id.startsWith('temp-')) {
      setMetrics(metrics.filter(m => m.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('company_metrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMetrics(metrics.filter(m => m.id !== id));
      toast({
        title: "Succès",
        description: "Métrique supprimée",
      });
    } catch (error) {
      console.error('Error deleting metric:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la métrique",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(metrics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index,
    }));

    setMetrics(updatedItems);
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

      for (const metric of metrics) {
        if (metric.id.startsWith('temp-')) {
          const { error } = await supabase
            .from('company_metrics')
            .insert({
              company_id: profile.company_id,
              metric_key: metric.metric_key,
              label: metric.label,
              value: metric.value,
              icon_name: metric.icon_name,
              display_order: metric.display_order,
              is_active: metric.is_active,
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('company_metrics')
            .update({
              metric_key: metric.metric_key,
              label: metric.label,
              value: metric.value,
              icon_name: metric.icon_name,
              display_order: metric.display_order,
              is_active: metric.is_active,
            })
            .eq('id', metric.id);
          if (error) throw error;
        }
      }

      toast({
        title: "Succès",
        description: "Métriques sauvegardées",
      });
      fetchMetrics();
    } catch (error) {
      console.error('Error saving metrics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les métriques",
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
          <CardTitle>Métriques de l'entreprise</CardTitle>
          <CardDescription>
            Définissez les métriques affichées dans la page "Nos valeurs" de vos offres PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleAddMetric} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une métrique
          </Button>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="metrics">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                  {metrics.map((metric, index) => (
                    <Draggable key={metric.id} draggableId={metric.id} index={index}>
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
                                checked={metric.is_active}
                                onCheckedChange={(checked) =>
                                  handleUpdateMetric(metric.id, 'is_active', checked)
                                }
                              />
                              <span className="text-sm">Actif</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMetric(metric.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label>Clé (identifiant unique)</Label>
                              <Input
                                value={metric.metric_key}
                                onChange={(e) =>
                                  handleUpdateMetric(metric.id, 'metric_key', e.target.value)
                                }
                                placeholder="Ex: client_satisfaction"
                              />
                            </div>

                            <div>
                              <Label>Valeur</Label>
                              <Input
                                value={metric.value}
                                onChange={(e) =>
                                  handleUpdateMetric(metric.id, 'value', e.target.value)
                                }
                                placeholder="Ex: 99%"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label>Label</Label>
                              <Input
                                value={metric.label}
                                onChange={(e) =>
                                  handleUpdateMetric(metric.id, 'label', e.target.value)
                                }
                                placeholder="Ex: de clients satisfaits"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Label>Icône (optionnel)</Label>
                              <div className="flex items-center gap-2">
                                {/* Affichage de l'icône sélectionnée */}
                                {metric.icon_name && (() => {
                                  const IconComponent = icons[metric.icon_name as keyof typeof icons] as React.ComponentType<{ className?: string }>;
                                  return IconComponent ? (
                                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                                      <IconComponent className="h-5 w-5" />
                                      <span className="text-sm">{metric.icon_name}</span>
                                    </div>
                                  ) : null;
                                })()}
                                
                                {/* Bouton pour ouvrir le sélecteur */}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIconPickerOpen(metric.id)}
                                >
                                  {metric.icon_name ? 'Changer l\'icône' : 'Choisir une icône'}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                L'icône sera affichée à côté de la métrique dans le PDF
                              </p>
                            </div>
                            
                            {/* Modale de sélection d'icône */}
                            <IconPickerDialog
                              open={iconPickerOpen === metric.id}
                              onOpenChange={(open) => !open && setIconPickerOpen(null)}
                              selectedIcon={metric.icon_name}
                              onSelectIcon={(iconName) => {
                                handleUpdateMetric(metric.id, 'icon_name', iconName);
                                setIconPickerOpen(null);
                              }}
                            />
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

export default CompanyMetricsSettings;
