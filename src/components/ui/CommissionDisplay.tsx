
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
  const [levelName, setLevelName] = useState<string>("");
  
  useEffect(() => {
    const fetchCommissionRates = async () => {
      try {
        setLoading(true);
        console.log("CommissionDisplay fetching rates with params:", { ambassadorId, commissionLevelId });
        
        let levelId = commissionLevelId;
        
        // If we have an ambassador ID but no level ID, get the ambassador's level directly from the database
        if (ambassadorId && !levelId) {
          console.log("Getting ambassador's commission level directly from database");
          const { data: ambassador, error: ambassadorError } = await supabase
            .from('ambassadors')
            .select('commission_level_id, name')
            .eq('id', ambassadorId)
            .single();
          
          if (!ambassadorError && ambassador && ambassador.commission_level_id) {
            console.log("Directly got ambassador's commission level:", ambassador.commission_level_id);
            levelId = ambassador.commission_level_id;
            
            // Get the level name
            const { data: levelData } = await supabase
              .from('commission_levels')
              .select('name')
              .eq('id', levelId)
              .single();
              
            if (levelData) {
              setLevelName(levelData.name);
              console.log("Commission level name from direct DB query:", levelData.name);
            }
          } else {
            console.log("Could not get ambassador level from database, error:", ambassadorError);
          }
        }
        
        // If we still don't have a level ID, get the default ambassador level
        if (!levelId) {
          const { data: defaultLevel, error: levelError } = await supabase
            .from('commission_levels')
            .select('id, name')
            .eq('type', 'ambassador')
            .eq('is_default', true)
            .single();
          
          if (!levelError && defaultLevel) {
            console.log("Using default commission level:", defaultLevel.id);
            levelId = defaultLevel.id;
            setLevelName(defaultLevel.name);
          } else {
            // If no default level, get any ambassador level
            const { data: anyLevel, error: anyLevelError } = await supabase
              .from('commission_levels')
              .select('id, name')
              .eq('type', 'ambassador')
              .limit(1);
              
            if (!anyLevelError && anyLevel && anyLevel.length > 0) {
              console.log("Using first available commission level:", anyLevel[0].id);
              levelId = anyLevel[0].id;
              setLevelName(anyLevel[0].name);
            } else {
              console.error("No commission levels found for ambassadors");
              setLoading(false);
              return;
            }
          }
        } else if (!levelName) {
          // Get the level name if we have a levelId but no name yet
          const { data: levelData } = await supabase
            .from('commission_levels')
            .select('name')
            .eq('id', levelId)
            .single();
            
          if (levelData) {
            setLevelName(levelData.name);
            console.log("Commission level name from direct lookup:", levelData.name);
          }
        }
        
        console.log("Fetching rates for level ID:", levelId);
        
        // Get the full level with rates
        const level = await getCommissionLevelWithRates(levelId);
        
        if (level && level.rates && level.rates.length > 0) {
          console.log("Fetched commission rates:", level.rates);
          setCommissionRates(level.rates);
          if (!levelName && level.name) {
            setLevelName(level.name);
          }
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
  
  console.log("CommissionDisplay rendering with rates:", commissionRates, "level name:", levelName);
  
  return (
    <div className="w-full">
      {loading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {levelName && (
            <div className="mb-4 pb-2 border-b border-muted">
              <h3 className="text-sm font-medium text-muted-foreground">
                Barème <span className="font-bold text-foreground">{levelName}</span>
              </h3>
            </div>
          )}
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
          <div className="mt-4 text-xs text-muted-foreground">
            <p>
              Les commissions sont calculées sur le montant total de l'offre et payées dès l'acceptation par le client.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default CommissionDisplay;
