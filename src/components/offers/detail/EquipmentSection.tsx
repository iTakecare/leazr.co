
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Hash, Euro, Truck, User, Building, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { calculateEquipmentTotals, calculateOfferMargin } from "@/utils/marginCalculations";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";

interface EquipmentSectionProps {
  offer: any;
}

const EquipmentSection: React.FC<EquipmentSectionProps> = ({ offer }) => {
  // Utiliser le hook pour récupérer les équipements depuis les nouvelles tables
  const { equipment, loading, error } = useOfferEquipment(offer.id);
  
  // Convertir les données de la base de données au format attendu par les calculs
  const equipmentItems = equipment.map(item => ({
    id: item.id,
    title: item.title,
    purchasePrice: item.purchase_price,
    quantity: item.quantity,
    margin: item.margin,
    monthlyPayment: item.monthly_payment,
    serialNumber: item.serial_number,
    // Convertir les attributs de array vers object pour l'affichage
    attributes: item.attributes?.reduce((acc: any, attr: any) => {
      acc[attr.key] = attr.value;
      return acc;
    }, {}) || {},
    // Convertir les spécifications de array vers object pour l'affichage
    specifications: item.specifications?.reduce((acc: any, spec: any) => {
      acc[spec.key] = spec.value;
      return acc;
    }, {}) || {},
    // Ajouter les informations de livraison
    deliveryType: item.delivery_type,
    collaboratorId: item.collaborator_id,
    deliverySiteId: item.delivery_site_id,
    deliveryAddress: item.delivery_address,
    deliveryCity: item.delivery_city,
    deliveryPostalCode: item.delivery_postal_code,
    deliveryCountry: item.delivery_country,
    deliveryContactName: item.delivery_contact_name,
    deliveryContactEmail: item.delivery_contact_email,
    deliveryContactPhone: item.delivery_contact_phone
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Équipements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Chargement des équipements...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Équipements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Erreur lors du chargement des équipements</p>
        </CardContent>
      </Card>
    );
  }

  // Function to render delivery information
  const renderDeliveryInfo = (item: any) => {
    if (!item.deliveryType) {
      return null;
    }

    let icon, label, details;

    switch (item.deliveryType) {
      case 'main_client':
        icon = <Building className="w-4 h-4" />;
        label = 'Client principal';
        details = 'Livraison à l\'adresse principale du client';
        break;
      case 'collaborator':
        icon = <User className="w-4 h-4" />;
        label = 'Collaborateur';
        details = item.collaboratorId ? 'Livraison au collaborateur assigné' : 'Collaborateur non spécifié';
        break;
      case 'predefined_site':
        icon = <Building className="w-4 h-4" />;
        label = 'Site prédéfini';
        details = item.deliverySiteId ? 'Livraison au site prédéfini' : 'Site non spécifié';
        break;
      case 'specific_address':
        icon = <MapPin className="w-4 h-4" />;
        label = 'Adresse spécifique';
        details = item.deliveryAddress 
          ? `${item.deliveryAddress}, ${item.deliveryCity} ${item.deliveryPostalCode || ''}`
          : 'Adresse non spécifiée';
        break;
      default:
        return null;
    }

    return (
      <div className="mt-3 pt-3 border-t">
        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Informations de livraison
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {icon}
            <Badge variant="secondary">{label}</Badge>
          </div>
          <p className="text-sm text-gray-600">{details}</p>
          {item.deliveryContactName && (
            <p className="text-sm text-gray-600">
              Contact: {item.deliveryContactName}
              {item.deliveryContactEmail && ` (${item.deliveryContactEmail})`}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Équipements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {equipmentItems.length > 0 ? (
          <div className="space-y-4">
            {equipmentItems.map((item: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-lg">{item.title || `Équipement ${index + 1}`}</h4>
                  {item.quantity && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Hash className="w-4 h-4" />
                      Qté: {item.quantity}
                    </div>
                  )}
                </div>
                
                {item.description && (
                  <p className="text-gray-600 mb-3">{item.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {item.purchasePrice && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-500">Prix d'achat</p>
                        <p className="font-medium">{formatCurrency(item.purchasePrice)}</p>
                      </div>
                    </div>
                  )}
                  
                  {item.monthlyPayment && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-500">Mensualité</p>
                        <p className="font-medium">{formatCurrency(item.monthlyPayment)}</p>
                      </div>
                    </div>
                  )}
                  
                  {item.margin && item.purchasePrice && (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 text-gray-500">%</span>
                      <div>
                        <p className="text-gray-500">Marge (%)</p>
                        <p className="font-medium">{item.margin.toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {item.attributes && Object.keys(item.attributes).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Caractéristiques</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(item.attributes).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500">{key}:</span>
                          <span className="ml-2 font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {item.specifications && Object.keys(item.specifications).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Spécifications</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(item.specifications).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500">{key}:</span>
                          <span className="ml-2 font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {renderDeliveryInfo(item)}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Aucun équipement spécifié</p>
        )}

        {/* Afficher le total si on a des équipements */}
        {equipmentItems.length > 0 && (() => {
          const totals = calculateEquipmentTotals(offer, equipmentItems);
          const calculatedMargin = calculateOfferMargin(offer, equipmentItems);
          
          return (
            <div className="mt-6 pt-4 border-t bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="font-medium">
                  <p className="text-gray-500 mb-1">Total articles</p>
                  <p className="text-lg font-bold">{equipmentItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)}</p>
                </div>
                <div className="font-medium">
                  <p className="text-gray-500 mb-1">Prix d'achat total</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(totals.totalPurchasePrice)}
                  </p>
                </div>
                <div className="font-medium">
                  <p className="text-gray-500 mb-1">Mensualité totale</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(totals.totalMonthlyPayment)}
                  </p>
                </div>
                <div className="font-medium">
                  <p className="text-gray-500 mb-1">Marge totale</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(calculatedMargin || 0)}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
        
        {offer.remarks && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Remarques</p>
            <p className="text-sm text-gray-600">{offer.remarks}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentSection;
