import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Info } from "lucide-react";
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
  onUpdate?: () => void;
}

const ContractDatesManager: React.FC<ContractDatesManagerProps> = ({
  contractId,
  deliveryDate,
  contractStartDate,
  leaserName,
  onUpdate
}) => {
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<Date | undefined>(
    deliveryDate ? new Date(deliveryDate) : undefined
  );
  const [calculatedStartDate, setCalculatedStartDate] = useState<Date | undefined>(
    contractStartDate ? new Date(contractStartDate) : undefined
  );
  const [leaserRule, setLeaserRule] = useState<string>('');
  const [billingFrequency, setBillingFrequency] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchLeaserSettings = async () => {
      const { data, error } = await supabase
        .from('leasers')
        .select('contract_start_rule, billing_frequency')
        .eq('name', leaserName)
        .maybeSingle();

      if (data) {
        setLeaserRule(data.contract_start_rule || 'next_month_first');
        setBillingFrequency(data.billing_frequency || 'monthly');
      }
    };

    fetchLeaserSettings();
  }, [leaserName]);

  useEffect(() => {
    if (contractStartDate) {
      setCalculatedStartDate(new Date(contractStartDate));
    }
  }, [contractStartDate]);

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

  const getBillingFrequencyLabel = (freq: string): string => {
    const labels: Record<string, string> = {
      'monthly': 'mensuelle',
      'quarterly': 'trimestrielle',
      'semi-annual': 'semestrielle',
      'annual': 'annuelle'
    };
    return labels[freq] || freq;
  };

  const handleDeliveryDateChange = async (date: Date | undefined) => {
    if (!date) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ 
          delivery_date: format(date, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) throw error;

      setSelectedDeliveryDate(date);
      toast.success('Date de livraison mise à jour');
      
      setTimeout(() => {
        onUpdate?.();
      }, 500);
      
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
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDeliveryDate}
                onSelect={handleDeliveryDateChange}
                locale={fr}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Date de début de contrat (calculée automatiquement)</Label>
          <div className="rounded-md border bg-muted/50 p-3">
            {calculatedStartDate ? (
              <p className="font-medium">
                {format(calculatedStartDate, "PPP", { locale: fr })}
              </p>
            ) : (
              <p className="text-muted-foreground">
                Sera calculée après la saisie de la date de livraison
              </p>
            )}
          </div>
        </div>

        {leaserRule && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 space-y-1">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Règle {leaserName}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Facturation <strong>{getBillingFrequencyLabel(billingFrequency)}</strong>
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Début de contrat : <strong>{getRuleDescription(leaserRule)}</strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractDatesManager;
