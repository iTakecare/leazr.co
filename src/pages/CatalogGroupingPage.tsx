
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import ProductGroupingManager from "@/components/catalog/ProductGroupingManager";
import { useNavigate } from "react-router-dom";

const CatalogGroupingPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col h-screen">
      <div className="bg-background border-b py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/catalogue")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Regroupement des Produits</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Actualiser
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-6">
        <div className="container mx-auto max-w-5xl">
          <div className="my-4">
            <p className="text-muted-foreground">
              Cette page vous permet d'analyser et de regrouper automatiquement les produits qui semblent être des variantes d'un même modèle. 
              Le système détecte les produits ayant des noms similaires et les organise en structure parent/enfant.
            </p>
          </div>
          
          <Separator className="my-6" />
          
          <ProductGroupingManager />
        </div>
      </ScrollArea>
    </div>
  );
};

export default CatalogGroupingPage;
