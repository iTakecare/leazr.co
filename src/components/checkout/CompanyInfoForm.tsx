
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Building, Loader2 } from 'lucide-react';
import { clientService } from '@/services/clientService';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface CompanyFormData {
  company: string;
  vat_number: string;
  company_verified: boolean;
  is_vat_exempt: boolean;
  country: string;
}

interface CompanyInfoFormProps {
  formData: CompanyFormData;
  updateFormData: (data: Partial<CompanyFormData>) => void;
  onNext: () => void;
}

// Définir les formats de numéro d'entreprise par pays
const idFormats = {
  BE: {
    label: "Numéro d'entreprise",
    example: "BE0123456789",
    format: "BE0123456789 (sans espaces)"
  },
  FR: {
    label: "Numéro SIREN/SIRET",
    example: "FR12345678900012",
    format: "FR + SIRET (14 chiffres) ou SIREN (9 chiffres)"
  },
  LU: {
    label: "Numéro d'identification",
    example: "LU12345678",
    format: "LU + 8 chiffres"
  }
};

const CompanyInfoForm: React.FC<CompanyInfoFormProps> = ({ formData, updateFormData, onNext }) => {
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();
  const [country, setCountry] = useState(formData.country || 'BE');

  const handleCountryChange = (value: string) => {
    setCountry(value);
    updateFormData({ country: value });
  };

  const handleVerifyVAT = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Si exempté de TVA et le nom de l'entreprise est renseigné, passer à l'étape suivante
    if (formData.is_vat_exempt && formData.company.trim()) {
      onNext();
      return;
    }

    // Sinon, vérifier le numéro de TVA/entreprise
    if (!formData.vat_number.trim()) {
      toast({
        title: "Champ obligatoire",
        description: `Veuillez entrer votre ${idFormats[country as keyof typeof idFormats].label}`,
        variant: "destructive"
      });
      return;
    }

    setVerifying(true);
    try {
      // Attempt to verify the VAT/business number
      console.log(`Verifying VAT number: ${formData.vat_number}`);
      const result = await clientService.verifyVatNumber(formData.vat_number);
      
      if (result.valid) {
        updateFormData({
          company_verified: true,
          company: result.companyName || formData.company
        });
        
        toast({
          title: "Vérification réussie",
          description: `Le ${idFormats[country as keyof typeof idFormats].label} a été vérifié avec succès.`,
          variant: "default"
        });
        
        // Proceed to next step
        onNext();
      } else {
        toast({
          title: "Vérification échouée",
          description: result.error || `Le ${idFormats[country as keyof typeof idFormats].label} n'a pas pu être vérifié. Veuillez vérifier et réessayer.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error verifying business ID:", error);
      toast({
        title: "Erreur de vérification",
        description: `Une erreur est survenue lors de la vérification du ${idFormats[country as keyof typeof idFormats].label}.`,
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <form onSubmit={handleVerifyVAT} className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Informations de votre entreprise</h2>
        <p className="text-gray-600">Veuillez compléter les informations ci-dessous pour continuer</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="country">Pays</Label>
          <Select 
            value={country} 
            onValueChange={handleCountryChange}
          >
            <SelectTrigger id="country" className="w-full">
              <SelectValue placeholder="Sélectionnez votre pays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BE">Belgique</SelectItem>
              <SelectItem value="FR">France</SelectItem>
              <SelectItem value="LU">Luxembourg</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="is_vat_exempt" 
            checked={formData.is_vat_exempt}
            onCheckedChange={(checked) => {
              updateFormData({ is_vat_exempt: checked === true });
            }}
          />
          <Label htmlFor="is_vat_exempt" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Mon entreprise n'est pas assujettie à la TVA
          </Label>
        </div>

        {!formData.is_vat_exempt && (
          <div className="space-y-2">
            <Label htmlFor="vat_number">{idFormats[country as keyof typeof idFormats].label} *</Label>
            <Input
              id="vat_number"
              placeholder={idFormats[country as keyof typeof idFormats].example}
              value={formData.vat_number}
              onChange={(e) => updateFormData({ vat_number: e.target.value })}
              required={!formData.is_vat_exempt}
              disabled={formData.is_vat_exempt}
            />
            <p className="text-sm text-gray-500">
              Format: {idFormats[country as keyof typeof idFormats].format}
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="company">Nom de l'entreprise {formData.is_vat_exempt && "*"}</Label>
          <div className="relative">
            <Input
              id="company"
              placeholder="Nom de votre entreprise"
              value={formData.company}
              onChange={(e) => updateFormData({ company: e.target.value })}
              className="pl-10"
              required={formData.is_vat_exempt}
            />
            <Building className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          {!formData.is_vat_exempt && (
            <p className="text-sm text-gray-500">
              Sera complété automatiquement après vérification
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={verifying || (!formData.is_vat_exempt && !formData.vat_number.trim()) || (formData.is_vat_exempt && !formData.company.trim())}
          className="min-w-[120px]"
        >
          {verifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Vérification...
            </>
          ) : (
            'Continuer'
          )}
        </Button>
      </div>
    </form>
  );
};

export default CompanyInfoForm;
