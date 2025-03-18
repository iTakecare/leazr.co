
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProductById } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { ShoppingCart, ArrowLeft, Check, ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import ProductRequestForm from "@/components/catalog/public/ProductRequestForm";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState(36); // Durée par défaut en mois
  
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id || ""),
    enabled: !!id,
  });

  const handleBackToCatalog = () => {
    navigate("/catalogue");
  };

  const handleRequestProduct = () => {
    setIsRequestFormOpen(true);
  };

  const handleQuantityChange = (value: number) => {
    if (value >= 1) {
      setQuantity(value);
    }
  };

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions({
      ...selectedOptions,
      [optionName]: value
    });
  };

  const handleDurationChange = (value: number) => {
    setDuration(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
          <p className="text-gray-600 mb-8">Impossible de trouver les détails de ce produit.</p>
          <Button onClick={handleBackToCatalog}>
            Retour au catalogue
          </Button>
        </div>
      </div>
    );
  }

  // Options possibles (simulées)
  const productOptions = {
    stockage: ["256GB SSD", "512GB SSD", "1TB SSD"],
    memoire: ["8GB", "16GB", "32GB"],
    processeur: ["Intel Core i5", "Intel Core i7", "Apple M1", "Apple M2"]
  };

  // Calculer le prix mensuel en fonction des options et de la durée
  const calculatePrice = () => {
    let basePrice = product.monthly_price || 0;
    
    // Ajuster le prix en fonction de la durée (réduction pour contrats plus longs)
    if (duration === 24) {
      basePrice *= 1.1; // Prix légèrement plus élevé pour contrat plus court
    } else if (duration === 48) {
      basePrice *= 0.9; // Réduction pour contrat plus long
    }
    
    // Ajuster en fonction des options (simulé)
    if (selectedOptions.stockage === "512GB SSD") {
      basePrice += 5;
    } else if (selectedOptions.stockage === "1TB SSD") {
      basePrice += 10;
    }
    
    if (selectedOptions.memoire === "16GB") {
      basePrice += 5;
    } else if (selectedOptions.memoire === "32GB") {
      basePrice += 15;
    }
    
    if (selectedOptions.processeur === "Intel Core i7" || selectedOptions.processeur === "Apple M2") {
      basePrice += 8;
    }
    
    return basePrice * quantity;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBackToCatalog} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au catalogue
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
            <img 
              src={product.image_url || product.imageUrl || "/placeholder.svg"} 
              alt={product.name}
              className="max-w-full max-h-96 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          
          {/* Product Details */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                {product.category === "laptop" ? "Ordinateur" : 
                  product.category === "tablet" ? "Tablette" : 
                  product.category === "smartphone" ? "Smartphone" : 
                  "Équipement"}
              </Badge>
              <Badge variant="outline">{product.brand}</Badge>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">
              {product.name}
            </h1>
            
            <div className="text-lg text-gray-700 mb-6">
              à partir de <span className="font-bold text-indigo-700">{formatCurrency(product.monthly_price || 0)}/mois</span>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                {product.description || "Cet appareil est disponible à la location pour votre entreprise. Configurez-le selon vos besoins et demandez une offre personnalisée."}
              </p>
            </div>
            
            <Separator className="my-6" />
            
            {/* Configuration Options */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Sélectionnez votre configuration idéale</h3>
              
              <div className="space-y-4">
                {Object.entries(productOptions).map(([option, values]) => (
                  <div key={option} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 capitalize">
                      {option}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {values.map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant={selectedOptions[option] === value ? "default" : "outline"}
                          className="text-sm"
                          onClick={() => handleOptionChange(option, value)}
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Durée
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[24, 36, 48].map((months) => (
                      <Button
                        key={months}
                        type="button"
                        variant={duration === months ? "default" : "outline"}
                        className="text-sm"
                        onClick={() => handleDurationChange(months)}
                      >
                        {months} mois
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Quantité souhaitée
                  </label>
                  <div className="flex items-center w-1/3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="mx-4 font-medium">{quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleQuantityChange(quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Price and CTA */}
            <div className="bg-gray-50 p-4 rounded-lg border mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700">Votre sélection pour</span>
                <span className="text-2xl font-bold text-indigo-700">{formatCurrency(calculatePrice())} HT / mois</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="w-full sm:w-auto px-8 bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleRequestProduct}
                >
                  Ajouter
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  onClick={() => toast.info("Un conseiller vous contactera bientôt.")}
                >
                  Parler à un conseiller
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span>Livraison gratuite en France et Europe</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span>Pas de premier loyer majoré</span>
                </div>
              </div>
            </div>
            
            {/* Product Features */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Inclus dans votre location</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                    <Check className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span>Garantie étendue et assurance casse, vol et oxydation</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                    <Check className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span>Support depuis l'application ou par téléphone pour les pannes logicielles</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                    <Check className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span>Accès à notre application de gestion de flotte en ligne</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                    <Check className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span>Recyclage ou reconditionnement de vos appareils en fin de contrat</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Specifications section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Caractéristiques techniques</h2>
          <div className="bg-white rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {product.specifications && Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="p-4 border-b border-r">
                  <div className="text-sm text-gray-500 capitalize">{key}</div>
                  <div className="font-medium">{value}</div>
                </div>
              ))}
              
              {(!product.specifications || Object.keys(product.specifications).length === 0) && (
                <div className="p-4 border-b">
                  <div className="text-gray-500">Aucune spécification disponible pour ce produit.</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Similar products section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Produits similaires</h2>
          {/* We would fetch similar products here, but for now just display some placeholder items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-100 flex items-center justify-center p-4">
                  <img src="/placeholder.svg" alt="Product" className="object-contain max-h-full" />
                </div>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">Marque</div>
                  <h3 className="font-medium">Produit similaire {index}</h3>
                  <div className="mt-2">
                    <div className="text-sm text-gray-500">dès</div>
                    <div className="font-bold text-indigo-700">XX,XX€/mois</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      {/* Product Request Form Modal */}
      <ProductRequestForm 
        isOpen={isRequestFormOpen}
        onClose={() => setIsRequestFormOpen(false)}
        product={product}
        quantity={quantity}
        selectedOptions={selectedOptions}
        duration={duration}
        monthlyPrice={calculatePrice()}
      />
    </div>
  );
};

export default ProductDetailPage;
