import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PostalCodeInput } from "@/components/form/PostalCodeInput";
import { useDeliverySites } from "@/hooks/useDeliverySites";
import { CreateDeliverySiteData, DeliverySite } from "@/types/deliverySite";
import { MapPin, Plus, Edit, Trash2, Star, Building } from "lucide-react";
import { toast } from "sonner";

interface DeliverySitesManagerProps {
  clientId: string;
  clientName: string;
}

const DeliverySitesManager: React.FC<DeliverySitesManagerProps> = ({
  clientId,
  clientName
}) => {
  const {
    deliverySites,
    isLoading,
    createDeliverySite,
    updateDeliverySite,
    deleteDeliverySite,
    setDeliverySiteAsDefault,
    isCreating,
    isUpdating
  } = useDeliverySites(clientId);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<DeliverySite | null>(null);
  
  const [formData, setFormData] = useState({
    site_name: "",
    address: "",
    city: "",
    postal_code: "",
    country: "BE",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    is_default: false,
    notes: ""
  });

  const resetForm = () => {
    setFormData({
      site_name: "",
      address: "",
      city: "",
      postal_code: "",
      country: "BE",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      is_default: false,
      notes: ""
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.site_name.trim() || !formData.address.trim() || !formData.city.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const siteData: CreateDeliverySiteData = {
      client_id: clientId,
      site_name: formData.site_name.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      postal_code: formData.postal_code.trim(),
      country: formData.country,
      contact_name: formData.contact_name.trim() || undefined,
      contact_email: formData.contact_email.trim() || undefined,
      contact_phone: formData.contact_phone.trim() || undefined,
      is_default: formData.is_default,
      notes: formData.notes.trim() || undefined
    };

    if (editingSite) {
      updateDeliverySite({
        id: editingSite.id,
        updates: siteData
      });
      setEditingSite(null);
    } else {
      createDeliverySite(siteData);
      setIsCreateDialogOpen(false);
    }
    
    resetForm();
  };

  const handleEdit = (site: DeliverySite) => {
    setFormData({
      site_name: site.site_name,
      address: site.address,
      city: site.city,
      postal_code: site.postal_code || "",
      country: site.country,
      contact_name: site.contact_name || "",
      contact_email: site.contact_email || "",
      contact_phone: site.contact_phone || "",
      is_default: site.is_default || false,
      notes: site.notes || ""
    });
    setEditingSite(site);
  };

  const handleDelete = (siteId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce site de livraison ?")) {
      deleteDeliverySite(siteId);
    }
  };

  const handleSetDefault = (siteId: string) => {
    setDeliverySiteAsDefault({ id: siteId, clientId });
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="site_name">Nom du site *</Label>
          <Input
            id="site_name"
            value={formData.site_name}
            onChange={(e) => handleInputChange('site_name', e.target.value)}
            placeholder="Ex: Siège social, Entrepôt, Succursale..."
            required
          />
        </div>
        
        <div className="flex items-center space-x-2 pt-6">
          <Switch
            id="is_default"
            checked={formData.is_default}
            onCheckedChange={(checked) => handleInputChange('is_default', checked)}
          />
          <Label htmlFor="is_default">Site par défaut</Label>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-primary">Adresse</h4>
        <div className="space-y-2">
          <Label htmlFor="address">Adresse complète *</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Rue, numéro..."
            required
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
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-primary">Contact sur site</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_name">Nom du contact</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => handleInputChange('contact_name', e.target.value)}
              placeholder="Nom complet"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contact_email">Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              placeholder="contact@exemple.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Téléphone</Label>
            <Input
              id="contact_phone"
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => handleInputChange('contact_phone', e.target.value)}
              placeholder="+32 XXX XX XX XX"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Instructions particulières, horaires d'accès..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            resetForm();
            setEditingSite(null);
            setIsCreateDialogOpen(false);
          }}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isCreating || isUpdating}>
          {editingSite ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </form>
  );

  if (isLoading) {
    return <div className="p-4">Chargement des sites de livraison...</div>;
  }

  return (
    <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
      <CardHeader className="bg-muted/50 pb-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Sites de livraison
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les adresses de livraison pour {clientName}
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouveau site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouveau site de livraison</DialogTitle>
              </DialogHeader>
              {renderForm()}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {deliverySites.length === 0 ? (
          <div className="text-center py-8">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Aucun site de livraison configuré
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez des sites pour faciliter la gestion des livraisons
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {deliverySites.map((site) => (
              <Card key={site.id} className="border border-border/60">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{site.site_name}</h3>
                      {site.is_default && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Défaut
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      {!site.is_default && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSetDefault(site.id)}
                          title="Définir comme défaut"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(site)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(site.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{site.address}</p>
                    <p>
                      {site.postal_code && `${site.postal_code} `}
                      {site.city}
                    </p>
                    
                    {site.contact_name && (
                      <div className="pt-2 border-t">
                        <p className="font-medium text-foreground">Contact:</p>
                        <p>{site.contact_name}</p>
                        {site.contact_email && <p>{site.contact_email}</p>}
                        {site.contact_phone && <p>{site.contact_phone}</p>}
                      </div>
                    )}
                    
                    {site.notes && (
                      <p className="pt-2 border-t text-xs">{site.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Editing Dialog */}
        <Dialog open={editingSite !== null} onOpenChange={(open) => !open && setEditingSite(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier le site de livraison</DialogTitle>
            </DialogHeader>
            {renderForm()}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DeliverySitesManager;