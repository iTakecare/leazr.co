
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";

interface ProductCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
  isSheet?: boolean;
  title?: string;
  description?: string;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ 
  isOpen, 
  onClose, 
  onSelectProduct,
  isSheet = false,
  title = "Catalogue de produits",
  description = "Sélectionnez un produit à ajouter à votre offre"
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Mock data for demonstration
        const mockProducts = [
          { id: "1", name: "Laptop HP ProBook", monthly_price: 1200, image_url: "/placeholder.svg" },
          { id: "2", name: "Imprimante Canon MF445", monthly_price: 800, image_url: "/placeholder.svg" },
          { id: "3", name: "Serveur Dell PowerEdge", monthly_price: 3500, image_url: "/placeholder.svg" },
          { id: "4", name: "Microsoft Office Suite", monthly_price: 350, image_url: "/placeholder.svg" },
          { id: "5", name: "NAS Synology", monthly_price: 950, image_url: "/placeholder.svg" },
        ];
        
        setTimeout(() => {
          setProducts(mockProducts);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error("Error fetching products", error);
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const DialogOrSheet = isSheet ? Sheet : Dialog;
  const ContentComponent = isSheet ? SheetContent : DialogContent;
  const HeaderComponent = isSheet ? SheetHeader : DialogHeader;
  const TitleComponent = isSheet ? SheetTitle : DialogTitle;
  const DescriptionComponent = isSheet ? SheetDescription : DialogDescription;

  return (
    <DialogOrSheet open={isOpen} onOpenChange={() => !loading && onClose()}>
      <ContentComponent className={isSheet ? "sm:max-w-md" : "sm:max-w-[700px]"}>
        <HeaderComponent>
          <TitleComponent>{title}</TitleComponent>
          <DescriptionComponent>{description}</DescriptionComponent>
        </HeaderComponent>
        
        <div className="relative my-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div key={product.id} onClick={() => onSelectProduct(product)}>
                    <ProductCard product={product} />
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-10 text-muted-foreground">
                  Aucun produit trouvé
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </ContentComponent>
    </DialogOrSheet>
  );
};

export default ProductCatalog;
