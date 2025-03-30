
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Building, Loader2 } from 'lucide-react';
import { clientService } from '@/services/clientService';

interface CompanyInfoFormProps {
  formData: {
    company: string;
    vat_number: string;
    company_verified: boolean;
  };
  updateFormData: (data: Partial<{ company: string; vat_number: string; company_verified: boolean; }>) => void;
  onNext: () => void;
}

const CompanyInfoForm: React.FC<CompanyInfoFormProps> = ({ formData, updateFormData, onNext }) => {
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerifyVAT = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vat_number.trim()) {
      toast({
        title: "Champ obligatoire",
        description: "Veuillez entrer votre numéro de TVA",
        variant: "destructive"
      });
      return;
    }

    setVerifying(true);
    try {
      // Attempt to verify the VAT number
      console.log("Verifying VAT number:", formData.vat_number);
      const result = await clientService.verifyVatNumber(formData.vat_number);
      
      if (result.valid) {
        updateFormData({
          company_verified: true,
          company: result.companyName || formData.company
        });
        
        toast({
          title: "TVA vérifiée",
          description: "Le numéro de TVA a été vérifié avec succès.",
          variant: "default"
        });
        
        // Proceed to next step
        onNext();
      } else {
        toast({
          title: "TVA invalide",
          description: "Le numéro de TVA n'a pas pu être vérifié. Veuillez vérifier et réessayer.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error verifying VAT:", error);
      toast({
        title: "Erreur de vérification",
        description: "Une erreur est survenue lors de la vérification du numéro de TVA.",
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
        <p className="text-gray-600">Veuillez entrer votre numéro de TVA pour continuer</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vat_number">Numéro de TVA *</Label>
          <Input
            id="vat_number"
            placeholder="BE0123456789"
            value={formData.vat_number}
            onChange={(e) => updateFormData({ vat_number: e.target.value })}
            required
          />
          <p className="text-sm text-gray-500">
            Format: BE0123456789 (sans espaces)
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="company">Nom de l'entreprise</Label>
          <div className="relative">
            <Input
              id="company"
              placeholder="Nom de votre entreprise"
              value={formData.company}
              onChange={(e) => updateFormData({ company: e.target.value })}
              className="pl-10"
            />
            <Building className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">
            Sera complété automatiquement après vérification de la TVA
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={verifying || !formData.vat_number.trim()}
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
