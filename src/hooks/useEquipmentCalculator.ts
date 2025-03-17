import { useState, useEffect } from 'react';
import { Equipment, GlobalMarginAdjustment } from '@/types/equipment';
import { Leaser } from '@/types/leaser';

// Mock default leasers for use when no leaser is selected
const defaultLeasers: Leaser[] = [
  {
    id: '1',
    name: 'Default Leaser',
    ranges: [
      { id: '1-1', min: 0, max: Infinity, coefficient: 2.1 }
    ]
  }
];

export const useEquipmentCalculator = (selectedLeaser: Leaser | null) => {
  const leaser = selectedLeaser || defaultLeasers[0];
  
  const [equipment, setEquipment] = useState<Equipment>({
    title: '',
    purchasePrice: 0,
    quantity: 1,
    margin: 20,
    monthlyPayment: 0,
    items: []
  });
  
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [targetMonthlyPayment, setTargetMonthlyPayment] = useState<number>(0);
  const [coefficient, setCoefficient] = useState<number>(0);
  const [calculatedMargin, setCalculatedMargin] = useState({ percentage: 0, amount: 0 });
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [totalMonthlyPayment, setTotalMonthlyPayment] = useState<number>(0);
  const [globalMarginAdjustment, setGlobalMarginAdjustment] = useState<GlobalMarginAdjustment>({ 
    enabled: false,
    originalAmount: 0,
    originalCoef: 0,
    originalMonthly: 0,
    adjustmentPercent: 0
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

    // Récupérer les plages du prestataire sélectionné
    const ranges = leaser?.ranges || defaultLeasers[0].ranges;
    
    // Trouver le coefficient approprié pour cette plage de financement
    // On commence par une estimation avec le coefficient de base
    let coef = ranges[0].coefficient;
    let finalCoef = coef;
    
    // Calculer le montant financé requis pour atteindre la mensualité cible
    // Formule: Montant financé = (Mensualité cible * 100) / coefficient
    const requiredFinancedAmount = (targetMonthlyPayment * 100) / coef;
    
    // Maintenant vérifier si ce montant de financement tombe dans une autre plage de coefficient
    // Si oui, recalculer avec le coefficient correct de cette plage
    for (const range of ranges) {
      if (requiredFinancedAmount >= range.min && requiredFinancedAmount <= range.max) {
        finalCoef = range.coefficient;
        break;
      }
    }
    
    // Recalculer le montant financé requis avec le coefficient correct
    const finalRequiredFinancedAmount = (targetMonthlyPayment * 100) / finalCoef;
    
    // La marge est la différence entre le montant financé requis et le prix d'achat
    const marginAmount = finalRequiredFinancedAmount - equipment.purchasePrice;
    
    // Calculer le pourcentage de marge
    const marginPercentage = (marginAmount / equipment.purchasePrice) * 100;
    
    // Mettre à jour l'état avec les valeurs calculées
    setCalculatedMargin({
      percentage: Number(marginPercentage.toFixed(2)),
      amount: marginAmount
    });
    
    // Mettre à jour le coefficient de l'équipement
    setCoefficient(finalCoef);
    
    console.log("Target monthly:", targetMonthlyPayment);
    console.log("Applied coefficient:", finalCoef);
    console.log("Required financed amount:", finalRequiredFinancedAmount);
    console.log("Calculated margin percentage:", marginPercentage);
    console.log("Calculated margin amount:", marginAmount);
  };

  const applyCalculatedMargin = () => {
    if (calculatedMargin.percentage > 0) {
      console.log("Applying calculated margin:", calculatedMargin.percentage);
      
      // Mettre à jour l'équipement avec la marge calculée
      setEquipment(prev => {
        // Créer un nouvel objet d'équipement avec la marge mise à jour
        const updatedEquipment = {
          ...prev,
          margin: Number(calculatedMargin.percentage.toFixed(2))
        };
        
        // Si nous avons une mensualité cible, mettre à jour la mensualité de l'équipement
        if (targetMonthlyPayment > 0) {
          updatedEquipment.monthlyPayment = targetMonthlyPayment;
          console.log("Setting monthly payment to target:", targetMonthlyPayment);
        }
        
        return updatedEquipment;
      });
      
      // Forcer un recalcul de la mensualité uniquement si pas de mensualité cible
      if (targetMonthlyPayment <= 0) {
        calculateMonthlyPayment();
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
        id: equipment.id || crypto.randomUUID(),
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
        title: '',
        purchasePrice: 0,
        quantity: 1,
        margin: 20,
        monthlyPayment: 0,
        items: []
      });
      
      setTargetMonthlyPayment(0);
    }
  };

  const startEditing = (id: string) => {
    const equipmentToEdit = equipmentList.find(eq => eq.id === id);
    if (equipmentToEdit) {
      setEquipment(equipmentToEdit);
      setEditingId(id);
      
      // If the equipment has a monthly payment, set it as the target
      if (equipmentToEdit.monthlyPayment && equipmentToEdit.monthlyPayment > 0) {
        setTargetMonthlyPayment(equipmentToEdit.monthlyPayment);
      }
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEquipment({
      title: '',
      purchasePrice: 0,
      quantity: 1,
      margin: 20,
      monthlyPayment: 0,
      items: []
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

  const calculateGlobalMarginAdjustment = () => {
    if (equipmentList.length === 0) {
      setGlobalMarginAdjustment({ 
        enabled: false,
        originalAmount: 0, 
        originalCoef: 0,
        originalMonthly: 0,
        adjustmentPercent: 0
      });
      return;
    }

    const totalBaseAmount = equipmentList.reduce((sum, eq) => {
      return sum + ((eq.purchasePrice || 0) * (eq.quantity || 1));
    }, 0);

    const totalFinancedAmount = equipmentList.reduce((sum, eq) => {
      return sum + calculateFinancedAmount(eq) * (eq.quantity || 1);
    }, 0);

    const currentCoef = findCoefficient(totalFinancedAmount);
    const currentMonthly = (totalFinancedAmount * currentCoef) / 100;
    const newCoef = findCoefficient(totalFinancedAmount);
    
    let newMonthly = 0;
    let marginDifference = 0;
    
    if (globalMarginAdjustment.adaptMonthlyPayment) {
      // Case 1: Using adapted monthly payment based on the coefficient
      newMonthly = (totalFinancedAmount * newCoef) / 100;
      marginDifference = 0; // No difference in this case
    } else {
      // Case 2: Using original monthly payments from individual equipment items
      newMonthly = equipmentList.reduce((sum, eq) => {
        return sum + ((eq.monthlyPayment || 0) * (eq.quantity || 1));
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
      enabled: true,
      originalAmount: totalBaseAmount,
      originalCoef: currentCoef,
      originalMonthly: currentMonthly,
      adjustmentPercent: marginPercentage,
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
