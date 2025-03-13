
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { commissionRates } from "@/utils/calculator";
import { motion } from "framer-motion";

const CommissionDisplay = () => {
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Barème de commissions</CardTitle>
      </CardHeader>
      <CardContent>
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
                  {formatCurrency(tier.min)} - {formatCurrency(tier.max)}
                </p>
              </div>
              <div className="flex items-center">
                <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tier.rate * 3}%` }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
                <p className="font-semibold text-right ml-3">
                  {formatPercentage(tier.rate)}
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
      </CardContent>
    </Card>
  );
};

export default CommissionDisplay;
