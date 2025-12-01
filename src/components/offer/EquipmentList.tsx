
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Plus, Minus, Truck, User, Building, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Equipment } from "@/types/equipment";
import { formatCurrency } from "@/utils/formatters";
import FinancialSummary from "@/components/offer/FinancialSummary";
import AmbassadorFinancialSummary from "@/components/ambassador/AmbassadorFinancialSummary";
import { useAuth } from "@/context/AuthContext";
import { useOfferCommissionCalculator } from "@/hooks/useOfferCommissionCalculator";

interface GlobalMarginAdjustment {
  amount: number;
  newCoef: number;
  active: boolean;
  marginDifference: number;
}

interface OfferFinancialData {
  totalPurchasePrice: number;
  totalFinancedAmount: number;
  totalMargin: number;
  monthlyPayment: number;
  coefficient: number;
}

interface EquipmentListProps {
  equipmentList: Equipment[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalMonthlyPayment: number;
  globalMarginAdjustment: GlobalMarginAdjustment;
  toggleAdaptMonthlyPayment: () => void;
  hideFinancialDetails?: boolean;
  ambassadorId?: string;
  commissionLevelId?: string;
  calculations?: any;
  hidePriceColumn?: boolean;
  offerData?: OfferFinancialData;
  fileFee?: number;
  annualInsurance?: number;
  // Mode achat direct (pas de financement)
  isPurchase?: boolean;
}

const EquipmentList = ({
  equipmentList,
  editingId,
  startEditing,
  removeFromList,
  updateQuantity,
  totalMonthlyPayment,
  globalMarginAdjustment,
  toggleAdaptMonthlyPayment,
  hideFinancialDetails = false,
  ambassadorId,
  commissionLevelId,
  calculations,
  hidePriceColumn = false,
  offerData,
  fileFee,
  annualInsurance,
  isPurchase = false
}: EquipmentListProps) => {
  const { user } = useAuth();
  const handleQuantityChange = (id: string, newQuantity: number) => {
    updateQuantity(id, newQuantity);
  };

  // Determine if we're in ambassador mode - check URL path and props
  const isAmbassadorMode = Boolean(ambassadorId) || 
                          Boolean(commissionLevelId) || 
                          window.location.pathname.includes('/ambassador');

  // Detect if this is an admin creating an ambassador offer (external ambassador offer)
  const isAdminCreatingAmbassadorOffer = user?.role === 'admin' && Boolean(ambassadorId) && Boolean(commissionLevelId);

  // Calculate total margin for ambassador commission - USE THE CORRECT MARGIN
  const totalMargin = calculations?.normalMarginAmount || 0;
  
  // Calculate total purchase amount for commission calculation
  const totalPurchaseAmount = equipmentList.reduce((sum, equipment) => 
    sum + (equipment.purchasePrice * equipment.quantity), 0);

  // Calculate commission for admin creating ambassador offers
  const commissionData = useOfferCommissionCalculator({
    isInternalOffer: false,
    selectedAmbassadorId: ambassadorId,
    commissionLevelId: commissionLevelId,
    totalMargin: totalMargin,
    equipmentListLength: equipmentList.length,
    totalMonthlyPayment: totalMonthlyPayment,
    totalPurchaseAmount
  });

  console.log("EquipmentList - Ambassador mode debug:", {
    ambassadorId,
    commissionLevelId,
    equipmentListLength: equipmentList.length,
    totalMonthlyPayment,
    hideFinancialDetails,
    isAmbassadorMode,
    currentPath: window.location.pathname,
    urlCheck: window.location.pathname.includes('/ambassador'),
    totalMargin,
    calculationsMargin: calculations?.normalMarginAmount,
    calculationsDetails: calculations
  });

  // Function to render equipment attributes
  const renderAttributes = (attributes?: Record<string, any>) => {
    if (!attributes || Object.keys(attributes).length === 0) {
      return null;
    }

    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {Object.entries(attributes).map(([key, value], index) => (
          <span 
            key={`${key}-${index}`}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
          >
            {key}: {String(value)}
          </span>
        ))}
      </div>
    );
  };

  // Function to format equipment title with attributes
  const formatEquipmentTitle = (item: Equipment) => {
    let title = item.title;
    
    if (item.attributes && Object.keys(item.attributes).length > 0) {
      const attributesText = Object.entries(item.attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      title += ` (${attributesText})`;
    }
    
    return title;
  };

  // Function to render delivery information
  const renderDeliveryInfo = (item: Equipment) => {
    if (!item.deliveryType) {
      return (
        <div className="flex items-center gap-1 text-gray-400">
          <Truck className="h-4 w-4" />
          <span className="text-xs">Non défini</span>
        </div>
      );
    }

    let icon, label, tooltipContent;

    switch (item.deliveryType) {
      case 'main_client':
        icon = <Building className="h-4 w-4" />;
        label = 'Client principal';
        tooltipContent = 'Livraison à l\'adresse principale du client';
        break;
      case 'collaborator':
        icon = <User className="h-4 w-4" />;
        label = item.collaboratorId ? 'Collaborateur' : 'Collaborateur (non spécifié)';
        tooltipContent = item.collaboratorId 
          ? `Livraison au collaborateur` 
          : 'Collaborateur non spécifié';
        break;
      case 'predefined_site':
        icon = <Building className="h-4 w-4" />;
        label = item.deliverySiteId ? 'Site prédéfini' : 'Site (non spécifié)';
        tooltipContent = item.deliverySiteId 
          ? `Livraison au site prédéfini`
          : 'Site de livraison non spécifié';
        break;
      case 'specific_address':
        icon = <MapPin className="h-4 w-4" />;
        label = 'Adresse spécifique';
        tooltipContent = item.deliveryAddress 
          ? `${item.deliveryAddress}, ${item.deliveryCity} ${item.deliveryPostalCode || ''}`
          : 'Adresse spécifique';
        break;
      default:
        icon = <Truck className="h-4 w-4" />;
        label = 'Non défini';
        tooltipContent = 'Type de livraison non défini';
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-sm cursor-help">
              {icon}
              <span className="text-xs truncate max-w-[100px]">{label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{label}</p>
              <p className="text-xs">{tooltipContent}</p>
              {item.deliveryContactName && (
                <p className="text-xs">Contact: {item.deliveryContactName}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle>Liste des équipements</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-sm font-medium text-gray-700 min-w-[120px]">
                      Équipement
                    </th>
                    {!hidePriceColumn && (
                      <th className="px-2 py-2 text-left text-sm font-medium text-gray-700 min-w-[100px]">
                        Prix unitaire
                      </th>
                    )}
                    <th className="px-2 py-2 text-left text-sm font-medium text-gray-700 min-w-[120px]">
                      Quantité
                    </th>
                    {!isAmbassadorMode && (
                      <th className="px-2 py-2 text-left text-sm font-medium text-gray-700 min-w-[70px]">
                        Marge
                      </th>
                    )}
                    <th className="px-2 py-2 text-left text-sm font-medium text-gray-700 min-w-[100px]">
                      {isPurchase ? 'Prix de vente' : 'Mensualité'}
                    </th>
                    <th className="px-2 py-2 text-left text-sm font-medium text-gray-700 min-w-[120px]">
                      Livraison
                    </th>
                    <th className="px-2 py-2 text-right text-sm font-medium text-gray-700 min-w-[100px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {equipmentList.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-3 text-sm text-gray-900 max-w-[120px]">
                        <div>
                          <div className="font-medium" title={formatEquipmentTitle(item)}>
                            {item.title}
                          </div>
                          {renderAttributes(item.attributes)}
                        </div>
                      </td>
                      {!hidePriceColumn && (
                        <td className="px-2 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {formatCurrency(item.purchasePrice)}
                        </td>
                      )}
                      <td className="px-2 py-3 text-sm text-gray-900">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              handleQuantityChange(item.id, Math.max(1, item.quantity - 1))
                            }
                            disabled={item.quantity <= 1}
                            className="h-7 w-7"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQuantity = parseInt(e.target.value, 10);
                              if (!isNaN(newQuantity) && newQuantity >= 1) {
                                handleQuantityChange(item.id, newQuantity);
                              }
                            }}
                            className="w-12 text-center h-7 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity + 1)
                            }
                            className="h-7 w-7"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      {!isAmbassadorMode && (
                        <td className="px-2 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {item.margin}%
                        </td>
                      )}
                      <td className="px-2 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {isPurchase 
                          ? formatCurrency((item.purchasePrice * item.quantity) * (1 + (item.margin || 0) / 100))
                          : formatCurrency(item.monthlyPayment || 0)
                        }
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-900">
                        {renderDeliveryInfo(item)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => startEditing(item.id)}
                            className="h-7 w-7"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeFromList(item.id)}
                            className="h-7 w-7"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Show appropriate financial summary based on mode */}
      {equipmentList.length > 0 && (isPurchase || totalMonthlyPayment > 0) && !hideFinancialDetails && calculations && (
        <>
          {isAdminCreatingAmbassadorOffer ? (
            // Admin creating ambassador offer: show full admin summary + commission
            <FinancialSummary 
              calculations={calculations}
              useGlobalAdjustment={globalMarginAdjustment.active}
              onToggleAdjustment={toggleAdaptMonthlyPayment}
              commissionData={{
                amount: commissionData.amount,
                rate: commissionData.rate,
                levelName: commissionData.levelName
              }}
              showCommission={true}
              offerData={offerData}
              fileFee={fileFee}
              annualInsurance={annualInsurance}
              isPurchase={isPurchase}
            />
          ) : isAmbassadorMode ? (
            // Ambassador creating their own offer: show simplified summary
            <AmbassadorFinancialSummary
              totalMonthlyPayment={totalMonthlyPayment}
              ambassadorId={ambassadorId}
              commissionLevelId={commissionLevelId}
              equipmentListLength={equipmentList.length}
              totalMargin={totalMargin}
            />
          ) : (
            // Internal/admin offers: show full admin summary without commission
            <FinancialSummary 
              calculations={calculations}
              useGlobalAdjustment={globalMarginAdjustment.active}
              onToggleAdjustment={toggleAdaptMonthlyPayment}
              offerData={offerData}
              fileFee={fileFee}
              annualInsurance={annualInsurance}
              isPurchase={isPurchase}
            />
          )}
        </>
      )}
    </div>
  );
};

export default EquipmentList;
