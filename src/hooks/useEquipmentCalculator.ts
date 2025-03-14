
import { useState, useEffect } from 'react';
import { Equipment, Leaser, GlobalMarginAdjustment } from '@/types/equipment';
import { defaultLeasers } from '@/data/leasers';

export const useEquipmentCalculator = (selectedLeaser: Leaser | null) => {
  const leaser = selectedLeaser || defaultLeasers[0];
  
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
    adaptMonthlyPayment: true,
    marginDifference: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);

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
      return defaultLeasers[0].ranges[0].coefficient;
    }
    
    const range = currentLeaser.ranges.find(
      (r) => amount >= r.min && amount <= r.max
    );
    
    return range?.coefficient || currentLeaser.ranges[0].coefficient;
  };

  const calculateMonthlyPayment = () => {
    const financedAmount = calculateFinancedAmount(equipment);
    const coef = findCoefficient(financedAmount);
    setCoefficient(coef);
    const calculated = (financedAmount * coef) / 100;
    console.log("Calculated monthly payment:", calculated);
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

    // Use the selected leaser's ranges instead of defaultLeasers
    const ranges = leaser?.ranges || defaultLeasers[0].ranges;
    let coef = ranges[0].coefficient;
    
    for (const range of ranges) {
      const estimatedFinancedAmount = (targetMonthlyPayment * 100) / range.coefficient;
      if (estimatedFinancedAmount >= range.min && estimatedFinancedAmount <= range.max) {
        coef = range.coefficient;
        break;
      }
    }

    const requiredFinancedAmount = (targetMonthlyPayment * 100) / coef;
    const marginAmount = requiredFinancedAmount - equipment.purchasePrice;
    const marginPercentage = (marginAmount / equipment.purchasePrice) * 100;

    setCalculatedMargin({
      percentage: Number(marginPercentage.toFixed(2)),
      amount: marginAmount
    });
  };

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

    const totalBaseAmount = equipmentList.reduce((sum, eq) => {
      return sum + (eq.purchasePrice * eq.quantity);
    }, 0);

    const totalFinancedAmount = equipmentList.reduce((sum, eq) => {
      return sum + calculateFinancedAmount(eq) * eq.quantity;
    }, 0);

    const currentCoef = findCoefficient(totalFinancedAmount);
    const currentMonthly = (totalFinancedAmount * currentCoef) / 100;
    const newCoef = findCoefficient(totalFinancedAmount);
    
    let newMonthly;
    let marginDifference = 0;
    
    if (globalMarginAdjustment.adaptMonthlyPayment) {
      // Case 1: Using adapted monthly payment based on the coefficient
      newMonthly = (totalFinancedAmount * newCoef) / 100;
      marginDifference = 0; // No difference in this case
    } else {
      // Case 2: Using original monthly payments from individual equipment items
      newMonthly = equipmentList.reduce((sum, eq) => {
        return sum + (eq.monthlyPayment || 0) * eq.quantity;
      }, 0);
      
      // Calculate adapted monthly based on new coefficient
      const adaptedMonthly = (totalFinancedAmount * newCoef) / 100;
      
      // Calculate the monthly payment difference first
      const monthlyDifference = newMonthly - adaptedMonthly;
      
      // Convert to margin difference by calculating how much capital this represents
      // If we have the coefficient, we can calculate how much capital is needed to generate 
      // this monthly payment difference
      marginDifference = (monthlyDifference * 100) / newCoef;
    }

    const marginAmount = totalFinancedAmount - totalBaseAmount;
    const marginPercentage = (marginAmount / totalBaseAmount) * 100;

    setGlobalMarginAdjustment({
      percentage: Number(marginPercentage.toFixed(2)),
      amount: marginAmount,
      newMonthly: newMonthly,
      currentCoef: currentCoef,
      newCoef: newCoef,
      adaptMonthlyPayment: globalMarginAdjustment.adaptMonthlyPayment,
      marginDifference: marginDifference
    });

    setTotalMonthlyPayment(newMonthly);
  };

  const applyCalculatedMargin = () => {
    if (calculatedMargin.percentage > 0) {
      console.log("Applying calculated margin:", calculatedMargin.percentage);
      
      // Update the equipment with the calculated margin
      setEquipment(prev => ({
        ...prev,
        margin: Number(calculatedMargin.percentage.toFixed(2))
      }));
      
      // If we have a targetMonthlyPayment, update the equipment's monthly payment
      if (targetMonthlyPayment > 0) {
        setEquipment(prev => ({
          ...prev,
          monthlyPayment: targetMonthlyPayment
        }));
      }
    }
  };

  const addToList = () => {
    if (equipment.title && equipment.purchasePrice > 0) {
      // Use target monthly payment if it exists, otherwise use calculated monthly payment
      const currentMonthlyPayment = targetMonthlyPayment > 0 ? targetMonthlyPayment : monthlyPayment;
      console.log("Adding to list with monthly payment:", currentMonthlyPayment);
      
      const equipmentToAdd = {
        ...equipment,
        margin: Number(equipment.margin.toFixed(2)),
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
      
      // Reset equipment and targetMonthlyPayment after adding to list
      setEquipment({
        id: crypto.randomUUID(),
        title: '',
        purchasePrice: 0,
        quantity: 1,
        margin: 20,
        monthlyPayment: 0,
      });
      
      setTargetMonthlyPayment(0);
    }
  };

  const startEditing = (id: string) => {
    const equipmentToEdit = equipmentList.find(eq => eq.id === id);
    if (equipmentToEdit) {
      setEquipment(equipmentToEdit);
      setEditingId(id);
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
  };

  const removeFromList = (id: string) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  const updateQuantity = (id: string, change: number) => {
    setEquipmentList(equipmentList.map(eq => 
      eq.id === id ? { ...eq, quantity: Math.max(1, eq.quantity + change) } : eq
    ));
  };

  // Recalculate monthly payment whenever equipment or leaser changes
  useEffect(() => {
    calculateMonthlyPayment();
  }, [equipment, leaser]);

  // Recalculate margin whenever target monthly payment, purchase price, or leaser changes
  useEffect(() => {
    calculateMarginFromMonthlyPayment();
  }, [targetMonthlyPayment, equipment.purchasePrice, leaser]);

  // Recalculate global margin adjustment whenever equipment list, leaser, or adaptMonthlyPayment changes
  useEffect(() => {
    calculateGlobalMarginAdjustment();
  }, [equipmentList, leaser, globalMarginAdjustment.adaptMonthlyPayment]);

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
    globalMarginAdjustment,
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
    toggleAdaptMonthlyPayment
  };
};
