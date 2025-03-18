import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, HelpCircle, Plus, Minus, Package, Shield, Monitor, Cpu, Smartphone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PackComparison from "./PackComparison";
import PackFeatureList from "./PackFeatureList";
import PackSelection from "./PackSelection";
import HardwareOptions from "./HardwareOptions";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

type PackTier = {
  id: string;
  name: string;
  color: string;
  price: number;
  monthlyPrice: number;
  features: {
    [key: string]: boolean | string | number;
  };
  hardwareOptions: {
    laptop: string[];
    desktop: string[];
    mobile: string[];
    tablet: string[];
  };
};

const ITakecarePack = () => {
  const [selectedPack, setSelectedPack] = useState<string>("silver");
  const [numberOfDevices, setNumberOfDevices] = useState<number>(5);
  const [contractDuration, setContractDuration] = useState<number>(36);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [selectedHardware, setSelectedHardware] = useState<{
    laptop: string | null;
    desktop: string | null;
    mobile: string | null;
    tablet: string | null;
  }>({
    laptop: null,
    desktop: null,
    mobile: null,
    tablet: null,
  });
  const [quantities, setQuantities] = useState<{
    laptop: number;
    desktop: number;
    mobile: number;
    tablet: number;
  }>({
    laptop: 0,
    desktop: 0,
    mobile: 0,
    tablet: 0,
  });
  
  const [selectedProducts, setSelectedProducts] = useState<{
    laptop: Product | null;
    desktop: Product | null;
    mobile: Product | null;
    tablet: Product | null;
  }>({
    laptop: null,
    desktop: null,
    mobile: null,
    tablet: null,
  });

  const form = useForm({
    defaultValues: {
      packTier: "silver",
      contractLength: "36",
      deviceCount: "5",
    },
  });

  const packs: Record<string, PackTier> = {
    silver: {
      id: "silver",
      name: "I CARE A LITTLE",
      color: "bg-gray-200",
      price: 1800,
      monthlyPrice: 50,
      features: {
        dashboard: true,
        insurance: true,
        support: "50 euros",
        assistance: false,
        replacement: false,
        deviceReplacement: "0",
        supportHours: "Business hours",
        supportValue: 0,
        backupRetention: "1 year",
        authentication: "Basic",
        phishingAwareness: false,
        passwordManager: false,
        externalBackup: false,
        incidentResponse: false,
      },
      hardwareOptions: {
        laptop: ["MacBook air M2 8/256", "Latitude i5 12e gen/16/256", "Lenovo V14/V15 i5 12e gen 16/256"],
        desktop: ["Mac mini M2 8/256"],
        mobile: ["iPhone 14"],
        tablet: ["iPad 9e gen"],
      },
    },
    gold: {
      id: "gold",
      name: "YES I CARE",
      color: "bg-yellow-100",
      price: 4320,
      monthlyPrice: 120,
      features: {
        dashboard: true,
        insurance: true,
        support: "5 heures par an offertes",
        assistance: true,
        replacement: true,
        deviceReplacement: "1 fois par contrat sur 36 mois",
        supportHours: "Business hours",
        supportValue: 750,
        backupRetention: "unlimited",
        authentication: "Advanced",
        phishingAwareness: true,
        passwordManager: true,
        externalBackup: false,
        incidentResponse: false,
      },
      hardwareOptions: {
        laptop: ["Macbook Pro M3 16/512", "Inspiron i5 13e gen / 16/512", "Thinkpad i5 13e 16/512"],
        desktop: ["Mac mini M4"],
        mobile: ["iPhone 15 pro"],
        tablet: ["iPad pro 11 M2"],
      },
    },
    platinum: {
      id: "platinum",
      name: "I REALLY TAKE CARE",
      color: "bg-blue-100",
      price: 6120,
      monthlyPrice: 170,
      features: {
        dashboard: true,
        insurance: true,
        support: "8 heures par an",
        assistance: true,
        replacement: true,
        deviceReplacement: "2 fois par contrat sur 36 mois",
        supportHours: "24/7",
        supportValue: 1200,
        backupRetention: "unlimited 4x day",
        authentication: "Premium",
        phishingAwareness: true,
        passwordManager: true,
        externalBackup: true,
        incidentResponse: true,
      },
      hardwareOptions: {
        laptop: ["MacBook pro 14 M3 Pro 36/512", "Dell XPS i7 16/512", "Thinkpad Carbon X1"],
        desktop: ["Mac mini M4 pro 36/512"],
        mobile: ["iPhone 16 pro Max"],
        tablet: ["iPad pro 13 M4 5G"],
      },
    },
  };

  useEffect(() => {
    const fetchSelectedProducts = async () => {
      const categories = ['laptop', 'desktop', 'mobile', 'tablet'] as const;
      
      for (const category of categories) {
        const productId = selectedHardware[category];
        if (productId) {
          try {
            const { data, error } = await supabase
              .from('products')
              .select('*')
              .eq('id', productId)
              .single();
              
            if (error) {
              console.error(`Error fetching ${category} product:`, error);
            } else if (data) {
              setSelectedProducts(prev => ({
                ...prev,
                [category]: data
              }));
            }
          } catch (error) {
            console.error(`Error in ${category} product fetch:`, error);
          }
        } else {
          setSelectedProducts(prev => ({
            ...prev,
            [category]: null
          }));
        }
      }
    };
    
    fetchSelectedProducts();
  }, [selectedHardware]);

  const deviceDiscounts = {
    "2-5": { percent: 0, label: "2-5 devices" },
    "5-10": { percent: 5, label: "5 à 10" },
    "10+": { percent: 10, label: "plus de 10" },
    "20+": { percent: 20, label: "> 20" },
  };

  const calculateTotalDevices = () => {
    return quantities.laptop + quantities.desktop + quantities.mobile + quantities.tablet;
  };

  useEffect(() => {
    setNumberOfDevices(calculateTotalDevices());
  }, [quantities]);

  const getDiscountPercentage = (devices: number) => {
    if (devices >= 20) {
      return deviceDiscounts["20+"].percent;
    } else if (devices >= 10) {
      return deviceDiscounts["10+"].percent;
    } else if (devices >= 5) {
      return deviceDiscounts["5-10"].percent;
    }
    return 0;
  };

  const calculatePrice = (basePack: PackTier, devices: number, duration: number) => {
    const discount = getDiscountPercentage(devices);

    const discountedMonthly = basePack.monthlyPrice * (1 - discount / 100);
    const baseTotal = basePack.price * (1 - discount / 100);
    
    const hardwareCosts = 0;

    return {
      monthly: discountedMonthly,
      base: baseTotal,
      hardware: hardwareCosts,
      total: baseTotal + hardwareCosts,
      discount: discount,
    };
  };

  const currentPack = packs[selectedPack];
  const totalDevices = calculateTotalDevices();
  const pricing = calculatePrice(currentPack, totalDevices, contractDuration);

  const handleSubmit = form.handleSubmit((data) => {
    console.log("Pack selected:", data);
    console.log("Selected hardware:", selectedHardware);
    console.log("Hardware quantities:", quantities);
    
    const categories = ['laptop', 'desktop', 'mobile', 'tablet'] as const;
    let isValid = true;
    let totalDevices = 0;
    
    for (const category of categories) {
      totalDevices += quantities[category];
      
      if (quantities[category] > 0 && !selectedHardware[category]) {
        toast.error(`Veuillez sélectionner un modèle de ${category}`);
        isValid = false;
        break;
      }
    }
    
    if (totalDevices === 0) {
      toast.error("Veuillez sélectionner au moins un équipement");
      isValid = false;
    }
    
    if (isValid) {
      toast.success("Pack iTakecare configuré avec succès");
    }
  });

  const handlePackChange = (packId: string) => {
    setSelectedPack(packId);
    form.setValue("packTier", packId);
  };

  const handleDeviceCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value);
    if (!isNaN(count) && count > 0) {
      setNumberOfDevices(count);
      form.setValue("deviceCount", e.target.value);
    }
  };

  const handleContractDurationChange = (duration: string) => {
    setContractDuration(parseInt(duration));
    form.setValue("contractLength", duration);
  };

  const handleSelectHardware = (category: string, option: string) => {
    if (quantities[category as keyof typeof quantities] > 0) {
      setSelectedHardware((prev) => ({
        ...prev,
        [category]: option,
      }));
    } else {
      toast.error(`Veuillez d'abord définir une quantité pour ${category}`);
    }
  };
  
  const handleQuantityChange = (category: string, quantity: number) => {
    setQuantities((prev) => ({
      ...prev,
      [category]: quantity,
    }));
    
    if (quantity === 0) {
      setSelectedHardware((prev) => ({
        ...prev,
        [category]: null,
      }));
      
      setSelectedProducts((prev) => ({
        ...prev,
        [category]: null,
      }));
    }
  };

  const getDiscountedMonthlyPrice = (packId: string) => {
    const basePack = packs[packId];
    const discount = getDiscountPercentage(totalDevices);
    return basePack.monthlyPrice * (1 - discount / 100);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)}€`;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Configurez votre Pack iTakecare</h1>
          <Button
            variant="outline"
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2"
          >
            {showComparison ? "Masquer la comparaison" : "Voir la comparaison complète"}
          </Button>
        </div>

        {showComparison ? (
          <PackComparison packs={packs} onSelect={handlePackChange} selectedPack={selectedPack} />
        ) : (
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">1. Choisissez votre formule</CardTitle>
                </CardHeader>
                <CardContent>
                  <PackSelection 
                    packs={packs} 
                    selectedPack={selectedPack} 
                    onSelect={handlePackChange} 
                    totalDevices={totalDevices}
                    getDiscountedMonthlyPrice={getDiscountedMonthlyPrice}
                    contractDuration={contractDuration}
                  />

                  <div className="grid gap-6 mt-8">
                    <div>
                      <Label htmlFor="contractDuration">Durée du contrat</Label>
                      <RadioGroup
                        className="flex space-x-4 mt-2"
                        value={contractDuration.toString()}
                        onValueChange={handleContractDurationChange}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="36" id="duration-36" />
                          <Label htmlFor="duration-36">36 mois</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">2. Sélectionnez votre matériel</CardTitle>
                </CardHeader>
                <CardContent>
                  <HardwareOptions 
                    options={currentPack.hardwareOptions}
                    selectedPack={selectedPack} 
                    selectedHardware={selectedHardware}
                    quantities={quantities}
                    onSelect={handleSelectHardware}
                    onQuantityChange={handleQuantityChange}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">3. Récapitulatif de votre pack</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium mb-4">Caractéristiques incluses</h3>
                      <PackFeatureList pack={currentPack} />
                      
                      {totalDevices > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-medium mb-4">Équipement sélectionné</h3>
                          <div className="space-y-2">
                            {Object.entries(quantities).map(([category, qty]) => {
                              if (qty > 0) {
                                const product = selectedProducts[category as keyof typeof selectedProducts];
                                return (
                                  <div key={category} className="flex justify-between">
                                    <span className="font-medium">
                                      {qty}x {product ? product.name : "Produit sélectionné"}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="w-full md:w-72 bg-gray-50 p-6 rounded-lg border">
                      <div className="text-center">
                        <h3 className="font-bold text-xl mb-1">{currentPack.name}</h3>
                        <div className={`w-full h-2 ${currentPack.color} mb-4 rounded`}></div>
                        
                        {pricing.discount > 0 ? (
                          <>
                            <div className="text-3xl font-bold">{formatCurrency(pricing.monthly)}</div>
                            <div className="text-sm text-muted-foreground">
                              <span className="line-through">{formatCurrency(currentPack.monthlyPrice)}</span> par mois
                            </div>
                            <div className="bg-green-100 text-green-800 text-sm p-1 rounded mt-2 mb-4">
                              Remise volume: {pricing.discount}% pour {totalDevices} équipements
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-3xl font-bold">{formatCurrency(pricing.monthly)}</div>
                            <div className="text-sm text-muted-foreground mb-4">par mois</div>
                          </>
                        )}
                        
                        <div className="mt-4 mb-4">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-1">Tier</th>
                                <th className="text-right py-1">Prix</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className={selectedPack === 'silver' ? 'bg-gray-100' : ''}>
                                <td className="py-1">Silver</td>
                                <td className="text-right py-1">
                                  {formatCurrency(getDiscountedMonthlyPrice('silver'))}
                                </td>
                              </tr>
                              <tr className={selectedPack === 'gold' ? 'bg-gray-100' : ''}>
                                <td className="py-1">Gold</td>
                                <td className="text-right py-1">
                                  {formatCurrency(getDiscountedMonthlyPrice('gold'))}
                                </td>
                              </tr>
                              <tr className={selectedPack === 'platinum' ? 'bg-gray-100' : ''}>
                                <td className="py-1">Platinum</td>
                                <td className="text-right py-1">
                                  {formatCurrency(getDiscountedMonthlyPrice('platinum'))}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="border-t pt-4 mt-4">
                          <div className="flex justify-between font-medium">
                            <span>Total sur {contractDuration} mois</span>
                            <span>{formatCurrency(pricing.monthly * contractDuration)}</span>
                          </div>
                        </div>
                        <Button type="submit" className="w-full mt-6">
                          Commander
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
};
export default ITakecarePack;
