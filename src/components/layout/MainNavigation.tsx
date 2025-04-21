
import React, { useState, useEffect } from "react";
import { ShoppingCart, ChevronDown, Menu, X, Globe, Server, Recycle, Briefcase, HelpCircle, Cpu, Monitor, Share2, Building, FileText } from "lucide-react";
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
import { useTranslationContext } from "@/context/TranslationContext";
import { LanguageSelector } from "./LanguageSelector";

const MainNavigation = () => {
  const { cartCount } = useCart();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslationContext();

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

  const solutionsMenu = [
    { label: t('equipment_rental', 'solutions'), href: "/solutions#location", icon: <Monitor className="w-4 h-4 mr-2" />, description: t('equipment_rental_desc', 'solutions') },
    { label: t('fleet_management', 'solutions'), href: "/solutions#gestion-parc", icon: <Server className="w-4 h-4 mr-2" />, description: t('fleet_management_desc', 'solutions') },
    { label: t('cloud_services', 'solutions'), href: "/solutions#cloud", icon: <Globe className="w-4 h-4 mr-2" />, description: t('cloud_services_desc', 'solutions') },
    { label: t('refurbishing', 'solutions'), href: "/solutions#reconditionnement", icon: <Recycle className="w-4 h-4 mr-2" />, description: t('refurbishing_desc', 'solutions') },
  ];

  const servicesMenu = [
    { label: t('for_businesses', 'services'), href: "/services#entreprises", icon: <Building className="h-4 w-4 text-[#48b5c3]" />, description: t('for_businesses_desc', 'services') },
    { label: t('for_professionals', 'services'), href: "/services#professionnels", icon: <Briefcase className="h-4 w-4 text-[#48b5c3]" />, description: t('for_professionals_desc', 'services') },
    { label: t('itakecare_hub', 'services'), href: "/hub", icon: <Cpu className="h-4 w-4 text-[#48b5c3]" />, description: t('itakecare_hub_desc', 'services'), badge: t('free', 'services') },
    { label: t('technical_support', 'services'), href: "/services#support", icon: <HelpCircle className="h-4 w-4 text-[#48b5c3]" />, description: t('technical_support_desc', 'services') },
  ];

  const durabiliteMenu = [
    { label: t('our_commitment', 'sustainability'), href: "/durabilite#engagement", icon: <Share2 className="w-4 h-4 mr-2" />, description: t('our_commitment_desc', 'sustainability') },
    { label: t('circular_economy', 'sustainability'), href: "/durabilite#economie-circulaire", icon: <Recycle className="w-4 h-4 mr-2" />, description: t('circular_economy_desc', 'sustainability') },
    { label: t('environmental_impact', 'sustainability'), href: "/durabilite#impact", icon: <Globe className="w-4 h-4 mr-2" />, description: t('environmental_impact_desc', 'sustainability') },
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
          
          <button 
            onClick={toggleMobileMenu} 
            className="p-2 md:hidden"
            aria-label={mobileMenuOpen ? t('close_menu', 'navigation') : t('open_menu', 'navigation')}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:hidden flex-col w-full mt-4 space-y-2 pb-4`}>
          <div className="border-b border-gray-200 pb-2 mb-2">
            <div className="font-medium text-[#33638E] mb-2 px-4">{t('solutions', 'navigation')}</div>
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
          
          <div className="border-b border-gray-200 pb-2 mb-2">
            <div className="font-medium text-[#33638E] mb-2 px-4">{t('services', 'navigation')}</div>
            {servicesMenu.map((item, index) => (
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
          
          <div className="border-b border-gray-200 pb-2 mb-2">
            <div className="font-medium text-[#33638E] mb-2 px-4">{t('sustainability', 'navigation')}</div>
            {durabiliteMenu.map((item, index) => (
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
            to="/a-propos"
            className={cn(
              "py-2 px-4 text-center font-medium text-[#222222] text-sm rounded-md",
              location.pathname === "/a-propos" && "bg-[#33638E]/10 text-[#33638E]"
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('about', 'navigation')}
          </Link>
          
          <Link
            to="/blog"
            className={cn(
              "py-2 px-4 text-center font-medium text-[#222222] text-sm rounded-md",
              location.pathname.startsWith("/blog") && "bg-[#33638E]/10 text-[#33638E]"
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('blog', 'navigation')}
          </Link>
          
          <Link
            to="/contact"
            className={cn(
              "py-2 px-4 text-center font-medium text-[#222222] text-sm rounded-md",
              location.pathname === "/contact" && "bg-[#33638E]/10 text-[#33638E]"
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('contact', 'navigation')}
          </Link>
          
          <div className="flex flex-col space-y-2 pt-4">
            <Link to="/login">
              <Button
                variant="outline"
                className="w-full rounded-[20px] md:rounded-[50px] font-bold text-sm"
              >
                {t('login', 'navigation')}
              </Button>
            </Link>
            <Link to="/catalogue">
              <Button className="w-full bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[20px] md:rounded-[50px] font-bold text-sm">
                {t('catalog', 'navigation')}
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
                    {t('solutions', 'navigation')} <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-white rounded-xl p-2 shadow-lg border border-gray-100">
                  {solutionsMenu.map((item, index) => (
                    <DropdownMenuItem key={index} asChild>
                      <Link 
                        to={item.href}
                        className="flex flex-col py-3 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer"
                      >
                        <div className="flex items-center">
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-6">{item.description}</p>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>

            <li className="relative group">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors">
                    {t('services', 'navigation')} <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-white rounded-xl p-2 shadow-lg border border-gray-100">
                  {servicesMenu.map((item, index) => (
                    <DropdownMenuItem key={index} asChild>
                      <Link 
                        to={item.href}
                        className="flex flex-col py-3 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer"
                      >
                        <div className="flex items-center">
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-6">{item.description}</p>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
            
            <li className="relative group">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors">
                    {t('sustainability', 'navigation')} <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-white rounded-xl p-2 shadow-lg border border-gray-100">
                  {durabiliteMenu.map((item, index) => (
                    <DropdownMenuItem key={index} asChild>
                      <Link 
                        to={item.href}
                        className="flex flex-col py-3 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer"
                      >
                        <div className="flex items-center">
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-6">{item.description}</p>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
            
            <li>
              <Link
                to="/a-propos"
                className={cn(
                  "font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors",
                  location.pathname === "/a-propos" && "font-medium text-[#33638E]"
                )}
              >
                {t('about', 'navigation')}
              </Link>
            </li>
            
            <li>
              <Link
                to="/blog"
                className={cn(
                  "font-normal text-[#222222] text-base hover:text-[#33638E] transition-colors",
                  location.pathname.startsWith("/blog") && "font-medium text-[#33638E]"
                )}
              >
                {t('blog', 'navigation')}
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
                {t('contact', 'navigation')}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link to="/panier" className="relative group">
            <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-[#33638E] transition-colors" />
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
              {t('login', 'navigation')}
            </Button>
          </Link>

          <Link to="/catalogue">
            <Button className="bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[50px] font-bold text-sm transition-all duration-300 hover:shadow-md">
              {t('catalog', 'navigation')}
            </Button>
          </Link>

          <LanguageSelector />
        </div>
      </div>
    </div>
  );
};

export default MainNavigation;
