import React, { useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { optimizeImageForPdf, imageToDataUrl, getImageDimensions } from '@/services/imageOptimizationService';
import { toast } from 'sonner';

interface ImageUploaderProps {
  value?: {
    url: string;
    opacity?: number;
    fit?: 'cover' | 'contain' | 'fill';
  };
  onChange: (value: {
    url: string;
    opacity?: number;
    fit?: 'cover' | 'contain' | 'fill';
  } | undefined) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 5MB)');
      return;
    }

    setIsProcessing(true);
    try {
      // Get original dimensions
      const dimensions = await getImageDimensions(file);
      console.log('Image originale:', dimensions);

      // Optimize image
      const optimizedFile = await optimizeImageForPdf(file, { targetQuality: 'web' });
      
      // Convert to data URL
      const dataUrl = await imageToDataUrl(optimizedFile);

      onChange({
        url: dataUrl,
        opacity: value?.opacity || 100,
        fit: value?.fit || 'cover'
      });

      toast.success('Image importée avec succès');
    } catch (error: any) {
      console.error('Error processing image:', error);
      toast.error('Erreur lors du traitement de l\'image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    onChange(undefined);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Image de fond</Label>
        <p className="text-sm text-muted-foreground">
          Format A4 recommandé : 1240x1754px (150 DPI) ou 2480x3508px (300 DPI)
        </p>
      </div>

      {value?.url ? (
        <div className="space-y-4">
          <div className="relative border rounded-lg overflow-hidden">
            <img 
              src={value.url} 
              alt="Aperçu" 
              className="w-full h-auto"
              style={{ opacity: (value.opacity || 100) / 100 }}
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Opacité : {value.opacity || 100}%</Label>
            <input
              type="range"
              min="0"
              max="100"
              value={value.opacity || 100}
              onChange={(e) => onChange({ ...value, opacity: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Ajustement</Label>
            <select
              value={value.fit || 'cover'}
              onChange={(e) => onChange({ ...value, fit: e.target.value as any })}
              className="w-full border rounded-md p-2"
            >
              <option value="cover">Couvrir (Cover)</option>
              <option value="contain">Contenir (Contain)</option>
              <option value="fill">Remplir (Fill)</option>
            </select>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
                <p className="text-sm text-muted-foreground">Traitement en cours...</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Cliquez pour importer</span> ou glissez-déposez
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG (max 5MB)
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      )}
    </div>
  );
};
