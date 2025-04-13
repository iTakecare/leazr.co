
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown, ShoppingCart, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/layout/Logo';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

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
    { label: 'Solutions', href: '/solutions' },
    { label: 'Ressources', href: '/ressources' },
    { label: 'Pourquoi iTakecare', href: '/pourquoi' },
    { label: 'Catalogue', href: '/catalogue' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className={cn(
      "fixed w-full z-50 transition-all duration-300",
      scrolled 
        ? "bg-white/90 backdrop-blur-sm shadow-md py-2" 
        : "bg-transparent py-4"
    )}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <div className={cn(
              "p-3 rounded-full bg-white shadow-lg transition-all duration-300",
              scrolled ? "scale-90" : "scale-100"
            )}>
              <Logo showText={false} className="h-8 w-8" />
            </div>
            <span className={cn(
              "ml-3 text-xl font-bold transition-all duration-300",
              scrolled ? "text-[#33638E]" : "text-white"
            )}>
              iTakecare
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8">
          {mainNavItems.map((item) => (
            <Link 
              key={item.href}
              to={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-[#48b5c3]",
                scrolled ? "text-gray-700" : "text-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center space-x-4">
          <Link to="/panier" className="relative">
            <ShoppingCartIcon className={cn(
              "w-5 h-5 transition-colors",
              scrolled ? "text-gray-700" : "text-white"
            )} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#33638E] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center">
              <Globe className={cn(
                "h-5 w-5 transition-colors",
                scrolled ? "text-gray-700" : "text-white"
              )} />
              <ChevronDown className={cn(
                "ml-1 h-3 w-3 transition-colors",
                scrolled ? "text-gray-700" : "text-white"
              )} />
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

          <Link to="/login">
            <Button
              variant={scrolled ? "outline" : "secondary"}
              className={cn(
                "rounded-full text-sm",
                !scrolled && "bg-white/20 text-white border-white/30 hover:bg-white/30"
              )}
            >
              Se connecter
            </Button>
          </Link>

          <Link to="/catalogue">
            <Button 
              className={cn(
                "rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white text-sm shadow-md",
                !scrolled && "shadow-lg"
              )}
            >
              Catalogue
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle button */}
        <div className="flex items-center space-x-4 lg:hidden">
          <Link to="/panier" className="relative">
            <ShoppingCartIcon className={cn(
              "w-5 h-5 transition-colors",
              scrolled ? "text-gray-700" : "text-white"
            )} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#33638E] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          
          <button 
            onClick={toggleMobileMenu}
            className={cn(
              "p-2 rounded-lg transition-colors",
              scrolled 
                ? "text-gray-700 hover:bg-gray-100" 
                : "text-white hover:bg-white/10"
            )}
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

      {/* Mobile menu */}
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
                  <Globe className="h-5 w-5 mr-2" />
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
