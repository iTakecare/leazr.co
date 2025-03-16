
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator as CalculatorIcon } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";

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
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6 space-x-2">
          <CalculatorIcon className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Calculateur de contrat</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Paramètres</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthly-price">Mensualité (€)</Label>
                <Input
                  id="monthly-price"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={monthlyPrice || ''}
                  onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Durée du contrat</Label>
                <Select
                  value={duration.toString()}
                  onValueChange={(value) => setDuration(Number(value))}
                >
                  <SelectTrigger id="duration">
                    <SelectValue placeholder="Sélectionnez une durée" />
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
                className="w-full mt-4" 
                onClick={calculateTotal}
                disabled={!monthlyPrice}
              >
                Calculer
              </Button>
            </div>
          </Card>
          
          <Card className="p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Résultats</h2>
            
            {totalPrice !== null ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Mensualité:</span>
                    <span>{monthlyPrice.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Durée:</span>
                    <span>{duration} mois</span>
                  </div>
                  <div className="flex justify-between mb-2 border-t pt-2">
                    <span className="font-medium">Coût total:</span>
                    <span className="font-bold">{totalPrice.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Valeur résiduelle estimée:</span>
                    <span className="text-primary font-bold">{residualValue} €</span>
                  </div>
                </div>
                
                <div className="mt-4 bg-primary/10 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Informations</h3>
                  <p className="text-sm text-muted-foreground">
                    Ce calculateur donne une estimation approximative du coût total et de la valeur résiduelle.
                    Pour une offre personnalisée, veuillez contacter votre conseiller iTakecare.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <CalculatorIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>Entrez les paramètres et cliquez sur Calculer pour voir les résultats</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default Calculator;
