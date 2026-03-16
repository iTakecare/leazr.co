
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Building, Mail } from 'lucide-react';
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
  email?: string;
  address?: string;
  city?: string;
  postal_code?: string;
}

interface CompanyInfoFormProps {
  formData: CompanyFormData;
  updateFormData: (data: Partial<CompanyFormData>) => void;
  onNext: () => void;
}

const idFormats = {
  BE: {
    label: "Numéro d'entreprise",
    example: "0123456789",
    format: "0123456789 (sans espaces)"
  },
  FR: {
    label: "Numéro SIREN/SIRET",
    example: "12345678900012",
    format: "SIRET (14 chiffres) ou SIREN (9 chiffres)"
  },
  LU: {
    label: "Numéro d'identification",
    example: "12345678",
    format: "8 chiffres"
  }
};

const CompanyInfoForm: React.FC<CompanyInfoFormProps> = ({ formData, updateFormData, onNext }) => {
  const { toast } = useToast();
  const [country, setCountry] = useState(formData.country || 'BE');

  const handleCountryChange = (value: string) => {
    setCountry(value);
    updateFormData({ country: value });
    
    if (value !== 'BE' && formData.is_vat_exempt) {
      updateFormData({ is_vat_exempt: false });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company.trim()) {
      toast({
        title: "Champ obligatoire",
        description: "Veuillez entrer le nom de votre entreprise",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email?.trim()) {
      toast({
        title: "Champ obligatoire",
        description: "Veuillez entrer votre email professionnel",
        variant: "destructive"
      });
      return;
    }

    onNext();
  };

  const showVatExemptOption = country === 'BE';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        
        <div className="space-y-2">
          <Label htmlFor="vat_number">{idFormats[country as keyof typeof idFormats].label}</Label>
          <Input
            id="vat_number"
            placeholder={idFormats[country as keyof typeof idFormats].example}
            value={formData.vat_number}
            onChange={(e) => updateFormData({ vat_number: e.target.value })}
          />
          <p className="text-sm text-gray-500">
            Format: {idFormats[country as keyof typeof idFormats].format}
          </p>
        </div>

        {showVatExemptOption && (
          <div className="flex items-center space-x-2 pl-1">
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
        )}
        
        <div className="space-y-2">
          <Label htmlFor="company">Nom de l'entreprise *</Label>
          <div className="relative">
            <Input
              id="company"
              placeholder="Nom de votre entreprise"
              value={formData.company}
              onChange={(e) => updateFormData({ company: e.target.value })}
              className="pl-10"
              required={true}
            />
            <Building className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email professionnel *</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="nom@entreprise.com"
              value={formData.email || ''}
              onChange={(e) => updateFormData({ email: e.target.value })}
              className="pl-10"
              required={true}
            />
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={!formData.company.trim() || !formData.email?.trim()}
          className="min-w-[120px]"
        >
          Continuer
        </Button>
      </div>
    </form>
  );
};

export default CompanyInfoForm;
