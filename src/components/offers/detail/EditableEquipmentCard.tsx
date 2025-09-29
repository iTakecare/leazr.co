import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/utils/formatters";
import { updateOfferEquipment, deleteOfferEquipment } from "@/services/offers/offerEquipment";
import { toast } from "sonner";
import { Hash, Euro, Truck, User, Building, MapPin, Save, Edit, X, Trash2 } from "lucide-react";

interface EditableEquipmentCardProps {
  item: any;
  index: number;
  onUpdate: () => void;
  onOfferUpdate?: () => void;
}

const EditableEquipmentCard: React.FC<EditableEquipmentCardProps> = ({ item, index, onUpdate, onOfferUpdate }) => {
  // 🔥 DEBUG: Log item data at the start
  console.log("🔥 EQUIPMENT CARD RENDER - Item data:", {
    id: item.id,
    idType: typeof item.id,
    title: item.title,
    hasValidId: !(!item.id || item.id.toString().startsWith('temp-')),
    fullItem: item
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState({
    title: item.title || '',
    purchasePrice: item.purchasePrice || 0,
    quantity: item.quantity || 1,
    margin: item.margin || 0,
    monthlyPayment: item.monthlyPayment || 0,
    sellingPrice: item.sellingPrice || 0,
    coefficient: item.coefficient || 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate selling price automatically when purchase price or margin changes
  const calculateSellingPrice = (purchasePrice: number, margin: number) => {
    return purchasePrice * (1 + margin / 100);
  };

  // Calculate coefficient automatically when monthly payment and purchase price are available
  const calculateCoefficient = (monthlyPayment: number, purchasePrice: number) => {
    return purchasePrice > 0 ? monthlyPayment / purchasePrice : 0;
  };

  const handleFieldChange = (field: string, value: any) => {
    const newItem = { ...editedItem, [field]: value };
    
    // Auto-calculate selling price when purchase price or margin changes
    if (field === 'purchasePrice' || field === 'margin') {
      newItem.sellingPrice = calculateSellingPrice(
        field === 'purchasePrice' ? value : newItem.purchasePrice,
        field === 'margin' ? value : newItem.margin
      );
    }
    
    // Auto-calculate coefficient when monthly payment or purchase price changes
    if (field === 'monthlyPayment' || field === 'purchasePrice') {
      newItem.coefficient = calculateCoefficient(
        field === 'monthlyPayment' ? value : newItem.monthlyPayment,
        field === 'purchasePrice' ? value : newItem.purchasePrice
      );
    }
    
    setEditedItem(newItem);
  };

  const handleSave = async () => {
    if (!item.id || item.id.startsWith('temp-')) {
      toast.error("Impossible de modifier cet équipement");
      return;
    }

    setIsSaving(true);
    try {
      await updateOfferEquipment(item.id, {
        title: editedItem.title,
        purchase_price: editedItem.purchasePrice,
        quantity: editedItem.quantity,
        margin: editedItem.margin,
        monthly_payment: editedItem.monthlyPayment,
        selling_price: editedItem.sellingPrice,
        coefficient: editedItem.coefficient
      });
      
      toast.success("Équipement mis à jour avec succès");
      setIsEditing(false);
      onUpdate();
      // Déclencher un refresh de l'offre pour synchroniser les données
      onOfferUpdate?.();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedItem({
      title: item.title || '',
      purchasePrice: item.purchasePrice || 0,
      quantity: item.quantity || 1,
      margin: item.margin || 0,
      monthlyPayment: item.monthlyPayment || 0,
      sellingPrice: item.sellingPrice || 0,
      coefficient: item.coefficient || 0
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    console.log("🗑️ DELETE - item.id:", item.id, "type:", typeof item.id);
    if (!item.id || item.id.toString().startsWith('temp-')) {
      toast.error("Impossible de supprimer cet équipement");
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteOfferEquipment(item.id);
      toast.success("Équipement supprimé avec succès");
      onUpdate();
      // Déclencher un refresh de l'offre pour synchroniser les données
      onOfferUpdate?.();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

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
    <div className="border rounded-lg p-4">
      {/* 🔥 TEMPORARY DEBUG INFO */}
      <div className="bg-yellow-100 border border-yellow-300 p-2 mb-3 text-xs">
        <strong>DEBUG INFO:</strong><br/>
        ID: {item.id} (Type: {typeof item.id})<br/>
        Starts with temp: {item.id ? item.id.toString().startsWith('temp-') ? 'YES' : 'NO' : 'NO ID'}<br/>
        Should show delete: {item.id && !item.id.toString().startsWith('temp-') ? 'YES ✅' : 'NO ❌'}
      </div>
      
      <div className="flex justify-between items-start mb-3">
        {isEditing ? (
          <Input
            value={editedItem.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className="font-medium text-lg flex-1 mr-4"
            placeholder="Nom de l'équipement"
          />
        ) : (
          <h4 className="font-medium text-lg">{item.title || `Équipement ${index + 1}`}</h4>
        )}
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Hash className="w-4 h-4" />
              <Input
                type="number"
                value={editedItem.quantity}
                onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 1)}
                className="w-16 h-8"
                min="1"
              />
            </div>
          ) : (
            item.quantity && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Hash className="w-4 h-4" />
                Qté: {item.quantity}
              </div>
            )
          )}
          
          {!isEditing ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              
              {(() => {
                const hasValidId = item.id && !item.id.toString().startsWith('temp-');
                console.log("🗑️ RENDER DELETE - Debug info:", {
                  itemId: item.id,
                  itemIdType: typeof item.id,
                  startsWithTemp: item.id ? item.id.toString().startsWith('temp-') : 'no id',
                  hasValidId: hasValidId,
                  willShowButton: hasValidId
                });
                
                // 🔥 FORCE DISPLAY FOR ALL ITEMS TO DEBUG
                return true && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-red-100 border-red-300 text-red-700 hover:bg-red-200 hover:text-red-800 font-bold shadow-lg"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                        DELETE
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer l'équipement</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer cet équipement ? Cette action est irréversible.
                          <br />
                          <strong>"{item.title || `Équipement ${index + 1}`}"</strong>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Suppression..." : "Supprimer"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                );
              })()}
            </div>
          ) : (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {item.description && (
        <p className="text-gray-600 mb-3">{item.description}</p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Euro className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            <p className="text-gray-500">Prix d'achat</p>
            {isEditing ? (
              <Input
                type="number"
                value={editedItem.purchasePrice}
                onChange={(e) => handleFieldChange('purchasePrice', parseFloat(e.target.value) || 0)}
                className="h-8"
                step="0.01"
                min="0"
              />
            ) : (
              <p className="font-medium">{formatCurrency(item.purchasePrice || 0)}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Euro className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            <p className="text-gray-500">Prix de vente</p>
            {isEditing ? (
              <Input
                type="number"
                value={editedItem.sellingPrice}
                onChange={(e) => handleFieldChange('sellingPrice', parseFloat(e.target.value) || 0)}
                className="h-8"
                step="0.01"
                min="0"
              />
            ) : (
              <p className="font-medium">{formatCurrency(item.sellingPrice || calculateSellingPrice(item.purchasePrice || 0, item.margin || 0))}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 text-gray-500">%</span>
          <div className="flex-1">
            <p className="text-gray-500">Marge (%)</p>
            {isEditing ? (
              <Input
                type="number"
                value={editedItem.margin}
                onChange={(e) => handleFieldChange('margin', parseFloat(e.target.value) || 0)}
                className="h-8"
                step="0.1"
                min="0"
              />
            ) : (
              <p className="font-medium">{(item.margin || 0).toFixed(1)}%</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Euro className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            <p className="text-gray-500">Mensualité</p>
            {isEditing ? (
              <Input
                type="number"
                value={editedItem.monthlyPayment}
                onChange={(e) => handleFieldChange('monthlyPayment', parseFloat(e.target.value) || 0)}
                className="h-8"
                step="0.01"
                min="0"
              />
            ) : (
              <p className="font-medium">{formatCurrency(item.monthlyPayment || 0)}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 text-gray-500">×</span>
          <div className="flex-1">
            <p className="text-gray-500">Coefficient</p>
            <p className="font-medium text-blue-600">
              {(item.coefficient || calculateCoefficient(item.monthlyPayment || 0, item.purchasePrice || 0)).toFixed(3)}
            </p>
          </div>
        </div>
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
  );
};

export default EditableEquipmentCard;