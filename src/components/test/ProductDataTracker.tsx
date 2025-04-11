
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Product } from "@/types/catalog";
import { Equipment } from "@/types/equipment";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

/**
 * Composant de test pour tracer le flux des données de produit (attributs et spécifications)
 * depuis la sélection du produit jusqu'à la création de l'offre
 */
const ProductDataTracker: React.FC = () => {
  // Simuler un produit avec des attributs et spécifications
  const [mockProduct, setMockProduct] = useState<Product>({
    id: "test-product-id",
    name: "MacBook Air Test",
    brand: "Apple",
    category: "Ordinateurs",
    description: "Produit de test avec attributs et spécifications",
    price: 1299,
    monthly_price: 43,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    active: true,
    attributes: {
      "Capacité": "256Go",
      "Mémoire RAM": "8Go",
      "Couleur": "Gris sidéral"
    },
    specifications: {
      "OS": "macOS Sequoia",
      "Connectivité": "Wifi 6E / Bluetooth 5.3",
      "Taille de l'écran": "15\"",
      "Processeur": "Apple M3",
      "Autonomie": "18 heures"
    }
  });

  // État pour stocker l'équipement créé à partir du produit
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  
  // État pour stocker l'équipement JSON (simulation de ce qui est stocké dans l'offre)
  const [equipmentJson, setEquipmentJson] = useState<string>("");
  
  // État pour stocker l'équipement reconstruit à partir du JSON
  const [reconstructedEquipment, setReconstructedEquipment] = useState<any>(null);

  // Simuler la sélection d'un produit
  const handleProductSelect = () => {
    console.log("Produit sélectionné:", mockProduct);
    console.log("Attributs du produit:", mockProduct.attributes);
    console.log("Spécifications du produit:", mockProduct.specifications);
    
    // Créer un équipement à partir du produit
    const newEquipment: Equipment = {
      id: crypto.randomUUID(),
      title: mockProduct.name,
      purchasePrice: mockProduct.price,
      quantity: 1,
      margin: 20,
      monthlyPayment: mockProduct.monthly_price,
      // Préserver les attributs et spécifications - convertir en Record<string, string>
      attributes: convertAttributesToStringRecord(mockProduct.attributes),
      specifications: convertAttributesToStringRecord(mockProduct.specifications)
    };
    
    setEquipment(newEquipment);
    console.log("Équipement créé:", newEquipment);
  };

  // Fonction utilitaire pour convertir les attributs en Record<string, string>
  const convertAttributesToStringRecord = (attributes?: Record<string, any>): Record<string, string> => {
    if (!attributes) return {};
    
    const result: Record<string, string> = {};
    Object.entries(attributes).forEach(([key, value]) => {
      result[key] = String(value);
    });
    
    return result;
  };

  // Simuler l'ajout de l'équipement à la liste (et sa transformation en JSON)
  const handleAddToList = () => {
    if (!equipment) return;
    
    // Simuler la conversion en JSON pour stocker dans l'offre
    const jsonString = JSON.stringify([equipment]);
    setEquipmentJson(jsonString);
    console.log("Équipement converti en JSON:", jsonString);
    
    // Simuler la reconstruction de l'équipement à partir du JSON
    try {
      const parsed = JSON.parse(jsonString);
      setReconstructedEquipment(parsed[0]);
      console.log("Équipement reconstruit à partir du JSON:", parsed[0]);
    } catch (error) {
      console.error("Erreur lors de la reconstruction:", error);
    }
  };

  // Afficher les attributs et spécifications sous forme de liste
  const renderProperties = (properties: Record<string, string | number> | undefined) => {
    if (!properties || Object.keys(properties).length === 0) {
      return <p className="text-gray-500 italic">Aucune donnée disponible</p>;
    }
    
    return (
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(properties).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">{key}:</span>
            <span className="text-sm text-gray-600">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test de préservation des attributs/spécifications</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte du produit original */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Produit original</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="font-medium mb-2">Informations de base</h3>
              <p><span className="font-medium">Nom:</span> {mockProduct.name}</p>
              <p><span className="font-medium">Prix:</span> {mockProduct.price}€</p>
              <p><span className="font-medium">Mensualité:</span> {mockProduct.monthly_price}€</p>
            </div>
            
            <Separator className="my-4" />
            
            <div className="mb-4">
              <h3 className="font-medium mb-2">Attributs</h3>
              {renderProperties(mockProduct.attributes)}
            </div>
            
            <Separator className="my-4" />
            
            <div>
              <h3 className="font-medium mb-2">Spécifications</h3>
              {renderProperties(mockProduct.specifications)}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleProductSelect} 
              className="w-full"
            >
              Sélectionner le produit
            </Button>
          </CardFooter>
        </Card>
        
        {/* Carte de l'équipement */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Équipement</CardTitle>
          </CardHeader>
          <CardContent>
            {equipment ? (
              <>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Informations de base</h3>
                  <p><span className="font-medium">Titre:</span> {equipment.title}</p>
                  <p><span className="font-medium">Prix d'achat:</span> {equipment.purchasePrice}€</p>
                  <p><span className="font-medium">Mensualité:</span> {equipment.monthlyPayment}€</p>
                </div>
                
                <Separator className="my-4" />
                
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Attributs</h3>
                  {renderProperties(equipment.attributes)}
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="font-medium mb-2">Spécifications</h3>
                  {renderProperties(equipment.specifications)}
                </div>
              </>
            ) : (
              <p className="text-gray-500 italic">Sélectionnez d'abord un produit</p>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleAddToList} 
              className="w-full"
              disabled={!equipment}
            >
              Ajouter à la liste (convertir en JSON)
            </Button>
          </CardFooter>
        </Card>
        
        {/* Carte de l'équipement reconstruit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Équipement reconstruit</CardTitle>
            <p className="text-sm text-gray-500">Après stockage dans l'offre</p>
          </CardHeader>
          <CardContent>
            {reconstructedEquipment ? (
              <>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Informations de base</h3>
                  <p><span className="font-medium">Titre:</span> {reconstructedEquipment.title}</p>
                  <p><span className="font-medium">Prix d'achat:</span> {reconstructedEquipment.purchasePrice}€</p>
                  <p><span className="font-medium">Mensualité:</span> {reconstructedEquipment.monthlyPayment}€</p>
                </div>
                
                <Separator className="my-4" />
                
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Attributs</h3>
                  {renderProperties(reconstructedEquipment.attributes)}
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="font-medium mb-2">Spécifications</h3>
                  {renderProperties(reconstructedEquipment.specifications)}
                </div>
              </>
            ) : (
              <p className="text-gray-500 italic">Ajoutez d'abord l'équipement à la liste</p>
            )}
          </CardContent>
          <CardFooter>
            <div className="w-full">
              {reconstructedEquipment && (
                <div className="flex flex-col gap-2">
                  <Badge variant={reconstructedEquipment.attributes ? "secondary" : "destructive"} className="self-start">
                    {reconstructedEquipment.attributes ? "Attributs préservés ✓" : "Attributs perdus ✗"}
                  </Badge>
                  <Badge variant={reconstructedEquipment.specifications ? "secondary" : "destructive"} className="self-start">
                    {reconstructedEquipment.specifications ? "Spécifications préservées ✓" : "Spécifications perdues ✗"}
                  </Badge>
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
      
      {equipmentJson && (
        <div className="mt-6">
          <h3 className="font-medium mb-2">JSON généré (stocké dans l'offre)</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60 text-xs">
            {JSON.stringify(JSON.parse(equipmentJson), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ProductDataTracker;
