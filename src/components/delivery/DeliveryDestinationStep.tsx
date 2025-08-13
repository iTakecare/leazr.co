import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building, User, MapPin, Package2 } from "lucide-react";
import { EquipmentDeliveryItem } from "@/types/contractDelivery";
import { Collaborator } from "@/types/client";
import { DeliverySite } from "@/types/deliverySite";

interface DeliveryDestinationStepProps {
  deliveryItems: EquipmentDeliveryItem[];
  onDeliveryItemsChange: (items: EquipmentDeliveryItem[]) => void;
  collaborators: Collaborator[];
  deliverySites: DeliverySite[];
}

const DeliveryDestinationStep: React.FC<DeliveryDestinationStepProps> = ({
  deliveryItems,
  onDeliveryItemsChange,
  collaborators,
  deliverySites
}) => {
  const updateItem = (index: number, updates: Partial<EquipmentDeliveryItem>) => {
    const newItems = [...deliveryItems];
    newItems[index] = { ...newItems[index], ...updates };
    onDeliveryItemsChange(newItems);
  };

  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'main_client': return Building;
      case 'collaborator': return User;
      case 'predefined_site': return MapPin;
      case 'specific_address': return Package2;
      default: return Building;
    }
  };

  const getDeliveryTypeLabel = (type: string) => {
    switch (type) {
      case 'main_client': return 'Client principal';
      case 'collaborator': return 'Collaborateur';
      case 'predefined_site': return 'Site prédéfini';
      case 'specific_address': return 'Adresse spécifique';
      default: return 'Client principal';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Destinations des livraisons</h3>
        <p className="text-muted-foreground">
          Configurez la destination de chaque livraison
        </p>
      </div>

      <div className="space-y-6">
        {deliveryItems.map((item, index) => {
          const Icon = getDeliveryTypeIcon(item.deliveryType);
          
          return (
            <Card key={index} className="p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <span>Livraison {index + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Qté: {item.quantity}
                    </Badge>
                    {item.serialNumbers.length > 0 && (
                      <Badge variant="outline">
                        {item.serialNumbers.length} N° série
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="space-y-4">
                  {/* Affichage des numéros de série si présents */}
                  {item.serialNumbers.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Numéros de série :</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.serialNumbers.map(serial => (
                          <Badge key={serial} variant="secondary" className="text-xs">
                            {serial}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sélection du type de destination */}
                  <div>
                    <Label className="text-sm font-medium">Type de destination</Label>
                    <RadioGroup
                      value={item.deliveryType}
                      onValueChange={(value) => updateItem(index, { 
                        deliveryType: value as any,
                        // Reset des champs spécifiques
                        collaboratorId: undefined,
                        deliverySiteId: undefined,
                        deliveryAddress: undefined,
                        deliveryCity: undefined,
                        deliveryPostalCode: undefined,
                        deliveryContactName: undefined,
                        deliveryContactEmail: undefined,
                        deliveryContactPhone: undefined
                      })}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="main_client" id={`main_client_${index}`} />
                        <Label htmlFor={`main_client_${index}`} className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Client principal
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="collaborator" id={`collaborator_${index}`} />
                        <Label htmlFor={`collaborator_${index}`} className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Collaborateur
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="predefined_site" id={`site_${index}`} />
                        <Label htmlFor={`site_${index}`} className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Site prédéfini
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="specific_address" id={`specific_${index}`} />
                        <Label htmlFor={`specific_${index}`} className="flex items-center gap-2">
                          <Package2 className="h-4 w-4" />
                          Adresse spécifique
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Configuration spécifique selon le type */}
                  {item.deliveryType === 'collaborator' && (
                    <div>
                      <Label htmlFor={`collaborator_select_${index}`}>Collaborateur</Label>
                      <Select
                        value={item.collaboratorId || ''}
                        onValueChange={(value) => updateItem(index, { collaboratorId: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionnez un collaborateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {collaborators.map(collab => (
                            <SelectItem key={collab.id} value={collab.id}>
                              {collab.name} - {collab.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {item.deliveryType === 'predefined_site' && (
                    <div>
                      <Label htmlFor={`site_select_${index}`}>Site de livraison</Label>
                      <Select
                        value={item.deliverySiteId || ''}
                        onValueChange={(value) => updateItem(index, { deliverySiteId: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionnez un site" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliverySites.map(site => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.site_name} - {site.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {item.deliveryType === 'specific_address' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`address_${index}`}>Adresse</Label>
                          <Input
                            id={`address_${index}`}
                            value={item.deliveryAddress || ''}
                            onChange={(e) => updateItem(index, { deliveryAddress: e.target.value })}
                            placeholder="Rue, numéro"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`city_${index}`}>Ville</Label>
                          <Input
                            id={`city_${index}`}
                            value={item.deliveryCity || ''}
                            onChange={(e) => updateItem(index, { deliveryCity: e.target.value })}
                            placeholder="Ville"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`postal_${index}`}>Code postal</Label>
                          <Input
                            id={`postal_${index}`}
                            value={item.deliveryPostalCode || ''}
                            onChange={(e) => updateItem(index, { deliveryPostalCode: e.target.value })}
                            placeholder="1000"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`country_${index}`}>Pays</Label>
                          <Input
                            id={`country_${index}`}
                            value={item.deliveryCountry || 'BE'}
                            onChange={(e) => updateItem(index, { deliveryCountry: e.target.value })}
                            placeholder="BE"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <Label htmlFor={`contact_name_${index}`}>Nom du contact</Label>
                          <Input
                            id={`contact_name_${index}`}
                            value={item.deliveryContactName || ''}
                            onChange={(e) => updateItem(index, { deliveryContactName: e.target.value })}
                            placeholder="Nom du contact"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`contact_email_${index}`}>Email du contact</Label>
                          <Input
                            id={`contact_email_${index}`}
                            type="email"
                            value={item.deliveryContactEmail || ''}
                            onChange={(e) => updateItem(index, { deliveryContactEmail: e.target.value })}
                            placeholder="contact@exemple.com"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`contact_phone_${index}`}>Téléphone du contact</Label>
                          <Input
                            id={`contact_phone_${index}`}
                            value={item.deliveryContactPhone || ''}
                            onChange={(e) => updateItem(index, { deliveryContactPhone: e.target.value })}
                            placeholder="+32 XXX XX XX XX"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes - toujours affichées */}
                  <div>
                    <Label htmlFor={`notes_${index}`}>Notes spéciales</Label>
                    <Textarea
                      id={`notes_${index}`}
                      value={item.notes || ''}
                      onChange={(e) => updateItem(index, { notes: e.target.value })}
                      placeholder="Instructions spéciales pour cette livraison..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DeliveryDestinationStep;