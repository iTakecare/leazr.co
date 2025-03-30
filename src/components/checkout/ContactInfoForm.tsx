
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';

interface ContactInfoFormProps {
  formData: {
    name: string;
    email: string;
    phone: string;
    message: string;
  };
  updateFormData: (data: Partial<{ name: string; email: string; phone: string; message: string; }>) => void;
  onPrev: () => void;
  onNext: () => void;
}

const ContactInfoForm: React.FC<ContactInfoFormProps> = ({ 
  formData, 
  updateFormData, 
  onPrev, 
  onNext 
}) => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.name.trim()) {
      toast({
        title: "Champ obligatoire",
        description: "Veuillez entrer votre nom",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive"
      });
      return;
    }

    // All good, move to next step
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
          <Input
            id="name"
            placeholder="Votre nom complet"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email professionnel *</Label>
          <Input
            id="email"
            type="email"
            placeholder="votre@email.com"
            value={formData.email}
            onChange={(e) => updateFormData({ email: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+32 123 45 67 89"
            value={formData.phone}
            onChange={(e) => updateFormData({ phone: e.target.value })}
          />
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
