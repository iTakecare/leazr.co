
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Loader2, X, Plus, Trash2 } from "lucide-react";
import { Leaser } from "@/types/equipment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Range {
  id: string;
  min: number;
  max: number;
  coefficient: number;
}

interface LeaserFormProps {
  currentLeaser: Leaser | null;
  isEditMode: boolean;
  onSave: (leaser: Omit<Leaser, "id">) => Promise<void>;
  onCancel: () => void;
}

const LeaserForm = ({ currentLeaser, isEditMode, onSave, onCancel }: LeaserFormProps) => {
  const [tempRanges, setTempRanges] = useState<Range[]>(
    currentLeaser?.ranges && currentLeaser.ranges.length > 0
      ? [...currentLeaser.ranges]
      : [{ id: crypto.randomUUID(), min: 0, max: 0, coefficient: 0 }]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLeaser?.logo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRangeChange = (index: number, field: keyof Range, value: number) => {
    const newRanges = [...tempRanges];
    
    if (field === 'min' || field === 'max' || field === 'coefficient') {
      newRanges[index][field] = value;
    }
    
    setTempRanges(newRanges);
  };
  
  const handleAddRange = () => {
    const lastRange = tempRanges[tempRanges.length - 1];
    setTempRanges([
      ...tempRanges,
      {
        id: crypto.randomUUID(),
        min: lastRange.max + 0.01,
        max: lastRange.max + 5000,
        coefficient: lastRange.coefficient
      }
    ]);
  };
  
  const handleRemoveRange = (index: number) => {
    if (tempRanges.length > 1) {
      const newRanges = [...tempRanges];
      newRanges.splice(index, 1);
      setTempRanges(newRanges);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse. Maximum 2MB autorisé");
      return;
    }

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = fileName;
      
      // 1. Créer un objet FormData pour gérer correctement le type du fichier
      const formData = new FormData();
      formData.append('file', file);
      
      // 2. Utiliser fetch au lieu de l'API supabase directe pour un meilleur contrôle
      const uploadResponse = await fetch(
        `${supabase.storageUrl}/object/leaser-logos/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            // Ne pas définir Content-Type ici pour que fetch définisse la bonne frontière multipart
          },
          body: formData
        }
      );
      
      if (!uploadResponse.ok) {
        throw new Error(`Erreur de téléchargement: ${await uploadResponse.text()}`);
      }
      
      // 3. Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('leaser-logos')
        .getPublicUrl(filePath);
      
      console.log("Logo téléchargé avec succès:", publicUrl);
      setPreviewUrl(publicUrl);
      
      toast.success("Logo téléchargé avec succès");
    } catch (error: any) {
      console.error("Erreur lors du téléchargement du logo:", error);
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setPreviewUrl(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      setIsSaving(true);
      
      const leaserData: Omit<Leaser, "id"> = {
        name: formData.get("name") as string,
        logo_url: previewUrl,
        ranges: tempRanges
      };
      
      await onSave(leaserData);
    } catch (error: any) {
      console.error("Error saving leaser:", error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du leaser</Label>
          <Input 
            id="name" 
            name="name" 
            defaultValue={currentLeaser?.name || ""}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="logo_url">Logo du leaser</Label>
          <div className="mt-2">
            {previewUrl ? (
              <div className="relative w-full h-32 border rounded-md overflow-hidden mb-2 bg-white p-4 flex items-center justify-center">
                <img 
                  src={previewUrl} 
                  alt="Logo preview" 
                  className="max-w-full max-h-full object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleRemoveLogo}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-md p-4 cursor-pointer hover:border-primary transition-colors"
                   onClick={handleLogoClick}>
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                )}
                <p className="text-sm text-gray-500">
                  {isUploading ? "Téléchargement en cours..." : "Cliquez pour télécharger un logo"}
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
        </div>
        
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label>Tranches de coefficients</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleAddRange}
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          </div>
          
          <div className="space-y-3 mt-3">
            {tempRanges.map((range, index) => (
              <div key={range.id} className="flex gap-2">
                <div className="flex flex-col space-y-1 w-1/3">
                  <label className="text-xs text-muted-foreground">Min (€)</label>
                  <Input 
                    type="number"
                    value={range.min}
                    onChange={(e) => handleRangeChange(index, 'min', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1 w-1/3">
                  <label className="text-xs text-muted-foreground">Max (€)</label>
                  <Input 
                    type="number"
                    value={range.max}
                    onChange={(e) => handleRangeChange(index, 'max', parseFloat(e.target.value))}
                    min={range.min + 0.01}
                    step="0.01"
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1 w-1/3">
                  <label className="text-xs text-muted-foreground">Coefficient</label>
                  <Input 
                    type="number"
                    value={range.coefficient}
                    onChange={(e) => handleRangeChange(index, 'coefficient', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemoveRange(index)}
                  disabled={tempRanges.length <= 1}
                  className="mt-auto h-10 w-10 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSaving || isUploading}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSaving || isUploading}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEditMode ? 'Enregistrement...' : 'Ajout...'}
            </>
          ) : (
            isEditMode ? 'Enregistrer' : 'Ajouter'
          )}
        </Button>
      </div>
    </form>
  );
};

export default LeaserForm;
