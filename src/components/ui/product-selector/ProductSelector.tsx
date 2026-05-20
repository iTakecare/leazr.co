
import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Package, Warehouse, Headphones } from "lucide-react";
import SearchBar from "./SearchBar";
import ProductTypeTabs from "./ProductTypeTabs";
import ProductList from "./ProductList";
import StockItemSelectorList from "./StockItemSelectorList";
import ProviderSelectorList, { type SelectableExternalService } from "./ProviderSelectorList";
import { useProductSelector } from "@/hooks/products/useProductSelector";
import { useProductFilter } from "@/hooks/products/useProductFilter";
import { Product } from "@/types/catalog";
import { StockItem } from "@/services/stockService";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onViewVariants?: (product: Product, e: React.MouseEvent) => void;
  onOpenPackSelector?: () => void;
  title?: string;
  description?: string;
  /** When set, enables a "Stock disponible" tab (admin only). */
  stockCompanyId?: string;
  onSelectStockItem?: (item: StockItem) => void;
  /** When set, enables a "Prestataires" tab listing external providers. */
  providersCompanyId?: string;
  onSelectExternalService?: (service: SelectableExternalService) => void;
}

type SourceMode = "catalog" | "stock" | "providers";

const ProductSelector: React.FC<ProductSelectorProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onViewVariants,
  onOpenPackSelector,
  title = "Sélectionner un produit",
  description = "Parcourez notre catalogue pour ajouter un produit à votre offre",
  stockCompanyId,
  onSelectStockItem,
  providersCompanyId,
  onSelectExternalService,
}) => {
  const stockEnabled = !!stockCompanyId && !!onSelectStockItem;
  const providersEnabled = !!providersCompanyId && !!onSelectExternalService;
  const [sourceMode, setSourceMode] = React.useState<SourceMode>("catalog");

  // Fetch products data
  const { products, isLoading, error } = useProductSelector(isOpen);

  // Filter products
  const {
    searchQuery,
    setSearchQuery,
    selectedTab,
    setSelectedTab,
    filteredProducts,
    resetFilters
  } = useProductFilter(products);

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    console.log("Selected product:", product);
    onSelectProduct(product);
  };

  const handleStockItemSelect = (item: StockItem) => {
    onSelectStockItem?.(item);
  };

  // Reset filters when the selector is opened
  React.useEffect(() => {
    if (isOpen) {
      resetFilters();
      setSourceMode("catalog");
    }
  }, [isOpen, resetFilters]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          
          {/* Source toggle (catalog / stock / providers) */}
          {(stockEnabled || providersEnabled) && (
            <div className="px-4 pt-3 border-b pb-3">
              <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setSourceMode("catalog")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    sourceMode === "catalog"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Catalogue
                </button>
                {stockEnabled && (
                  <button
                    type="button"
                    onClick={() => setSourceMode("stock")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      sourceMode === "stock"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Warehouse className="h-3.5 w-3.5" />
                    Stock disponible
                  </button>
                )}
                {providersEnabled && (
                  <button
                    type="button"
                    onClick={() => setSourceMode("providers")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      sourceMode === "providers"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    Prestataires
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Catalog: search bar + product tabs + list */}
          {sourceMode === "catalog" ? (
            <>
              <div className="p-4 border-b">
                <div className="flex gap-2 items-center">
                  {onOpenPackSelector && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onOpenPackSelector();
                      }}
                      className="shrink-0"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Packs
                    </Button>
                  )}
                  <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                  <SheetClose asChild>
                    <Button variant="outline" onClick={onClose}>Fermer</Button>
                  </SheetClose>
                </div>
              </div>

              <div className="px-4 py-2 border-b">
                <ProductTypeTabs
                  selectedTab={selectedTab}
                  setSelectedTab={setSelectedTab}
                />
              </div>

              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <ProductList
                    filteredProducts={filteredProducts}
                    isLoading={isLoading}
                    error={error}
                    handleProductSelect={handleProductSelect}
                    onViewVariants={onViewVariants}
                  />
                </ScrollArea>
              </div>
            </>
          ) : sourceMode === "stock" ? (
            <div className="flex-1 overflow-hidden">
              <StockItemSelectorList
                companyId={stockCompanyId!}
                onSelectStockItem={handleStockItemSelect}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <ProviderSelectorList
                companyId={providersCompanyId!}
                onSelectExternalService={(service) => onSelectExternalService?.(service)}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductSelector;
