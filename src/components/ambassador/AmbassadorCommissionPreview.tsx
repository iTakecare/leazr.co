
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { calculateCommissionByLevel } from "@/utils/calculator";
import { toast } from "sonner";

interface AmbassadorCommissionPreviewProps {
  totalMonthlyPayment: number;
  ambassadorId?: string;
  commissionLevelId?: string;
  equipmentList: any[];
  onCommissionCalculated?: (commission: number) => void;
}

const AmbassadorCommissionPreview = ({
  totalMonthlyPayment,
  ambassadorId,
  commissionLevelId,
  equipmentList,
  onCommissionCalculated
}: AmbassadorCommissionPreviewProps) => {
  const [commission, setCommission] = useState<{ amount: number; rate: number; levelName: string }>({
    amount: 0,
    rate: 0,
    levelName: ""
  });
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Reference to track previous parameters and avoid unnecessary recalculations
  const previousParams = useRef({ 
    totalAmount: 0, 
    ambassadorId: '', 
    commissionLevelId: '',
    equipmentListHash: '',
    lastCalculationTime: 0
  });
  
  // Object to track if the component is mounted
  const isMounted = useRef(true);
  
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Cleanup function to set unmounted flag
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Skip calculation if missing required parameters
    if (!ambassadorId || !commissionLevelId) {
      return;
    }
    
    // Prevent calculations triggered by zero values at component initialization
    if (totalMonthlyPayment === 0 && equipmentList.length === 0) {
      return;
    }
    
    // Debounce calculations - don't allow more frequent than every 500ms
    const now = Date.now();
    if (now - previousParams.current.lastCalculationTime < 500) {
      return;
    }

    const calculateCommission = async () => {
      // Calculate total equipment amount
      const totalEquipmentAmount = equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0);
      
      if (totalEquipmentAmount <= 0) {
        return;
      }
      
      // Create a simple hash of the equipment list for comparison
      const equipmentListHash = JSON.stringify(equipmentList.map(eq => ({
        id: eq.id,
        price: eq.purchasePrice,
        quantity: eq.quantity
      })));
      
      // Verify if the parameters have changed to avoid unnecessary recalculations
      if (
        previousParams.current.totalAmount === totalEquipmentAmount &&
        previousParams.current.ambassadorId === ambassadorId &&
        previousParams.current.commissionLevelId === commissionLevelId &&
        previousParams.current.equipmentListHash === equipmentListHash
      ) {
        return;
      }

      // Update the last calculation timestamp
      previousParams.current.lastCalculationTime = now;
      
      setIsCalculating(true);
      try {
        console.log(`Calculating commission for ambassador ${ambassadorId} with level ${commissionLevelId}`);
        
        const commissionData = await calculateCommissionByLevel(
          totalEquipmentAmount,
          commissionLevelId,
          'ambassador',
          ambassadorId
        );
        
        // Only update state if component is still mounted
        if (isMounted.current) {
          setCommission({
            amount: commissionData.amount,
            rate: commissionData.rate,
            levelName: commissionData.levelName || ""
          });
          
          // Notify parent component about the calculated commission
          if (onCommissionCalculated) {
            onCommissionCalculated(commissionData.amount);
          }
          
          console.log("Commission calculated:", commissionData);
          
          // Update the previous parameters reference
          previousParams.current = {
            totalAmount: totalEquipmentAmount,
            ambassadorId,
            commissionLevelId,
            equipmentListHash,
            lastCalculationTime: now
          };
        }
      } catch (error) {
        console.error("Error calculating commission:", error);
        if (isMounted.current) {
          toast.error("Erreur lors du calcul de la commission");
        }
      } finally {
        if (isMounted.current) {
          setIsCalculating(false);
        }
      }
    };

    // Use setTimeout to prevent React state update cycles
    const timeoutId = setTimeout(() => {
      if (equipmentList.length > 0 && ambassadorId && commissionLevelId) {
        calculateCommission();
      }
    }, 50);
    
    // Clean up timeout on dependency changes
    return () => clearTimeout(timeoutId);
  }, [totalMonthlyPayment, equipmentList, ambassadorId, commissionLevelId, onCommissionCalculated]);

  if (!ambassadorId || !commissionLevelId) {
    return null;
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2 border-b">
        <CardTitle>Votre commission</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between py-2">
          {isCalculating ? (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calcul en cours...
            </div>
          ) : (
            <>
              <div className="font-medium">Montant de commission:</div>
              <div className="text-green-600 font-medium flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(commission.amount)}
                {commission.rate > 0 && (
                  <span className="text-sm text-muted-foreground">({commission.rate}%)</span>
                )}
              </div>
            </>
          )}
        </div>
        {commission.levelName && (
          <div className="mt-2 text-sm text-muted-foreground">
            Niveau de commission: {commission.levelName}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorCommissionPreview;
