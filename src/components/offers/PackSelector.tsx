import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Plus, Check } from 'lucide-react';
import { ProductPack } from '@/types/pack';
import { getPacks } from '@/services/packService';
import { getEffectivePackPrice, getSavingsVsIndividuals, isPromoActive, formatPrice } from '@/utils/packPricing';

interface PackSelectorProps {
  selectedPacks: Array<{
    pack_id: string;
    pack: ProductPack;
    quantity: number;
    unit_monthly_price: number;
  }>;
  onPackSelect: (pack: ProductPack, quantity: number) => void;
  onPackRemove: (packId: string) => void;
}

const PackSelector: React.FC<PackSelectorProps> = ({ 
  selectedPacks, 
  onPackSelect, 
  onPackRemove 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ['packs'],
    queryFn: getPacks
  });

  const filteredPacks = packs.filter(pack => 
    pack.is_active &&
    pack.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isPackSelected = (packId: string) => {
    return selectedPacks.some(sp => sp.pack_id === packId);
  };

  const handleQuantityChange = (packId: string, quantity: number) => {
    if (quantity >= 1) {
      setQuantities(prev => ({ ...prev, [packId]: quantity }));
    }
  };

  const handlePackAdd = (pack: ProductPack) => {
    const quantity = quantities[pack.id] || 1;
    const price = getEffectivePackPrice(pack);
    onPackSelect(pack, quantity);
    setQuantities(prev => ({ ...prev, [pack.id]: 1 })); // Reset quantity
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Rechercher un pack..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {selectedPacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Packs sélectionnés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedPacks.map((selectedPack) => (
                <div key={selectedPack.pack_id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <span className="font-medium">{selectedPack.pack.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      Quantité: {selectedPack.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {(selectedPack.unit_monthly_price * selectedPack.quantity).toFixed(2)}€/mois
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPackRemove(selectedPack.pack_id)}
                    >
                      Retirer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPacks.map((pack) => {
          const isSelected = isPackSelected(pack.id);
          const currentQuantity = quantities[pack.id] || 1;
          const packPrice = getEffectivePackPrice(pack);
          const savings = getSavingsVsIndividuals(pack);
          const isPromoCurrentlyActive = isPromoActive(pack);

          return (
            <Card key={pack.id} className={`transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{pack.name}</CardTitle>
                  {isSelected && (
                    <Badge variant="default" className="ml-2">
                      <Check className="w-3 h-3 mr-1" />
                      Sélectionné
                    </Badge>
                  )}
                </div>
                {pack.description && (
                  <p className="text-sm text-muted-foreground">{pack.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {pack.image_url && (
                  <img 
                    src={pack.image_url} 
                    alt={pack.name}
                    className="w-full h-32 object-cover rounded"
                  />
                )}
                
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {pack.items?.length || 0} produit(s)
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Prix du pack:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">
                        {formatPrice(packPrice)}
                      </span>
                      {isPromoCurrentlyActive && (
                        <Badge variant="destructive">PROMO</Badge>
                      )}
                    </div>
                  </div>
                  
                  {savings > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Prix individuel:</span>
                      <span className="line-through text-muted-foreground">
                        {formatPrice(pack.total_monthly_price)}
                      </span>
                    </div>
                  )}
                  
                  {savings > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600">Économie:</span>
                      <span className="font-medium text-green-600">
                        -{formatPrice(savings)}
                      </span>
                    </div>
                  )}
                </div>

                {!isSelected && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={currentQuantity}
                      onChange={(e) => handleQuantityChange(pack.id, parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <Button
                      onClick={() => handlePackAdd(pack)}
                      className="flex-1"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPacks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun pack trouvé</p>
        </div>
      )}
    </div>
  );
};

export default PackSelector;