
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { calculateEquipmentTotals, calculateOfferMargin, formatMarginDisplay } from "@/utils/marginCalculations";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";
import EditableEquipmentCard from "./EditableEquipmentCard";

interface EquipmentSectionProps {
  offer: any;
}

const EquipmentSection: React.FC<EquipmentSectionProps> = ({ offer }) => {
  // Utiliser le hook pour récupérer les équipements depuis les nouvelles tables
  const { equipment, loading, error, refresh } = useOfferEquipment(offer.id);
  
  // Convertir les données de la base de données au format attendu par les calculs
  const equipmentItems = equipment.map(item => ({
    id: item.id,
    title: item.title,
    purchasePrice: item.purchase_price,
    quantity: item.quantity,
    margin: item.margin,
    monthlyPayment: item.monthly_payment,
    sellingPrice: item.selling_price,
    coefficient: item.coefficient,
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
              <EditableEquipmentCard
                key={item.id || index}
                item={item}
                index={index}
                onUpdate={refresh}
              />
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
                    {formatMarginDisplay(calculatedMargin)}
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
