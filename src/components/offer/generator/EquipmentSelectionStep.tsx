import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Laptop, Package, Plus, Edit, Trash2, ShoppingCart } from 'lucide-react';
import { OfferFormData } from '@/hooks/useCustomOfferGenerator';
import ProductSelector from '@/components/ui/ProductSelector';
import { Product } from '@/types/catalog';
import { toast } from 'sonner';

interface EquipmentSelectionStepProps {
  formData: OfferFormData;
  updateFormData: (section: keyof OfferFormData, data: any) => void;
}

const EQUIPMENT_BUNDLES = [
  {
    id: 'startup',
    name: 'Pack Startup',
    description: 'Idéal pour les petites équipes (1-5 personnes)',
    items: [
      { name: 'MacBook Air M2', price: 1200, quantity: 1 },
      { name: 'Écran externe 24"', price: 300, quantity: 1 },
      { name: 'Clavier + Souris', price: 80, quantity: 1 }
    ],
    totalPrice: 1580,
    icon: '🚀'
  },
  {
    id: 'creative',
    name: 'Pack Créatif',
    description: 'Pour les designers et créateurs de contenu',
    items: [
      { name: 'MacBook Pro 16"', price: 2500, quantity: 1 },
      { name: 'Écran 4K 32"', price: 800, quantity: 1 },
      { name: 'Tablette graphique', price: 400, quantity: 1 }
    ],
    totalPrice: 3700,
    icon: '🎨'
  },
  {
    id: 'business',
    name: 'Pack Business',
    description: 'Configuration complète pour l\'entreprise',
    items: [
      { name: 'Dell Latitude', price: 1000, quantity: 1 },
      { name: 'Station d\'accueil', price: 200, quantity: 1 },
      { name: 'Écran dual 24"', price: 600, quantity: 2 }
    ],
    totalPrice: 2400,
    icon: '💼'
  }
];

export const EquipmentSelectionStep: React.FC<EquipmentSelectionStepProps> = ({
  formData,
  updateFormData
}) => {
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [newEquipment, setNewEquipment] = useState({
    title: '',
    purchasePrice: 0,
    quantity: 1,
    margin: 20
  });

  const { equipment } = formData;

  const handleAddEquipment = (equipmentData: any) => {
    const equipment = {
      id: Date.now().toString(),
      title: equipmentData.title || equipmentData.name,
      purchasePrice: equipmentData.purchasePrice || equipmentData.price || 0,
      quantity: equipmentData.quantity || 1,
      margin: equipmentData.margin || 20,
      monthlyPayment: 0, // Will be calculated in financing step
      attributes: equipmentData.attributes || {},
      specifications: equipmentData.specifications || {}
    };

    updateFormData('equipment', [...formData.equipment, equipment]);
    resetNewEquipment();
  };

  const handleProductSelect = (product: Product) => {
    handleAddEquipment({
      title: product.name,
      purchasePrice: product.price || 0,
      quantity: 1,
      margin: 20,
      attributes: product.selected_attributes || product.attributes || {},
      specifications: product.specifications || {}
    });
    setIsProductSelectorOpen(false);
    toast.success(`${product.name} ajouté à la sélection`);
  };

  const handleRemoveEquipment = (index: number) => {
    const newEquipment = [...formData.equipment];
    newEquipment.splice(index, 1);
    updateFormData('equipment', newEquipment);
  };

  const handleUpdateEquipment = (index: number, field: string, value: any) => {
    const newEquipment = [...formData.equipment];
    newEquipment[index] = { ...newEquipment[index], [field]: value };
    updateFormData('equipment', newEquipment);
  };

  const handleAddBundle = (bundle: any) => {
    const bundleEquipment = bundle.items.map((item: any, index: number) => ({
      id: `${Date.now()}-${index}`,
      title: item.name,
      purchasePrice: item.price,
      quantity: item.quantity,
      margin: 20,
      monthlyPayment: 0,
      attributes: {},
      specifications: {}
    }));

    updateFormData('equipment', [...formData.equipment, ...bundleEquipment]);
    toast.success(`${bundle.name} ajouté à la sélection`);
  };

  const resetNewEquipment = () => {
    setNewEquipment({
      title: '',
      purchasePrice: 0,
      quantity: 1,
      margin: 20
    });
  };

  const handleManualAdd = () => {
    if (!newEquipment.title || newEquipment.purchasePrice <= 0) {
      toast.error('Veuillez renseigner au minimum le nom et le prix');
      return;
    }

    handleAddEquipment(newEquipment);
    toast.success('Équipement ajouté manuellement');
  };

  const totalValue = equipment.reduce((sum, eq) => 
    sum + (eq.purchasePrice * eq.quantity), 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Laptop className="h-5 w-5 text-primary" />
          Sélection des Équipements
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choisissez les équipements pour votre offre - catalogue, packs ou saisie manuelle
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Résumé */}
        {equipment.length > 0 && (
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{equipment.length} équipement(s) sélectionné(s)</p>
                <p className="text-sm text-muted-foreground">
                  Valeur totale: {totalValue.toLocaleString('fr-FR')} €
                </p>
              </div>
              <Badge variant="secondary">
                <ShoppingCart className="h-3 w-3 mr-1" />
                {equipment.length}
              </Badge>
            </div>
          </div>
        )}

        {/* Actions d'ajout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center space-y-2"
            onClick={() => setIsProductSelectorOpen(true)}
          >
            <Package className="h-6 w-6" />
            <span>Parcourir le Catalogue</span>
            <span className="text-xs text-muted-foreground">Produits avec specs complètes</span>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center space-y-2"
            onClick={() => setEditingEquipment({})}
          >
            <Plus className="h-6 w-6" />
            <span>Ajouter Manuellement</span>
            <span className="text-xs text-muted-foreground">Saisie libre</span>
          </Button>
        </div>

        {/* Packs suggérés */}
        <div className="space-y-4">
          <h3 className="font-medium">Packs Suggérés</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EQUIPMENT_BUNDLES.map((bundle) => (
              <Card key={bundle.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <div className="text-3xl">{bundle.icon}</div>
                    <div>
                      <h4 className="font-medium">{bundle.name}</h4>
                      <p className="text-xs text-muted-foreground">{bundle.description}</p>
                    </div>
                    <div className="space-y-1">
                      {bundle.items.map((item, index) => (
                        <p key={index} className="text-xs">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>
                    <div className="font-bold text-primary">
                      {bundle.totalPrice.toLocaleString('fr-FR')} €
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddBundle(bundle)}
                      className="w-full"
                    >
                      Ajouter ce pack
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Liste des équipements sélectionnés */}
        {equipment.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Équipements Sélectionnés</h3>
            <div className="space-y-3">
              {equipment.map((eq, index) => (
                <Card key={eq.id || index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{eq.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Prix: {eq.purchasePrice.toLocaleString('fr-FR')} €</span>
                          <span>Qté: {eq.quantity}</span>
                          <span>Marge: {eq.margin}%</span>
                          <span className="font-medium text-foreground">
                            Total: {(eq.purchasePrice * eq.quantity).toLocaleString('fr-FR')} €
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingEquipment({ ...eq, index })}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveEquipment(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire d'ajout/modification manuel */}
        {editingEquipment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingEquipment.index !== undefined ? 'Modifier l\'équipement' : 'Ajouter un équipement'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Nom de l'équipement *</Label>
                  <Input
                    id="title"
                    value={editingEquipment.title || newEquipment.title}
                    onChange={(e) => editingEquipment.index !== undefined 
                      ? handleUpdateEquipment(editingEquipment.index, 'title', e.target.value)
                      : setNewEquipment({...newEquipment, title: e.target.value})
                    }
                    placeholder="MacBook Pro 16"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Prix d'achat (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingEquipment.purchasePrice || newEquipment.purchasePrice}
                    onChange={(e) => editingEquipment.index !== undefined
                      ? handleUpdateEquipment(editingEquipment.index, 'purchasePrice', parseFloat(e.target.value) || 0)
                      : setNewEquipment({...newEquipment, purchasePrice: parseFloat(e.target.value) || 0})
                    }
                    placeholder="2500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantité</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={editingEquipment.quantity || newEquipment.quantity}
                    onChange={(e) => editingEquipment.index !== undefined
                      ? handleUpdateEquipment(editingEquipment.index, 'quantity', parseInt(e.target.value) || 1)
                      : setNewEquipment({...newEquipment, quantity: parseInt(e.target.value) || 1})
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin">Marge (%)</Label>
                  <Input
                    id="margin"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editingEquipment.margin || newEquipment.margin}
                    onChange={(e) => editingEquipment.index !== undefined
                      ? handleUpdateEquipment(editingEquipment.index, 'margin', parseFloat(e.target.value) || 0)
                      : setNewEquipment({...newEquipment, margin: parseFloat(e.target.value) || 0})
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingEquipment(null);
                    resetNewEquipment();
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={editingEquipment.index !== undefined 
                    ? () => setEditingEquipment(null)
                    : handleManualAdd
                  }
                >
                  {editingEquipment.index !== undefined ? 'Sauvegarder' : 'Ajouter'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>

      {/* Product Selector */}
      <ProductSelector
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        onSelectProduct={handleProductSelect}
        title="Sélectionner dans le catalogue"
        description="Choisissez un produit avec toutes ses spécifications techniques"
      />
    </Card>
  );
};

export default EquipmentSelectionStep;