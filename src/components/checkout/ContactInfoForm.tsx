
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, UserRound, Phone, Mail } from 'lucide-react';

interface ContactFormData {
  name: string;
  phone: string;
  email?: string;
  has_client_account: boolean;
}

interface ContactInfoFormProps {
  formData: ContactFormData;
  updateFormData: (data: Partial<ContactFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  initialEmail?: string;
}

const ContactInfoForm: React.FC<ContactInfoFormProps> = ({ formData, updateFormData, onNext, onBack, initialEmail }) => {
  React.useEffect(() => {
    // If email is not set in contactFormData but we have an initialEmail, set it
    if (!formData.email && initialEmail) {
      updateFormData({ email: initialEmail });
    }
  }, [initialEmail, formData.email, updateFormData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Informations de contact</h2>
        <p className="text-gray-600">Veuillez compléter les informations ci-dessous pour continuer</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom complet *</Label>
          <div className="relative">
            <Input
              id="name"
              placeholder="Jean Dupont"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              className="pl-10"
              required
            />
            <UserRound className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="nom@entreprise.com"
              value={formData.email || ''}
              onChange={(e) => updateFormData({ email: e.target.value })}
              className="pl-10"
              required
            />
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <div className="relative">
            <Input
              id="phone"
              placeholder="+33 6 12 34 56 78"
              value={formData.phone}
              onChange={(e) => updateFormData({ phone: e.target.value })}
              className="pl-10"
            />
            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox 
            id="has_client_account"
            checked={formData.has_client_account}
            onCheckedChange={(checked) => {
              updateFormData({ has_client_account: checked === true });
            }}
          />
          <Label htmlFor="has_client_account" className="text-sm">
            Je souhaite créer un compte client pour suivre mes demandes
          </Label>
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex items-center"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour
        </Button>
        
        <Button 
          type="submit"
          disabled={!formData.name || !formData.email}
        >
          Continuer
        </Button>
      </div>
    </form>
  );
};

export default ContactInfoForm;
