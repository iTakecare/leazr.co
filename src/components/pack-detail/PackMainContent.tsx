import React from "react";
import { ProductPack } from "@/types/pack";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import PackItemsList from "./PackItemsList";

interface PackMainContentProps {
  pack: ProductPack;
}

const PackMainContent: React.FC<PackMainContentProps> = ({ pack }) => {
  const getPackImage = () => {
    if (pack.image_url) return pack.image_url;
    if (pack.items && pack.items.length > 0 && pack.items[0].product?.image_url) {
      return pack.items[0].product.image_url;
    }
    return '/placeholder.svg';
  };

  return (
    <div className="space-y-6">
      {/* Pack Image */}
      <div className="relative">
        <img
          src={getPackImage()}
          alt={pack.name}
          className="w-full h-96 object-cover rounded-lg border shadow-md"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
        
        {/* Featured Badge */}
        {pack.is_featured && (
          <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
            Pack vedette
          </Badge>
        )}
      </div>

      {/* Pack Description */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Description du pack</h2>
        </div>
        
        {pack.description ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-muted-foreground leading-relaxed">{pack.description}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Ce pack contient {pack.items?.length || 0} produit{(pack.items?.length || 0) > 1 ? 's' : ''} 
            soigneusement sélectionné{(pack.items?.length || 0) > 1 ? 's' : ''} pour répondre à vos besoins.
          </p>
        )}
      </div>

      {/* Pack Items List */}
      {pack.items && pack.items.length > 0 && (
        <PackItemsList items={pack.items} />
      )}

      {/* Pack Validity */}
      {(pack.valid_from || pack.valid_to) && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="font-medium text-foreground mb-2">Disponibilité</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            {pack.valid_from && (
              <p>Disponible à partir du: {new Date(pack.valid_from).toLocaleDateString('fr-FR')}</p>
            )}
            {pack.valid_to && (
              <p>Disponible jusqu'au: {new Date(pack.valid_to).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PackMainContent;