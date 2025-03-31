
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, UserRound, Phone, Mail, Building, MapPin } from 'lucide-react';

interface ContactFormData {
  name: string;
  phone: string;
  email?: string;
  has_client_account: boolean;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  has_different_shipping_address?: boolean;
  shipping_address?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
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

        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">Adresse de facturation</h3>
          
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <div className="relative">
              <Input
                id="address"
                placeholder="123 Rue de la Paix"
                value={formData.address || ''}
                onChange={(e) => updateFormData({ address: e.target.value })}
                className="pl-10"
              />
              <Building className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                placeholder="Paris"
                value={formData.city || ''}
                onChange={(e) => updateFormData({ city: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="postal_code">Code postal</Label>
              <Input
                id="postal_code"
                placeholder="75000"
                value={formData.postal_code || ''}
                onChange={(e) => updateFormData({ postal_code: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2 mt-3">
            <Label htmlFor="country">Pays</Label>
            <Input
              id="country"
              placeholder="France"
              value={formData.country || ''}
              onChange={(e) => updateFormData({ country: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <Switch
              id="different-shipping"
              checked={formData.has_different_shipping_address || false}
              onCheckedChange={(checked) => {
                updateFormData({ has_different_shipping_address: checked });
              }}
            />
            <Label htmlFor="different-shipping" className="text-sm">
              Adresse de livraison différente
            </Label>
          </div>
        </div>
        
        {formData.has_different_shipping_address && (
          <div className="border rounded-md p-4 mt-3 bg-gray-50">
            <h3 className="font-medium mb-3">Adresse de livraison</h3>
            
            <div className="space-y-2">
              <Label htmlFor="shipping_address">Adresse de livraison</Label>
              <div className="relative">
                <Input
                  id="shipping_address"
                  placeholder="123 Rue de la Livraison"
                  value={formData.shipping_address || ''}
                  onChange={(e) => updateFormData({ shipping_address: e.target.value })}
                  className="pl-10"
                />
                <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-2">
                <Label htmlFor="shipping_city">Ville</Label>
                <Input
                  id="shipping_city"
                  placeholder="Paris"
                  value={formData.shipping_city || ''}
                  onChange={(e) => updateFormData({ shipping_city: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shipping_postal_code">Code postal</Label>
                <Input
                  id="shipping_postal_code"
                  placeholder="75000"
                  value={formData.shipping_postal_code || ''}
                  onChange={(e) => updateFormData({ shipping_postal_code: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2 mt-3">
              <Label htmlFor="shipping_country">Pays</Label>
              <Input
                id="shipping_country"
                placeholder="France"
                value={formData.shipping_country || ''}
                onChange={(e) => updateFormData({ shipping_country: e.target.value })}
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-2 pt-4">
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
