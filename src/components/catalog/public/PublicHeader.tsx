
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search, ShoppingCart } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PublicHeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

const PublicHeader: React.FC<PublicHeaderProps> = ({ onSearch, searchQuery = '' }) => {
  const location = useLocation();
  const [searchValue, setSearchValue] = useState(searchQuery);
  const [cartItemsCount, setCartItemsCount] = useState(0);

  useEffect(() => {
    // Mettre à jour le compteur du panier
    const updateCartCount = () => {
      try {
        const cartJSON = localStorage.getItem('itakecare-cart') || '[]';
        const cart = JSON.parse(cartJSON);
        const itemsCount = cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        setCartItemsCount(itemsCount);
      } catch (error) {
        console.error("Erreur lors du chargement du panier:", error);
        setCartItemsCount(0);
      }
    };

    // Mettre à jour au chargement de la page
    updateCartCount();

    // Configurer un écouteur d'événements pour les changements de stockage local
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'itakecare-cart') {
        updateCartCount();
      }
    };

    // Mettre à jour quand localStorage change
    window.addEventListener('storage', handleStorageChange);

    // Configurer un intervalle pour vérifier périodiquement (au cas où d'autres onglets modifient le panier)
    const interval = setInterval(updateCartCount, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-[#4ab6c4]">
              iTakecare
            </Link>
            
            <nav className="hidden md:flex ml-8 space-x-4">
              <Link to="/catalogue" className={`px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 ${location.pathname === '/catalogue' ? 'bg-gray-100' : ''}`}>
                Catalogue
              </Link>
              <Link to="/itakecare" className={`px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 ${location.pathname === '/itakecare' ? 'bg-gray-100' : ''}`}>
                iTakecare
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {onSearch && (
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Rechercher..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 w-64"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSearch} 
                  className="ml-2"
                >
                  Rechercher
                </Button>
              </div>
            )}
            
            <Link to="/panier" className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 min-w-[1.25rem] px-1 bg-blue-600">
                    {cartItemsCount}
                  </Badge>
                )}
              </Button>
            </Link>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <nav className="flex flex-col space-y-4 mt-6">
                  <Link to="/catalogue" className="px-3 py-2 hover:bg-gray-100 rounded-md">
                    Catalogue
                  </Link>
                  <Link to="/itakecare" className="px-3 py-2 hover:bg-gray-100 rounded-md">
                    iTakecare
                  </Link>
                  <Link to="/panier" className="px-3 py-2 hover:bg-gray-100 rounded-md flex items-center justify-between">
                    Panier
                    {cartItemsCount > 0 && (
                      <Badge className="bg-blue-600">{cartItemsCount}</Badge>
                    )}
                  </Link>
                  {onSearch && (
                    <div className="pt-4 border-t">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="search"
                          placeholder="Rechercher..."
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleSearch} 
                        className="mt-2 w-full"
                      >
                        Rechercher
                      </Button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
