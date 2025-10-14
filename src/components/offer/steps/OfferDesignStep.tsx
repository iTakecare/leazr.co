import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PdfTemplateSelector } from '../pdf/PdfTemplateSelector';
import { PdfPreview } from '../pdf/PdfPreview';
import { Palette, Image as ImageIcon } from 'lucide-react';

interface OfferDesignStepProps {
  offerId?: string;
  formData: any;
  updateFormData: (section: string, data: any) => void;
}

const OfferDesignStep: React.FC<OfferDesignStepProps> = ({
  offerId,
  formData,
  updateFormData,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(
    formData.design?.templateId || 'classic-business'
  );
  
  const [customizations, setCustomizations] = useState(
    formData.design?.customizations || {
      showLogo: true,
      showFooter: true,
    }
  );

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    updateFormData('design', {
      templateId,
      customizations,
    });
  };

  const handleCustomizationChange = (key: string, value: any) => {
    const newCustomizations = {
      ...customizations,
      [key]: value,
    };
    setCustomizations(newCustomizations);
    updateFormData('design', {
      templateId: selectedTemplate,
      customizations: newCustomizations,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Design de l'offre</h2>
        <p className="text-muted-foreground">
          Choisissez le template et personnalisez l'apparence de votre offre PDF
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Template Selection & Customizations */}
        <div className="space-y-6">
          {/* Template Selector */}
          <PdfTemplateSelector
            selectedTemplateId={selectedTemplate}
            onSelectTemplate={handleTemplateChange}
          />

          {/* Customizations */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Personnalisation</h3>
              </div>

              <div className="space-y-4">
                {/* Show Logo */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-logo">Afficher le logo</Label>
                    <p className="text-sm text-muted-foreground">
                      Affiche le logo de votre entreprise dans l'en-tête
                    </p>
                  </div>
                  <Switch
                    id="show-logo"
                    checked={customizations.showLogo}
                    onCheckedChange={(checked) =>
                      handleCustomizationChange('showLogo', checked)
                    }
                  />
                </div>

                {/* Show Footer */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-footer">Afficher le pied de page</Label>
                    <p className="text-sm text-muted-foreground">
                      Affiche les mentions légales en bas du document
                    </p>
                  </div>
                  <Switch
                    id="show-footer"
                    checked={customizations.showFooter}
                    onCheckedChange={(checked) =>
                      handleCustomizationChange('showFooter', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: PDF Preview */}
        <div>
          {offerId ? (
            <PdfPreview
              offerId={offerId}
              templateId={selectedTemplate}
              customizations={customizations}
            />
          ) : (
            <Card className="p-6">
              <div className="flex flex-col items-center justify-center h-[600px] text-center">
                <ImageIcon className="w-12 h-12 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  L'aperçu sera disponible après la création de l'offre
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfferDesignStep;
