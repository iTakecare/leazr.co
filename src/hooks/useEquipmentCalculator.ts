
import { useState, useEffect, useRef } from 'react';
import { Equipment, Leaser, GlobalMarginAdjustment } from '@/types/equipment';
import { defaultLeasers } from '@/data/leasers';

export const useEquipmentCalculator = (selectedLeaser: Leaser | null, duration: number = 36) => {
  const leaser = selectedLeaser || defaultLeasers[0];
  const calculationsInProgressRef = useRef<Record<string, boolean>>({});
  
  const [equipment, setEquipment] = useState<Equipment>({
    id: crypto.randomUUID(),
    title: '',
    purchasePrice: 0,
    quantity: 1,
    margin: 20,
    monthlyPayment: 0,
  });
  
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [targetMonthlyPayment, setTargetMonthlyPayment] = useState<number>(0);
  const [coefficient, setCoefficient] = useState<number>(0);
  const [calculatedMargin, setCalculatedMargin] = useState({ percentage: 0, amount: 0 });
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [totalMonthlyPayment, setTotalMonthlyPayment] = useState<number>(0);
  const [globalMarginAdjustment, setGlobalMarginAdjustment] = useState<GlobalMarginAdjustment>({ 
    percentage: 0,
    amount: 0,
    newMonthly: 0,
    currentCoef: 0,
    newCoef: 0,
    adaptMonthlyPayment: false,
    marginDifference: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const lastEquipmentPriceRef = useRef(0);
  const lastLeaserIdRef = useRef("");
  const lastEquipmentMarginRef = useRef(0);

  // Ajout d'un ref pour suivre les changements de marge
  useEffect(() => {
    // Recalculer quand le prix ou la marge change
    if (equipment.purchasePrice !== lastEquipmentPriceRef.current || 
        equipment.margin !== lastEquipmentMarginRef.current) {
      calculateMonthlyPayment();
    }
  }, [equipment.purchasePrice, equipment.margin]);

  const toggleAdaptMonthlyPayment = () => {
    setGlobalMarginAdjustment(prev => ({
      ...prev,
      adaptMonthlyPayment: !prev.adaptMonthlyPayment
    }));
  };

  const calculateFinancedAmount = (eq: Equipment) => {
    return eq.purchasePrice * (1 + eq.margin / 100);
  };

  const findCoefficient = (amount: number) => {
    const currentLeaser = leaser || defaultLeasers[0];
    
    if (!currentLeaser || !currentLeaser.ranges || currentLeaser.ranges.length === 0) {
      return defaultLeasers[0].ranges[0].coefficient || 3.55;
    }
    
    const range = currentLeaser.ranges.find(
      (r) => amount >= r.min && amount <= r.max
    );
    
    if (!range) {
      return currentLeaser.ranges[0].coefficient || 3.55;
    }

    // Si le range a des coefficients par durée, les utiliser
    if (range.duration_coefficients && range.duration_coefficients.length > 0) {
      const durationCoeff = range.duration_coefficients.find(
        dc => dc.duration_months === duration
      );
      if (durationCoeff) {
        return durationCoeff.coefficient;
      }
    }
    
    return range.coefficient || 3.55;
  };

  const calculateMonthlyPayment = () => {
    if (equipment.purchasePrice === lastEquipmentPriceRef.current && 
        leaser?.id === lastLeaserIdRef.current &&
        equipment.margin === lastEquipmentMarginRef.current) {
      return;
    }
    
    lastEquipmentPriceRef.current = equipment.purchasePrice;
    lastLeaserIdRef.current = leaser?.id || "";
    lastEquipmentMarginRef.current = equipment.margin;
    
    const financedAmount = calculateFinancedAmount(equipment);
    const coef = findCoefficient(financedAmount);
    setCoefficient(coef);
    const calculated = (financedAmount * coef) / 100;
    
    setMonthlyPayment(calculated);
    
    setEquipment(prev => ({
      ...prev,
      monthlyPayment: calculated
    }));
  };

  const calculateMarginFromMonthlyPayment = () => {
    if (targetMonthlyPayment <= 0 || equipment.purchasePrice <= 0) {
      setCalculatedMargin({ percentage: 0, amount: 0 });
      return;
    }
    
    const calcKey = `margin-${targetMonthlyPayment}-${equipment.purchasePrice}`;
    if (calculationsInProgressRef.current[calcKey]) return;
    calculationsInProgressRef.current[calcKey] = true;

    const ranges = leaser?.ranges || defaultLeasers[0].ranges;
    
    let coef = ranges[0].coefficient;
    for (const range of ranges) {
      const financedAmountEstimate = (targetMonthlyPayment * 100) / range.coefficient;
      if (financedAmountEstimate >= range.min && financedAmountEstimate <= range.max) {
        coef = range.coefficient;
        break;
      }
    }
    
    const requiredTotal = (targetMonthlyPayment * 100) / coef;
    
    const marginAmount = requiredTotal - equipment.purchasePrice;
    
    const marginPercentage = (marginAmount / equipment.purchasePrice) * 100;
    
    setCalculatedMargin({
      percentage: Number(marginPercentage.toFixed(2)),
      amount: marginAmount
    });
    
    setCoefficient(coef);
    
    setTimeout(() => {
      calculationsInProgressRef.current[calcKey] = false;
    }, 300);
  };

  const applyCalculatedMargin = () => {
    if (calculatedMargin.percentage > 0) {
      setEquipment(prev => {
        const updatedEquipment = {
          ...prev,
          margin: calculatedMargin.percentage
        };
        
        if (targetMonthlyPayment > 0) {
          updatedEquipment.monthlyPayment = targetMonthlyPayment;
        }
        
        return updatedEquipment;
      });
      
      if (targetMonthlyPayment <= 0) {
        calculateMonthlyPayment();
      }
    }
  };

  const addToList = () => {
    if (equipment.title && equipment.purchasePrice > 0) {
      const currentMonthlyPayment = targetMonthlyPayment > 0 ? targetMonthlyPayment : monthlyPayment;
      
      const marginToUse = calculatedMargin.percentage > 0 ? calculatedMargin.percentage : equipment.margin;
      
      const equipmentToAdd = {
        ...equipment,
        margin: Number(marginToUse.toFixed(2)),
        monthlyPayment: currentMonthlyPayment
      };
      
      if (editingId) {
        setEquipmentList(equipmentList.map(eq => 
          eq.id === editingId ? { ...equipmentToAdd, id: editingId } : eq
        ));
        setEditingId(null);
      } else {
        setEquipmentList([...equipmentList, equipmentToAdd]);
      }
      
      setEquipment({
        id: crypto.randomUUID(),
        title: '',
        purchasePrice: 0,
        quantity: 1,
        margin: 20,
        monthlyPayment: 0,
      });
      
      setTargetMonthlyPayment(0);
      setCalculatedMargin({ percentage: 0, amount: 0 });
    }
  };

  const startEditing = (id: string) => {
    const equipmentToEdit = equipmentList.find(eq => eq.id === id);
    if (equipmentToEdit) {
      setEquipment(equipmentToEdit);
      setEditingId(id);
      
      if (equipmentToEdit.monthlyPayment && equipmentToEdit.monthlyPayment > 0) {
        setTargetMonthlyPayment(equipmentToEdit.monthlyPayment);
      }
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEquipment({
      id: crypto.randomUUID(),
      title: '',
      purchasePrice: 0,
      quantity: 1,
      margin: 20,
      monthlyPayment: 0,
    });
    setTargetMonthlyPayment(0);
    setCalculatedMargin({ percentage: 0, amount: 0 });
  };

  const removeFromList = (id: string) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    console.log(`Updating quantity for item ${id} to ${newQuantity}`);
    setEquipmentList(prevList => 
      prevList.map(eq => 
        eq.id === id ? { ...eq, quantity: newQuantity } : eq
      )
    );
  };

  useEffect(() => {
    if (equipment.purchasePrice > 0) {
      calculateMonthlyPayment();
    }
  }, [equipment.margin, equipment.purchasePrice, leaser?.id]);

  useEffect(() => {
    if (targetMonthlyPayment > 0 && equipment.purchasePrice > 0) {
      calculateMarginFromMonthlyPayment();
    }
  }, [targetMonthlyPayment, equipment.purchasePrice, leaser?.id]);

  const equipmentListLengthRef = useRef(0);
  const globalMarginToggleRef = useRef(false);
  
  useEffect(() => {
    const currentToggleState = globalMarginAdjustment.adaptMonthlyPayment;
    const currentListLength = equipmentList.length;
    
    if (equipmentListLengthRef.current === currentListLength && 
        globalMarginToggleRef.current === currentToggleState && 
        currentListLength === 0) {
      return;
    }
    
    equipmentListLengthRef.current = currentListLength;
    globalMarginToggleRef.current = currentToggleState;
    
    calculateGlobalMarginAdjustment();
  }, [equipmentList, leaser, globalMarginAdjustment.adaptMonthlyPayment]);

  const calculateGlobalMarginAdjustment = () => {
    if (equipmentList.length === 0) {
      setGlobalMarginAdjustment({ 
        percentage: 0, 
        amount: 0, 
        newMonthly: 0,
        currentCoef: 0,
        newCoef: 0,
        adaptMonthlyPayment: globalMarginAdjustment.adaptMonthlyPayment,
        marginDifference: 0
      });
      return;
    }

    // Calculer le prix d'achat total (avec quantités)
    const totalBaseAmount = equipmentList.reduce((sum, eq) => {
      return sum + (eq.purchasePrice * eq.quantity);
    }, 0);

    // Calculer la marge normale (somme des marges individuelles avec quantités)
    const normalMarginAmount = equipmentList.reduce((sum, eq) => {
      return sum + (eq.purchasePrice * eq.quantity * eq.margin / 100);
    }, 0);

    // Calculer le montant financé total (avec quantités)
    const totalFinancedAmount = equipmentList.reduce((sum, eq) => {
      const financedAmountForOne = calculateFinancedAmount(eq);
      return sum + (financedAmountForOne * eq.quantity);
    }, 0);

    // Trouver le coefficient basé sur le montant financé total
    const globalCoef = findCoefficient(totalFinancedAmount);
    
    // Calculer la mensualité normale basée sur les équipements individuels (avec quantités)
    const normalMonthly = equipmentList.reduce((sum, eq) => {
      return sum + ((eq.monthlyPayment || 0) * eq.quantity);
    }, 0);
    
    // Calculer la mensualité théorique avec le coefficient global
    const theoreticalMonthly = (totalFinancedAmount * globalCoef) / 100;
    
    let appliedMonthly;
    let appliedMarginAmount;
    let marginDifference;
    
    if (globalMarginAdjustment.adaptMonthlyPayment) {
      // Mode ajusté : utiliser le coefficient global
      appliedMonthly = theoreticalMonthly;
      
      // Calculer le montant financé nécessaire pour cette mensualité
      const requiredFinancedAmount = (theoreticalMonthly * 100) / globalCoef;
      
      // La marge ajustée est la différence entre le montant financé requis et le prix d'achat total
      appliedMarginAmount = requiredFinancedAmount - totalBaseAmount;
      
      // La différence entre la marge normale et la marge ajustée
      marginDifference = normalMarginAmount - appliedMarginAmount;
      
      console.log("🔵 Mode AJUSTÉ - Switch ON:", {
        totalBaseAmount,
        normalMarginAmount,
        totalFinancedAmount,
        globalCoef,
        theoreticalMonthly,
        requiredFinancedAmount,
        appliedMarginAmount,
        marginDifference,
        equipmentCount: equipmentList.length
      });
    } else {
      // Mode normal : utiliser les marges individuelles
      appliedMonthly = normalMonthly;
      appliedMarginAmount = normalMarginAmount;
      
      // Calculer quand même la différence pour l'affichage potentiel
      const requiredFinancedAmountWithGlobalCoef = (theoreticalMonthly * 100) / globalCoef;
      const adjustedMarginAmount = requiredFinancedAmountWithGlobalCoef - totalBaseAmount;
      marginDifference = normalMarginAmount - adjustedMarginAmount;
      
      console.log("🟡 Mode NORMAL - Switch OFF:", {
        totalBaseAmount,
        normalMarginAmount,
        appliedMonthly,
        theoreticalMonthly,
        globalCoef,
        marginDifference: "Calculée mais non appliquée"
      });
    }

    const marginPercentage = totalBaseAmount > 0 ? (appliedMarginAmount / totalBaseAmount) * 100 : 0;

    setGlobalMarginAdjustment({
      percentage: Number(marginPercentage.toFixed(2)),
      amount: appliedMarginAmount,
      newMonthly: appliedMonthly,
      currentCoef: globalCoef,
      newCoef: globalCoef,
      adaptMonthlyPayment: globalMarginAdjustment.adaptMonthlyPayment,
      marginDifference: marginDifference
    });

    setTotalMonthlyPayment(appliedMonthly);
  };

  // Calculate financial summary for display
  const calculations = {
    totalPurchasePrice: equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
    totalFinancedAmount: equipmentList.reduce((sum, eq) => {
      const financedAmount = calculateFinancedAmount(eq);
      return sum + (financedAmount * eq.quantity);
    }, 0),
    normalMarginAmount: equipmentList.reduce((sum, eq) => {
      return sum + (eq.purchasePrice * eq.quantity * eq.margin / 100);
    }, 0),
    finalMonthlyPayment: totalMonthlyPayment,
    coefficient: equipmentList.length > 0 ? findCoefficient(equipmentList.reduce((sum, eq) => {
      const financedAmount = calculateFinancedAmount(eq);
      return sum + (financedAmount * eq.quantity);
    }, 0)) : 0
  };

  return {
    equipment,
    setEquipment,
    monthlyPayment,
    targetMonthlyPayment,
    setTargetMonthlyPayment,
    coefficient,
    calculatedMargin,
    equipmentList,
    setEquipmentList,
    totalMonthlyPayment,
    globalMarginAdjustment: {
      ...globalMarginAdjustment,
      active: globalMarginAdjustment.adaptMonthlyPayment
    },
    setGlobalMarginAdjustment,
    editingId,
    applyCalculatedMargin,
    addToList,
    startEditing,
    cancelEditing,
    removeFromList,
    updateQuantity,
    findCoefficient,
    calculateFinancedAmount,
    calculations,
    toggleAdaptMonthlyPayment: () => {
      setGlobalMarginAdjustment(prev => ({
        ...prev,
        adaptMonthlyPayment: !prev.adaptMonthlyPayment
      }));
    }
  };
};
