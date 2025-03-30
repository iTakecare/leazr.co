
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

interface ContactInfoFormProps {
  formData: ContactFormData;
  updateFormData: (data: Partial<ContactFormData>) => void;
  onPrev: () => void;
  onNext: () => void;
}

const ContactInfoForm: React.FC<ContactInfoFormProps> = ({ formData, updateFormData, onPrev, onNext }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!formData.name || formData.name.trim().length < 2) {
      toast.error("Veuillez entrer un nom complet valide (minimum 2 caractères)");
      return;
    }
    
    if (!formData.email || !formData.email.trim()) {
      toast.error("Veuillez entrer votre adresse email");
      return;
    }
    
    // More comprehensive email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }
    
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Vos coordonnées</h2>
        <p className="text-gray-600">Veuillez entrer vos informations de contact</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom et prénom *</Label>
          <div className="relative">
            <Input
              id="name"
              placeholder="Votre nom complet"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              required
              className="pl-10"
            />
            <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email professionnel *</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              required
              className="pl-10"
            />
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <div className="relative">
            <Input
              id="phone"
              type="tel"
              placeholder="+32 123 45 67 89"
              value={formData.phone}
              onChange={(e) => updateFormData({ phone: e.target.value })}
              className="pl-10"
            />
            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="message">Message (optionnel)</Label>
          <Textarea
            id="message"
            placeholder="Informations supplémentaires concernant votre demande..."
            value={formData.message}
            onChange={(e) => updateFormData({ message: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrev}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        
        <Button 
          type="submit" 
          disabled={!formData.name.trim() || !formData.email.trim()}
          className="min-w-[120px]"
        >
          Continuer
        </Button>
      </div>
    </form>
  );
};

export default ContactInfoForm;
