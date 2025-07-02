import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CollaboratorCreationDialogProps {
  clientId: string;
  onCollaboratorCreated?: () => void;
}

const CollaboratorCreationDialog: React.FC<CollaboratorCreationDialogProps> = ({
  clientId,
  onCollaboratorCreated
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Collaborateur'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Création collaborateur:', { client_id: clientId, ...formData });

      const { data, error } = await supabase
        .from('collaborators')
        .insert({
          client_id: clientId,
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          role: formData.role,
          is_primary: false
        })
        .select('id, name, email')
        .single();

      if (error) {
        console.error('❌ Erreur création collaborateur:', error);
        toast.error(`Erreur lors de la création: ${error.message}`);
        return;
      }

      console.log('✅ Collaborateur créé:', data);
      toast.success(`Collaborateur "${data.name}" créé avec succès`);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'Collaborateur'
      });
      
      setOpen(false);
      onCollaboratorCreated?.();
    } catch (error) {
      console.error('Erreur lors de la création du collaborateur:', error);
      toast.error('Erreur lors de la création du collaborateur');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Ajouter un collaborateur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nouveau collaborateur</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau collaborateur pour l'assignation d'équipements
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nom du collaborateur"
              required
            />
          </div>
          
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
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              placeholder="Rôle ou fonction"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CollaboratorCreationDialog;