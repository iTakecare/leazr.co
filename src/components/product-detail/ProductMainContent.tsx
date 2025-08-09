
import React from "react";
import { Product } from "@/types/catalog";
import ProductImageDisplay from "./ProductImageDisplay";
import ProductDescription from "./ProductDescription";
import FrequentlyBoughtTogether from "./FrequentlyBoughtTogether";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, ClipboardCheck, Headphones, ShieldCheck, Truck, RefreshCw } from "lucide-react";

interface ProductMainContentProps {
  product: Product | null;
  productName: string;
  productDescription: string;
  currentImage: string | undefined;
  productBrand: string;
  companyId?: string;
}

const ProductMainContent: React.FC<ProductMainContentProps> = ({
  product,
  productName,
  productDescription,
  currentImage,
  productBrand,
  companyId
}) => {
  const benefits = [
    {
      icon: TrendingUp,
      title: "Préservez votre trésorerie",
      description: "Pas d'investissement initial important. Conservez votre capacité d'emprunt."
    },
    {
      icon: RefreshCw,
      title: "Toujours à la pointe",
      description: "Renouvelez facilement vos équipements en fin de contrat."
    },
    {
      icon: ClipboardCheck,
      title: "Budgétisation simplifiée",
      description: "Loyers fixes mensuels prévisibles pour une meilleure maîtrise budgétaire."
    }
  ];

  const services = [
    {
      icon: Truck,
      title: "Livraison en Europe",
      description: "Service gratuit partout en Europe avec installation coordonnée."
    },
    {
      icon: ShieldCheck,
      title: "Garantie complète",
      description: "Garantie étendue pendant toute la durée du contrat."
    },
    {
      icon: Headphones,
      title: "Support dédié",
      description: "Équipe basée en Belgique qui vous accompagne."
    }
  ];

  const processSteps = [
    {
      step: "1",
      title: "Identification simple",
      description: "Numéro d'entreprise (BCE) et email professionnel requis."
    },
    {
      step: "2",
      title: "Étude rapide",
      description: "Dossier étudié en moins de 24h."
    },
    {
      step: "3",
      title: "Finalisation en ligne",
      description: "Signature électronique du contrat."
    }
  ];

  return (
    <div className="space-y-4">
      <ProductImageDisplay 
        imageUrl={currentImage} 
        altText={productName} 
      />
      
      <div>
        <ProductDescription 
          title={`Descriptif ${productBrand} ${productName}`}
          description={productDescription} 
        />
      </div>
      
      {/* Frequently Bought Together Section */}
      {product && companyId && (
        <FrequentlyBoughtTogether
          productId={product.id}
          companyId={companyId}
          category={product.category}
          brand={product.brand}
          currentProduct={product}
        />
      )}
      
      {/* Compact Information Tabs */}
      <div className="mt-4">
        <Tabs defaultValue="benefits" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100">
            <TabsTrigger value="benefits" className="text-xs">Avantages</TabsTrigger>
            <TabsTrigger value="process" className="text-xs">Processus</TabsTrigger>
            <TabsTrigger value="services" className="text-xs">Services</TabsTrigger>
          </TabsList>
          
          <TabsContent value="benefits" className="mt-4">
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                    <benefit.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-800">{benefit.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="process" className="mt-4">
            <div className="space-y-3">
              {processSteps.map((step, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-indigo-50 rounded-lg">
                  <div className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-800">{step.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="services" className="mt-4">
            <div className="space-y-3">
              {services.map((service, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="bg-green-100 rounded-full p-2 mt-0.5">
                    <service.icon className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-800">{service.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProductMainContent;
