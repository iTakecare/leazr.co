
import React, { useEffect, useState } from "react";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CommissionRate } from "@/services/commissionService";

const CommissionDisplay = () => {
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCommissionRates = async () => {
      try {
        setLoading(true);
        // First, try to get the default ambassador commission level
        const { data: defaultLevel, error: levelError } = await supabase
          .from('commission_levels')
          .select('id')
          .eq('type', 'ambassador')
          .eq('is_default', true)
          .single();
        
        let levelId;
        
        if (levelError || !defaultLevel) {
          // If no default level, get any ambassador level
          const { data: anyLevel, error: anyLevelError } = await supabase
            .from('commission_levels')
            .select('id')
            .eq('type', 'ambassador')
            .limit(1);
            
          if (anyLevelError || !anyLevel || anyLevel.length === 0) {
            console.error("No commission levels found for ambassadors");
            setLoading(false);
            return;
          }
          
          levelId = anyLevel[0].id;
        } else {
          levelId = defaultLevel.id;
        }
        
        // Now get the rates for this level
        const { data: rates, error: ratesError } = await supabase
          .from('commission_rates')
          .select('*')
          .eq('commission_level_id', levelId)
          .order('min_amount', { ascending: true });
        
        if (ratesError) {
          console.error("Error fetching commission rates:", ratesError);
          setLoading(false);
          return;
        }
        
        if (rates && rates.length > 0) {
          console.log("Fetched commission rates:", rates);
          setCommissionRates(rates);
        } else {
          // Use default rates if none found
          setCommissionRates([
            {
              id: 'default-1',
              commission_level_id: levelId,
              min_amount: 500,
              max_amount: 2500,
              rate: 10,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'default-2',
              commission_level_id: levelId,
              min_amount: 2500.01,
              max_amount: 5000,
              rate: 13,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'default-3',
              commission_level_id: levelId,
              min_amount: 5000.01,
              max_amount: 12500,
              rate: 18,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'default-4',
              commission_level_id: levelId,
              min_amount: 12500.01,
              max_amount: 25000,
              rate: 21,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 'default-5',
              commission_level_id: levelId,
              min_amount: 25000.01,
              max_amount: 50000,
              rate: 25,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
        }
      } catch (error) {
        console.error("Error in fetchCommissionRates:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCommissionRates();
  }, []);
  
  console.log("CommissionDisplay rendering with rates:", commissionRates);
  
  return (
    <div className="w-full">
      {loading ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {commissionRates.map((tier, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="font-medium text-sm">
                  {formatCurrency(Number(tier.min_amount))} - {formatCurrency(Number(tier.max_amount))}
                </p>
              </div>
              <div className="flex items-center">
                <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Number(tier.rate) * 3}%` }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
                <p className="font-semibold text-right ml-3">
                  {formatPercentage(Number(tier.rate))}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          Les commissions sont calculées sur le montant total de l'offre et payées dès l'acceptation par le client.
        </p>
      </div>
    </div>
  );
};

export default CommissionDisplay;
