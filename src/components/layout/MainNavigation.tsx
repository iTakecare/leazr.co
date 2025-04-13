
import React, { useState } from "react";
import { ShoppingCartIcon, ChevronDown, Menu, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

const MainNavigation = () => {
  const { cartCount } = useCart();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation menu items
  const navItems = [
    { label: "Accueil", href: "/" },
    { label: "Catalogue", href: "/catalogue" },
    { label: "Logiciel de gestion", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-6 bg-white">
      <div className="relative w-full max-w-[1320px] mx-auto h-auto md:h-[82px] bg-[#f8f8f6] rounded-[20px] md:rounded-[50px] border-2 border-solid border-[#e1e1e1] flex flex-col md:flex-row items-center justify-between px-4 md:px-5 py-3 md:py-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <Link to="/">
            <img
              className="w-[120px] md:w-[201px] h-auto md:h-[41px] object-contain"
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
          {navItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className={cn(
                "py-2 px-4 text-center font-medium text-[#222222] text-lg rounded-md",
                location.pathname === item.href && "bg-[#33638E]/10 text-[#33638E]"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col space-y-2 pt-4">
            <Link to="/login">
              <Button
                variant="outline"
                className="w-full rounded-[20px] md:rounded-[50px] font-bold text-lg"
              >
                Se connecter
              </Button>
            </Link>
            <Link to="/catalogue">
              <Button className="w-full bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[20px] md:rounded-[50px] font-bold text-lg">
                Catalogue
              </Button>
            </Link>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:block ml-[75px]">
          <ul className="flex space-x-[30px]">
            {navItems.map((item, index) => (
              <li key={index}>
                <Link
                  to={item.href}
                  className={cn(
                    "font-normal text-[#222222] text-lg",
                    location.pathname === item.href && "font-medium text-[#33638E]"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link to="/panier" className="relative">
            <ShoppingCartIcon className="w-6 h-6" />
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
              className="rounded-[50px] font-bold text-lg"
            >
              Se connecter
            </Button>
          </Link>

          <Link to="/catalogue">
            <Button className="bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[50px] font-bold text-lg">
              Catalogue
            </Button>
          </Link>

          <div className="flex items-center ml-4">
            <img className="w-8 h-8" alt="Langue" src="/langue.png" />
            <ChevronDown className="w-[13px] h-[7px] ml-2" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainNavigation;
