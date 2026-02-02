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
import { calculateEquipmentResults, findCoefficientForAmount } from "@/utils/equipmentCalculations";
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
    coefficient?: number;
    down_payment?: number;
    is_purchase?: boolean; // Mode achat direct
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
  const [editedTotalMonthlyInput, setEditedTotalMonthlyInput] = useState("");
  const [leaser, setLeaser] = useState<Leaser | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
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
    
    // Auto-calculate selling price ONLY when purchase price or margin changes
    // BUT NOT if user is editing selling_price directly
    if (field === 'purchase_price' || field === 'margin') {
      newValues.selling_price = calculateSellingPrice(
        field === 'purchase_price' ? value : newValues.purchase_price,
        field === 'margin' ? value : newValues.margin
      );
    }
    
    // If user edits selling_price directly, recalculate margin to match
    if (field === 'selling_price') {
      const purchasePrice = newValues.purchase_price || 0;
      if (purchasePrice > 0) {
        newValues.margin = ((value / purchasePrice) - 1) * 100;
      }
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

  // Détection du mode achat
  const isPurchase = offer.is_purchase === true;

  const calculateTotals = () => {
    // Calculer les totaux directement à partir des valeurs stockées en BD
    const totalPrice = equipment.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
    const totalMonthlyPayment = equipment.reduce((sum, item) => sum + (Number(item.monthly_payment) || 0), 0);
    
    // P.V. total = somme des (selling_price * quantity) si disponible, sinon calcul par marge
    const totalSellingPrice = equipment.reduce((sum, item) => {
      if (item.selling_price && item.selling_price > 0) {
        return sum + (item.selling_price * item.quantity);
      }
      const calculatedPrice = item.purchase_price * (1 + (item.margin || 0) / 100);
      return sum + (calculatedPrice * item.quantity);
    }, 0);
    
    // MODE ACHAT: utiliser directement le prix de vente total, pas la formule Grenke
    // MODE LEASING: Utiliser la formule inverse Grenke pour le montant financé
    const coefficient = offer.coefficient || 0;
    let effectiveFinancedAmount: number;
    
    if (isPurchase) {
      // En mode achat, le montant financé = prix de vente total (pas de formule Grenke)
      effectiveFinancedAmount = totalSellingPrice;
    } else {
      // En mode leasing: Montant financé = Mensualité × 100 / Coefficient
      effectiveFinancedAmount = coefficient > 0 && totalMonthlyPayment > 0
        ? (totalMonthlyPayment * 100) / coefficient
        : totalSellingPrice;
    }
    
    // Marge = Montant financé - Prix d'achat total
    const totalMargin = effectiveFinancedAmount - totalPrice;
    const marginPercentage = totalPrice > 0 ? (totalMargin / totalPrice) * 100 : 0;
    const globalCoefficient = totalPrice > 0 ? totalMonthlyPayment / totalPrice : 0;

    // Calculs avec acompte (seulement en mode leasing)
    const downPayment = isPurchase ? 0 : (offer.down_payment || 0);
    const financedAfterDownPayment = Math.max(0, effectiveFinancedAmount - downPayment);
    const adjustedMonthlyPayment = !isPurchase && downPayment > 0 && coefficient > 0
      ? (financedAfterDownPayment * coefficient) / 100
      : totalMonthlyPayment;

    return { 
      totalPrice, 
      totalMonthlyPayment, 
      totalSellingPrice,
      effectiveFinancedAmount,
      totalMargin, 
      marginPercentage,
      globalCoefficient,
      downPayment,
      financedAfterDownPayment,
      adjustedMonthlyPayment
    };
  };

  // Pré-calculer tous les P.V. répartis avec ajustement pour que la somme soit exacte (méthode Largest Remainder)
  // MODE ACHAT: Calcul direct par ligne (PA * (1 + marge%)), pas de répartition
  // MODE LEASING: Répartition proportionnelle pour équilibrer
  const calculateAllSellingPrices = (equipmentList: any[], totalPurchasePrice: number, totalSellingPrice: number): Record<string, number> => {
    if (equipmentList.length === 0 || totalPurchasePrice === 0) {
      return {};
    }

    const adjustedPrices: Record<string, number> = {};
    
    // MODE ACHAT: Calcul direct par ligne, pas de répartition
    if (isPurchase) {
      equipmentList.forEach(item => {
        const equipmentPurchaseTotal = item.purchase_price * item.quantity;
        
        // Priorité 1: selling_price stocké en BD
        if (item.selling_price !== null && item.selling_price !== undefined && item.selling_price > 0) {
          adjustedPrices[item.id] = Math.round(item.selling_price * item.quantity * 100) / 100;
        } 
        // Priorité 2: Calcul depuis la marge de la ligne
        else {
          const marginPercent = item.margin || 0;
          const sellingPriceUnit = item.purchase_price * (1 + marginPercent / 100);
          adjustedPrices[item.id] = Math.round(sellingPriceUnit * item.quantity * 100) / 100;
        }
      });
      return adjustedPrices;
    }
    
    // MODE LEASING: Répartition proportionnelle basée sur le total Grenke
    // Les selling_price stockés en BD sont ignorés SAUF s'ils ont été manuellement définis
    // (écart > 1€ avec le prix proportionnel attendu)
    
    // Étape 1: Calculer le prix proportionnel attendu pour chaque équipement
    const proportionalPrices: Record<string, number> = {};
    equipmentList.forEach(item => {
      const equipmentTotal = item.purchase_price * item.quantity;
      const proportion = equipmentTotal / totalPurchasePrice;
      proportionalPrices[item.id] = totalSellingPrice * proportion;
    });
    
    // Étape 2: Identifier les équipements avec un prix manuellement défini (écart > 1€)
    let totalManualSellingPrice = 0;
    let totalManualPurchasePrice = 0;
    
    equipmentList.forEach(item => {
      const equipmentPurchaseTotal = item.purchase_price * item.quantity;
      const proportionalPrice = proportionalPrices[item.id];
      
      if (item.selling_price !== null && item.selling_price !== undefined && item.selling_price > 0) {
        const storedTotal = item.selling_price * item.quantity;
        const difference = Math.abs(storedTotal - proportionalPrice);
        
        // Si l'écart est > 1€, considérer comme prix manuel à préserver
        if (difference > 1) {
          adjustedPrices[item.id] = Math.round(storedTotal * 100) / 100;
          totalManualSellingPrice += storedTotal;
          totalManualPurchasePrice += equipmentPurchaseTotal;
        }
      }
    });

    // Étape 3: Calculer le reste à répartir pour les équipements sans prix manuel
    const remainingSellingPrice = totalSellingPrice - totalManualSellingPrice;
    const remainingPurchasePrice = totalPurchasePrice - totalManualPurchasePrice;
    
    // Étape 4: Répartir proportionnellement le reste (méthode Largest Remainder)
    const itemsToDistribute = equipmentList.filter(item => !adjustedPrices[item.id]);
    
    if (itemsToDistribute.length > 0 && remainingPurchasePrice > 0) {
      const rawPrices = itemsToDistribute.map(item => {
        const equipmentTotal = item.purchase_price * item.quantity;
        const proportion = equipmentTotal / remainingPurchasePrice;
        const rawSellingPrice = remainingSellingPrice * proportion;
        const roundedPrice = Math.round(rawSellingPrice * 100) / 100;
        return {
          id: item.id,
          rawPrice: rawSellingPrice,
          roundedPrice: roundedPrice,
          remainder: rawSellingPrice - roundedPrice
        };
      });

      const sumRounded = rawPrices.reduce((sum, p) => sum + p.roundedPrice, 0);
      let differenceInCents = Math.round((remainingSellingPrice - sumRounded) * 100);
      const sortedByRemainder = [...rawPrices].sort((a, b) => Math.abs(b.remainder) - Math.abs(a.remainder));
      
      rawPrices.forEach(p => {
        adjustedPrices[p.id] = p.roundedPrice;
      });

      for (let i = 0; i < Math.abs(differenceInCents) && i < sortedByRemainder.length; i++) {
        const id = sortedByRemainder[i].id;
        adjustedPrices[id] += differenceInCents > 0 ? 0.01 : -0.01;
        adjustedPrices[id] = Math.round(adjustedPrices[id] * 100) / 100;
      }
    }

    return adjustedPrices;
  };

  // Pré-calculer toutes les marges réparties avec ajustement (méthode Largest Remainder)
  // MODE ACHAT: Calcul direct par ligne (PV - PA), pas de répartition
  // MODE LEASING: Répartition proportionnelle pour équilibrer
  const calculateAllMargins = (equipmentList: any[], totalPurchasePrice: number, totalMargin: number, adjustedSellingPrices: Record<string, number>): Record<string, number> => {
    if (equipmentList.length === 0 || totalPurchasePrice === 0) {
      return {};
    }

    const adjustedMargins: Record<string, number> = {};
    
    // MODE ACHAT: Calcul direct par ligne, pas de répartition
    if (isPurchase) {
      equipmentList.forEach(item => {
        const equipmentPurchaseTotal = item.purchase_price * item.quantity;
        const sellingPriceTotal = adjustedSellingPrices[item.id] || 0;
        const margin = sellingPriceTotal - equipmentPurchaseTotal;
        adjustedMargins[item.id] = Math.round(margin * 100) / 100;
      });
      return adjustedMargins;
    }
    
    // MODE LEASING: Répartition proportionnelle (logique existante)
    // Étape 1: Calculer les marges pour les équipements avec selling_price stocké en BD
    let totalManualMargin = 0;
    let totalManualPurchasePrice = 0;
    
    equipmentList.forEach(item => {
      const equipmentPurchaseTotal = item.purchase_price * item.quantity;
      
      // Si un selling_price est stocké en BD, calculer la marge réelle
      if (item.selling_price !== null && item.selling_price !== undefined && item.selling_price > 0) {
        const totalSellingPriceForItem = item.selling_price * item.quantity;
        const margin = totalSellingPriceForItem - equipmentPurchaseTotal;
        adjustedMargins[item.id] = Math.round(margin * 100) / 100;
        totalManualMargin += margin;
        totalManualPurchasePrice += equipmentPurchaseTotal;
      }
    });

    // Étape 2: Répartir le reste de la marge
    const remainingMargin = totalMargin - totalManualMargin;
    const remainingPurchasePrice = totalPurchasePrice - totalManualPurchasePrice;
    
    const itemsToDistribute = equipmentList.filter(item => !adjustedMargins[item.id]);
    
    if (itemsToDistribute.length > 0 && remainingPurchasePrice > 0) {
      const rawMargins = itemsToDistribute.map(item => {
        const equipmentTotal = item.purchase_price * item.quantity;
        const proportion = equipmentTotal / remainingPurchasePrice;
        const rawMargin = remainingMargin * proportion;
        const roundedMargin = Math.round(rawMargin * 100) / 100;
        return {
          id: item.id,
          rawMargin: rawMargin,
          roundedMargin: roundedMargin,
          remainder: rawMargin - roundedMargin
        };
      });

      const sumRounded = rawMargins.reduce((sum, m) => sum + m.roundedMargin, 0);
      let differenceInCents = Math.round((remainingMargin - sumRounded) * 100);
      const sortedByRemainder = [...rawMargins].sort((a, b) => Math.abs(b.remainder) - Math.abs(a.remainder));
      
      rawMargins.forEach(m => {
        adjustedMargins[m.id] = m.roundedMargin;
      });

      for (let i = 0; i < Math.abs(differenceInCents) && i < sortedByRemainder.length; i++) {
        const id = sortedByRemainder[i].id;
        adjustedMargins[id] += differenceInCents > 0 ? 0.01 : -0.01;
        adjustedMargins[id] = Math.round(adjustedMargins[id] * 100) / 100;
      }
    }

    return adjustedMargins;
  };

  const handleEditTotalMonthly = () => {
    const totals = calculateTotals();
    setEditedTotalMonthly(totals.totalMonthlyPayment);
    setEditedTotalMonthlyInput(totals.totalMonthlyPayment.toFixed(2).replace('.', ','));
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
      const calculatedFinancedAmount = calculateSalePriceWithLeaser(editedTotalMonthly, leaser, offer.duration || 36);
      const totalFinancedAmount = parseFloat(calculatedFinancedAmount.toFixed(2));
      
      // ÉTAPE 2: Calculer le coefficient global de répartition
      const globalCoefficient = totalFinancedAmount / currentTotalPurchasePrice;
      
      // ÉTAPE 3: Répartir la mensualité avec la méthode Largest Remainder pour que la somme soit EXACTE
      const rawDistributed = equipment.map(item => {
        const itemWeight = item.purchase_price * item.quantity;
        const rawMonthlyPayment = editedTotalMonthly * (itemWeight / currentTotalPurchasePrice);
        const roundedPayment = Math.floor(rawMonthlyPayment * 100) / 100; // Arrondi vers le bas
        return {
          item,
          rawPayment: rawMonthlyPayment,
          roundedPayment,
          remainder: (rawMonthlyPayment * 100) - Math.floor(rawMonthlyPayment * 100) // Reste en centimes
        };
      });

      // Calculer les centimes restants à distribuer
      const sumRounded = rawDistributed.reduce((sum, d) => sum + d.roundedPayment, 0);
      let remainingCents = Math.round((editedTotalMonthly - sumRounded) * 100);

      // Distribuer les centimes aux lignes avec le plus grand reste
      const sortedByRemainder = [...rawDistributed].sort((a, b) => b.remainder - a.remainder);
      const finalPayments: Record<string, number> = {};

      rawDistributed.forEach(d => {
        finalPayments[d.item.id] = d.roundedPayment;
      });

      for (let i = 0; i < remainingCents && i < sortedByRemainder.length; i++) {
        finalPayments[sortedByRemainder[i].item.id] = Math.round((finalPayments[sortedByRemainder[i].item.id] + 0.01) * 100) / 100;
      }
      
      // ÉTAPE 4: Mettre à jour chaque équipement avec sa mensualité exacte
      const updatePromises = equipment.map(async (item) => {
        const newSellingPrice = Math.round(item.purchase_price * globalCoefficient * 100) / 100;
        const newMonthlyPayment = finalPayments[item.id];
        const leaserCoefficient = getCoefficientFromLeaser(leaser, newSellingPrice * item.quantity, offer.duration || 36);
        const newMargin = item.purchase_price > 0 ? 
          Math.round(((newSellingPrice - item.purchase_price) / item.purchase_price) * 100 * 100) / 100 : 0;
        
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
      setEditedTotalMonthlyInput("");
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
    setEditedTotalMonthlyInput("");
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
  
  // Pré-calculer les prix de vente et marges ajustés (méthode Largest Remainder)
  // MODE LEASING: Utiliser effectiveFinancedAmount (formule Grenke) pour la répartition
  // MODE ACHAT: Utiliser totalSellingPrice (somme des PV individuels)
  const targetSellingPriceTotal = isPurchase ? totals.totalSellingPrice : totals.effectiveFinancedAmount;
  const adjustedSellingPrices = calculateAllSellingPrices(equipment, totals.totalPrice, targetSellingPriceTotal);
  const adjustedMargins = calculateAllMargins(equipment, totals.totalPrice, totals.totalMargin, adjustedSellingPrices);

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
                <TableHead className="text-right whitespace-nowrap">
                  <div>P.A.</div>
                  <div>unitaire</div>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  <div>P.A.</div>
                  <div>total</div>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  <div>P.V.</div>
                  <div>unitaire</div>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  <div>P.V.</div>
                  <div>total</div>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  <div>Marge</div>
                  <div>(%)</div>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  <div>Marge</div>
                  <div>(€)</div>
                </TableHead>
                {!isPurchase && (
                  <TableHead className="text-right whitespace-nowrap">
                    <div>Mens.</div>
                    <div>unitaire</div>
                  </TableHead>
                )}
                {!isPurchase && (
                  <TableHead className="text-right whitespace-nowrap">
                    <div>Total</div>
                    <div>mensuel</div>
                  </TableHead>
                )}
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => {
                const isEditing = editingId === item.id;
                const values = isEditing ? editedValues : item;
                const totalPrice = values.purchase_price * values.quantity;
                const equipmentSellingPrice = adjustedSellingPrices[item.id] || 0;
                const equipmentMargin = adjustedMargins[item.id] || 0;
                const attributes = formatAttributes(item.attributes);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="w-[60px]">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.title}
                          className="w-12 h-12 object-contain rounded border bg-white p-0.5"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
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
                          type="text"
                          inputMode="decimal"
                          value={inputValues[`${item.id}_purchase_price`] ?? values.purchase_price}
                          onChange={(e) => {
                            setInputValues(prev => ({
                              ...prev,
                              [`${item.id}_purchase_price`]: e.target.value
                            }));
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.replace(',', '.');
                            const numValue = parseFloat(value);
                            handleFieldChange('purchase_price', isNaN(numValue) ? 0 : numValue);
                            setInputValues(prev => {
                              const copy = {...prev};
                              delete copy[`${item.id}_purchase_price`];
                              return copy;
                            });
                          }}
                          className="w-32 text-right"
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
                          type="text"
                          inputMode="decimal"
                          value={inputValues[`${item.id}_selling_price`] ?? (values.selling_price || 0)}
                          onChange={(e) => {
                            setInputValues(prev => ({
                              ...prev,
                              [`${item.id}_selling_price`]: e.target.value
                            }));
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.replace(',', '.');
                            const numValue = parseFloat(value);
                            handleFieldChange('selling_price', isNaN(numValue) ? 0 : numValue);
                            setInputValues(prev => {
                              const copy = {...prev};
                              delete copy[`${item.id}_selling_price`];
                              return copy;
                            });
                          }}
                          className="w-28 text-right"
                        />
                      ) : (
                        <span className="text-green-600">
                          {formatPrice(equipmentSellingPrice / item.quantity)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600">
                        {formatPrice(equipmentSellingPrice)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={inputValues[`${item.id}_margin`] ?? (values.margin || 0)}
                          onChange={(e) => {
                            setInputValues(prev => ({
                              ...prev,
                              [`${item.id}_margin`]: e.target.value
                            }));
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.replace(',', '.');
                            const numValue = parseFloat(value);
                            handleFieldChange('margin', isNaN(numValue) ? 0 : numValue);
                            setInputValues(prev => {
                              const copy = {...prev};
                              delete copy[`${item.id}_margin`];
                              return copy;
                            });
                          }}
                          className="w-20 text-right"
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
                    {!isPurchase && (
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={inputValues[`${item.id}_monthly_payment`] ?? (values.monthly_payment || 0)}
                            onChange={(e) => {
                              setInputValues(prev => ({
                                ...prev,
                                [`${item.id}_monthly_payment`]: e.target.value
                              }));
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.replace(',', '.');
                              const numValue = parseFloat(value);
                              handleFieldChange('monthly_payment', isNaN(numValue) ? 0 : numValue);
                              setInputValues(prev => {
                                const copy = {...prev};
                                delete copy[`${item.id}_monthly_payment`];
                                return copy;
                              });
                            }}
                            className="w-32 text-right"
                          />
                        ) : (
                          <span className="text-blue-600">
                            {formatPrice((item.monthly_payment || 0) / (item.quantity || 1))}
                          </span>
                        )}
                      </TableCell>
                    )}
                    {!isPurchase && (
                      <TableCell className="text-right">
                        {isEditing ? (
                          <span className="text-purple-600 font-semibold">
                            {formatPrice(values.monthly_payment || 0)}
                          </span>
                        ) : (
                          <span className="text-purple-600 font-semibold">
                            {formatPrice(item.monthly_payment || 0)}
                          </span>
                        )}
                      </TableCell>
                    )}
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
                  <span className="text-muted-foreground text-sm">—</span>
                </TableCell>
                
                <TableCell className="text-right py-4">
                  <div className="font-bold text-base text-green-600">
                    {formatPrice(totals.effectiveFinancedAmount)}
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
                
                {!isPurchase && (
                  <TableCell className="text-right py-4">
                    <span className="text-muted-foreground text-sm">—</span>
                  </TableCell>
                )}
                
                {!isPurchase && (
                  <TableCell className="text-right py-4">
                    {isEditingTotalMonthly ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editedTotalMonthlyInput}
                          onChange={(e) => {
                            setEditedTotalMonthlyInput(e.target.value);
                            const value = e.target.value.replace(',', '.');
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              setEditedTotalMonthly(numValue);
                            }
                          }}
                          className="w-28 text-right font-mono text-sm"
                          placeholder="0,00"
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
                )}
                
                <TableCell className="py-4"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        {/* Section Acompte si présent - seulement en mode leasing */}
        {!isPurchase && totals.downPayment > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-amber-800 mb-3">Acompte versé</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-amber-700">Acompte : </span>
                <span className="font-bold text-amber-600">{formatPrice(totals.downPayment)}</span>
              </div>
              <div>
                <span className="text-amber-700">Montant financé après acompte : </span>
                <span className="font-bold text-amber-600">{formatPrice(totals.financedAfterDownPayment)}</span>
              </div>
              <div>
                <span className="text-amber-700">Mensualité après acompte : </span>
                <span className="font-bold text-amber-600">{formatPrice(totals.adjustedMonthlyPayment)}</span>
              </div>
            </div>
          </div>
        )}

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