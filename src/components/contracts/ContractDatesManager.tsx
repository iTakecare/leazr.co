import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Info, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContractDatesManagerProps {
  contractId: string;
  deliveryDate?: string;
  contractStartDate?: string;
  leaserName: string;
  leaserId?: string;
  onUpdate?: () => void;
}

const ContractDatesManager: React.FC<ContractDatesManagerProps> = ({
  contractId,
  deliveryDate,
  contractStartDate,
  leaserName,
  leaserId,
  onUpdate
}) => {
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<Date | undefined>(
    deliveryDate ? new Date(deliveryDate) : undefined
  );
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(
    contractStartDate ? new Date(contractStartDate) : undefined
  );
  const [leaserRule, setLeaserRule] = useState<string>('');
  const [billingFrequency, setBillingFrequency] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fonction robuste pour récupérer les paramètres du leaser
  const resolveLeaserSettings = async (): Promise<{ rule: string; frequency: string; foundLeaserId?: string } | null> => {
    // 1. Chercher par ID si disponible (priorité)
    if (leaserId) {
      const { data } = await supabase
        .from('leasers')
        .select('id, contract_start_rule, billing_frequency, name')
        .eq('id', leaserId)
        .maybeSingle();
      if (data) {
        return { rule: data.contract_start_rule || 'next_month_first', frequency: data.billing_frequency || 'monthly', foundLeaserId: data.id };
      }
    }
    
    if (!leaserName) return null;
    
    // 2. Chercher par company_name exact (priorité haute - c'est le cas de SRL GRENKE LEASE)
    const { data: byCompanyName } = await supabase
      .from('leasers')
      .select('id, contract_start_rule, billing_frequency, name, company_name')
      .ilike('company_name', leaserName)
      .limit(1);
    
    if (byCompanyName && byCompanyName.length > 0) {
      const leaser = byCompanyName[0];
      return { rule: leaser.contract_start_rule || 'next_month_first', frequency: leaser.billing_frequency || 'monthly', foundLeaserId: leaser.id };
    }
    
    // 3. Chercher par name exact
    const { data: byName } = await supabase
      .from('leasers')
      .select('id, contract_start_rule, billing_frequency, name')
      .ilike('name', leaserName)
      .limit(1);
    
    if (byName && byName.length > 0) {
      const leaser = byName[0];
      return { rule: leaser.contract_start_rule || 'next_month_first', frequency: leaser.billing_frequency || 'monthly', foundLeaserId: leaser.id };
    }
    
    // 4. Recherche par mot-clé (extraire le mot principal du nom)
    const keywords = leaserName.split(/\s+/).filter(w => w.length > 3 && !['SRL', 'SPRL', 'SA', 'NV', 'BV'].includes(w.toUpperCase()));
    for (const keyword of keywords) {
      const { data: byKeyword } = await supabase
        .from('leasers')
        .select('id, contract_start_rule, billing_frequency, name, company_name')
        .or(`name.ilike.%${keyword}%,company_name.ilike.%${keyword}%`)
        .limit(1);
      
      if (byKeyword && byKeyword.length > 0) {
        const leaser = byKeyword[0];
        return { rule: leaser.contract_start_rule || 'next_month_first', frequency: leaser.billing_frequency || 'monthly', foundLeaserId: leaser.id };
      }
    }
    
    // 5. Self-leasing fallback
    if (leaserName.toLowerCase().includes('itakecare') || leaserName.toLowerCase().includes('itakcare')) {
      const { data } = await supabase
        .from('leasers')
        .select('id, contract_start_rule, billing_frequency, name')
        .eq('is_own_company', true)
        .maybeSingle();
      if (data) {
        return { rule: data.contract_start_rule || 'next_month_first', frequency: data.billing_frequency || 'monthly', foundLeaserId: data.id };
      }
    }
    
    return null;
  };

  // Récupérer les paramètres du leaser au chargement
  useEffect(() => {
    const fetchLeaserSettings = async () => {
      const settings = await resolveLeaserSettings();
      if (settings) {
        setLeaserRule(settings.rule);
        setBillingFrequency(settings.frequency);
      } else {
        console.warn('Leaser non trouvé, utilisation des valeurs par défaut');
        setLeaserRule('next_month_first');
        setBillingFrequency('monthly');
      }
    };

    if (leaserId || leaserName) {
      fetchLeaserSettings();
    }
  }, [leaserId, leaserName]);

  // Mettre à jour selectedStartDate quand contractStartDate change
  useEffect(() => {
    if (contractStartDate) {
      setSelectedStartDate(new Date(contractStartDate));
    }
  }, [contractStartDate]);

  // Fonction pour calculer la date de début selon la règle du leaser
  const calculateStartDateFromRule = (deliveryDate: Date, rule: string): Date | null => {
    switch (rule) {
      case 'next_month_first': {
        const nextMonth = new Date(deliveryDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        return nextMonth;
      }
      case 'next_quarter_first': {
        const currentQuarter = Math.floor(deliveryDate.getMonth() / 3);
        const nextQuarter = (currentQuarter + 1) % 4;
        const year = nextQuarter === 0 ? deliveryDate.getFullYear() + 1 : deliveryDate.getFullYear();
        return new Date(year, nextQuarter * 3, 1);
      }
      case 'next_semester_first': {
        const nextSemester = deliveryDate.getMonth() < 6 ? 6 : 0;
        const semYear = nextSemester === 0 ? deliveryDate.getFullYear() + 1 : deliveryDate.getFullYear();
        return new Date(semYear, nextSemester, 1);
      }
      case 'next_year_first':
        return new Date(deliveryDate.getFullYear() + 1, 0, 1);
      case 'delivery_date':
        return deliveryDate;
      case 'delivery_date_plus_15': {
        const result = new Date(deliveryDate);
        result.setDate(result.getDate() + 15);
        return result;
      }
      default:
        return null;
    }
  };

  // Fonction pour formater la règle en texte lisible
  const getRuleDescription = (rule: string): string => {
    const rules: Record<string, string> = {
      'next_month_first': '1er du mois suivant',
      'next_quarter_first': '1er du trimestre suivant',
      'next_semester_first': '1er du semestre suivant',
      'next_year_first': '1er de l\'année suivante',
      'delivery_date': 'Date de livraison exacte',
      'delivery_date_plus_15': 'Date de livraison + 15 jours'
    };
    return rules[rule] || rule;
  };

  // Fonction pour formater la fréquence de facturation
  const getBillingFrequencyLabel = (frequency: string): string => {
    const labels: Record<string, string> = {
      'monthly': 'mensuelle',
      'quarterly': 'trimestrielle',
      'semi-annual': 'semestrielle',
      'annual': 'annuelle'
    };
    return labels[frequency] || frequency;
  };

  const handleDeliveryDateChange = async (date: Date | undefined) => {
    if (!date) return;

    setIsUpdating(true);
    try {
      // 1. Mettre à jour la date de livraison
      const { error } = await supabase
        .from('contracts')
        .update({ 
          delivery_date: format(date, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) throw error;
      setSelectedDeliveryDate(date);

      // 2. Résoudre la règle du leaser (au cas où elle n'était pas encore chargée)
      const settings = await resolveLeaserSettings();
      const ruleToUse = settings?.rule || leaserRule || 'next_month_first';
      
      // Mettre à jour l'état si on a trouvé de nouvelles infos
      if (settings) {
        setLeaserRule(settings.rule);
        setBillingFrequency(settings.frequency);
      }

      // 3. Calculer automatiquement la date de début selon la règle
      const calculatedStartDate = calculateStartDateFromRule(date, ruleToUse);
      
      if (calculatedStartDate) {
        const { error: startError } = await supabase
          .from('contracts')
          .update({ 
            contract_start_date: format(calculatedStartDate, 'yyyy-MM-dd'),
            updated_at: new Date().toISOString()
          })
          .eq('id', contractId);
        
        if (!startError) {
          setSelectedStartDate(calculatedStartDate);
          toast.success(`Date de livraison mise à jour → Début contrat: ${format(calculatedStartDate, "d MMMM yyyy", { locale: fr })}`);
        } else {
          toast.success('Date de livraison mise à jour');
        }
      } else {
        toast.success('Date de livraison mise à jour');
      }
      
      onUpdate?.();
      
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de la date');
    } finally {
      setIsUpdating(false);
    }
  };

  // Recalculer la date de début selon la règle du leaser (pour corriger des contrats existants)
  const handleRecalculateStartDate = async () => {
    if (!selectedDeliveryDate) {
      toast.error('Veuillez d\'abord définir une date de livraison');
      return;
    }

    setIsUpdating(true);
    try {
      const settings = await resolveLeaserSettings();
      const ruleToUse = settings?.rule || leaserRule || 'next_month_first';
      
      if (settings) {
        setLeaserRule(settings.rule);
        setBillingFrequency(settings.frequency);
      }

      const calculatedStartDate = calculateStartDateFromRule(selectedDeliveryDate, ruleToUse);
      
      if (calculatedStartDate) {
        const { error } = await supabase
          .from('contracts')
          .update({ 
            contract_start_date: format(calculatedStartDate, 'yyyy-MM-dd'),
            updated_at: new Date().toISOString()
          })
          .eq('id', contractId);
        
        if (error) throw error;
        
        setSelectedStartDate(calculatedStartDate);
        toast.success(`Date de début recalculée: ${format(calculatedStartDate, "d MMMM yyyy", { locale: fr })} (${getRuleDescription(ruleToUse)})`);
        onUpdate?.();
      } else {
        toast.error('Impossible de calculer la date avec cette règle');
      }
    } catch (error: any) {
      console.error('Erreur lors du recalcul:', error);
      toast.error('Erreur lors du recalcul de la date');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleContractStartDateChange = async (date: Date | undefined) => {
    if (!date) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ 
          contract_start_date: format(date, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) throw error;

      setSelectedStartDate(date);
      toast.success('Date de début de contrat mise à jour');
      onUpdate?.();
      
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de la date');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Dates du contrat
        </CardTitle>
        <CardDescription>
          Gestion de la temporalité du contrat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date de livraison */}
        <div className="space-y-2">
          <Label>Date de livraison effective</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDeliveryDate && "text-muted-foreground"
                )}
                disabled={isUpdating}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDeliveryDate ? (
                  format(selectedDeliveryDate, "PPP", { locale: fr })
                ) : (
                  <span>Sélectionner une date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDeliveryDate}
                onSelect={handleDeliveryDateChange}
                locale={fr}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date de début de contrat - ÉDITABLE */}
        <div className="space-y-2">
          <Label>Date de début de contrat</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedStartDate && "text-muted-foreground"
                )}
                disabled={isUpdating}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedStartDate ? (
                  format(selectedStartDate, "PPP", { locale: fr })
                ) : (
                  <span>Sélectionner une date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedStartDate}
                onSelect={handleContractStartDateChange}
                locale={fr}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground flex-1">
              Par défaut calculée selon la règle du leaser, mais modifiable manuellement
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRecalculateStartDate}
              disabled={isUpdating || !selectedDeliveryDate}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Recalculer
            </Button>
          </div>
        </div>

        {/* Informations sur la règle du leaser */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 space-y-1">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">
                Règle {leaserName}
              </p>
              <p className="text-blue-700">
                Facturation <strong>{getBillingFrequencyLabel(billingFrequency)}</strong>
              </p>
              <p className="text-blue-700">
                Début de contrat : <strong>{getRuleDescription(leaserRule)}</strong>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractDatesManager;
