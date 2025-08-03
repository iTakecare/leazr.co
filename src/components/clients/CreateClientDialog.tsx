import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAmbassadorClients } from "@/hooks/useAmbassadorClients";
import { PostalCodeInput } from "@/components/form/PostalCodeInput";

interface CreateClientDialogProps {
  onClientCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isAmbassadorMode?: boolean;
  isPartnerMode?: boolean;
}

const CreateClientDialog = ({ 
  onClientCreated, 
  open, 
  onOpenChange,
  isAmbassadorMode = false,
  isPartnerMode = false 
}: CreateClientDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { createClientAsAmbassador } = useAmbassadorClients();
  
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    vat_number: '',
    status: 'active' as 'active' | 'inactive' | 'lead',
    notes: '',
    contact_name: ''
  });

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      company: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      country: '',
      vat_number: '',
      status: 'active',
      notes: '',
      contact_name: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fullName = `${formData.first_name || ""} ${formData.last_name || ""}`.trim();
    
    if (!fullName) {
      toast.error("Le prénom ou le nom de famille est obligatoire");
      return;
    }

    setLoading(true);
    
    try {
      if (isAmbassadorMode) {
        // Mode ambassadeur - utiliser le service spécialisé
        const success = await createClientAsAmbassador({
          name: fullName,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          email: formData.email || undefined,
          company: formData.company || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          postal_code: formData.postal_code || undefined,
          country: formData.country || undefined,
          vat_number: formData.vat_number || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        });

        if (success) {
          toast.success("Client créé avec succès");
          setOpen(false);
          resetForm();
          onClientCreated?.();
        }
      } else if (isPartnerMode) {
        // Mode partenaire - création directe avec company_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user?.id)
          .single();

        if (!profile?.company_id) {
          toast.error("Impossible de déterminer l'entreprise associée");
          setLoading(false);
          return;
        }

        if (formData.email) {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('email', formData.email)
            .single();

          if (existingClient) {
            toast.error("Un client avec cet email existe déjà");
            setLoading(false);
            return;
          }
        }

        const { data, error } = await supabase
          .from('clients')
          .insert([{
            ...formData,
            name: fullName,
            company_id: profile.company_id,
            is_partner_client: true
          }])
          .select()
          .single();

        if (error) {
          console.error('Erreur lors de la création du client (partenaire):', error);
          toast.error("Erreur lors de la création du client");
          return;
        }

        toast.success("Client créé avec succès");
        setOpen(false);
        resetForm();
        onClientCreated?.();
      } else {
        // Mode admin classique
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user?.id)
          .single();

        if (!profile?.company_id) {
          toast.error("Impossible de déterminer l'entreprise associée");
          setLoading(false);
          return;
        }

        if (formData.email) {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('email', formData.email)
            .single();

          if (existingClient) {
            toast.error("Un client avec cet email existe déjà");
            setLoading(false);
            return;
          }
        }

        const { data, error } = await supabase
          .from('clients')
          .insert([{
            ...formData,
            name: fullName,
            company_id: profile.company_id
          }])
          .select()
          .single();

        if (error) {
          console.error('Erreur lors de la création du client:', error);
          toast.error("Erreur lors de la création du client");
          return;
        }

        toast.success("Client créé avec succès");
        setOpen(false);
        resetForm();
        onClientCreated?.();
      }
      
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const dialogContent = (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Créer un nouveau client</DialogTitle>
        <DialogDescription>
          Remplissez les informations du nouveau client
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Prénom *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="Prénom"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="last_name">Nom de famille *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Nom de famille"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="email@exemple.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company">Société</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Nom de la société"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+32 123 456 789"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Adresse complète"
          />
        </div>

        <PostalCodeInput
          postalCode={formData.postal_code}
          city={formData.city}
          country={formData.country}
          onPostalCodeChange={(value) => handleInputChange('postal_code', value)}
          onCityChange={(value) => handleInputChange('city', value)}
          onCountryChange={(value) => handleInputChange('country', value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vat_number">Numéro TVA</Label>
            <Input
              id="vat_number"
              value={formData.vat_number}
              onChange={(e) => handleInputChange('vat_number', e.target.value)}
              placeholder="FR12345678901"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
                <SelectItem value="lead">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Notes additionnelles..."
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer le client'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (isControlled) {
    return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau client
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};

export default CreateClientDialog;
