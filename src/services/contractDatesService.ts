import { supabase } from "@/integrations/supabase/client";

/**
 * Calcule la date de début de contrat selon la règle du leaser
 */
export const calculateContractStartDate = async (
  deliveryDate: Date,
  leaserName: string
): Promise<Date | null> => {
  try {
    const { data: leaser, error } = await supabase
      .from('leasers')
      .select('contract_start_rule')
      .eq('name', leaserName)
      .maybeSingle();

    if (error || !leaser) {
      console.warn('Impossible de récupérer la règle du leaser, utilisation par défaut');
      return calculateNextMonthFirst(deliveryDate);
    }

    const rule = leaser.contract_start_rule || 'next_month_first';

    switch (rule) {
      case 'next_month_first':
        return calculateNextMonthFirst(deliveryDate);
      case 'next_quarter_first':
        return calculateNextQuarterFirst(deliveryDate);
      case 'next_semester_first':
        return calculateNextSemesterFirst(deliveryDate);
      case 'next_year_first':
        return calculateNextYearFirst(deliveryDate);
      case 'delivery_date':
        return deliveryDate;
      case 'delivery_date_plus_15':
        return addDays(deliveryDate, 15);
      default:
        return calculateNextMonthFirst(deliveryDate);
    }
  } catch (error) {
    console.error('Erreur lors du calcul de la date de début:', error);
    return null;
  }
};

const calculateNextMonthFirst = (date: Date): Date => {
  const nextMonth = new Date(date);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  return nextMonth;
};

const calculateNextQuarterFirst = (date: Date): Date => {
  const currentQuarter = Math.floor(date.getMonth() / 3);
  const nextQuarter = (currentQuarter + 1) % 4;
  const year = nextQuarter === 0 ? date.getFullYear() + 1 : date.getFullYear();
  return new Date(year, nextQuarter * 3, 1);
};

const calculateNextSemesterFirst = (date: Date): Date => {
  const currentSemester = date.getMonth() < 6 ? 0 : 1;
  const nextSemester = (currentSemester + 1) % 2;
  const year = nextSemester === 0 ? date.getFullYear() + 1 : date.getFullYear();
  return new Date(year, nextSemester * 6, 1);
};

const calculateNextYearFirst = (date: Date): Date => {
  return new Date(date.getFullYear() + 1, 0, 1);
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
