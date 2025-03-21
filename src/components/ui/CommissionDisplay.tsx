
import React, { useEffect, useState } from "react";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CommissionRate, getCommissionLevelWithRates } from "@/services/commissionService";
import { Loader2 } from "lucide-react";

interface CommissionDisplayProps {
  ambassadorId?: string;
  commissionLevelId?: string;
}

const CommissionDisplay = ({ ambassadorId, commissionLevelId }: CommissionDisplayProps) => {
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCommissionRates = async () => {
      try {
        setLoading(true);
        console.log("CommissionDisplay fetching rates with params:", { ambassadorId, commissionLevelId });
        
        let levelId = commissionLevelId;
        
        // If we have an ambassador ID but no level ID, get the ambassador's level
        if (ambassadorId && !levelId) {
          const { data: ambassador, error: ambassadorError } = await supabase
            .from('ambassadors')
            .select('commission_level_id')
            .eq('id', ambassadorId)
            .single();
          
          if (!ambassadorError && ambassador && ambassador.commission_level_id) {
            console.log("Got ambassador's commission level:", ambassador.commission_level_id);
            levelId = ambassador.commission_level_id;
          }
        }
        
        // If we still don't have a level ID, get the default ambassador level
        if (!levelId) {
          const { data: defaultLevel, error: levelError } = await supabase
            .from('commission_levels')
            .select('id')
            .eq('type', 'ambassador')
            .eq('is_default', true)
            .single();
          
          if (!levelError && defaultLevel) {
            console.log("Using default commission level:", defaultLevel.id);
            levelId = defaultLevel.id;
          } else {
            // If no default level, get any ambassador level
            const { data: anyLevel, error: anyLevelError } = await supabase
              .from('commission_levels')
              .select('id')
              .eq('type', 'ambassador')
              .limit(1);
              
            if (!anyLevelError && anyLevel && anyLevel.length > 0) {
              console.log("Using first available commission level:", anyLevel[0].id);
              levelId = anyLevel[0].id;
            } else {
              console.error("No commission levels found for ambassadors");
              setLoading(false);
              return;
            }
          }
        }
        
        console.log("Fetching rates for level ID:", levelId);
        
        // Get the full level with rates
        const level = await getCommissionLevelWithRates(levelId);
        
        if (level && level.rates && level.rates.length > 0) {
          console.log("Fetched commission rates:", level.rates);
          setCommissionRates(level.rates);
        } else {
          console.log("No rates found for level, using defaults");
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
  }, [ambassadorId, commissionLevelId]);
  
  console.log("CommissionDisplay rendering with rates:", commissionRates);
  
  return (
    <div className="w-full">
      {loading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {commissionRates
            .sort((a, b) => Number(a.min_amount) - Number(b.min_amount))
            .map((tier, index) => (
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
