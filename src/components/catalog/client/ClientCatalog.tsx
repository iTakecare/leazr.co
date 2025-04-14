
import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { useNavigate } from 'react-router-dom';
import { Product } from '@/types/catalog';
import { Filter, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PublicProductGrid from '@/components/catalog/public/PublicProductGrid';

const ClientCatalog = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisible, setFilterVisible] = useState(true);
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["client-products-catalog"],
    queryFn: () => getProducts(),
  });

  const handleProductClick = (productId: string) => {
    console.log("Navigating to client product detail:", productId);
    navigate(`/client/products/${productId}`);
  };

  const filteredProducts = products.filter(product => 
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Catalogue des produits</h1>
        <p className="text-gray-600">Découvrez nos produits disponibles pour votre entreprise</p>
      </div>
      
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Rechercher un produit..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Button 
          variant="outline" 
          size="default" 
          onClick={() => setFilterVisible(!filterVisible)}
          className="md:w-auto w-full"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {filterVisible ? 'Masquer les filtres' : 'Afficher les filtres'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {filterVisible && (
          <div className="lg:col-span-1 border rounded-lg p-4 bg-gray-50 h-fit sticky top-4">
            <h3 className="font-medium text-gray-800 mb-4 flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Filtres
            </h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Catégories</h4>
                <div className="space-y-2">
                  {/* Ajouter les catégories disponibles ici */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="laptops"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label htmlFor="laptops" className="ml-2 text-sm text-gray-700">
                      Ordinateurs portables
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="desktops"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label htmlFor="desktops" className="ml-2 text-sm text-gray-700">
                      Ordinateurs de bureau
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="accessories"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label htmlFor="accessories" className="ml-2 text-sm text-gray-700">
                      Accessoires
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Marques</h4>
                <div className="space-y-2">
                  {/* Ajouter les marques disponibles ici */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="apple"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label htmlFor="apple" className="ml-2 text-sm text-gray-700">
                      Apple
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="dell"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label htmlFor="dell" className="ml-2 text-sm text-gray-700">
                      Dell
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hp"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label htmlFor="hp" className="ml-2 text-sm text-gray-700">
                      HP
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Prix mensuel</h4>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    className="w-full"
                    min={0}
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    className="w-full"
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className={filterVisible ? "lg:col-span-3" : "lg:col-span-4"}>
          <PublicProductGrid 
            products={filteredProducts}
            isLoading={isLoading}
            onProductClick={handleProductClick}
            onToggleFilters={() => setFilterVisible(!filterVisible)}
            filterVisible={filterVisible}
          />
        </div>
      </div>
    </div>
  );
};

export default ClientCatalog;
