
/**
 * Calcule le montant financé à partir de la mensualité et du coefficient
 */
export const calculateFinancedAmount = (monthlyPayment: number, coefficient: number): number => {
  // Formule: Montant financé = (Mensualité × 100) ÷ Coefficient
  if (!monthlyPayment || !coefficient || coefficient === 0) return 0;
  
  return Math.round((monthlyPayment * 100) / coefficient);
};

import { supabase } from "@/integrations/supabase/client";

/**
 * Calcule la commission basée sur le niveau de commission
 */
export const calculateCommissionByLevel = async (
  amount: number, 
  commissionLevelId: string,
  levelType: 'ambassador' | 'partner', 
  entityId?: string
): Promise<{ amount: number; rate: number; rateId?: string } | null> => {
  if (!amount || amount <= 0 || !commissionLevelId) {
    console.error("Données invalides pour le calcul de commission", { amount, commissionLevelId });
    return null;
  }
  
  try {
    console.log(`Calcul de commission pour montant: ${amount}€, niveau: ${commissionLevelId}, type: ${levelType}`);
    
    // Récupérer les taux de commission pour le niveau spécifique
    const { data: rates, error } = await supabase
      .from('commission_rates')
      .select('*')
      .eq('commission_level_id', commissionLevelId)
      .order('min_amount', { ascending: true });
    
    if (error) {
      console.error("Erreur lors de la récupération des taux de commission:", error);
      return null;
    }
    
    if (!rates || rates.length === 0) {
      console.error("Aucun taux de commission trouvé pour le niveau:", commissionLevelId);
      return null;
    }
    
    console.log(`Taux de commission trouvés (${rates.length}):`, rates);
    
    // Trouver le taux applicable en fonction du montant
    const applicableRate = rates.find(rate => 
      amount >= rate.min_amount && 
      (amount <= rate.max_amount || rate.max_amount === null || rate.max_amount === 0)
    );
    
    if (!applicableRate) {
      console.error(`Aucun taux applicable trouvé pour le montant ${amount}€ dans les taux:`, rates);
      return null;
    }
    
    console.log(`Taux applicable trouvé: ${applicableRate.rate}% pour le montant ${amount}€`);
    console.log(`Min: ${applicableRate.min_amount}€, Max: ${applicableRate.max_amount || 'illimité'}€`);
    
    // Calculer la commission
    const commissionAmount = Math.round((amount * applicableRate.rate) / 100);
    
    console.log(`Commission calculée: ${commissionAmount}€ (${amount}€ * ${applicableRate.rate}%)`);
    
    return {
      amount: commissionAmount,
      rate: applicableRate.rate,
      rateId: applicableRate.id
    };
  } catch (error) {
    console.error("Erreur lors du calcul de la commission:", error);
    return null;
  }
};
