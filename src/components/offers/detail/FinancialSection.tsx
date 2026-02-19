import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calculator, Euro, Percent, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { hasCommission } from "@/utils/offerTypeTranslator";
import { calculateOfferMargin, getEffectiveFinancedAmount } from "@/utils/marginCalculations";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";
import { calculateEquipmentResults } from "@/utils/equipmentCalculations";
import { useUpdateOfferMutation } from "@/hooks/offers/useOffersQuery";
import { getLeaserById } from "@/services/leaserService";
import { Leaser } from "@/types/equipment";
import RecalculateFinancialsButton from "./RecalculateFinancialsButton";
import { GlobalMarginEditor } from "./GlobalMarginEditor";
interface FinancialSectionProps {
  offer: any;
  onOfferUpdated?: () => void;
  refreshKey?: number;
}
const FinancialSection: React.FC<FinancialSectionProps> = ({
  offer,
  onOfferUpdated,
  refreshKey
}) => {
  // Use the equipment hook to get structured data
  const { equipment: offerEquipment, loading: equipmentLoading, refresh } = useOfferEquipment(offer.id);
  const { mutateAsync: updateOffer } = useUpdateOfferMutation();
  const [leaser, setLeaser] = useState<Leaser | null>(null);

  // Refresh equipment in this section when parent signals a change
  useEffect(() => {
    if (typeof refreshKey !== 'undefined') {
      refresh();
    }
  }, [refreshKey, refresh]);

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
  
  // Vérifier si ce type d'offre a une commission
  const shouldShowCommission = hasCommission(offer.type);

  // Calculer les totaux des équipements si disponibles
  const calculateEquipmentTotals = () => {
    // Use structured equipment data if available
    if (offerEquipment && offerEquipment.length > 0) {
      return offerEquipment.reduce((acc: any, item: any) => {
        const purchasePrice = parseFloat(item.purchase_price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const monthlyPayment = parseFloat(item.monthly_payment) || 0;
        const marginPercent = parseFloat(item.margin) || 0;
        const sellingPrice = parseFloat(item.selling_price) || (purchasePrice > 0 ? purchasePrice * (1 + marginPercent / 100) : 0);
        return {
          totalPurchasePrice: acc.totalPurchasePrice + purchasePrice * quantity,
          totalMonthlyPayment: acc.totalMonthlyPayment + monthlyPayment,
          totalSellingPrice: acc.totalSellingPrice + sellingPrice * quantity
        };
      }, {
        totalPurchasePrice: 0,
        totalMonthlyPayment: 0,
        totalSellingPrice: 0
      });
    }

    // Fallback: Try to parse equipment from equipment_description
    let equipmentList = [];
    if (offer.equipment_description) {
      try {
        const parsedEquipment = JSON.parse(offer.equipment_description);
        if (Array.isArray(parsedEquipment)) {
          equipmentList = parsedEquipment;
        }
      } catch (e) {
        console.warn("Could not parse equipment_description as JSON");
      }
    }

    // Si on a des équipements parsés, calculer depuis ces données
    if (equipmentList.length > 0) {
      return equipmentList.reduce((acc: any, item: any) => {
        // Utiliser purchasePrice ou purchase_price pour le prix d'achat
        const purchasePrice = parseFloat(item.purchasePrice || item.purchase_price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        // Utiliser monthlyPayment ou monthly_payment pour la mensualité
        const monthlyPayment = parseFloat(item.monthlyPayment || item.monthly_payment) || 0;
        const marginPercent = parseFloat(item.margin) || 0;
        const explicitSelling = item.selling_price ?? item.sellingPrice;
        const sellingParsed = explicitSelling != null ? parseFloat(explicitSelling) : NaN;
        const sellingPrice = Number.isFinite(sellingParsed) && sellingParsed > 0
          ? sellingParsed
          : (purchasePrice > 0 ? purchasePrice * (1 + marginPercent / 100) : 0);
        return {
          totalPurchasePrice: acc.totalPurchasePrice + purchasePrice * quantity,
          totalMonthlyPayment: acc.totalMonthlyPayment + monthlyPayment,
          totalSellingPrice: acc.totalSellingPrice + sellingPrice * quantity
        };
      }, {
        totalPurchasePrice: 0,
        totalMonthlyPayment: 0,
        totalSellingPrice: 0
      });
    }

    // Fallback: Use offer amount as purchase price for client requests
    // For client requests, the 'amount' field now contains the estimated purchase price
    return {
      totalPurchasePrice: offer.amount || 0,
      totalMonthlyPayment: offer.monthly_payment || 0,
      totalSellingPrice: 0
    };
  };
  const totals = calculateEquipmentTotals();
  
  // Détection du mode achat
  const isPurchase = offer.is_purchase === true;

  // Auto-update offer financials when equipment data is available
  useEffect(() => {
    const updateOfferFinancials = async () => {
      if (offerEquipment && offerEquipment.length > 0 && !equipmentLoading) {
        console.log("🔄 AUTO-UPDATE: Recalculating offer financials based on equipment (isPurchase:", isPurchase, ")");
        
        const currentTotals = calculateEquipmentTotals();
        
        let newFinancedAmount: number;
        let newMonthlyPayment: number;
        
        if (isPurchase) {
          // MODE ACHAT: Pas de mensualité, le montant financé = prix de vente total
          newMonthlyPayment = 0;
          newFinancedAmount = currentTotals.totalSellingPrice > 0 
            ? currentTotals.totalSellingPrice 
            : currentTotals.totalPurchasePrice;
        } else {
          // MODE LEASING: Utiliser la formule Grenke
          newMonthlyPayment = currentTotals.totalMonthlyPayment;
          // Grenke: Mensualité × 100 / Coefficient
          newFinancedAmount = currentTotals.totalMonthlyPayment > 0 && (offer.coefficient || 0) > 0
            ? (currentTotals.totalMonthlyPayment * 100) / offer.coefficient
            : currentTotals.totalSellingPrice > 0
              ? currentTotals.totalSellingPrice
              : currentTotals.totalPurchasePrice;
        }
        
        const newTotalAmount = currentTotals.totalPurchasePrice;
        const newMargin = newFinancedAmount - currentTotals.totalPurchasePrice;
        
        console.log("🔄 AUTO-UPDATE: New calculations:", {
          isPurchase,
          currentAmount: offer.amount,
          newTotalAmount,
          currentMonthlyPayment: offer.monthly_payment,
          newMonthlyPayment,
          currentFinancedAmount: offer.financed_amount,
          newFinancedAmount,
          currentMargin: offer.margin,
          newMargin
        });
        
        // Check if values need updating (avoid unnecessary updates)
        const needsUpdate = (
          Math.abs((offer.amount || 0) - newTotalAmount) > 0.01 ||
          Math.abs((offer.monthly_payment || 0) - newMonthlyPayment) > 0.01 ||
          Math.abs((offer.financed_amount || 0) - newFinancedAmount) > 0.01 ||
          Math.abs((offer.margin || 0) - newMargin) > 0.01
        );
        
        if (needsUpdate) {
          console.log("🔄 AUTO-UPDATE: Values need updating, calling updateOffer");
          try {
            await updateOffer({
              id: offer.id,
              updates: {
                amount: newTotalAmount,
                monthly_payment: newMonthlyPayment,
                financed_amount: newFinancedAmount,
                margin: newMargin
              }
            });
            console.log("✅ AUTO-UPDATE: Offer financials updated successfully");
            // Déclencher le refresh de l'offre parent
            onOfferUpdated?.();
          } catch (error) {
            console.error("❌ AUTO-UPDATE: Failed to update offer financials:", error);
          }
        } else {
          console.log("🔄 AUTO-UPDATE: No update needed, values are current");
        }
      }
    };
    
    updateOfferFinancials();
  }, [offerEquipment, equipmentLoading, offer.id, onOfferUpdated, isPurchase]);
  
  // Calculer le montant financé
  // MODE ACHAT: Prix de vente total directement
  // MODE LEASING: Formule inverse Grenke (Mensualité × 100 / Coefficient)
  const calculateFinancedAmount = () => {
    // MODE ACHAT: utiliser directement le prix de vente
    if (isPurchase) {
      if (totals.totalSellingPrice > 0) {
        return totals.totalSellingPrice;
      }
      // Fallback: financed_amount stocké en base
      if (offer.financed_amount && offer.financed_amount > 0) {
        return offer.financed_amount;
      }
      return totals.totalPurchasePrice;
    }
    
    // MODE LEASING: Priorité 1 - Formule inverse Grenke
    
    
   // MODE LEASING: Priorité 1 - Formule Grenke (source de vérité)
   if (totals.totalMonthlyPayment > 0 && offer.coefficient > 0) {
     return (totals.totalMonthlyPayment * 100) / offer.coefficient;
   }
   
   // Priorité 2: Somme des prix de vente (fallback)
   if (totals.totalSellingPrice > 0) {
     return totals.totalSellingPrice;
   }
   
   // Priorité 3: financed_amount stocké en base
   if (offer.financed_amount && offer.financed_amount > 0) {
     return offer.financed_amount;
   }
    
    return 0;
  };

  const effectiveFinancedAmount = calculateFinancedAmount();

  // Calculer la marge directement : montant financé effectif - prix d'achat total
  const displayMargin = totals.totalPurchasePrice > 0 ? effectiveFinancedAmount - totals.totalPurchasePrice : 0;
  
  // Calculer le pourcentage de marge basé sur le prix d'achat
  const marginPercentage = totals.totalPurchasePrice > 0 ? (displayMargin / totals.totalPurchasePrice) * 100 : 0;

  const displayCommission = shouldShowCommission ? offer.commission || 0 : 0;

  return <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
            <DollarSign className="w-6 h-6 text-blue-600" />
            Résumé financier
          </CardTitle>
          <RecalculateFinancialsButton 
            offerId={offer.id} 
            onRecalculated={() => window.location.reload()}
          />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        
        {/* Global Margin Editor */}
        {totals.totalPurchasePrice > 0 && (
          <div className="mb-6">
            <GlobalMarginEditor
              offer={offer}
              totalPurchasePrice={totals.totalPurchasePrice}
              totalMonthlyPayment={totals.totalMonthlyPayment}
              displayMargin={formatCurrency(displayMargin)}
              marginPercentage={marginPercentage}
              leaser={leaser}
              equipment={offerEquipment || []}
              onUpdate={refresh}
            />
          </div>
        )}

        {/* Principales métriques - Layout en 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* Montant total d'achat */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Montant total d'achat</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {formatCurrency(totals.totalPurchasePrice)}
            </div>
            <div className="text-xs text-blue-600">
              Prix d'achat des équipements
            </div>
          </div>
          
          {/* Mensualité totale */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Mensualité totale</span>
              </div>
            </div>
            {offer.discount_amount && offer.discount_amount > 0 ? (
              <div className="space-y-1">
                <div className="text-lg text-green-700 line-through opacity-60">
                  {formatCurrency(offer.monthly_payment_before_discount || totals.totalMonthlyPayment)}
                </div>
                <div className="text-xs text-red-600 font-medium">
                  🏷️ Remise {offer.discount_type === 'percentage' ? `(${offer.discount_value}%)` : ''} : -{formatCurrency(offer.discount_amount)}
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(totals.totalMonthlyPayment)}
                </div>
                <div className="text-xs text-green-600">
                  Mensualité après remise
                </div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-900 mb-1">
                  {formatCurrency(totals.totalMonthlyPayment)}
                </div>
                <div className="text-xs text-green-600">
                  Paiement mensuel client
                </div>
              </>
            )}
          </div>
          
          {/* Marge totale - Toujours affichée */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Marge totale</span>
              </div>
            </div>
            {offer.discount_amount && offer.discount_amount > 0 && offer.coefficient > 0 ? (
              <div className="space-y-1">
                {(() => {
                  const monthlyBeforeDiscount = offer.monthly_payment_before_discount || (totals.totalMonthlyPayment + offer.discount_amount);
                  const marginBeforeDiscount = (monthlyBeforeDiscount * 100 / offer.coefficient) - totals.totalPurchasePrice;
                  const marginBeforePercent = totals.totalPurchasePrice > 0 ? (marginBeforeDiscount / totals.totalPurchasePrice) * 100 : 0;
                  return (
                    <>
                      <div className="text-sm text-purple-700 opacity-60 line-through">
                        {formatCurrency(marginBeforeDiscount)} ({marginBeforePercent.toFixed(1)}%)
                      </div>
                      <div className="text-2xl font-bold text-purple-900">
                        {formatCurrency(displayMargin)}
                      </div>
                      <div className="text-xs text-purple-600 flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {marginPercentage.toFixed(1)}% du prix d'achat (après remise)
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-purple-900 mb-1">
                  {formatCurrency(displayMargin)}
                </div>
                <div className="text-xs text-purple-600 flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  {marginPercentage.toFixed(1)}% du prix d'achat
                </div>
              </>
            )}
          </div>
        </div>

        {/* Informations complémentaires */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          
          {/* Acompte - affiché si > 0 */}
          {offer.down_payment !== undefined && offer.down_payment > 0 && (
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Acompte versé</span>
              </div>
              <span className="text-lg font-bold text-amber-900">
                {formatCurrency(offer.down_payment)}
              </span>
            </div>
          )}
          
          {/* Montant financé après acompte - si acompte > 0 */}
          {offer.down_payment !== undefined && offer.down_payment > 0 && effectiveFinancedAmount > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Montant financé après acompte</span>
              </div>
              <span className="text-lg font-bold text-blue-900">
                {formatCurrency(effectiveFinancedAmount - offer.down_payment)}
              </span>
            </div>
          )}

          {/* Montant financé - quand pas d'acompte */}
          {effectiveFinancedAmount > 0 && effectiveFinancedAmount !== totals.totalPurchasePrice && (!offer.down_payment || offer.down_payment <= 0) && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Montant financé</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(effectiveFinancedAmount)}
              </span>
            </div>
          )}


          {/* Commission - Conditionnelle selon le type d'offre */}
          {shouldShowCommission && <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Commission</span>
              </div>
              <span className="text-lg font-bold text-emerald-900">
                {formatCurrency(displayCommission)}
              </span>
            </div>}
          
          {/* Frais de dossier */}
          {offer.file_fee !== undefined && (
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Frais de dossier</span>
              </div>
              <span className="text-lg font-bold text-orange-900">
                {formatCurrency(offer.file_fee)}
              </span>
            </div>
          )}
          
          {/* Assurance annuelle */}
          {offer.annual_insurance !== undefined && (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Assurance annuelle</span>
              </div>
              <span className="text-lg font-bold text-green-900">
                {formatCurrency(offer.annual_insurance)}
              </span>
            </div>
          )}
        </div>

        {/* Statuts et informations additionnelles */}
        {(offer.commission_status || offer.margin_difference || offer.commission_paid_at) && shouldShowCommission && <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-4">
              {offer.commission_status && <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Statut commission:</span>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${offer.commission_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : offer.commission_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {offer.commission_status === 'pending' ? 'En attente' : offer.commission_status === 'paid' ? 'Payée' : offer.commission_status}
                  </span>
                </div>}

              {offer.margin_difference && Math.abs(offer.margin_difference) > 0.01 && <div className="flex items-center gap-2">
                  
                  
                </div>}

              {offer.commission_paid_at && <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Commission payée le:</span>
                  <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {new Date(offer.commission_paid_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>}
            </div>
          </div>}
      </CardContent>
    </Card>;
};
export default FinancialSection;