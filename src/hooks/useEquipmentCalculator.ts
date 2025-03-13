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
    newCoef: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);

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
    setMonthlyPayment((financedAmount * coef) / 100);
  };

  const calculateMarginFromMonthlyPayment = () => {
    if (targetMonthlyPayment <= 0 || equipment.purchasePrice <= 0) {
      setCalculatedMargin({ percentage: 0, amount: 0 });
      return;
    }

    const ranges = selectedLeaser?.ranges || defaultLeasers[0].ranges;
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
        newCoef: 0
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
    const newMonthly = (totalFinancedAmount * newCoef) / 100;
    const marginAmount = totalFinancedAmount - totalBaseAmount;
    const marginPercentage = (marginAmount / totalBaseAmount) * 100;

    setGlobalMarginAdjustment({
      percentage: Number(marginPercentage.toFixed(2)),
      amount: marginAmount,
      newMonthly: newMonthly,
      currentCoef: currentCoef,
      newCoef: newCoef
    });

    setTotalMonthlyPayment(newMonthly);
  };

  const applyCalculatedMargin = () => {
    setEquipment({
      ...equipment,
      margin: Number(calculatedMargin.percentage.toFixed(2))
    });
  };

  const addToList = () => {
    if (equipment.title && equipment.purchasePrice > 0) {
      if (editingId) {
        setEquipmentList(equipmentList.map(eq => 
          eq.id === editingId ? { ...equipment, margin: Number(equipment.margin.toFixed(2)), id: editingId } : eq
        ));
        setEditingId(null);
      } else {
        const newEquipment = { ...equipment, margin: Number(equipment.margin.toFixed(2)) };
        setEquipmentList([...equipmentList, newEquipment]);
      }
      
      setEquipment({
        id: crypto.randomUUID(),
        title: '',
        purchasePrice: 0,
        quantity: 1,
        margin: 20,
      });
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
    });
  };

  const removeFromList = (id: string) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  const updateQuantity = (id: string, change: number) => {
    setEquipmentList(equipmentList.map(eq => 
      eq.id === id ? { ...eq, quantity: Math.max(1, eq.quantity + change) } : eq
    ));
  };

  useEffect(() => {
    calculateMonthlyPayment();
  }, [equipment, leaser]);

  useEffect(() => {
    calculateMarginFromMonthlyPayment();
  }, [targetMonthlyPayment, equipment.purchasePrice, leaser]);

  useEffect(() => {
    calculateGlobalMarginAdjustment();
  }, [equipmentList, leaser]);

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
    editingId,
    applyCalculatedMargin,
    addToList,
    startEditing,
    cancelEditing,
    removeFromList,
    updateQuantity,
    findCoefficient,
    calculateFinancedAmount
  };
};
