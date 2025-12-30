
import { useState, useEffect, useRef } from 'react';
import { Equipment, Leaser, GlobalMarginAdjustment } from '@/types/equipment';
import { defaultLeasers } from '@/data/leasers';
import { 
  calculateEquipmentResults, 
  findCoefficientForAmount, 
  calculateFinancedAmountForEquipment,
  roundToTwoDecimals
} from '@/utils/equipmentCalculations';

export const useSimplifiedEquipmentCalculator = (selectedLeaser: Leaser | null, duration: number = 36) => {
  const leaser = selectedLeaser;
  
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
  const [targetSalePrice, setTargetSalePrice] = useState<number>(0);
  const [coefficient, setCoefficient] = useState<number>(0);
  const [calculatedMargin, setCalculatedMargin] = useState({ percentage: 0, amount: 0 });
  const [calculatedFromSalePrice, setCalculatedFromSalePrice] = useState({ margin: 0, monthlyPayment: 0 });
  
  // États pour la liste des équipements
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // États pour les ajustements globaux
  const [useGlobalAdjustment, setUseGlobalAdjustment] = useState<boolean>(false);
  
  // Refs pour éviter les recalculs inutiles
  const lastEquipmentPriceRef = useRef(0);
  const lastLeaserIdRef = useRef("");
  const lastEquipmentMarginRef = useRef(0);
  
  // Refs pour verrouiller le montant financé lors du changement de durée
  const lastDurationRef = useRef(duration);
  const lastFinancedAmountRef = useRef<number | null>(null);
  const lastTotalMonthlyRef = useRef<number | null>(null);

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
    const coef = findCoefficientForAmount(financedAmount, leaser, duration);
    setCoefficient(coef);
    // Arrondir la mensualité à 2 décimales
    const calculated = roundToTwoDecimals((financedAmount * coef) / 100);
    
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
    
    // Utiliser directement les ranges du leaser ou des valeurs de fallback
    const ranges = leaser?.ranges || [];
    
    let coef = 3.55; // Coefficient par défaut
    
    if (ranges.length > 0) {
      coef = ranges[0].coefficient || 3.55;
      
      for (const range of ranges) {
        let rangeCoef = range.coefficient || 3.55;
        
        // Si le range a des coefficients par durée, les utiliser
        if (range.duration_coefficients && range.duration_coefficients.length > 0) {
          const durationCoeff = range.duration_coefficients.find(
            dc => dc.duration_months === duration
          );
          if (durationCoeff) {
            rangeCoef = durationCoeff.coefficient;
          }
        }
        
        const financedAmountEstimate = (targetMonthlyPayment * 100) / rangeCoef;
        if (financedAmountEstimate >= range.min && financedAmountEstimate <= range.max) {
          coef = rangeCoef;
          break;
        }
      }
    } else {
      // Fallback avec les valeurs par défaut
      const DEFAULT_RANGES = [
        { min: 500, max: 2500, coefficient: 3.55 },
        { min: 2500.01, max: 5000, coefficient: 3.27 },
        { min: 5000.01, max: 12500, coefficient: 3.18 },
        { min: 12500.01, max: 25000, coefficient: 3.17 },
        { min: 25000.01, max: 50000, coefficient: 3.16 }
      ];
      
      for (const range of DEFAULT_RANGES) {
        const financedAmountEstimate = (targetMonthlyPayment * 100) / range.coefficient;
        if (financedAmountEstimate >= range.min && financedAmountEstimate <= range.max) {
          coef = range.coefficient;
          break;
        }
      }
    }
    
    // Calculer le montant financé requis avec précision
    const requiredTotal = roundToTwoDecimals((targetMonthlyPayment * 100) / coef);
    const marginAmount = roundToTwoDecimals(requiredTotal - equipment.purchasePrice);
    const marginPercentage = (marginAmount / equipment.purchasePrice) * 100;
    
    setCalculatedMargin({
      percentage: roundToTwoDecimals(marginPercentage),
      amount: marginAmount
    });
    
    setCoefficient(coef);
  };

  // Calcul à partir du prix de vente souhaité
  const calculateFromSalePrice = () => {
    if (targetSalePrice <= 0 || equipment.purchasePrice <= 0 || targetSalePrice <= equipment.purchasePrice) {
      setCalculatedFromSalePrice({ margin: 0, monthlyPayment: 0 });
      return;
    }
    
    const marginAmount = roundToTwoDecimals(targetSalePrice - equipment.purchasePrice);
    const marginPercentage = (marginAmount / equipment.purchasePrice) * 100;
    
    // Calculer la mensualité à partir du prix de vente et du coefficient avec précision
    const coef = coefficient > 0 ? coefficient : findCoefficientForAmount(targetSalePrice, leaser, duration);
    const monthlyPaymentCalc = roundToTwoDecimals((targetSalePrice * coef) / 100);
    
    setCalculatedFromSalePrice({
      margin: roundToTwoDecimals(marginPercentage),
      monthlyPayment: monthlyPaymentCalc
    });
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

  // Application du calcul à partir du prix de vente
  const applyCalculatedFromSalePrice = () => {
    if (calculatedFromSalePrice.margin > 0 && calculatedFromSalePrice.monthlyPayment > 0) {
      console.log('Applying calculated from sale price:', {
        margin: calculatedFromSalePrice.margin,
        monthlyPayment: calculatedFromSalePrice.monthlyPayment,
        currentEquipmentMargin: equipment.margin,
        currentMonthlyPayment: monthlyPayment,
        currentTargetMonthlyPayment: targetMonthlyPayment
      });
      
      setEquipment(prev => ({
        ...prev,
        margin: calculatedFromSalePrice.margin,
        monthlyPayment: calculatedFromSalePrice.monthlyPayment
      }));
      
      // Mettre à jour la mensualité globale
      setMonthlyPayment(calculatedFromSalePrice.monthlyPayment);
      
      // Réinitialiser targetMonthlyPayment pour éviter les conflits d'affichage
      setTargetMonthlyPayment(0);
      
      // Réinitialiser tous les refs pour permettre un futur recalcul si l'utilisateur change les valeurs
      lastEquipmentPriceRef.current = 0;
      lastLeaserIdRef.current = "";
      lastEquipmentMarginRef.current = -1;
      
      // NE PAS appeler calculateMonthlyPayment() ici car cela écraserait la mensualité qu'on vient d'appliquer
    }
  };

  // Gestion de la liste des équipements
  const addToList = () => {
    if (equipment.title && equipment.purchasePrice > 0) {
      // CORRECTION : Si targetMonthlyPayment vient du catalogue (prix unitaire), le multiplier par la quantité
      // pour obtenir le total de la ligne. Sinon utiliser monthlyPayment qui est déjà calculé.
      const currentMonthlyPayment = targetMonthlyPayment > 0 
        ? targetMonthlyPayment * equipment.quantity  // Prix catalogue unitaire × quantité = total ligne
        : monthlyPayment;
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
        monthlyPayment: equipmentToAdd.monthlyPayment,
        targetMonthlyPayment,
        isFromCatalogue: targetMonthlyPayment > 0
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
      setTargetSalePrice(0);
      setCalculatedMargin({ percentage: 0, amount: 0 });
      setCalculatedFromSalePrice({ margin: 0, monthlyPayment: 0 });
    }
  };

  const startEditing = (id: string) => {
    const equipmentToEdit = equipmentList.find(eq => eq.id === id);
    if (equipmentToEdit) {
      setEquipment(equipmentToEdit);
      setEditingId(id);
      
      // Calculer et définir le prix de vente basé sur la marge stockée
      const marginAmount = (equipmentToEdit.purchasePrice * equipmentToEdit.margin) / 100;
      const priceWithMargin = equipmentToEdit.purchasePrice + marginAmount;
      setTargetSalePrice(priceWithMargin);
      
      if (equipmentToEdit.monthlyPayment && equipmentToEdit.monthlyPayment > 0) {
        // monthlyPayment stocké est le total (unitaire × quantité)
        // On divise par la quantité pour obtenir la mensualité unitaire
        const quantity = equipmentToEdit.quantity || 1;
        const unitMonthlyPayment = equipmentToEdit.monthlyPayment / quantity;
        setTargetMonthlyPayment(unitMonthlyPayment);
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
    setTargetSalePrice(0);
    setCalculatedMargin({ percentage: 0, amount: 0 });
    setCalculatedFromSalePrice({ margin: 0, monthlyPayment: 0 });
  };

  const removeFromList = (id: string) => {
    console.log("🗑️ REMOVING EQUIPMENT FROM LIST:", id);
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    console.log(`📊 UPDATING QUANTITY for item ${id} to ${newQuantity}`);
    setEquipmentList(prevList => 
      prevList.map(eq => {
        if (eq.id !== id) return eq;
        
        // Recalculer le monthlyPayment proportionnellement si basé sur un prix catalogue
        // monthlyPayment stocké = total ligne, donc on calcule le prix unitaire puis on remultiplie
        const oldQuantity = eq.quantity || 1;
        const unitMonthlyPrice = eq.monthlyPayment ? eq.monthlyPayment / oldQuantity : 0;
        const newMonthlyPayment = unitMonthlyPrice * newQuantity;
        
        console.log(`📊 QUANTITY UPDATE - Unit price: ${unitMonthlyPrice}, New total: ${newMonthlyPayment}`);
        
        return { 
          ...eq, 
          quantity: newQuantity,
          monthlyPayment: newMonthlyPayment
        };
      })
    );
  };

  // Calculs globaux basés sur la liste des équipements
  const calculations = calculateEquipmentResults(equipmentList, leaser, duration);
  
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
  }, [equipment.margin, equipment.purchasePrice, leaser?.id, duration]);

  useEffect(() => {
    if (targetMonthlyPayment > 0 && equipment.purchasePrice > 0) {
      calculateMarginFromMonthlyPayment();
    }
  }, [targetMonthlyPayment, equipment.purchasePrice, leaser?.id, duration]);

  useEffect(() => {
    if (targetSalePrice > 0 && equipment.purchasePrice > 0) {
      calculateFromSalePrice();
    }
  }, [targetSalePrice, equipment.purchasePrice, coefficient]);

  // Mettre à jour les refs avant chaque changement de durée
  // pour capturer le montant financé et mensualité actuels
  useEffect(() => {
    if (equipmentList.length > 0) {
      lastFinancedAmountRef.current = calculations.totalFinancedAmount;
      lastTotalMonthlyRef.current = calculations.normalMonthlyPayment;
    }
  }, [equipmentList, calculations.totalFinancedAmount, calculations.normalMonthlyPayment]);

  // Recalculer les mensualités UNIQUEMENT quand la durée change
  // On verrouille le montant financé affiché et on recalcule les mensualités proportionnellement
  useEffect(() => {
    // Ne rien faire si c'est la première exécution ou pas d'équipements
    if (equipmentList.length === 0 || lastDurationRef.current === duration) {
      lastDurationRef.current = duration;
      return;
    }
    
    const lockedFinanced = lastFinancedAmountRef.current;
    const oldTotalMonthly = lastTotalMonthlyRef.current;
    
    console.log("🔄 Duration changed - Recalculating with locked financed amount", {
      oldDuration: lastDurationRef.current,
      newDuration: duration,
      lockedFinanced,
      oldTotalMonthly,
      equipmentCount: equipmentList.length
    });
    
    // Mettre à jour la ref de durée
    lastDurationRef.current = duration;
    
    // Si on n'a pas de montant financé verrouillé, fallback sur le calcul classique
    if (!lockedFinanced || lockedFinanced <= 0 || !oldTotalMonthly || oldTotalMonthly <= 0) {
      console.log("⚠️ No locked financed amount, using classic recalculation");
      setEquipmentList(prevList => 
        prevList.map(eq => {
          const financedAmount = calculateFinancedAmountForEquipment(eq);
          const newCoeff = findCoefficientForAmount(financedAmount, leaser, duration);
          const newMonthlyPayment = roundToTwoDecimals((financedAmount * newCoeff) / 100);
          return { ...eq, monthlyPayment: newMonthlyPayment };
        })
      );
      return;
    }
    
    // Calculer le nouveau coefficient basé sur le montant financé verrouillé
    const newCoeff = findCoefficientForAmount(lockedFinanced, leaser, duration);
    const newTotalMonthly = roundToTwoDecimals((lockedFinanced * newCoeff) / 100);
    
    // Calculer le ratio pour redistribuer proportionnellement
    const ratio = newTotalMonthly / oldTotalMonthly;
    
    console.log("📊 Duration change calculation:", {
      lockedFinanced,
      oldTotalMonthly,
      newCoeff,
      newTotalMonthly,
      ratio
    });
    
    setEquipmentList(prevList => 
      prevList.map(eq => {
        const oldMonthly = eq.monthlyPayment || 0;
        const newMonthlyPayment = roundToTwoDecimals(oldMonthly * ratio);
        
        console.log(`📊 ${eq.title}: old=${oldMonthly}, new=${newMonthlyPayment} (ratio=${ratio})`);
        
        return {
          ...eq,
          monthlyPayment: newMonthlyPayment
        };
      })
    );
    
    // Mettre à jour les refs avec les nouvelles valeurs
    lastTotalMonthlyRef.current = newTotalMonthly;
  }, [duration]);

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
    targetSalePrice,
    setTargetSalePrice,
    coefficient,
    calculatedMargin,
    calculatedFromSalePrice,
    
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
    applyCalculatedFromSalePrice,
    addToList,
    startEditing,
    cancelEditing,
    removeFromList,
    updateQuantity,
    toggleAdaptMonthlyPayment,
    
    // Utilitaires
    findCoefficient: (amount: number) => findCoefficientForAmount(amount, leaser, duration),
    calculateFinancedAmount: calculateFinancedAmountForEquipment,
    
    // Calculs détaillés pour debugging
    calculations
  };
};
