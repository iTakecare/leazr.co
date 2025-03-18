import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import PackFeatureList from "./PackFeatureList";
import PackCatalog from "../catalog/PackCatalog";
import { toast } from "sonner";

const features = {
  silver: [
    "Laptop jusqu'à 650€",
    "Smartphone jusqu'à 400€",
    "Assistance technique de base",
    "Garantie standard",
  ],
  gold: [
    "Laptop jusqu'à 1500€",
    "Smartphone jusqu'à 800€",
    "Assistance technique prioritaire",
    "Garantie étendue",
    "Renouvellement anticipé"
  ],
  platinum: [
    "Laptop jusqu'à 2500€",
    "Smartphone haut de gamme",
    "Assistance technique VIP 24/7",
    "Garantie premium",
    "Renouvellement anticipé",
    "Services cloud inclus"
  ]
};

const ITakecarePack = () => {
  const [activeTab, setActiveTab] = useState("silver");
  const [selectedHardware, setSelectedHardware] = useState({
    laptop: null,
    desktop: null,
    mobile: null,
    tablet: null
  });
  const [quantities, setQuantities] = useState({
    laptop: 0,
    desktop: 0,
    mobile: 0,
    tablet: 0
  });
  
  const handleSelectHardware = useCallback((category: string, productId: string) => {
    setSelectedHardware(prev => ({
      ...prev,
      [category]: productId
    }));
  }, []);
  
  const handleQuantityChange = useCallback((category: string, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [category]: quantity
    }));
  }, []);

  const handleSubmit = () => {
    const selectedProducts = Object.keys(selectedHardware).filter(
      key => selectedHardware[key as keyof typeof selectedHardware] && quantities[key as keyof typeof quantities] > 0
    );
    
    if (selectedProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit et définir une quantité supérieure à zéro");
      return;
    }
    
    toast.success("Votre sélection a été enregistrée. Un représentant vous contactera bientôt.");
    
    // Reset selections
    setSelectedHardware({
      laptop: null,
      desktop: null,
      mobile: null,
      tablet: null
    });
    
    setQuantities({
      laptop: 0,
      desktop: 0,
      mobile: 0,
      tablet: 0
    });
  };

  return (
    <div className="py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Choisissez votre pack iTakecare</h1>
          <p className="text-gray-600">
            Sélectionnez la formule qui convient le mieux à vos besoins professionnels
          </p>
        </div>
      
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="silver" className="py-3">
              <div className="text-center">
                <div className="font-semibold">Silver</div>
                <div className="text-sm text-muted-foreground">Essentiel</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="gold" className="py-3">
              <div className="text-center">
                <div className="font-semibold">Gold</div>
                <div className="text-sm text-muted-foreground">Professionnel</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="platinum" className="py-3">
              <div className="text-center">
                <div className="font-semibold">Platinum</div>
                <div className="text-sm text-muted-foreground">Premium</div>
              </div>
            </TabsTrigger>
          </TabsList>
          
          <div className="grid gap-8 md:grid-cols-[300px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    Pack {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </span>
                  <span className="text-xl font-bold">
                    {activeTab === "silver" ? "15€" : activeTab === "gold" ? "25€" : "40€"}
                    <span className="text-sm font-normal">/mois</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PackFeatureList features={features[activeTab as keyof typeof features]} />
                
                <div className="mt-6">
                  <p className="text-sm text-gray-500 mb-4">
                    Tous nos packs incluent:
                  </p>
                  <ul className="text-sm space-y-2">
                    <li>Service de réparation</li>
                    <li>Support technique</li>
                    <li>Renouvellement du matériel</li>
                    <li>Garantie complète</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurez votre matériel</CardTitle>
                </CardHeader>
                <CardContent>
                  <PackCatalog 
                    selectedPack={activeTab}
                    onSelectHardware={handleSelectHardware}
                    onQuantityChange={handleQuantityChange}
                    selectedHardware={selectedHardware}
                    quantities={quantities}
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button onClick={handleSubmit} size="lg">
                  Valider ma sélection
                </Button>
              </div>
            </div>
          </div>
          
          <TabsContent value="silver">
            {/* Contenu spécifique Silver si nécessaire */}
          </TabsContent>
          <TabsContent value="gold">
            {/* Contenu spécifique Gold si nécessaire */}
          </TabsContent>
          <TabsContent value="platinum">
            {/* Contenu spécifique Platinum si nécessaire */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ITakecarePack;
