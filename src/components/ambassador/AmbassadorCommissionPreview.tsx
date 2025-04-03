
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
  
  // Tracking if component is mounted
  const isMounted = useRef(true);
  
  // Debounce timer reference
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track last successful calculation data
  const lastCalculationRef = useRef({
    equipmentHash: '',
    ambassadorId: '',
    commissionLevelId: '',
    calculated: false,
    timestamp: 0
  });
  
  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Skip calculation if missing required parameters
    if (!ambassadorId || !commissionLevelId) {
      return;
    }
    
    // Skip calculation if no equipment
    if (equipmentList.length === 0) {
      return;
    }
    
    // Create a simple hash of the equipment list for comparison
    const equipmentHash = JSON.stringify(equipmentList.map(eq => ({
      id: eq.id,
      price: eq.purchasePrice,
      quantity: eq.quantity
    })));
    
    // Total equipment amount (this is what we want to calculate commission on)
    const totalEquipmentAmount = equipmentList.reduce(
      (sum, eq) => sum + (eq.purchasePrice * eq.quantity), 
      0
    );
    
    if (totalEquipmentAmount <= 0) {
      return;
    }
    
    // Check if we've already calculated with these exact parameters recently
    const now = Date.now();
    const isSameCalculation = 
      lastCalculationRef.current.equipmentHash === equipmentHash &&
      lastCalculationRef.current.ambassadorId === ambassadorId &&
      lastCalculationRef.current.commissionLevelId === commissionLevelId &&
      lastCalculationRef.current.calculated &&
      (now - lastCalculationRef.current.timestamp < 2000); // 2 seconds cache
    
    if (isSameCalculation) {
      return; // Skip calculation if we've done it recently with same params
    }

    // Cancel any previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new debounce timer (300ms delay)
    debounceTimerRef.current = setTimeout(() => {
      // Don't start a calculation if one is already in progress
      if (isCalculating) {
        return;
      }
      
      calculateCommission(totalEquipmentAmount, equipmentHash);
    }, 300);
    
    // Cleanup function to clear the timeout if the component unmounts or dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    
  }, [totalMonthlyPayment, equipmentList, ambassadorId, commissionLevelId, isCalculating]);

  const calculateCommission = async (totalEquipmentAmount: number, equipmentHash: string) => {
    if (isCalculating || !isMounted.current) return;
    
    setIsCalculating(true);
    
    try {
      const commissionData = await calculateCommissionByLevel(
        totalEquipmentAmount,
        commissionLevelId,
        'ambassador',
        ambassadorId
      );
      
      if (!isMounted.current) return;
      
      setCommission({
        amount: commissionData.amount,
        rate: commissionData.rate,
        levelName: commissionData.levelName || ""
      });
      
      // Update the last calculation reference
      lastCalculationRef.current = {
        equipmentHash,
        ambassadorId: ambassadorId || '',
        commissionLevelId: commissionLevelId || '',
        calculated: true,
        timestamp: Date.now()
      };
      
      // Notify parent component about the calculated commission
      if (onCommissionCalculated) {
        onCommissionCalculated(commissionData.amount);
      }
    } catch (error) {
      if (!isMounted.current) return;
      
      console.error("Error calculating commission:", error);
      toast.error("Erreur lors du calcul de la commission");
    } finally {
      if (isMounted.current) {
        setIsCalculating(false);
      }
    }
  };

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
