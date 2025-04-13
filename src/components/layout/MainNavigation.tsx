
import React, { useState, useEffect } from "react";
import { ShoppingCartIcon, ChevronDown, Menu, X, Globe, Star, Sparkles, Book, Headphones, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const MainNavigation = () => {
  const { cartCount } = useCart();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  // Navigation menu items with icons and dropdowns
  const solutionsMenu = [
    { label: "Location d'équipement", href: "/solutions/location", icon: <Sparkles className="w-4 h-4 mr-2" /> },
    { label: "Gestion de parc", href: "/solutions/gestion-parc", icon: <Briefcase className="w-4 h-4 mr-2" /> },
    { label: "Services cloud", href: "/solutions/cloud", icon: <Globe className="w-4 h-4 mr-2" /> },
    { label: "Reconditionnement", href: "/solutions/reconditionnement", icon: <Star className="w-4 h-4 mr-2" /> },
  ];

  const ressourcesMenu = [
    { label: "Blog", href: "/blog", icon: <Book className="w-4 h-4 mr-2" /> },
    { label: "Centre d'aide", href: "/aide", icon: <Headphones className="w-4 h-4 mr-2" /> },
    { label: "Documentation", href: "/docs", icon: <Book className="w-4 h-4 mr-2" /> },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-6 transition-all duration-300",
      scrolled ? "bg-white/95 backdrop-blur-sm shadow-md" : "bg-white"
    )}>
      <div className="relative w-full max-w-[1320px] mx-auto h-auto md:h-[82px] bg-[#f8f8f6] rounded-[20px] md:rounded-[50px] border-2 border-solid border-[#e1e1e1] flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-0 transition-all duration-300 hover:border-[#48B5C3]/30">
        <div className="flex items-center justify-between w-full md:w-auto">
          <Link to="/" className="group">
            <img
              className="w-[120px] md:w-[201px] h-auto md:h-[41px] object-contain transition-transform duration-300 group-hover:scale-105"
              alt="iTakecare Logo"
              src="/lovable-uploads/3a4ae1ec-2b87-4a07-a178-b3bc5d86594b.png"
            />
          </Link>
          
          {/* Mobile menu toggle button */}
          <button 
            onClick={toggleMobileMenu} 
            className="p-2 md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile navigation */}
        <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:hidden flex-col w-full mt-4 space-y-2 pb-4`}>
          {/* Solutions dropdown for mobile */}
          <div className="border-b border-gray-200 pb-2 mb-2">
            <div className="font-medium text-[#33638E] mb-2 px-4">Solutions</div>
            {solutionsMenu.map((item, index) => (
              <Link
                key={index}
                to={item.href}
                className="py-2 px-4 flex items-center text-[#222222] text-sm hover:bg-[#33638E]/10 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
          
          {/* Ressources dropdown for mobile */}
          <div className="border-b border-gray-200 pb-2 mb-2">
            <div className="font-medium text-[#33638E] mb-2 px-4">Ressources</div>
            {ressourcesMenu.map((item, index) => (
              <Link
                key={index}
                to={item.href}
                className="py-2 px-4 flex items-center text-[#222222] text-sm hover:bg-[#33638E]/10 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
          
          <Link
            to="/catalogue"
            className={cn(
              "py-2 px-4 text-center font-medium text-[#222222] text-sm rounded-md",
              location.pathname === "/catalogue" && "bg-[#33638E]/10 text-[#33638E]"
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            Catalogue
          </Link>
          
          <Link
            to="/contact"
            className={cn(
              "py-2 px-4 text-center font-medium text-[#222222] text-sm rounded-md",
              location.pathname === "/contact" && "bg-[#33638E]/10 text-[#33638E]"
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            Contact
          </Link>
          
          <div className="flex flex-col space-y-2 pt-4">
            <Link to="/login">
              <Button
                variant="outline"
                className="w-full rounded-[20px] md:rounded-[50px] font-bold text-sm"
              >
                Se connecter
              </Button>
            </Link>
            <Link to="/catalogue">
              <Button className="w-full bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[20px] md:rounded-[50px] font-bold text-sm">
                Catalogue
              </Button>
            </Link>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:block ml-[40px]">
          <ul className="flex space-x-[25px]">
            {/* Solutions dropdown */}
            <li className="relative group">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors">
                    Solutions <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white rounded-xl p-2 shadow-lg border border-gray-100">
                  {solutionsMenu.map((item, index) => (
                    <DropdownMenuItem key={index} asChild>
                      <Link 
                        to={item.href}
                        className="flex items-center py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>

            {/* Ressources dropdown */}
            <li className="relative group">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors">
                    Ressources <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white rounded-xl p-2 shadow-lg border border-gray-100">
                  {ressourcesMenu.map((item, index) => (
                    <DropdownMenuItem key={index} asChild>
                      <Link 
                        to={item.href}
                        className="flex items-center py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
            
            <li>
              <Link
                to="/catalogue"
                className={cn(
                  "font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors",
                  location.pathname === "/catalogue" && "font-medium text-[#33638E]"
                )}
              >
                Catalogue
              </Link>
            </li>
            
            <li>
              <Link
                to="/contact"
                className={cn(
                  "font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors",
                  location.pathname === "/contact" && "font-medium text-[#33638E]"
                )}
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link to="/panier" className="relative group">
            <ShoppingCartIcon className="w-6 h-6 text-gray-700 group-hover:text-[#33638E] transition-colors" />
            {cartCount > 0 && (
              <Badge 
                className={cn(
                  "absolute -top-1 -right-2 w-5 h-5 bg-[#33638E] rounded-[10px] flex items-center justify-center p-0",
                  cartCount > 0 ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''
                )}
              >
                <span className="font-bold text-white text-xs">{cartCount}</span>
              </Badge>
            )}
          </Link>

          <Link to="/login">
            <Button
              variant="outline"
              className="rounded-[50px] font-bold text-sm border-gray-300 hover:border-[#33638E] hover:text-[#33638E] transition-all"
            >
              Se connecter
            </Button>
          </Link>

          <Link to="/catalogue">
            <Button className="bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[50px] font-bold text-sm transition-all duration-300 hover:shadow-md">
              Catalogue
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center ml-2 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Globe className="w-5 h-5 text-gray-700" />
              <ChevronDown className="w-3 h-3 ml-1 text-gray-700" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-white rounded-xl p-2 shadow-lg border border-gray-100">
              <DropdownMenuItem className="py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer">
                Français
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
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
  );
};

export default MainNavigation;
