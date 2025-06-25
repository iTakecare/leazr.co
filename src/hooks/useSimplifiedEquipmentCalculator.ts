
import { useState, useEffect, useRef } from 'react';
import { Equipment, Leaser, GlobalMarginAdjustment } from '@/types/equipment';
import { defaultLeasers } from '@/data/leasers';
import { 
  calculateEquipmentResults, 
  findCoefficientForAmount, 
  calculateFinancedAmountForEquipment 
} from '@/utils/equipmentCalculations';

export const useSimplifiedEquipmentCalculator = (selectedLeaser: Leaser | null) => {
  const leaser = selectedLeaser || defaultLeasers[0];
  
  // États pour l'équipement en cours de création/édition
  const [equipment, setEquipment] = useState<Equipment>({
    id: crypto.randomUUID(),
    title: '',
    purchasePrice: 0,
    quantity: 1,
    margin: 20,
    monthlyPayment: 0,
  });
  
  // États pour les calculs de l'équipement individuel
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [targetMonthlyPayment, setTargetMonthlyPayment] = useState<number>(0);
  const [coefficient, setCoefficient] = useState<number>(0);
  const [calculatedMargin, setCalculatedMargin] = useState({ percentage: 0, amount: 0 });
  
  // États pour la liste des équipements
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // États pour les ajustements globaux
  const [useGlobalAdjustment, setUseGlobalAdjustment] = useState<boolean>(false);
  
  // Refs pour éviter les recalculs inutiles
  const lastEquipmentPriceRef = useRef(0);
  const lastLeaserIdRef = useRef("");
  const lastEquipmentMarginRef = useRef(0);

  // Calcul de l'équipement individuel
  const calculateMonthlyPayment = () => {
    if (equipment.purchasePrice === lastEquipmentPriceRef.current && 
        leaser?.id === lastLeaserIdRef.current &&
        equipment.margin === lastEquipmentMarginRef.current) {
      return;
    }
    
    lastEquipmentPriceRef.current = equipment.purchasePrice;
    lastLeaserIdRef.current = leaser?.id || "";
    lastEquipmentMarginRef.current = equipment.margin;
    
    const financedAmount = calculateFinancedAmountForEquipment(equipment);
    const coef = findCoefficientForAmount(financedAmount, leaser);
    setCoefficient(coef);
    const calculated = (financedAmount * coef) / 100;
    
    setMonthlyPayment(calculated);
    
    setEquipment(prev => ({
      ...prev,
      monthlyPayment: calculated
    }));
  };

  // Calcul de la marge à partir de la mensualité cible
  const calculateMarginFromMonthlyPayment = () => {
    if (targetMonthlyPayment <= 0 || equipment.purchasePrice <= 0) {
      setCalculatedMargin({ percentage: 0, amount: 0 });
      return;
    }
    
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
  };

  // Application de la marge calculée
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

  // Gestion de la liste des équipements
  const addToList = () => {
    if (equipment.title && equipment.purchasePrice > 0) {
      const currentMonthlyPayment = targetMonthlyPayment > 0 ? targetMonthlyPayment : monthlyPayment;
      const marginToUse = calculatedMargin.percentage > 0 ? calculatedMargin.percentage : equipment.margin;
      
      const equipmentToAdd = {
        ...equipment,
        margin: Number(marginToUse.toFixed(2)),
        monthlyPayment: currentMonthlyPayment
      };
      
      console.log("🔧 ADDING EQUIPMENT TO LIST:", {
        title: equipmentToAdd.title,
        purchasePrice: equipmentToAdd.purchasePrice,
        quantity: equipmentToAdd.quantity,
        margin: equipmentToAdd.margin,
        marginAmount: (equipmentToAdd.purchasePrice * equipmentToAdd.quantity * equipmentToAdd.margin) / 100,
        monthlyPayment: equipmentToAdd.monthlyPayment
      });
      
      if (editingId) {
        setEquipmentList(equipmentList.map(eq => 
          eq.id === editingId ? { ...equipmentToAdd, id: editingId } : eq
        ));
        setEditingId(null);
      } else {
        setEquipmentList([...equipmentList, equipmentToAdd]);
      }
      
      // Reset du formulaire
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
    console.log("🗑️ REMOVING EQUIPMENT FROM LIST:", id);
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    console.log(`📊 UPDATING QUANTITY for item ${id} to ${newQuantity}`);
    setEquipmentList(prevList => 
      prevList.map(eq => 
        eq.id === id ? { ...eq, quantity: newQuantity } : eq
      )
    );
  };

  // Calculs globaux basés sur la liste des équipements
  const calculations = calculateEquipmentResults(equipmentList, leaser);
  
  // Log des marges pour debugging
  const totalEquipmentMargin = equipmentList.reduce((sum, eq) => {
    const equipmentMargin = (eq.purchasePrice * eq.quantity * eq.margin) / 100;
    return sum + equipmentMargin;
  }, 0);
  
  console.log("🎯 HOOK - Marges détaillées:", {
    equipmentCount: equipmentList.length,
    equipmentMargins: equipmentList.map(eq => ({
      title: eq.title,
      margin: eq.margin,
      marginAmount: (eq.purchasePrice * eq.quantity * eq.margin) / 100
    })),
    totalEquipmentMargin,
    useGlobalAdjustment,
    marginDifference: calculations.marginDifference
  });
  
  // Détermination des valeurs finales à utiliser
  const finalMarginAmount = useGlobalAdjustment ? calculations.adjustedMarginAmount : calculations.normalMarginAmount;
  const finalMonthlyPayment = useGlobalAdjustment ? calculations.adjustedMonthlyPayment : calculations.normalMonthlyPayment;
  const finalMarginPercentage = useGlobalAdjustment ? calculations.adjustedMarginPercentage : calculations.normalMarginPercentage;

  // Global margin adjustment object pour compatibilité
  const globalMarginAdjustment: GlobalMarginAdjustment = {
    percentage: finalMarginPercentage,
    amount: finalMarginAmount,
    newMonthly: finalMonthlyPayment,
    currentCoef: calculations.globalCoefficient,
    newCoef: calculations.globalCoefficient,
    adaptMonthlyPayment: useGlobalAdjustment,
    marginDifference: calculations.marginDifference
  };

  // Toggle de l'ajustement global
  const toggleAdaptMonthlyPayment = () => {
    setUseGlobalAdjustment(prev => !prev);
  };

  // Effects
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

  console.log("🎯 HOOK - État final:", {
    equipmentCount: equipmentList.length,
    useGlobalAdjustment,
    finalMonthlyPayment,
    totalEquipmentMargin,
    marginDifference: calculations.marginDifference,
    calculations
  });

  return {
    // États de l'équipement
    equipment,
    setEquipment,
    monthlyPayment,
    targetMonthlyPayment,
    setTargetMonthlyPayment,
    coefficient,
    calculatedMargin,
    
    // Liste des équipments
    equipmentList,
    setEquipmentList,
    editingId,
    
    // Calculs globaux
    totalMonthlyPayment: finalMonthlyPayment,
    globalMarginAdjustment: {
      ...globalMarginAdjustment,
      active: useGlobalAdjustment
    },
    setGlobalMarginAdjustment: () => {}, // Pour compatibilité
    
    // Actions
    applyCalculatedMargin,
    addToList,
    startEditing,
    cancelEditing,
    removeFromList,
    updateQuantity,
    toggleAdaptMonthlyPayment,
    
    // Utilitaires
    findCoefficient: (amount: number) => findCoefficientForAmount(amount, leaser),
    calculateFinancedAmount: calculateFinancedAmountForEquipment,
    
    // Calculs détaillés pour debugging
    calculations
  };
};
