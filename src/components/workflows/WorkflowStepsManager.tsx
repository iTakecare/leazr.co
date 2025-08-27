import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { workflowService } from '@/services/workflows/workflowService';
import { useToast } from '@/hooks/use-toast';
import type { WorkflowTemplate, WorkflowStep, CreateWorkflowStep } from '@/types/workflow';

interface WorkflowStepsManagerProps {
  template: WorkflowTemplate;
  onBack: () => void;
}

interface StepFormData extends CreateWorkflowStep {
  id?: string;
}

export const WorkflowStepsManager: React.FC<WorkflowStepsManagerProps> = ({
  template,
  onBack
}) => {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<StepFormData | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSteps();
  }, [template.id]);

  const loadSteps = async () => {
    try {
      setLoading(true);
      const data = await workflowService.getWorkflowSteps(template.id);
      setSteps(data);
    } catch (error) {
      console.error('Error loading steps:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les étapes"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep = async (stepData: StepFormData) => {
    try {
      if (stepData.id) {
        // Update existing step
        const { id, ...updateData } = stepData;
        await workflowService.updateWorkflowStep(id, updateData);
        toast({
          title: "Succès",
          description: "Étape mise à jour avec succès"
        });
      } else {
        // Create new step
        await workflowService.createWorkflowStep(template.id, stepData);
        toast({
          title: "Succès",
          description: "Étape créée avec succès"
        });
      }
      await loadSteps();
      setEditingStep(null);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving step:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder l'étape"
      });
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette étape ?')) {
      return;
    }

    try {
      await workflowService.deleteWorkflowStep(stepId);
      toast({
        title: "Succès",
        description: "Étape supprimée avec succès"
      });
      await loadSteps();
    } catch (error) {
      console.error('Error deleting step:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'étape"
      });
    }
  };

  const iconOptions = [
    { value: 'Circle', label: 'Cercle' },
    { value: 'Clock', label: 'Horloge' },
    { value: 'CheckCircle', label: 'Check' },
    { value: 'HelpCircle', label: 'Question' },
    { value: 'AlertCircle', label: 'Alerte' },
    { value: 'XCircle', label: 'Croix' },
    { value: 'ArrowRight', label: 'Flèche' }
  ];

  const colorOptions = [
    { value: 'bg-gray-100', label: 'Gris', class: 'bg-gray-100 border-gray-200' },
    { value: 'bg-blue-500', label: 'Bleu', class: 'bg-blue-100 border-blue-200' },
    { value: 'bg-green-500', label: 'Vert', class: 'bg-green-100 border-green-200' },
    { value: 'bg-orange-500', label: 'Orange', class: 'bg-orange-100 border-orange-200' },
    { value: 'bg-purple-500', label: 'Violet', class: 'bg-purple-100 border-purple-200' },
    { value: 'bg-red-500', label: 'Rouge', class: 'bg-red-100 border-red-200' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h3 className="text-xl font-semibold">Étapes du workflow</h3>
            <p className="text-muted-foreground">{template.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une étape
        </Button>
      </div>

      {(showAddForm || editingStep) && (
        <StepForm
          step={editingStep}
          maxOrder={Math.max(...steps.map(s => s.step_order), 0)}
          onSave={handleSaveStep}
          onCancel={() => {
            setEditingStep(null);
            setShowAddForm(false);
          }}
          iconOptions={iconOptions}
          colorOptions={colorOptions}
        />
      )}

      <div className="grid gap-4">
        {steps.sort((a, b) => a.step_order - b.step_order).map((step) => (
          <Card key={step.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">
                    #{step.step_order}
                  </Badge>
                  <CardTitle className="text-base">{step.step_label}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {step.step_key}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingStep({
                      id: step.id,
                      step_key: step.step_key,
                      step_label: step.step_label,
                      step_description: step.step_description || '',
                      step_order: step.step_order,
                      is_required: step.is_required,
                      is_visible: step.is_visible,
                      icon_name: step.icon_name || '',
                      color_class: step.color_class || ''
                    })}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteStep(step.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {step.step_description && (
                <CardDescription>{step.step_description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <span>Icône: {step.icon_name || 'Aucune'}</span>
                <span>•</span>
                <span>Couleur: {step.color_class || 'Par défaut'}</span>
                <span>•</span>
                <span>{step.is_required ? 'Obligatoire' : 'Optionnelle'}</span>
                <span>•</span>
                <span>{step.is_visible ? 'Visible' : 'Masquée'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {steps.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Plus className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune étape configurée</h3>
            <p className="text-muted-foreground text-center mb-4">
              Ajoutez des étapes pour définir le processus de ce workflow.
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter la première étape
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface StepFormProps {
  step?: StepFormData | null;
  maxOrder: number;
  onSave: (step: StepFormData) => void;
  onCancel: () => void;
  iconOptions: Array<{ value: string; label: string }>;
  colorOptions: Array<{ value: string; label: string; class: string }>;
}

const StepForm: React.FC<StepFormProps> = ({
  step,
  maxOrder,
  onSave,
  onCancel,
  iconOptions,
  colorOptions
}) => {
  const [formData, setFormData] = useState<StepFormData>({
    step_key: step?.step_key || '',
    step_label: step?.step_label || '',
    step_description: step?.step_description || '',
    step_order: step?.step_order || maxOrder + 1,
    is_required: step?.is_required ?? true,
    is_visible: step?.is_visible ?? true,
    icon_name: step?.icon_name || 'Circle',
    color_class: step?.color_class || 'bg-gray-100',
    id: step?.id
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.step_key || !formData.step_label) {
      return;
    }
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {step ? 'Modifier l\'étape' : 'Nouvelle étape'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="step_key">Clé de l'étape *</Label>
              <Input
                id="step_key"
                placeholder="draft, sent, validated..."
                value={formData.step_key}
                onChange={(e) => setFormData({ ...formData, step_key: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step_label">Libellé *</Label>
              <Input
                id="step_label"
                placeholder="Brouillon, Offre envoyée..."
                value={formData.step_label}
                onChange={(e) => setFormData({ ...formData, step_label: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="step_description">Description</Label>
            <Textarea
              id="step_description"
              placeholder="Description de cette étape..."
              value={formData.step_description}
              onChange={(e) => setFormData({ ...formData, step_description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="step_order">Ordre</Label>
              <Input
                id="step_order"
                type="number"
                min="1"
                value={formData.step_order}
                onChange={(e) => setFormData({ ...formData, step_order: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon_name">Icône</Label>
              <Select 
                value={formData.icon_name} 
                onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une icône" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color_class">Couleur</Label>
              <Select 
                value={formData.color_class} 
                onValueChange={(value) => setFormData({ ...formData, color_class: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une couleur" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked as boolean })}
              />
              <Label htmlFor="is_required">Étape obligatoire</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_visible"
                checked={formData.is_visible}
                onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked as boolean })}
              />
              <Label htmlFor="is_visible">Étape visible</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit">
              {step ? 'Mettre à jour' : 'Ajouter l\'étape'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};