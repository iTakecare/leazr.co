import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Save, X, Edit3, Calculator, Trash2, ImageIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AddCustomEquipmentDialog from "./AddCustomEquipmentDialog";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";
import { calculateOfferMargin } from "@/utils/marginCalculations";
import { useQueryClient } from '@tanstack/react-query';
import { updateOfferEquipment, deleteOfferEquipment } from "@/services/offers/offerEquipment";
import { GlobalMarginEditor } from "./GlobalMarginEditor";
import { toast } from "sonner";
import { getLeaserById } from "@/services/leaserService";
import { Leaser } from "@/types/equipment";
import { calculateSalePriceWithLeaser, getCoefficientFromLeaser } from "@/utils/leaserCalculator";
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
    duration?: number;
  };
  onOfferUpdate?: () => void;
}

const NewEquipmentSection: React.FC<NewEquipmentSectionProps> = ({ offer, onOfferUpdate }) => {
  const { equipment, loading, error, refresh } = useOfferEquipment(offer.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTotalMonthly, setIsEditingTotalMonthly] = useState(false);
  const [editedTotalMonthly, setEditedTotalMonthly] = useState(0);
  const [leaser, setLeaser] = useState<Leaser | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Load leaser data
  useEffect(() => {
    const loadLeaser = async () => {
      if (offer.leaser_id) {
        try {
          const leaserData = await getLeaserById(offer.leaser_id);
          setLeaser(leaserData);
        } catch (error) {
          console.error("Error loading leaser:", error);
        }
      }
    };
    
    loadLeaser();
  }, [offer.leaser_id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const formatAttributes = (attributes: Array<{ key: string; value: string }> = []) => {
    if (!attributes.length) return [];
    return attributes;
  };

  // Calculate selling price automatically
  const calculateSellingPrice = (purchasePrice: number, margin: number) => {
    return purchasePrice * (1 + margin / 100);
  };

  // Calculate coefficient automatically (mensualité / prix_achat)
  const calculateCoefficient = (monthlyPayment: number, purchasePrice: number) => {
    return purchasePrice > 0 ? monthlyPayment / purchasePrice : 0;
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
      coefficient: item.coefficient || calculateCoefficient(item.monthly_payment || 0, item.purchase_price)
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
        field === 'purchase_price' ? value : newValues.purchase_price
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
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      onOfferUpdate?.();
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

  const handleDelete = async (equipmentId: string, equipmentTitle: string) => {
    setIsDeletingId(equipmentId);
    try {
      await deleteOfferEquipment(equipmentId);
      toast.success(`Équipement "${equipmentTitle}" supprimé avec succès`);
      refresh();
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      onOfferUpdate?.();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression de l'équipement");
    } finally {
      setIsDeletingId(null);
    }
  };

  const calculateTotals = () => {
    const totalPrice = equipment.reduce((acc, item) => {
      return acc + (item.purchase_price * item.quantity);
    }, 0);

    const totalMonthlyPayment = equipment.reduce((acc, item) => {
      const qty = Number(item.quantity) || 1;
      const unitMonthly = Number(item.monthly_payment) || 0;
      return acc + unitMonthly * qty;
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
    if (!editedTotalMonthly || editedTotalMonthly <= 0) {
      toast.error("Veuillez entrer une mensualité totale valide");
      return;
    }

    setIsSaving(true);
    
    try {
      const currentTotalPurchasePrice = equipment.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
      
      if (currentTotalPurchasePrice === 0) {
        toast.error("Impossible de calculer avec un prix d'achat total de 0");
        return;
      }
      
      // ÉTAPE 1: Calculer le montant financé total avec le coefficient correct du leaser
      // Utiliser la logique du leaser pour trouver le montant financé exact
      const calculatedFinancedAmount = calculateSalePriceWithLeaser(editedTotalMonthly, leaser, offer.duration || 36);
      
      // Forcer l'arrondi à exactement 2 décimales (comme Excel)
      const totalFinancedAmount = parseFloat(calculatedFinancedAmount.toFixed(2));
      
      // ÉTAPE 2: Calculer le coefficient global de répartition
      const globalCoefficient = totalFinancedAmount / currentTotalPurchasePrice;
      
      console.log("🔥 TOTAL MONTHLY - Leaser Logic Calculation:", {
        currentTotalPurchasePrice,
        editedTotalMonthly,
        totalFinancedAmount,
        globalCoefficient,
        leaserName: leaser?.name,
        duration: offer.duration || 36
      });
      
      // ÉTAPE 3: Répartir proportionnellement sur chaque équipement
      const updatePromises = equipment.map(async (item) => {
         // Prix de vente unitaire = Prix d'achat × Coefficient global (arrondi à 2 décimales)
         const newSellingPrice = Math.round(item.purchase_price * globalCoefficient * 100) / 100;
         
         // Répartir proportionnellement la mensualité totale saisie par l'utilisateur (arrondi à 2 décimales)
         const itemWeight = item.purchase_price * item.quantity;
         const newMonthlyPayment = Math.round(editedTotalMonthly * (itemWeight / currentTotalPurchasePrice) * 100) / 100;
         const leaserCoefficient = getCoefficientFromLeaser(leaser, newSellingPrice * item.quantity, offer.duration || 36);
         
         // Marge = ((Prix de vente - Prix d'achat) / Prix d'achat) × 100 (arrondi à 2 décimales)
         const newMargin = item.purchase_price > 0 ? 
           Math.round(((newSellingPrice - item.purchase_price) / item.purchase_price) * 100 * 100) / 100 : 0;
        
        console.log(`🔥 TOTAL MONTHLY - Item ${item.id}:`, {
          purchasePrice: item.purchase_price,
          quantity: item.quantity,
          newSellingPrice,
          itemWeight,
          newMonthlyPayment,
          newMargin,
          globalCoefficient
        });
        
        return updateOfferEquipment(item.id, {
          monthly_payment: newMonthlyPayment,
          selling_price: newSellingPrice,
          margin: newMargin,
          coefficient: leaserCoefficient
        });
      });

      await Promise.all(updatePromises);
      
      await refresh();
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      setIsEditingTotalMonthly(false);
      onOfferUpdate?.();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour de la mensualité totale");
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Équipements
            <Badge variant="secondary">{equipment.length}</Badge>
          </div>
          <AddCustomEquipmentDialog 
            offerId={offer.id} 
            onEquipmentAdded={() => {
              refresh();
              queryClient.invalidateQueries({ queryKey: ['offers'] });
              onOfferUpdate?.();
            }}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="max-w-[200px]">Description</TableHead>
                <TableHead className="text-center">Qté</TableHead>
                <TableHead className="text-right">P.A. unitaire</TableHead>
                <TableHead className="text-right">P.A. total</TableHead>
                <TableHead className="text-right">Marge (%)</TableHead>
                <TableHead className="text-right">Marge (€)</TableHead>
                <TableHead className="text-right">Prix de vente</TableHead>
                <TableHead className="text-right">Mensualité unit.</TableHead>
                <TableHead className="text-right">Total mensuel</TableHead>
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
                    <TableCell className="w-[50px]">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.title}
                          className="w-10 h-10 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
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
                        {attributes && attributes.length > 0 && (
                          <div className="flex flex-col gap-0.5 mt-1">
                            {attributes.map((attr, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs font-normal py-0 px-1.5">
                                {attr.key}: {attr.value}
                              </Badge>
                            ))}
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
                        <span>{formatPrice(item.purchase_price)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span>{formatPrice(item.purchase_price * item.quantity)}</span>
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
                        <span>{(item.margin || 0).toFixed(1)}%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600">
                        {formatPrice(equipmentMargin)}
                      </span>
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
                        <span className="text-green-600">
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
                        <span className="text-blue-600">
                          {formatPrice(item.monthly_payment || 0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <span className="text-purple-600 font-semibold">
                          {formatPrice((values.monthly_payment || 0) * values.quantity)}
                        </span>
                      ) : (
                        <span className="text-purple-600 font-semibold">
                          {formatPrice((item.monthly_payment || 0) * item.quantity)}
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
                         <div className="flex gap-1 justify-center">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleEdit(item)}
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 disabled={isDeletingId === item.id}
                               >
                                 {isDeletingId === item.id ? (
                                   <Loader2 className="w-4 h-4 animate-spin" />
                                 ) : (
                                   <Trash2 className="w-4 h-4 text-destructive" />
                                 )}
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Supprimer l'équipement</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Êtes-vous sûr de vouloir supprimer l'équipement "{item.title}" ? 
                                   Cette action est irréversible.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Annuler</AlertDialogCancel>
                                 <AlertDialogAction 
                                   onClick={() => handleDelete(item.id, item.title)}
                                   className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                 >
                                   Supprimer
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         </div>
                       )}
                     </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Ligne de totaux - Compacte avec police plus petite */}
              <TableRow className="border-t-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                <TableCell className="py-4"></TableCell>
                
                <TableCell className="py-4">
                  <div className="font-bold text-base text-primary">TOTAUX</div>
                </TableCell>
                
                <TableCell className="text-center py-4">
                  <div className="font-bold text-sm">
                    {equipment.reduce((acc, item) => acc + item.quantity, 0)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <span className="text-muted-foreground text-sm">—</span>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <div className="font-bold text-base text-foreground">
                    {formatPrice(totals.totalPrice)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <div className="font-bold text-base text-foreground">
                    {totals.marginPercentage.toFixed(1)}%
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <div className="font-bold text-base text-green-600">
                    {formatPrice(totals.totalMargin)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <div className="font-bold text-base text-blue-600">
                    {formatPrice(totals.totalSellingPrice)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <span className="text-muted-foreground text-sm">—</span>
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
                      <div className="font-bold text-base text-purple-600">
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