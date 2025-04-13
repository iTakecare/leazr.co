
import React, { useState, useEffect } from "react";
import { ShoppingCart, ChevronDown, Menu, X, Globe } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import Logo from "./Logo";

const UnifiedNavigation: React.FC = () => {
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const mainNavItems = [
    { label: 'Accueil', href: '/' },
    { label: 'Catalogue', href: '/catalogue' },
    { label: 'Solutions', href: '/solutions', subMenu: [
      { label: "Location d'équipement", href: "/solutions/location" },
      { label: "Gestion de parc", href: "/solutions/gestion-parc" },
      { label: "Services cloud", href: "/solutions/cloud" },
      { label: "Reconditionnement", href: "/solutions/reconditionnement" },
    ]},
    { label: 'Services', href: '/services', subMenu: [
      { label: "Pour entreprises", href: "/services/entreprises" },
      { label: "Pour professionnels", href: "/services/professionnels" },
      { label: "Formations", href: "/services/formations" },
      { label: "Support technique", href: "/services/support" },
    ]},
    { label: 'Contact', href: '/contact' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-6 transition-all duration-300",
      scrolled ? "bg-white/95 backdrop-blur-sm shadow-md" : "bg-white"
    )}>
      <div className="relative w-full max-w-[1320px] mx-auto h-auto md:h-[82px] bg-[#f8f8f6] rounded-[20px] md:rounded-[50px] border-2 border-solid border-[#e1e1e1] flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-0 transition-all duration-300 hover:border-[#48B5C3]/30">
        <div className="flex items-center justify-between w-full md:w-auto">
          <Link to="/" className="group">
            <Logo />
          </Link>
          
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 md:hidden"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {mainNavItems.map((item) => (
            <div key={item.href} className="relative group">
              <Link
                to={item.href}
                className={cn(
                  "text-base font-medium transition-colors hover:text-[#33638E]",
                  location.pathname === item.href ? "text-[#33638E]" : "text-gray-700"
                )}
              >
                {item.label}
              </Link>
              {item.subMenu && (
                <div className="hidden group-hover:block absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 z-50 p-2">
                  {item.subMenu.map((subItem) => (
                    <Link
                      key={subItem.href}
                      to={subItem.href}
                      className="block px-3 py-2 text-sm hover:bg-gray-50 rounded-md text-gray-700 hover:text-[#33638E]"
                    >
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link to="/panier" className="relative group">
            <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-[#33638E] transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#33638E] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Globe className="w-5 h-5 text-gray-700" />
              <ChevronDown className="w-3 h-3 ml-1 text-gray-700" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-white rounded-xl p-2 shadow-lg border border-gray-100">
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

          <Button 
            variant="outline" 
            className="rounded-[50px] font-bold text-sm border-gray-300 hover:border-[#33638E] hover:text-[#33638E] transition-all"
            onClick={() => navigate('/login')}
          >
            Se connecter
          </Button>

          <Button 
            className="bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[50px] font-bold text-sm transition-all duration-300 hover:shadow-md"
            onClick={() => navigate('/catalogue')}
          >
            Catalogue
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden w-full mt-4 space-y-2 pb-4">
            {mainNavItems.map((item) => (
              <div key={item.href} className="border-b border-gray-200 pb-2">
                <Link
                  to={item.href}
                  className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-[#33638E]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
                {item.subMenu && item.subMenu.map((subItem) => (
                  <Link
                    key={subItem.href}
                    to={subItem.href}
                    className="block px-6 py-1 text-sm text-gray-600 hover:text-[#33638E]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            ))}

            <div className="flex flex-col space-y-2 px-4 pt-4">
              <Button 
                variant="outline" 
                className="w-full rounded-[20px]"
                onClick={() => {
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
              >
                Se connecter
              </Button>
              <Button 
                className="w-full bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[20px]"
                onClick={() => {
                  navigate('/catalogue');
                  setMobileMenuOpen(false);
                }}
              >
                Catalogue
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedNavigation;

