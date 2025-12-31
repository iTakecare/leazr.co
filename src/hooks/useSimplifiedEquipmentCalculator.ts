
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
  
  // Ref pour détecter le changement de durée
  const previousDurationRef = useRef(duration);
  
  // ========== BASELINE REFS pour le self-leasing (is_own_company) ==========
  // Ces refs mémorisent l'état "source" pour éviter la dérive lors des changements de durée
  const baseDurationRef = useRef<number | null>(null);
  const baseMonthlyByIdRef = useRef<Record<string, number>>({});
  const baseFinancedRef = useRef<number | null>(null);
  const baseCoefRef = useRef<number | null>(null);
  const isApplyingDurationChangeRef = useRef(false);

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

  // Fonction pour recalculer les mensualités quand la durée change (leasing en propre)
  // NOUVELLE LOGIQUE: On utilise une baseline pour éviter la dérive
  // Le montant financé affiché reste CONSTANT, seule la mensualité change proportionnellement au coefficient
  const recalculateMonthlyPaymentsForDuration = (newDuration: number) => {
    if (equipmentList.length === 0) return;
    
    // Si pas en leasing en propre, ne rien faire (comportement normal)
    if (!leaser?.is_own_company) {
      console.log("🔄 DURATION CHANGE - Not self-leasing, skipping recalculation");
      return;
    }
    
    // Si mode ajustement global activé, ne pas appliquer cette logique
    if (useGlobalAdjustment) {
      console.log("🔄 DURATION CHANGE - Global adjustment mode active, skipping self-leasing recalc");
      return;
    }
    
    console.log("🔄 SELF-LEASING DURATION CHANGE - Recalculating with baseline scaling");
    
    // Vérifier qu'on a une baseline valide
    if (baseFinancedRef.current === null || baseCoefRef.current === null || baseDurationRef.current === null) {
      console.log("⚠️ No baseline available, initializing now...");
      // Initialiser la baseline avec l'état actuel
      const currentMonthlyById: Record<string, number> = {};
      let currentTotalMonthly = 0;
      equipmentList.forEach(eq => {
        currentMonthlyById[eq.id] = eq.monthlyPayment || 0;
        currentTotalMonthly += eq.monthlyPayment || 0;
      });
      
      // Calculer le montant financé à partir des mensualités actuelles et du coefficient actuel
      const currentCoef = findCoefficientForAmount(
        calculations.totalFinancedAmount || 10000, 
        leaser, 
        previousDurationRef.current
      );
      const currentFinanced = currentTotalMonthly > 0 && currentCoef > 0 
        ? roundToTwoDecimals((currentTotalMonthly * 100) / currentCoef)
        : calculations.totalFinancedAmount;
      
      baseDurationRef.current = previousDurationRef.current;
      baseMonthlyByIdRef.current = currentMonthlyById;
      baseFinancedRef.current = currentFinanced;
      baseCoefRef.current = currentCoef;
      
      console.log("📌 BASELINE INITIALIZED:", {
        baseDuration: baseDurationRef.current,
        baseFinanced: baseFinancedRef.current,
        baseCoef: baseCoefRef.current,
        baseMonthlyById: baseMonthlyByIdRef.current
      });
    }
    
    // Calculer le nouveau coefficient pour la nouvelle durée basé sur le montant financé de référence
    const newCoef = findCoefficientForAmount(baseFinancedRef.current!, leaser, newDuration);
    const oldCoef = baseCoefRef.current!;
    
    // Le ratio de scaling
    const scalingFactor = newCoef / oldCoef;
    
    console.log(`🎯 SCALING: baseFinanced=${baseFinancedRef.current}€, oldCoef=${oldCoef}%, newCoef=${newCoef}%, factor=${scalingFactor.toFixed(4)}`);
    
    // Calculer le nouveau total mensuel attendu
    const expectedTotalMonthly = roundToTwoDecimals((baseFinancedRef.current! * newCoef) / 100);
    
    // Marquer qu'on applique un changement de durée (pour éviter de reset la baseline)
    isApplyingDurationChangeRef.current = true;
    
    setEquipmentList(prevList => {
      // Recalculer chaque mensualité à partir de la baseline avec le factor
      let calculatedTotal = 0;
      const updatedList = prevList.map(eq => {
        const baseMonthly = baseMonthlyByIdRef.current[eq.id];
        if (baseMonthly === undefined) {
          // Nouvel équipement ajouté après la baseline, calculer normalement
          const financedAmount = roundToTwoDecimals(eq.purchasePrice * eq.quantity * (1 + eq.margin / 100));
          const newMonthlyPayment = roundToTwoDecimals((financedAmount * newCoef) / 100);
          calculatedTotal += newMonthlyPayment;
          return { ...eq, monthlyPayment: newMonthlyPayment };
        }
        
        // Appliquer le scaling
        const newMonthlyPayment = roundToTwoDecimals(baseMonthly * scalingFactor);
        calculatedTotal += newMonthlyPayment;
        
        console.log(`📊 ${eq.title}: base ${baseMonthly}€ × ${scalingFactor.toFixed(4)} = ${newMonthlyPayment}€`);
        
        return {
          ...eq,
          monthlyPayment: newMonthlyPayment
        };
      });
      
      // Ajuster les centimes si nécessaire (corriger l'arrondi sur la dernière ligne)
      const diff = roundToTwoDecimals(expectedTotalMonthly - calculatedTotal);
      if (Math.abs(diff) > 0.001 && Math.abs(diff) < 1 && updatedList.length > 0) {
        const lastIdx = updatedList.length - 1;
        updatedList[lastIdx] = {
          ...updatedList[lastIdx],
          monthlyPayment: roundToTwoDecimals((updatedList[lastIdx].monthlyPayment || 0) + diff)
        };
        console.log(`🔧 Rounding adjustment: ${diff}€ on last item`);
      }
      
      console.log(`✅ TOTAL MONTHLY: expected=${expectedTotalMonthly}€, calculated=${calculatedTotal}€, after adjustment=${expectedTotalMonthly}€`);
      
      return updatedList;
    });
    
    // Réinitialiser le flag après un court délai
    setTimeout(() => {
      isApplyingDurationChangeRef.current = false;
    }, 100);
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

  // Effet pour détecter le changement de durée et recalculer les mensualités
  useEffect(() => {
    if (previousDurationRef.current !== duration && equipmentList.length > 0) {
      console.log(`🕐 Duration changed from ${previousDurationRef.current} to ${duration} months - recalculating all monthly payments...`);
      recalculateMonthlyPaymentsForDuration(duration);
    }
    previousDurationRef.current = duration;
  }, [duration, leaser]);

  // Effet pour initialiser/mettre à jour la baseline quand la liste change (hors changement de durée)
  // Cet effet se déclenche UNIQUEMENT pour les actions utilisateur (ajout/suppression/édition)
  useEffect(() => {
    // Ne pas mettre à jour la baseline si on est en train d'appliquer un changement de durée
    if (isApplyingDurationChangeRef.current) {
      console.log("📌 BASELINE - Skipping update (duration change in progress)");
      return;
    }
    
    // Ne s'applique qu'au self-leasing
    if (!leaser?.is_own_company) {
      return;
    }
    
    // Ne s'applique que si on a des équipements
    if (equipmentList.length === 0) {
      // Reset baseline
      baseDurationRef.current = null;
      baseMonthlyByIdRef.current = {};
      baseFinancedRef.current = null;
      baseCoefRef.current = null;
      return;
    }
    
    // Calculer les valeurs actuelles
    const currentMonthlyById: Record<string, number> = {};
    let currentTotalMonthly = 0;
    equipmentList.forEach(eq => {
      currentMonthlyById[eq.id] = eq.monthlyPayment || 0;
      currentTotalMonthly += eq.monthlyPayment || 0;
    });
    
    // Calculer le coefficient actuel
    const currentCoef = findCoefficientForAmount(
      calculations.totalFinancedAmount || 10000,
      leaser,
      duration
    );
    
    // Calculer le montant financé à partir des mensualités et du coefficient
    const currentFinanced = currentTotalMonthly > 0 && currentCoef > 0
      ? roundToTwoDecimals((currentTotalMonthly * 100) / currentCoef)
      : calculations.totalFinancedAmount;
    
    // Mettre à jour la baseline
    baseDurationRef.current = duration;
    baseMonthlyByIdRef.current = currentMonthlyById;
    baseFinancedRef.current = currentFinanced;
    baseCoefRef.current = currentCoef;
    
    console.log("📌 BASELINE UPDATED:", {
      baseDuration: duration,
      baseFinanced: currentFinanced,
      baseCoef: currentCoef,
      equipmentCount: equipmentList.length,
      totalMonthly: currentTotalMonthly
    });
  }, [equipmentList.length, leaser?.is_own_company, leaser?.id]);

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
