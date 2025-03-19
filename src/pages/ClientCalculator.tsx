
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calculator as CalculatorIcon, 
  Euro, 
  CalendarDays, 
  ArrowRight,
  Clock
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const ClientCalculator = () => {
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [duration, setDuration] = useState<number>(36);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [residualValue, setResidualValue] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const calculateTotal = () => {
    if (!monthlyPrice) return;
    
    const total = monthlyPrice * duration;
    setTotalPrice(total);
    
    // Calcul d'une valeur résiduelle approximative (15% de la valeur totale)
    setResidualValue(Number((total * 0.15).toFixed(2)));
  };

  return (
    <div className="w-full p-3 md:p-0">
      <div className="flex items-center mb-6 md:mb-8 space-x-3 border-b pb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <CalculatorIcon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <h1 className="text-xl md:text-3xl font-bold">Calculateur de contrat</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <Card className="p-5 md:p-6 shadow-md rounded-xl card-gradient overflow-hidden border-0">
          <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-5 flex items-center">
            <span className="bg-primary/10 p-1.5 rounded-lg mr-2">
              <Euro className="h-4 w-4 text-primary" />
            </span>
            Paramètres
          </h2>
          
          <div className="space-y-4 md:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="monthly-price" className="text-base font-medium">Mensualité (€)</Label>
              <Input
                id="monthly-price"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={monthlyPrice || ''}
                onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                className="shadow-sm text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-base font-medium">Durée du contrat</Label>
              <Select
                value={duration.toString()}
                onValueChange={(value) => setDuration(Number(value))}
              >
                <SelectTrigger id="duration" className="shadow-sm text-base">
                  <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Sélectionnez une durée" />
                  </div>
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
              className="w-full mt-6 enhanced-button button-gradient py-6 rounded-lg" 
              onClick={calculateTotal}
              disabled={!monthlyPrice}
              size="lg"
            >
              Calculer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
        
        <Card className="p-5 md:p-6 shadow-md rounded-xl overflow-hidden border-0">
          <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-5 flex items-center">
            <span className="bg-primary/10 p-1.5 rounded-lg mr-2">
              <Clock className="h-4 w-4 text-primary" />
            </span>
            Résultats
          </h2>
          
          {totalPrice !== null ? (
            <div className="space-y-4 md:space-y-5">
              <div className="p-4 md:p-5 bg-muted/50 rounded-lg shadow-inner">
                <div className="flex justify-between mb-3 items-center">
                  <span className="font-medium text-muted-foreground">Mensualité:</span>
                  <span className="text-lg font-semibold">{monthlyPrice.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between mb-3 items-center">
                  <span className="font-medium text-muted-foreground">Durée:</span>
                  <span className="text-lg font-semibold">{duration} mois</span>
                </div>
                <div className="flex justify-between mb-3 items-center border-t pt-3">
                  <span className="font-medium text-muted-foreground">Coût total:</span>
                  <span className="text-lg font-bold">{totalPrice.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-medium text-muted-foreground">Valeur résiduelle estimée:</span>
                  <span className="text-lg font-bold text-primary">{residualValue} €</span>
                </div>
              </div>
              
              <div className="mt-4 md:mt-5 bg-primary/5 p-4 md:p-5 rounded-lg border border-primary/10">
                <h3 className="font-medium mb-2 flex items-center">
                  <CalculatorIcon className="h-4 w-4 mr-2 text-primary" />
                  Informations
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Ce calculateur donne une estimation approximative du coût total et de la valeur résiduelle.
                  Pour une offre personnalisée, veuillez contacter votre conseiller iTakecare.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 md:h-64 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <CalculatorIcon className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-center max-w-xs">
                Entrez les paramètres et cliquez sur Calculer pour voir les résultats
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClientCalculator;
