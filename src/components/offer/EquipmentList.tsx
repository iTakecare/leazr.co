
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage, formatPercentageWithComma } from "@/utils/formatters";
import { Trash2, Edit, Plus, Minus, PenLine, Coins } from "lucide-react";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { calculateCommissionByLevel } from "@/utils/calculator";

interface EquipmentListProps {
  equipmentList: Equipment[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, change: number) => void;
  totalMonthlyPayment: number;
  globalMarginAdjustment: GlobalMarginAdjustment;
  toggleAdaptMonthlyPayment: () => void;
  hideFinancialDetails?: boolean;
  ambassadorId?: string;
  commissionLevelId?: string;
}

const EquipmentList: React.FC<EquipmentListProps> = ({
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
  commissionLevelId
}) => {
  // Helper function to format coefficient
  const formatCoefficient = (value: number): string => {
    return value.toFixed(2).replace('.', ',');
  };

  // State for commission information
  const [commissionData, setCommissionData] = useState({
    rate: 0,
    amount: 0,
    marginDifferenceCommission: 0
  });

  // Add debug logs to check values
  useEffect(() => {
    console.log("EquipmentList received commissionLevelId:", commissionLevelId);
    console.log("EquipmentList received ambassadorId:", ambassadorId);
    console.log("Global margin amount:", globalMarginAdjustment.amount);
  }, [commissionLevelId, ambassadorId, globalMarginAdjustment]);

  // Calculate commission based on margin
  useEffect(() => {
    const calculateCommission = async () => {
      if (globalMarginAdjustment.amount > 0 && commissionLevelId) {
        console.log("Calculating commission for level ID:", commissionLevelId);
        // Calculer la commission sur la marge
        const commission = await calculateCommissionByLevel(
          globalMarginAdjustment.amount, 
          commissionLevelId,
          'ambassador'
        );

        console.log("Commission calculation result:", commission);

        // Calculer la commission sur la différence de marge
        let marginDifferenceCommission = 0;
        if (!globalMarginAdjustment.adaptMonthlyPayment && globalMarginAdjustment.marginDifference !== 0) {
          const diffCommission = await calculateCommissionByLevel(
            globalMarginAdjustment.marginDifference,
            commissionLevelId,
            'ambassador'
          );
          marginDifferenceCommission = diffCommission.amount;
        }

        setCommissionData({
          rate: commission.rate,
          amount: commission.amount,
          marginDifferenceCommission
        });
      } else {
        setCommissionData({
          rate: 0,
          amount: 0,
          marginDifferenceCommission: 0
        });
      }
    };

    calculateCommission();
  }, [globalMarginAdjustment, commissionLevelId]);

  if (equipmentList.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 rounded-lg">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-medium">Liste des équipements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-10 text-gray-500">
            Aucun équipement ajouté
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-gray-200 rounded-lg">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-medium">Liste des équipements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-medium">Équipement</TableHead>
                {!hideFinancialDetails && (
                  <TableHead className="text-right font-medium">Prix unitaire</TableHead>
                )}
                <TableHead className="text-center font-medium">Qté</TableHead>
                {!hideFinancialDetails && (
                  <TableHead className="text-right font-medium">Marge</TableHead>
                )}
                <TableHead className="text-right font-medium">Total</TableHead>
                <TableHead className="text-center font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentList.map((equipment) => (
                <TableRow 
                  key={equipment.id}
                  className={`${editingId === equipment.id ? 'bg-blue-50' : ''}`}
                >
                  <TableCell>
                    <div className="font-medium">{equipment.title}</div>
                  </TableCell>
                  {!hideFinancialDetails && (
                    <TableCell className="text-right">
                      {formatCurrency(equipment.purchasePrice)}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => updateQuantity(equipment.id, -1)}
                        disabled={equipment.quantity <= 1 || editingId !== null}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="mx-2 w-4 text-center">{equipment.quantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => updateQuantity(equipment.id, 1)}
                        disabled={editingId !== null}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  {!hideFinancialDetails && (
                    <TableCell className="text-right">
                      {formatPercentageWithComma(equipment.margin)}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium text-blue-600">
                    {formatCurrency((equipment.monthlyPayment || 0) * equipment.quantity)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => startEditing(equipment.id)}
                        disabled={editingId !== null}
                      >
                        <PenLine className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => removeFromList(equipment.id)}
                        disabled={editingId !== null}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={hideFinancialDetails ? 2 : 4} className="text-right font-medium">
                  Mensualité totale :
                </TableCell>
                <TableCell colSpan={2} className="text-right text-blue-600 font-bold">
                  {formatCurrency(totalMonthlyPayment)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-200 rounded-lg">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-medium">Récapitulatif global</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {!hideFinancialDetails && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Coefficient actuel :</span>
                  <span className="font-medium">{formatCoefficient(globalMarginAdjustment.currentCoef)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Nouveau coefficient :</span>
                  <span className="font-medium">{formatCoefficient(globalMarginAdjustment.newCoef)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Marge globale :</span>
                  <span className="font-medium">{formatPercentageWithComma(globalMarginAdjustment.percentage)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Marge totale en euros :</span>
                  <span className="font-medium">{formatCurrency(globalMarginAdjustment.amount)}</span>
                </div>
                
                {!globalMarginAdjustment.adaptMonthlyPayment && globalMarginAdjustment.marginDifference !== 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Différence de marge :</span>
                      <span className={`font-medium ${globalMarginAdjustment.marginDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(globalMarginAdjustment.marginDifference)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total marge avec différence :</span>
                      <span className={`font-medium ${globalMarginAdjustment.marginDifference > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                        {formatCurrency(globalMarginAdjustment.amount + globalMarginAdjustment.marginDifference)}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
            
            {/* Cette section reste visible même avec hideFinancialDetails=true */}
            <div className="flex items-center space-x-2 py-2 border-t border-b mt-2">
              <Switch 
                id="adapt-monthly" 
                checked={globalMarginAdjustment.adaptMonthlyPayment}
                onCheckedChange={toggleAdaptMonthlyPayment}
              />
              <Label htmlFor="adapt-monthly" className="cursor-pointer">
                Adapter la mensualité au nouveau coefficient
              </Label>
            </div>
            
            <div className="flex justify-between items-center text-blue-600 mt-2">
              <span className="font-medium">Mensualité totale :</span>
              <span className="font-bold">{formatCurrency(globalMarginAdjustment.newMonthly)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section de commissionnement - ajout d'une condition plus robuste */}
      {commissionLevelId && commissionLevelId.length > 0 && (
        <Card className="shadow-sm border-gray-200 rounded-lg">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg font-medium">Commissionnement</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Commission totale :</span>
                <span className="font-medium text-green-600">{formatCurrency(commissionData.amount)}</span>
              </div>
              
              {!globalMarginAdjustment.adaptMonthlyPayment && globalMarginAdjustment.marginDifference !== 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Commission totale avec différence :</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(commissionData.amount + commissionData.marginDifferenceCommission)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 text-sm text-gray-500">
                <span>Taux de commission appliqué :</span>
                <span>{formatPercentageWithComma(commissionData.rate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EquipmentList;
