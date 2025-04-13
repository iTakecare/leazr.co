
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ChevronDown, Menu, X, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const HomeHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const mainNavItems = [
    { label: 'Accueil', href: '/' },
    { label: 'Catalogue', href: '/catalogue' },
    { label: 'Logiciel de gestion', href: '/solutions/gestion' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className={cn(
      "fixed w-full z-50 transition-all duration-300",
      scrolled 
        ? "bg-white shadow-sm py-2" 
        : "bg-white py-4"
    )}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/653cda1e-cf1a-4e33-957d-39cbc3c149a4.png" 
              alt="iTakecare Logo" 
              className="h-10 w-auto"
            />
          </Link>
        </div>

        <nav className="hidden lg:flex items-center space-x-10">
          {mainNavItems.map((item) => (
            <Link 
              key={item.href}
              to={item.href}
              className={cn(
                "text-base font-medium transition-colors hover:text-[#48b5c3]",
                "text-gray-700"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center space-x-4">
          <Link to="/panier" className="relative">
            <ShoppingCart className="w-6 h-6 text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#33638E] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          <Link to="/login">
            <Button
              variant="ghost"
              className="text-gray-700 hover:text-[#48b5c3] font-medium"
            >
              Se connecter
            </Button>
          </Link>

          <Link to="/catalogue">
            <Button 
              className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white font-medium px-6"
            >
              Catalogue
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center">
              <img 
                src="/lovable-uploads/fd238acc-acf0-4045-8257-a57d72209f2c.png" 
                alt="French flag" 
                className="h-6 w-6 rounded-full"
              />
              <ChevronDown className="ml-1 h-3 w-3 text-gray-700" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-white rounded-xl p-2 shadow-lg">
              <DropdownMenuItem className="py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer">
                Français
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer">
                English
              </DropdownMenuItem>
              <DropdownMenuItem className="py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer">
                Español
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center space-x-4 lg:hidden">
          <Link to="/panier" className="relative">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#33638E] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          
          <button 
            onClick={toggleMobileMenu}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white shadow-lg animate-fade-in">
          <div className="container mx-auto px-4 py-6">
            <nav className="flex flex-col space-y-4">
              {mainNavItems.map((item) => (
                <Link 
                  key={item.href}
                  to={item.href}
                  className="text-gray-700 hover:text-[#33638E] text-lg font-medium py-2 border-b border-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            
            <div className="flex items-center space-x-4 mt-8">
              <Link to="/login" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Se connecter
                </Button>
              </Link>
              <Link to="/catalogue" className="flex-1">
                <Button 
                  className="w-full rounded-full bg-[#48b5c3] hover:bg-[#3da6b4]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Catalogue
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center justify-center mt-8">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center text-gray-700 hover:text-[#33638E]">
                  <img 
                    src="/lovable-uploads/fd238acc-acf0-4045-8257-a57d72209f2c.png" 
                    alt="French flag" 
                    className="h-6 w-6 rounded-full mr-2"
                  />
                  Français
                  <ChevronDown className="ml-1 h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-36 bg-white rounded-xl p-2 shadow-lg">
                  <DropdownMenuItem className="py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer">
                    Français
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer">
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem className="py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer">
                    Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default HomeHeader;
