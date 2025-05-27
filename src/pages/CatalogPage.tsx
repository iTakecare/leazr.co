
import React from 'react';
import MainNavigation from '@/components/layout/MainNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Laptop, Monitor, Printer, Server } from 'lucide-react';

const CatalogPage = () => {
  const categories = [
    { name: 'Ordinateurs portables', icon: <Laptop className="h-6 w-6" />, count: 45 },
    { name: 'Écrans', icon: <Monitor className="h-6 w-6" />, count: 32 },
    { name: 'Imprimantes', icon: <Printer className="h-6 w-6" />, count: 18 },
    { name: 'Serveurs', icon: <Server className="h-6 w-6" />, count: 12 }
  ];

  const products = [
    {
      id: 1,
      name: 'MacBook Pro 14"',
      category: 'Ordinateur portable',
      price: 89,
      features: ['Apple M3 Pro', '18GB RAM', '512GB SSD'],
      image: '/placeholder.svg'
    },
    {
      id: 2,
      name: 'Dell XPS 13',
      category: 'Ordinateur portable',
      price: 65,
      features: ['Intel i7', '16GB RAM', '256GB SSD'],
      image: '/placeholder.svg'
    },
    {
      id: 3,
      name: 'LG UltraWide 34"',
      category: 'Écran',
      price: 25,
      features: ['4K', 'USB-C', 'HDR'],
      image: '/placeholder.svg'
    },
    {
      id: 4,
      name: 'HP LaserJet Pro',
      category: 'Imprimante',
      price: 15,
      features: ['Laser couleur', 'Recto-verso', 'WiFi'],
      image: '/placeholder.svg'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Catalogue Équipements</h1>
            <p className="text-xl mb-8">
              Découvrez notre sélection complète d'équipements professionnels en leasing
            </p>
            <div className="flex max-w-md mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input 
                  placeholder="Rechercher un équipement..." 
                  className="pl-10 bg-white text-gray-900"
                />
              </div>
              <Button className="ml-2 bg-white text-blue-600 hover:bg-gray-100">
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Catégories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      {category.icon}
                      <span>{category.name}</span>
                    </div>
                    <Badge variant="secondary">{category.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Équipements disponibles</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Prix croissant</Button>
                <Button variant="outline" size="sm">Popularité</Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <Badge variant="secondary" className="mb-2">{product.category}</Badge>
                    <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                    <ul className="text-sm text-gray-600 mb-4">
                      {product.features.map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-blue-600">{product.price}€</span>
                        <span className="text-gray-500">/mois</span>
                      </div>
                      <Button>Ajouter au panier</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;
