
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Euro, ArrowRight, Clock } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";

const Calculator = () => {
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [duration, setDuration] = useState<number>(36);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [residualValue, setResidualValue] = useState<number | null>(null);

  const calculateTotal = () => {
    if (!monthlyPrice) return;
    
    const total = monthlyPrice * duration;
    setTotalPrice(total);
    
    // Calcul d'une valeur résiduelle approximative (15% de la valeur totale)
    setResidualValue(Number((total * 0.15).toFixed(2)));
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center mb-6 space-x-3">
          <h1 className="text-2xl font-bold">Calculateur de contrat</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 shadow-sm">
            <div className="flex items-center mb-5">
              <Euro className="mr-2 h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-medium">Paramètres</h2>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="monthly-price" className="block text-sm font-medium">Mensualité (€)</label>
                <Input
                  id="monthly-price"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={monthlyPrice || ''}
                  onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="duration" className="block text-sm font-medium">Durée du contrat</label>
                <Select
                  value={duration.toString()}
                  onValueChange={(value) => setDuration(Number(value))}
                >
                  <SelectTrigger id="duration" className="w-full">
                    <SelectValue placeholder="36 mois" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 mois</SelectItem>
                    <SelectItem value="24">24 mois</SelectItem>
                    <SelectItem value="36">36 mois</SelectItem>
                    <SelectItem value="48">48 mois</SelectItem>
                    <SelectItem value="60">60 mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600"
                onClick={calculateTotal}
                disabled={!monthlyPrice}
              >
                Calculer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm">
            <div className="flex items-center mb-5">
              <Clock className="mr-2 h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-medium">Résultats</h2>
            </div>
            
            {totalPrice !== null ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Mensualité:</span>
                    <span className="font-medium">{monthlyPrice.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Durée:</span>
                    <span className="font-medium">{duration} mois</span>
                  </div>
                  <div className="flex justify-between mb-2 pt-2 border-t">
                    <span className="text-gray-600">Coût total:</span>
                    <span className="font-medium">{totalPrice.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Valeur résiduelle estimée:</span>
                    <span className="font-medium text-blue-600">{residualValue} €</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <div className="h-16 w-16 mb-4 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="opacity-50">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-center max-w-xs">
                  Entrez les paramètres et cliquez sur Calculer pour voir les résultats
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default Calculator;
