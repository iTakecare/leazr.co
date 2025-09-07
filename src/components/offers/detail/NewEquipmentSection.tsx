import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Save, X, Edit3, Calculator } from "lucide-react";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";
import { calculateOfferMargin } from "@/utils/marginCalculations";
import { updateOfferEquipment } from "@/services/offers/offerEquipment";
import { GlobalMarginEditor } from "./GlobalMarginEditor";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NewEquipmentSectionProps {
  offer: {
    id: string;
    amount?: number;
    financed_amount?: number;
    equipment_description?: string;
    leaser_id?: string;
  };
}

const NewEquipmentSection: React.FC<NewEquipmentSectionProps> = ({ offer }) => {
  const { equipment, loading, error, refresh } = useOfferEquipment(offer.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTotalMonthly, setIsEditingTotalMonthly] = useState(false);
  const [editedTotalMonthly, setEditedTotalMonthly] = useState(0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const formatAttributes = (attributes: Array<{ key: string; value: string }> = []) => {
    if (!attributes.length) return "";
    return attributes.map(attr => `${attr.key}: ${attr.value}`).join(", ");
  };

  // Calculate selling price automatically
  const calculateSellingPrice = (purchasePrice: number, margin: number) => {
    return purchasePrice * (1 + margin / 100);
  };

  // Calculate coefficient automatically (mensualité * 36 / prix_achat)
  const calculateCoefficient = (monthlyPayment: number, purchasePrice: number, duration: number = 36) => {
    return purchasePrice > 0 ? (monthlyPayment * duration) / purchasePrice : 0;
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditedValues({
      title: item.title,
      purchase_price: item.purchase_price,
      quantity: item.quantity,
      margin: item.margin || 0,
      monthly_payment: item.monthly_payment || 0,
      selling_price: item.selling_price || calculateSellingPrice(item.purchase_price, item.margin || 0),
      coefficient: item.coefficient || calculateCoefficient(item.monthly_payment || 0, item.purchase_price, 36)
    });
  };

  const handleFieldChange = (field: string, value: any) => {
    const newValues = { ...editedValues, [field]: value };
    
    // Auto-calculate selling price when purchase price or margin changes
    if (field === 'purchase_price' || field === 'margin') {
      newValues.selling_price = calculateSellingPrice(
        field === 'purchase_price' ? value : newValues.purchase_price,
        field === 'margin' ? value : newValues.margin
      );
    }
    
    // Auto-calculate coefficient when monthly payment or purchase price changes
    if (field === 'monthly_payment' || field === 'purchase_price') {
      newValues.coefficient = calculateCoefficient(
        field === 'monthly_payment' ? value : newValues.monthly_payment,
        field === 'purchase_price' ? value : newValues.purchase_price,
        36
      );
    }
    
    setEditedValues(newValues);
  };

  const handleSave = async () => {
    if (!editingId) return;

    setIsSaving(true);
    try {
      await updateOfferEquipment(editingId, {
        title: editedValues.title,
        purchase_price: editedValues.purchase_price,
        quantity: editedValues.quantity,
        margin: editedValues.margin,
        monthly_payment: editedValues.monthly_payment,
        selling_price: editedValues.selling_price,
        coefficient: editedValues.coefficient
      });
      
      toast.success("Équipement mis à jour avec succès");
      setEditingId(null);
      setEditedValues({});
      refresh();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedValues({});
  };

  const calculateTotals = () => {
    const totalPrice = equipment.reduce((acc, item) => {
      return acc + (item.purchase_price * item.quantity);
    }, 0);

    const totalMonthlyPayment = equipment.reduce((acc, item) => {
      return acc + (item.monthly_payment || 0);
    }, 0);

    const totalSellingPrice = equipment.reduce((acc, item) => {
      const sellingPrice = item.selling_price || calculateSellingPrice(item.purchase_price, item.margin || 0);
      return acc + (sellingPrice * item.quantity);
    }, 0);

    // Calculer la marge totale correctement : Prix de vente total - Prix d'achat total
    const totalMargin = totalSellingPrice - totalPrice;
    
    // Calculer le pourcentage de marge : (marge / prix d'achat) * 100
    const marginPercentage = totalPrice > 0 ? (totalMargin / totalPrice) * 100 : 0;

    // Calculer le coefficient global (total mensualité * 36 / total prix achat)
    const globalCoefficient = totalPrice > 0 ? (totalMonthlyPayment * 36) / totalPrice : 0;

    return { 
      totalPrice, 
      totalMonthlyPayment, 
      totalSellingPrice,
      totalMargin, 
      marginPercentage,
      globalCoefficient 
    };
  };

  const calculateEquipmentMargin = (item: any, totalPurchasePrice: number, totalMargin: number) => {
    // Calculer la proportion de cet équipement dans le total
    const equipmentTotal = item.purchase_price * item.quantity;
    const proportion = totalPurchasePrice > 0 ? equipmentTotal / totalPurchasePrice : 0;
    
    // Répartir la marge totale proportionnellement
    return totalMargin * proportion;
  };

  const handleEditTotalMonthly = () => {
    const totals = calculateTotals();
    setEditedTotalMonthly(totals.totalMonthlyPayment);
    setIsEditingTotalMonthly(true);
  };

  const handleSaveTotalMonthly = async () => {
    const currentTotals = calculateTotals();
    const currentTotal = currentTotals.totalMonthlyPayment;
    
    console.log("🔧 DEBUG - handleSaveTotalMonthly called");
    console.log("🔧 DEBUG - Current total:", currentTotal);
    console.log("🔧 DEBUG - Edited total:", editedTotalMonthly);
    
    if (currentTotal === 0 || editedTotalMonthly === currentTotal) {
      console.log("🔧 DEBUG - No change needed, exiting");
      setIsEditingTotalMonthly(false);
      return;
    }

    setIsSaving(true);
    try {
      // Calculer le ratio de répartition
      const ratio = editedTotalMonthly / currentTotal;
      console.log("🔧 DEBUG - Ratio calculated:", ratio);
      
      // Mettre à jour tous les équipements proportionnellement
      const updatePromises = equipment.map(async (item) => {
        const newMonthlyPayment = (item.monthly_payment || 0) * ratio;
        const newCoefficient = calculateCoefficient(newMonthlyPayment, item.purchase_price, 36);
        // Calculer le nouveau prix de vente basé sur la nouvelle mensualité (36 mois de financement)
        const newSellingPrice = newMonthlyPayment * 36;
        
        console.log(`🔧 DEBUG - Updating equipment ${item.id}:`, {
          oldMonthlyPayment: item.monthly_payment,
          newMonthlyPayment,
          newCoefficient,
          newSellingPrice
        });
        
        return updateOfferEquipment(item.id, {
          monthly_payment: newMonthlyPayment,
          coefficient: newCoefficient,
          selling_price: newSellingPrice
        });
      });

      await Promise.all(updatePromises);
      
      toast.success("Mensualités et prix de vente mis à jour proportionnellement");
      setIsEditingTotalMonthly(false);
      refresh();
    } catch (error) {
      console.error("Erreur lors de la mise à jour des mensualités:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelTotalMonthly = () => {
    setIsEditingTotalMonthly(false);
    setEditedTotalMonthly(0);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Équipements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement des équipements...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Équipements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Erreur lors du chargement des équipements
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!equipment.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Équipements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucun équipement trouvé
          </div>
        </CardContent>
      </Card>
    );
  }

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Équipements
          <Badge variant="secondary">{equipment.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Description</TableHead>
                <TableHead className="text-center">Qté</TableHead>
                <TableHead className="text-right">Prix d'achat</TableHead>
                <TableHead className="text-right">Marge (%)</TableHead>
                <TableHead className="text-right">Prix de vente</TableHead>
                <TableHead className="text-right">Mensualité</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => {
                const isEditing = editingId === item.id;
                const values = isEditing ? editedValues : item;
                const totalPrice = values.purchase_price * values.quantity;
                const equipmentMargin = calculateEquipmentMargin(item, totals.totalPrice, totals.totalMargin);
                const attributes = formatAttributes(item.attributes);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        {isEditing ? (
                          <Input
                            value={values.title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            className="font-medium"
                          />
                        ) : (
                          <div className="font-medium">{item.title}</div>
                        )}
                        {attributes && (
                          <div className="text-sm text-muted-foreground">
                            {attributes}
                          </div>
                        )}
                        {item.serial_number && (
                          <div className="text-xs text-muted-foreground">
                            S/N: {item.serial_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={values.quantity}
                          onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 1)}
                          className="w-16 text-center"
                          min="1"
                        />
                      ) : (
                        <Badge variant="outline">{item.quantity}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={values.purchase_price}
                          onChange={(e) => handleFieldChange('purchase_price', parseFloat(e.target.value) || 0)}
                          className="w-32 text-right"
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <span className="font-mono">{formatPrice(item.purchase_price)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={values.margin || 0}
                          onChange={(e) => handleFieldChange('margin', parseFloat(e.target.value) || 0)}
                          className="w-20 text-right"
                          step="0.1"
                          min="0"
                        />
                      ) : (
                        <span className="font-mono">{(item.margin || 0).toFixed(1)}%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={values.selling_price || 0}
                          onChange={(e) => handleFieldChange('selling_price', parseFloat(e.target.value) || 0)}
                          className="w-32 text-right"
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <span className="font-mono text-green-600">
                          {formatPrice(item.selling_price || calculateSellingPrice(item.purchase_price, item.margin || 0))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={values.monthly_payment || 0}
                          onChange={(e) => handleFieldChange('monthly_payment', parseFloat(e.target.value) || 0)}
                          className="w-32 text-right"
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <span className="font-mono text-blue-600">
                          {formatPrice(item.monthly_payment || 0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <div className="flex gap-1 justify-center">
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
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Ligne de totaux - Compacte avec police plus petite */}
              <TableRow className="border-t-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                <TableCell className="py-4">
                  <div className="font-bold text-base text-primary">TOTAUX</div>
                </TableCell>
                
                <TableCell className="text-center py-4">
                  <div className="font-bold text-sm">
                    {equipment.reduce((acc, item) => acc + item.quantity, 0)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <div className="font-mono font-bold text-base text-foreground">
                    {formatPrice(totals.totalPrice)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <div className="font-mono font-bold text-base text-green-600">
                    {formatPrice(totals.totalMargin)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <div className="font-mono font-bold text-base text-blue-600">
                    {formatPrice(totals.totalSellingPrice)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  {isEditingTotalMonthly ? (
                    <div className="flex items-center gap-2 justify-end">
                      <Input
                        type="number"
                        value={editedTotalMonthly}
                        onChange={(e) => setEditedTotalMonthly(parseFloat(e.target.value) || 0)}
                        className="w-28 text-right font-mono text-sm"
                        step="0.01"
                        min="0"
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveTotalMonthly}
                          disabled={isSaving}
                          className="h-7 w-7 p-0"
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelTotalMonthly}
                          disabled={isSaving}
                          className="h-7 w-7 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 justify-end">
                      <div className="font-mono font-bold text-base text-blue-600">
                        {formatPrice(totals.totalMonthlyPayment)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditTotalMonthly}
                        className="p-2 h-7 w-7 hover:bg-muted"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                
                <TableCell className="py-4"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        {/* Global Margin Editor */}
        <div className="mt-6 pt-4 border-t">
          <GlobalMarginEditor
            offer={offer}
            totalPurchasePrice={totals.totalPrice}
            totalMonthlyPayment={totals.totalMonthlyPayment}
            displayMargin={formatPrice(totals.totalMargin)}
            marginPercentage={totals.marginPercentage}
            leaser={offer.leaser_id ? { id: offer.leaser_id, name: "Grenke Lease", ranges: [] } : null}
            equipment={equipment}
            onUpdate={refresh}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default NewEquipmentSection;