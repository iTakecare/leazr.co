import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PostalCodeInput } from "@/components/form/PostalCodeInput";
import { useDeliverySites } from "@/hooks/useDeliverySites";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Equipment } from "@/types/equipment";
import { MapPin, User, Building, Navigation } from "lucide-react";

interface EquipmentDeliverySectionProps {
  equipment: Equipment;
  clientId?: string;
  onChange: (field: string, value: any) => void;
}

const EquipmentDeliverySection: React.FC<EquipmentDeliverySectionProps> = ({
  equipment,
  clientId,
  onChange
}) => {
  const { deliverySites } = useDeliverySites(clientId);
  
  // Fetch collaborators for the client
  const { data: collaborators = [] } = useQuery({
    queryKey: ['collaborators', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      
      if (error) {
        console.error('Error fetching collaborators:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!clientId
  });

  const deliveryType = equipment.deliveryType || 'main_client';

  const handleDeliveryTypeChange = (value: string) => {
    onChange('deliveryType', value);
    
    // Reset related fields when changing delivery type
    if (value !== 'collaborator') {
      onChange('collaboratorId', '');
    }
    if (value !== 'predefined_site') {
      onChange('deliverySiteId', '');
    }
    if (value !== 'specific_address') {
      onChange('deliveryAddress', '');
      onChange('deliveryCity', '');
      onChange('deliveryPostalCode', '');
      onChange('deliveryCountry', '');
      onChange('deliveryContactName', '');
      onChange('deliveryContactEmail', '');
      onChange('deliveryContactPhone', '');
    }
  };

  const renderDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'main_client':
        return <Building className="h-4 w-4" />;
      case 'collaborator':
        return <User className="h-4 w-4" />;
      case 'predefined_site':
        return <MapPin className="h-4 w-4" />;
      case 'specific_address':
        return <Navigation className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Informations de livraison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="delivery-type">Type de livraison</Label>
          <Select value={deliveryType} onValueChange={handleDeliveryTypeChange}>
            <SelectTrigger id="delivery-type">
              <SelectValue placeholder="Sélectionner le type de livraison">
                {deliveryType && (
                  <div className="flex items-center gap-2">
                    {renderDeliveryTypeIcon(deliveryType)}
                    <span>
                      {deliveryType === 'main_client' && 'Client principal'}
                      {deliveryType === 'collaborator' && 'Collaborateur'}
                      {deliveryType === 'predefined_site' && 'Site prédéfini'}
                      {deliveryType === 'specific_address' && 'Adresse spécifique'}
                    </span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main_client">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Client principal
                </div>
              </SelectItem>
              <SelectItem value="collaborator">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Collaborateur
                </div>
              </SelectItem>
              {deliverySites.length > 0 && (
                <SelectItem value="predefined_site">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Site prédéfini
                  </div>
                </SelectItem>
              )}
              <SelectItem value="specific_address">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Adresse spécifique
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Collaborator selection */}
        {deliveryType === 'collaborator' && collaborators.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="collaborator">Collaborateur</Label>
            <Select 
              value={equipment.collaboratorId || ''} 
              onValueChange={(value) => onChange('collaboratorId', value)}
            >
              <SelectTrigger id="collaborator">
                <SelectValue placeholder="Sélectionner un collaborateur" />
              </SelectTrigger>
              <SelectContent>
                {collaborators.map((collaborator) => (
                  <SelectItem key={collaborator.id} value={collaborator.id}>
                    {collaborator.name} - {collaborator.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Predefined site selection */}
        {deliveryType === 'predefined_site' && deliverySites.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="delivery-site">Site de livraison</Label>
            <Select 
              value={equipment.deliverySiteId || ''} 
              onValueChange={(value) => onChange('deliverySiteId', value)}
            >
              <SelectTrigger id="delivery-site">
                <SelectValue placeholder="Sélectionner un site" />
              </SelectTrigger>
              <SelectContent>
                {deliverySites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    <div className="flex items-center gap-2">
                      {site.is_default && <span className="text-xs bg-primary text-primary-foreground px-1 rounded">Défaut</span>}
                      <span>{site.site_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Specific address fields */}
        {deliveryType === 'specific_address' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-address">Adresse de livraison</Label>
              <Input
                id="delivery-address"
                value={equipment.deliveryAddress || ''}
                onChange={(e) => onChange('deliveryAddress', e.target.value)}
                placeholder="Adresse complète"
              />
            </div>
            
            <PostalCodeInput
              postalCode={equipment.deliveryPostalCode || ''}
              city={equipment.deliveryCity || ''}
              country={equipment.deliveryCountry || 'BE'}
              onPostalCodeChange={(value) => onChange('deliveryPostalCode', value)}
              onCityChange={(value) => onChange('deliveryCity', value)}
              onCountryChange={(value) => onChange('deliveryCountry', value)}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-contact-name">Contact</Label>
                <Input
                  id="delivery-contact-name"
                  value={equipment.deliveryContactName || ''}
                  onChange={(e) => onChange('deliveryContactName', e.target.value)}
                  placeholder="Nom du contact"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delivery-contact-email">Email</Label>
                <Input
                  id="delivery-contact-email"
                  type="email"
                  value={equipment.deliveryContactEmail || ''}
                  onChange={(e) => onChange('deliveryContactEmail', e.target.value)}
                  placeholder="Email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delivery-contact-phone">Téléphone</Label>
                <Input
                  id="delivery-contact-phone"
                  type="tel"
                  value={equipment.deliveryContactPhone || ''}
                  onChange={(e) => onChange('deliveryContactPhone', e.target.value)}
                  placeholder="Téléphone"
                />
              </div>
            </div>
          </div>
        )}

        {/* Information display for main_client */}
        {deliveryType === 'main_client' && (
          <div className="bg-muted/20 p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              <Building className="h-4 w-4 inline mr-1" />
              La livraison sera effectuée à l'adresse principale du client
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentDeliverySection;