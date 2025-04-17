import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, ChevronDown, Menu, X, Globe, Server, Recycle, Briefcase, HelpCircle, Cpu, Monitor, Share2, Building, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const UnifiedNavigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isClient, isPartner, isAmbassador } = useAuth();

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

  const handleHubNavigation = () => {
    if (isAdmin()) {
      navigate('/dashboard');
    } else if (isClient()) {
      navigate('/client/dashboard');
    } else if (isAmbassador()) {
      navigate('/ambassador/dashboard');
    } else if (isPartner()) {
      navigate('/partner/dashboard');
    }
  };

  const solutionsMenu = [
    { label: "Location d'équipement", href: "/solutions#location", icon: <Monitor className="h-4 w-4 text-[#48b5c3]" />, description: "Matériel informatique haute performance en location flexible" },
    { label: "Gestion de parc", href: "/solutions#gestion-parc", icon: <Server className="h-4 w-4 text-[#48b5c3]" />, description: "Solutions complètes pour gérer votre infrastructure informatique" },
    { label: "Services cloud", href: "/solutions#cloud", icon: <Globe className="h-4 w-4 text-[#48b5c3]" />, description: "Infrastructure cloud sécurisée et évolutive" },
    { label: "Reconditionnement", href: "/solutions#reconditionnement", icon: <Recycle className="h-4 w-4 text-[#48b5c3]" />, description: "Équipements reconditionnés et certifiés écologiques" },
  ];

  const servicesMenu = [
    { label: "Pour entreprises", href: "/services#entreprises", icon: <Building className="h-4 w-4 text-[#48b5c3]" />, description: "Solutions adaptées aux besoins des entreprises" },
    { label: "Pour professionnels", href: "/services#professionnels", icon: <Briefcase className="h-4 w-4 text-[#48b5c3]" />, description: "Offres spéciales pour indépendants et professionnels" },
    { label: "Hub iTakecare", href: "/hub", icon: <Cpu className="h-4 w-4 text-[#48b5c3]" />, description: "Votre espace personnel de gestion informatique", badge: "Gratuit" },
    { label: "Support technique", href: "/services#support", icon: <HelpCircle className="h-4 w-4 text-[#48b5c3]" />, description: "Assistance technique dédiée et réactive" },
  ];

  const durabiliteMenu = [
    { label: "Notre engagement", href: "/durabilite#engagement", icon: <Share2 className="h-4 w-4 text-[#48b5c3]" />, description: "Notre mission pour un numérique responsable" },
    { label: "Économie circulaire", href: "/durabilite#economie-circulaire", icon: <Recycle className="h-4 w-4 text-[#48b5c3]" />, description: "Comment nous contribuons à l'économie circulaire" },
    { label: "Impact environnemental", href: "/durabilite#impact", icon: <Globe className="h-4 w-4 text-[#48b5c3]" />, description: "Nos actions pour réduire l'empreinte environnementale" },
  ];

  return (
    <header className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300",
      scrolled 
        ? "bg-white shadow-sm py-2" 
        : "bg-white py-4"
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
          
          <button 
            onClick={toggleMobileMenu} 
            className="p-2 md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:hidden flex-col w-full mt-4 space-y-2 pb-4`}>
          {/* Menu mobile */}
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
                <span className="ml-2">{item.label}</span>
              </Link>
            ))}
          </div>
          
          <div className="border-b border-gray-200 pb-2 mb-2">
            <div className="font-medium text-[#33638E] mb-2 px-4">Services</div>
            {servicesMenu.map((item, index) => (
              <Link
                key={index}
                to={item.href}
                className="py-2 px-4 flex items-center text-[#222222] text-sm hover:bg-[#33638E]/10 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
                {item.badge && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
          
          <div className="border-b border-gray-200 pb-2 mb-2">
            <div className="font-medium text-[#33638E] mb-2 px-4">Durabilité</div>
            {durabiliteMenu.map((item, index) => (
              <Link
                key={index}
                to={item.href}
                className="py-2 px-4 flex items-center text-[#222222] text-sm hover:bg-[#33638E]/10 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Link>
            ))}
          </div>
          
          {/* Nouvel élément À propos dans le menu mobile */}
          <Link
            to="/a-propos"
            className={cn(
              "py-2 px-4 text-center font-medium text-[#222222] text-sm rounded-md",
              location.pathname === "/a-propos" && "bg-[#33638E]/10 text-[#33638E]"
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            À propos
          </Link>
          
          {/* Blog dans le menu mobile */}
          <Link
            to="/blog"
            className={cn(
              "py-2 px-4 text-center font-medium text-[#222222] text-sm rounded-md",
              location.pathname.startsWith("/blog") && "bg-[#33638E]/10 text-[#33638E]"
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            Blog
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
            {user ? (
              <Button
                variant="outline"
                className="w-full rounded-[20px] md:rounded-[50px] font-bold text-sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleHubNavigation();
                }}
              >
                Mon Hub
              </Button>
            ) : (
              <Link to="/login">
                <Button
                  variant="outline"
                  className="w-full rounded-[20px] md:rounded-[50px] font-bold text-sm"
                >
                  Se connecter
                </Button>
              </Link>
            )}
            <Link to="/catalogue">
              <Button className="w-full bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[20px] md:rounded-[50px] font-bold text-sm">
                Catalogue
              </Button>
            </Link>
          </div>
        </div>

        <nav className="hidden md:block ml-[40px]">
          <ul className="flex space-x-[25px]">
            <li className="relative group">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors">
                    Solutions <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 w-[500px]">
                  <div className="mb-4 text-sm font-medium text-[#33638E]">
                    Nos solutions d'équipement innovantes
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {solutionsMenu.map((item, index) => (
                      <Link 
                        key={index} 
                        to={item.href}
                        className="flex flex-col p-3 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center">
                          {item.icon}
                          <span className="ml-2 font-medium">{item.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-6">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link 
                      to="/solutions" 
                      className="flex items-center text-sm font-medium text-[#33638E] hover:text-[#48b5c3]"
                    >
                      Toutes nos solutions
                      <ChevronDown className="ml-2 h-3 w-3 rotate-[270deg]" />
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>

            <li className="relative group">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors">
                    Services <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 w-[500px]">
                  <div className="mb-4 text-sm font-medium text-[#33638E]">
                    Nos services pour votre entreprise
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {servicesMenu.map((item, index) => (
                      <Link 
                        key={index} 
                        to={item.href}
                        className="flex flex-col p-3 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center">
                          {item.icon}
                          <span className="ml-2 font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-6">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
            
            <li className="relative group">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors">
                    Durabilité <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 w-[400px]">
                  {durabiliteMenu.map((item, index) => (
                    <Link 
                      key={index} 
                      to={item.href}
                      className="flex flex-col p-3 rounded-lg hover:bg-gray-50 mb-2"
                    >
                      <div className="flex items-center">
                        {item.icon}
                        <span className="ml-2 font-medium">{item.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-6">{item.description}</p>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
            
            {/* Ajout du lien À propos */}
            <li>
              <Link
                to="/a-propos"
                className={cn(
                  "font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors",
                  location.pathname === "/a-propos" && "font-medium text-[#33638E]"
                )}
              >
                À propos
              </Link>
            </li>
            
            {/* Blog existant */}
            <li>
              <Link
                to="/blog"
                className={cn(
                  "font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors",
                  location.pathname.startsWith("/blog") && "font-medium text-[#33638E]"
                )}
              >
                Blog
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
            <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-[#33638E] transition-colors" />
            {cartCount > 0 && (
              <span
                className={cn(
                  "absolute -top-1 -right-2 w-5 h-5 bg-[#33638E] rounded-[10px] flex items-center justify-center p-0",
                  cartCount > 0 ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''
                )}
              >
                <span className="font-bold text-white text-xs">{cartCount}</span>
              </span>
            )}
          </Link>

          {user ? (
            <Button
              variant="outline"
              className="rounded-[50px] font-bold text-sm border-gray-300 hover:border-[#33638E] hover:text-[#33638E] transition-all"
              onClick={handleHubNavigation}
            >
              Mon Hub
            </Button>
          ) : (
            <Link to="/login">
              <Button
                variant="outline"
                className="rounded-[50px] font-bold text-sm border-gray-300 hover:border-[#33638E] hover:text-[#33638E] transition-all"
              >
                Se connecter
              </Button>
            </Link>
          )}

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
    </header>
  );
};

export default UnifiedNavigation;
