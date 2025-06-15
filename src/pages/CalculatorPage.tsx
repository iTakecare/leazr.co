
import React, { useState } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Calculator as CalcIcon } from "lucide-react";
import { useEquipmentCalculator } from "@/hooks/useEquipmentCalculator";
import { defaultLeasers } from "@/data/leasers";
import EquipmentForm from "@/components/offer/EquipmentForm";
import EquipmentList from "@/components/offer/EquipmentList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CalculatorPage = () => {
  const [selectedLeaser, setSelectedLeaser] = useState(defaultLeasers[0]);
  const calculator = useEquipmentCalculator(selectedLeaser);

  return (
    <PageTransition>
      <Container>
        <div className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <CalcIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Calculateur de Mensualités
              </h1>
            </div>
            
            <Tabs defaultValue="calculator" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calculator">Calculateur</TabsTrigger>
                <TabsTrigger value="equipment-list">Liste des équipements</TabsTrigger>
              </TabsList>

              <TabsContent value="calculator" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ajouter un équipement</CardTitle>
                    <CardDescription>
                      Calculez les mensualités de leasing pour vos équipements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EquipmentForm 
                      equipment={calculator.equipment}
                      setEquipment={calculator.setEquipment}
                      selectedLeaser={selectedLeaser}
                      addToList={calculator.addToList}
                      editingId={calculator.editingId}
                      cancelEditing={calculator.cancelEditing}
                      onOpenCatalog={() => {}}
                      coefficient={calculator.coefficient}
                      monthlyPayment={calculator.monthlyPayment}
                      targetMonthlyPayment={calculator.targetMonthlyPayment}
                      setTargetMonthlyPayment={calculator.setTargetMonthlyPayment}
                      calculatedMargin={calculator.calculatedMargin}
                      applyCalculatedMargin={calculator.applyCalculatedMargin}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="equipment-list" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Liste des équipements calculés</CardTitle>
                    <CardDescription>
                      Gérez vos équipements et leurs mensualités
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EquipmentList 
                      equipmentList={calculator.equipmentList}
                      startEditing={calculator.startEditing}
                      removeFromList={calculator.removeFromList}
                      updateQuantity={calculator.updateQuantity}
                      editingId={calculator.editingId}
                      totalMonthlyPayment={calculator.totalMonthlyPayment}
                      globalMarginAdjustment={calculator.globalMarginAdjustment}
                      toggleAdaptMonthlyPayment={calculator.toggleAdaptMonthlyPayment}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default CalculatorPage;
