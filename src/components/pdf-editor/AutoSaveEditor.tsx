import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Clock, CloudOff, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CustomPdfTemplate } from '@/types/customPdfTemplate';

interface AutoSaveEditorProps {
  template: CustomPdfTemplate;
  onSave: (template: CustomPdfTemplate) => Promise<void>;
  autoSaveInterval?: number; // en millisecondes
}

export const AutoSaveEditor: React.FC<AutoSaveEditorProps> = ({
  template,
  onSave,
  autoSaveInterval = 30000 // 30 secondes par défaut
}) => {
  const [localTemplate, setLocalTemplate] = useState<CustomPdfTemplate>(template);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'pending'>('saved');

  // Auto-save effect
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(async () => {
      await performAutoSave();
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [localTemplate, isDirty, autoSaveInterval]);

  // Track changes
  useEffect(() => {
    if (JSON.stringify(localTemplate) !== JSON.stringify(template)) {
      setIsDirty(true);
      setSaveStatus('pending');
    }
  }, [localTemplate, template]);

  const performAutoSave = useCallback(async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await onSave(localTemplate);
      setIsDirty(false);
      setLastSaved(new Date());
      setSaveStatus('saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
      toast.error('Échec de la sauvegarde automatique');
    } finally {
      setIsSaving(false);
    }
  }, [localTemplate, isDirty, isSaving, onSave]);

  const handleManualSave = async () => {
    await performAutoSave();
  };

  const handleFieldChange = (field: keyof CustomPdfTemplate, value: any) => {
    setLocalTemplate(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'saving':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <CloudOff className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saved':
        return lastSaved ? `Sauvegardé à ${lastSaved.toLocaleTimeString()}` : 'Sauvegardé';
      case 'saving':
        return 'Sauvegarde en cours...';
      case 'error':
        return 'Erreur de sauvegarde';
      case 'pending':
        return 'Modifications non sauvegardées';
      default:
        return '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Éditeur avec Sauvegarde Automatique
          <Badge variant={saveStatus === 'saved' ? 'default' : 'secondary'}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </CardTitle>
        <Button
          onClick={handleManualSave}
          disabled={isSaving || !isDirty}
          size="sm"
        >
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder manuellement
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nom du template</Label>
            <Input
              id="template-name"
              value={localTemplate.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Nom du template"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              value={localTemplate.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Description du template"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">Configuration Auto-Save</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Intervalle: {autoSaveInterval / 1000}s</span>
            <span>•</span>
            <span>{isDirty ? 'Modifications en attente' : 'Tout est sauvegardé'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};