import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import PageTransition from '@/components/layout/PageTransition';
import Container from '@/components/layout/Container';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { GlobalMarginAdjustment } from '@/types/equipment';

const AmbassadorCalculator = () => {
  const [equipmentCost, setEquipmentCost] = useState<number>(0);
  const [installationCost, setInstallationCost] = useState<number>(0);
  const [maintenanceCost, setMaintenanceCost] = useState<number>(0);
  const [additionalCosts, setAdditionalCosts] = useState<number>(0);
  const [margin, setMargin] = useState<number>(20);
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [totalCommission, setTotalCommission] = useState<number>(0);
  const [coefficient, setCoefficient] = useState<number>(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const calculate = () => {
      const totalCosts =
        Number(equipmentCost) +
        Number(installationCost) +
        Number(maintenanceCost) +
        Number(additionalCosts);

      const calculatedMargin = totalCosts * (Number(margin) / 100);
      const priceWithMargin = totalCosts + calculatedMargin;
      const calculatedCommission = priceWithMargin * (Number(commissionRate) / 100);
      const finalPrice = priceWithMargin + calculatedCommission;

      const calculatedMonthlyPayment = finalPrice / 24;
      const calculatedCoefficient = finalPrice / totalCosts;

      setTotalCost(finalPrice);
      setTotalCommission(calculatedCommission);
      setMonthlyPayment(calculatedMonthlyPayment);
      setCoefficient(calculatedCoefficient);
    };

    calculate();
  }, [equipmentCost, installationCost, maintenanceCost, additionalCosts, margin, commissionRate]);

  const globalMarginAdjustment: GlobalMarginAdjustment = {
    enabled: false,
    originalAmount: 0,
    originalCoef: 0,
    originalMonthly: 0,
    adjustmentPercent: 0
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <h1 className="text-2xl font-bold mb-6">Calculateur d'offre Ambassadeur</h1>

          <Card>
            <CardHeader>
              <CardTitle>Informations sur les coûts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipmentCost">Coût de l'équipement</Label>
                  <Input
                    type="number"
                    id="equipmentCost"
                    value={equipmentCost}
                    onChange={(e) => setEquipmentCost(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="installationCost">Coût d'installation</Label>
                  <Input
                    type="number"
                    id="installationCost"
                    value={installationCost}
                    onChange={(e) => setInstallationCost(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="maintenanceCost">Coût de maintenance</Label>
                  <Input
                    type="number"
                    id="maintenanceCost"
                    value={maintenanceCost}
                    onChange={(e) => setMaintenanceCost(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="additionalCosts">Coûts supplémentaires</Label>
                  <Input
                    type="number"
                    id="additionalCosts"
                    value={additionalCosts}
                    onChange={(e) => setAdditionalCosts(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres de marge et commission</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="margin">Marge (%)</Label>
                  <Input
                    type="number"
                    id="margin"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="commissionRate">Taux de commission (%)</Label>
                  <Input
                    type="number"
                    id="commissionRate"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Résultats</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label>Paiement mensuel</Label>
                <Input type="text" value={monthlyPayment.toFixed(2)} readOnly />
              </div>
              <div>
                <Label>Coût total</Label>
                <Input type="text" value={totalCost.toFixed(2)} readOnly />
              </div>
              <div>
                <Label>Commission totale</Label>
                <Input type="text" value={totalCommission.toFixed(2)} readOnly />
              </div>
              <div>
                <Label>Coefficient</Label>
                <Input type="text" value={coefficient.toFixed(2)} readOnly />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end mt-6">
            <Button onClick={() => navigate('/ambassador/dashboard')}>Retour au tableau de bord</Button>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorCalculator;
