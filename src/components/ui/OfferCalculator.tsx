
import React, { useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import {
  calculateMonthlyLeasing,
  getCoefficientRate,
  calculateCommission,
  getCommissionRate,
} from "@/utils/calculator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Download, Mail, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface OfferCalculatorProps {
  selectedProducts: Product[];
  onRemoveProduct: (productId: string) => void;
  onSaveOffer?: (calculatedData: { 
    totalAmount: number;
    monthlyPayment: number;
    coefficient: number; 
    commission: number;
  }) => void;
  clientName?: string;
  clientEmail?: string;
  isSubmitting?: boolean;
}

const OfferCalculator = ({
  selectedProducts,
  onRemoveProduct,
  onSaveOffer,
  clientName,
  clientEmail,
  isSubmitting = false,
}: OfferCalculatorProps) => {
  const [duration, setDuration] = useState<number>(36);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [commission, setCommission] = useState<number>(0);
  const [coefficientRate, setCoefficientRate] = useState<number>(0);
  const [commissionRate, setCommissionRate] = useState<number>(0);

  useEffect(() => {
    const total = selectedProducts.reduce((sum, product) => sum + product.price, 0);
    setTotalAmount(total);

    const coefficient = getCoefficientRate(total);
    setCoefficientRate(coefficient);

    const monthly = calculateMonthlyLeasing(total);
    setMonthlyPayment(monthly);

    const commRate = getCommissionRate(total);
    setCommissionRate(commRate);

    const comm = calculateCommission(total);
    setCommission(comm);
  }, [selectedProducts, duration]);

  const handleGeneratePDF = () => {
    toast.success("Le PDF a été généré");
  };

  const handleSendEmail = () => {
    toast.success("L'offre a été envoyée par email");
  };

  const handleSaveOffer = () => {
    if (!clientName || !clientEmail) {
      toast.error("Veuillez remplir les informations client");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

    if (onSaveOffer) {
      onSaveOffer({
        totalAmount,
        monthlyPayment,
        coefficient: coefficientRate,
        commission
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Calcul de l'offre</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {selectedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <p className="text-muted-foreground mb-2">
              Sélectionnez des produits pour calculer votre offre
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Produits sélectionnés</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedProducts.length} produit(s)
                </p>
              </div>
              <div className="divide-y">
                {selectedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between py-2 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveProduct(product.id)}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="duration">Durée du contrat</Label>
                <div className="pt-6 px-1">
                  <Slider
                    id="duration"
                    defaultValue={[36]}
                    max={60}
                    min={24}
                    step={12}
                    onValueChange={(value) => setDuration(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>24 mois</span>
                    <span>36 mois</span>
                    <span>48 mois</span>
                    <span>60 mois</span>
                  </div>
                </div>
                <p className="text-center text-sm mt-1">
                  {duration} mois
                </p>
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">Montant total</p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Coefficient ({formatPercentage(coefficientRate)})
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(totalAmount * coefficientRate / 100)}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="grid grid-cols-2 gap-4"
              >
                <div className="p-4 rounded-lg bg-secondary">
                  <p className="text-sm font-medium">Loyer mensuel</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(monthlyPayment)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    pour {duration} mois
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm font-medium">Votre commission</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(commission)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Taux: {formatPercentage(commissionRate)}
                  </p>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGeneratePDF}
          disabled={selectedProducts.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendEmail}
          disabled={selectedProducts.length === 0}
        >
          <Mail className="mr-2 h-4 w-4" />
          Email
        </Button>
        <Button
          size="sm"
          onClick={handleSaveOffer}
          disabled={selectedProducts.length === 0 || isSubmitting || !clientName || !clientEmail}
        >
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </CardFooter>
    </Card>
  );
};

export default OfferCalculator;
