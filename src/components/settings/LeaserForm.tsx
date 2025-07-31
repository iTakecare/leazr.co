
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Image as ImageIcon, Loader2, X, Plus, Trash2, Search, Check, AlertCircle } from "lucide-react";
import { Leaser, DurationCoefficient } from "@/types/equipment";
import { supabase, STORAGE_URL, SUPABASE_KEY } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { verifyVatNumber } from "@/services/clientService";
import LeaserDurationMatrix from "@/components/leasers/LeaserDurationMatrix";

interface ExtendedRange {
  id: string;
  min: number;
  max: number;
  coefficient: number;
  duration_coefficients?: DurationCoefficient[];
}

interface LeaserFormProps {
  currentLeaser: Leaser | null;
  isEditMode: boolean;
  onSave: (leaser: Omit<Leaser, "id">) => Promise<void>;
  onCancel: () => void;
}

const LeaserForm = ({ currentLeaser, isEditMode, onSave, onCancel }: LeaserFormProps) => {
  const [tempRanges, setTempRanges] = useState<ExtendedRange[]>(
    currentLeaser?.ranges && currentLeaser.ranges.length > 0
      ? currentLeaser.ranges.map(r => ({ 
          id: r.id, 
          min: r.min, 
          max: r.max, 
          coefficient: r.coefficient || 3.55,
          duration_coefficients: r.duration_coefficients
        }))
      : [{ id: crypto.randomUUID(), min: 0, max: 0, coefficient: 0 }]
  );
  const [useDurationBasedCoefficients, setUseDurationBasedCoefficients] = useState(
    (currentLeaser as any)?.use_duration_coefficients || false
  );
  const [availableDurations, setAvailableDurations] = useState<number[]>(
    currentLeaser?.available_durations || [12, 18, 24, 36, 48, 60, 72]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLeaser?.logo_url || null);
  const [isVerifyingVies, setIsVerifyingVies] = useState(false);
  const [viesData, setViesData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleRangeChange = (index: number, field: keyof ExtendedRange, value: number) => {
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

  const handleDurationChange = (duration: number, checked: boolean) => {
    if (checked) {
      setAvailableDurations([...availableDurations, duration].sort((a, b) => a - b));
    } else {
      setAvailableDurations(availableDurations.filter(d => d !== duration));
    }
  };

  const handleDurationCoefficientChange = (rangeId: string, duration: number, coefficient: number) => {
    setTempRanges(prevRanges => 
      prevRanges.map(range => {
        if (range.id === rangeId) {
          const durationCoeffs = range.duration_coefficients || [];
          const existingIndex = durationCoeffs.findIndex(dc => dc.duration_months === duration);
          
          if (existingIndex >= 0) {
            durationCoeffs[existingIndex].coefficient = coefficient;
          } else {
            durationCoeffs.push({ duration_months: duration, coefficient });
          }
          
          return { ...range, duration_coefficients: durationCoeffs };
        }
        return range;
      })
    );
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
        `${STORAGE_URL}/object/leaser-logos/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
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

  const handleViesVerification = async () => {
    if (!formRef.current) return;
    
    const formData = new FormData(formRef.current);
    const vatNumber = formData.get("vat_number") as string;
    const country = formData.get("country") as string || 'BE';
    
    if (!vatNumber || vatNumber.trim() === '') {
      toast.error("Veuillez saisir un numéro de TVA");
      return;
    }

    setIsVerifyingVies(true);
    
    try {
      const result = await verifyVatNumber(vatNumber.trim(), country);
      
      if (result.valid && result.companyName) {
        setViesData(result);
        
        // Parse address if available
        let addressData = { streetAddress: '', city: '', postalCode: '', country: '' };
        if (result.addressParsed) {
          addressData = result.addressParsed;
        } else if (result.address) {
          // Simple parsing fallback
          const addressParts = result.address.split(',').map((part: string) => part.trim());
          if (addressParts.length >= 2) {
            addressData.streetAddress = addressParts[0];
            const postalMatch = result.address.match(/\b\d{4,6}\b/);
            if (postalMatch) {
              addressData.postalCode = postalMatch[0];
              addressData.city = result.address.replace(addressData.streetAddress, '').replace(addressData.postalCode, '').replace(/[,\s]+/g, ' ').trim();
            } else {
              addressData.city = addressParts[1];
            }
          }
        }

        // Update form fields
        if (formRef.current) {
          const form = formRef.current;
          
          // Company name from VIES
          const companyNameField = form.querySelector('[name="company_name"]') as HTMLInputElement;
          if (companyNameField && result.companyName) {
            companyNameField.value = result.companyName;
          }
          
          // Address fields
          if (addressData.streetAddress) {
            const addressField = form.querySelector('[name="address"]') as HTMLInputElement;
            if (addressField) addressField.value = addressData.streetAddress;
          }
          
          if (addressData.city) {
            const cityField = form.querySelector('[name="city"]') as HTMLInputElement;
            if (cityField) cityField.value = addressData.city;
          }
          
          if (addressData.postalCode) {
            const postalField = form.querySelector('[name="postal_code"]') as HTMLInputElement;
            if (postalField) postalField.value = addressData.postalCode;
          }
          
          if (addressData.country) {
            const countryField = form.querySelector('[name="country"]') as HTMLInputElement;
            if (countryField) countryField.value = addressData.country;
          }
        }
        
        toast.success(`Données VIES récupérées pour ${result.companyName}`);
      } else if (!result.valid) {
        toast.error("Numéro de TVA invalide selon VIES");
        setViesData(null);
      } else {
        toast.error("Aucune donnée d'entreprise trouvée");
        setViesData(null);
      }
    } catch (error) {
      console.error('Erreur VIES:', error);
      toast.error("Erreur lors de la vérification VIES");
      setViesData(null);
    } finally {
      setIsVerifyingVies(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      setIsSaving(true);
      
      const leaserData: Omit<Leaser, "id"> & { use_duration_coefficients: boolean } = {
        name: formData.get("name") as string,
        company_name: formData.get("company_name") as string || undefined,
        logo_url: previewUrl,
        address: formData.get("address") as string || undefined,
        city: formData.get("city") as string || undefined,
        postal_code: formData.get("postal_code") as string || undefined,
        country: formData.get("country") as string || undefined,
        vat_number: formData.get("vat_number") as string || undefined,
        phone: formData.get("phone") as string || undefined,
        email: formData.get("email") as string || undefined,
        available_durations: availableDurations,
        ranges: tempRanges,
        use_duration_coefficients: useDurationBasedCoefficients
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
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-6">
      <div className="space-y-6">
        {/* Informations générales */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informations générales</h3>
          <div className="space-y-2">
            <Label htmlFor="name">Nom du leaser</Label>
            <Input 
              id="name" 
              name="name" 
              defaultValue={currentLeaser?.name || ""}
              required
              placeholder="ex: Mon Bailleur SRL"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom commercial</Label>
            <Input 
              id="company_name" 
              name="company_name" 
              defaultValue={currentLeaser?.company_name || ""}
              placeholder="ex: Mon Bailleur"
            />
            <p className="text-xs text-muted-foreground">
              Nom utilisé pour la correspondance avec les contrats
            </p>
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
        </div>
        
        {/* Informations de contact */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informations de contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email"
                defaultValue={currentLeaser?.email || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input 
                id="phone" 
                name="phone" 
                defaultValue={currentLeaser?.phone || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_number">Numéro de TVA</Label>
              <div className="flex gap-2">
                <Input 
                  id="vat_number" 
                  name="vat_number" 
                  defaultValue={currentLeaser?.vat_number || ""}
                  placeholder="BE1234567890"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleViesVerification}
                  disabled={isVerifyingVies}
                  className="flex-shrink-0"
                >
                  {isVerifyingVies ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : viesData?.valid ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">
                    {isVerifyingVies ? "Vérification..." : "VIES"}
                  </span>
                </Button>
              </div>
              {viesData?.valid && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Numéro de TVA valide - {viesData.companyName}
                </p>
              )}
              {viesData?.valid === false && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Numéro de TVA invalide
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Adresse</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Adresse complète</Label>
              <Input 
                id="address" 
                name="address" 
                defaultValue={currentLeaser?.address || ""}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input 
                  id="city" 
                  name="city" 
                  defaultValue={currentLeaser?.city || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Code postal</Label>
                <Input 
                  id="postal_code" 
                  name="postal_code" 
                  defaultValue={currentLeaser?.postal_code || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input 
                  id="country" 
                  name="country" 
                  defaultValue={currentLeaser?.country || ""}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Configuration des coefficients */}
        <div className="space-y-4 pt-2">
          <div className="space-y-3">
            <Label className="text-lg font-medium">Configuration des coefficients</Label>
            
            {/* Toggle pour choisir le type de coefficients */}
            <div className="flex items-center space-x-2">
              <Switch
                id="duration-coefficients"
                checked={useDurationBasedCoefficients}
                onCheckedChange={setUseDurationBasedCoefficients}
              />
              <Label htmlFor="duration-coefficients">Utiliser des coefficients différents selon la durée</Label>
            </div>
            
            {useDurationBasedCoefficients && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                <div className="space-y-3">
                  <Label className="font-medium">Durées de financement disponibles</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {[12, 18, 24, 36, 48, 60, 72, 84].map((duration) => (
                      <div key={duration} className="flex items-center space-x-2">
                        <Checkbox
                          id={`duration-${duration}`}
                          checked={availableDurations.includes(duration)}
                          onCheckedChange={(checked) => handleDurationChange(duration, checked as boolean)}
                        />
                        <Label htmlFor={`duration-${duration}`} className="text-sm">
                          {duration} mois
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tranches de montants</Label>
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
                  {!useDurationBasedCoefficients && (
                    <div className="flex flex-col space-y-1 w-1/3">
                      <label className="text-xs text-muted-foreground">Coefficient</label>
                      <Input 
                        type="number"
                        value={range.coefficient}
                        onChange={(e) => handleRangeChange(index, 'coefficient', parseFloat(e.target.value))}
                        min="0"
                        step="0.001"
                        required
                      />
                    </div>
                  )}
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
          
          {useDurationBasedCoefficients && availableDurations.length > 0 && (
            <div className="mt-6">
              <LeaserDurationMatrix
                ranges={tempRanges}
                availableDurations={availableDurations}
                onCoefficientChange={handleDurationCoefficientChange}
              />
            </div>
          )}
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
