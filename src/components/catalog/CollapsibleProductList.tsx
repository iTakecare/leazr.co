
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface CollapsibleProductListProps {
  products?: Product[];
  onDeleteProduct: (productId: string) => void;
}

const CollapsibleProductList = ({ products: providedProducts, onDeleteProduct }: CollapsibleProductListProps) => {
  // Si les produits sont fournis en props, utilisez-les, sinon récupérez-les
  const { data: fetchedProducts = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    enabled: !providedProducts, // Ne récupère les produits que s'ils ne sont pas déjà fournis
  });

  const products = providedProducts || fetchedProducts;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading && !providedProducts) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun produit trouvé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.05 }}
        >
          <Collapsible className="border rounded-md">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded overflow-hidden">
                  <img
                    src={product.image_url || product.imageUrl || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.category} • 
                    {formatCurrency(product.price || 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link to={`/products/${product.id}`}>
                  <Button variant="outline" size="sm">Modifier</Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeleteProduct(product.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronsUpDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent>
              <div className="p-4 pt-0 border-t">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.description || "Aucune description disponible"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Détails</h4>
                    <ul className="text-sm space-y-1">
                      <li><span className="text-muted-foreground">Marque:</span> {product.brand || "Non spécifiée"}</li>
                      <li><span className="text-muted-foreground">Prix:</span> {formatCurrency(product.price || 0)}</li>
                      <li><span className="text-muted-foreground">Mensualité:</span> {formatCurrency(product.monthly_price || 0)}/mois</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>
      ))}
    </div>
  );
};

export default CollapsibleProductList;
