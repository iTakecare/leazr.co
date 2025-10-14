import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { FileText, Save, Eye } from 'lucide-react';
import { useCompanyTemplateSettings } from '@/hooks/useCompanyTemplateSettings';
import { PDF_TEMPLATES } from '@/components/offer/pdf/templates';
import { useNavigate } from 'react-router-dom';

const OfferTemplateSettings = () => {
  const { defaultTemplateId, customizations, saveSettings, loading, company } = useCompanyTemplateSettings();
  const navigate = useNavigate();

  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplateId);
  const [localCustomizations, setLocalCustomizations] = useState(customizations);

  React.useEffect(() => {
    setSelectedTemplate(defaultTemplateId);
    setLocalCustomizations(customizations);
  }, [defaultTemplateId, customizations]);

  const handleSave = async () => {
    await saveSettings(selectedTemplate, localCustomizations);
  };

  const handleTestTemplate = () => {
    // Navigate to offer creation with the selected template pre-filled
    navigate('/offers/new');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates d'offres disponibles
          </CardTitle>
          <CardDescription>
            Choisissez le template par défaut pour vos offres et personnalisez l'apparence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Sélectionner le template par défaut</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(PDF_TEMPLATES).map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate === template.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="text-4xl text-center">{template.thumbnail}</div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-center">{template.name}</h3>
                      <p className="text-sm text-muted-foreground text-center">
                        {template.description}
                      </p>
                    </div>
                    {selectedTemplate === template.id && (
                      <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                        ✓ Template par défaut
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Customization Options */}
          <div className="space-y-4 pt-6 border-t">
            <Label className="text-base font-semibold">Personnalisation globale</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Couleur primaire</Label>
                <Input
                  id="primary-color"
                  type="color"
                  value={localCustomizations.primaryColor || company?.primary_color || '#3b82f6'}
                  onChange={(e) =>
                    setLocalCustomizations({ ...localCustomizations, primaryColor: e.target.value })
                  }
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-color">Couleur secondaire</Label>
                <Input
                  id="secondary-color"
                  type="color"
                  value={localCustomizations.secondaryColor || company?.secondary_color || '#64748b'}
                  onChange={(e) =>
                    setLocalCustomizations({ ...localCustomizations, secondaryColor: e.target.value })
                  }
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="show-logo" className="cursor-pointer">
                Afficher le logo par défaut
              </Label>
              <Switch
                id="show-logo"
                checked={localCustomizations.showLogo ?? true}
                onCheckedChange={(checked) =>
                  setLocalCustomizations({ ...localCustomizations, showLogo: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="show-footer" className="cursor-pointer">
                Afficher le pied de page
              </Label>
              <Switch
                id="show-footer"
                checked={localCustomizations.showFooter ?? true}
                onCheckedChange={(checked) =>
                  setLocalCustomizations({ ...localCustomizations, showFooter: checked })
                }
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
            </Button>
            
            <Button variant="outline" onClick={handleTestTemplate} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Tester dans une offre
            </Button>
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">ℹ️ Comment ça marche ?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Le template sélectionné sera utilisé par défaut pour toutes les nouvelles offres</li>
              <li>Les couleurs définies ici seront appliquées automatiquement</li>
              <li>Vous pourrez toujours changer le template lors de la création d'une offre (étape "Design de l'offre")</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfferTemplateSettings;
