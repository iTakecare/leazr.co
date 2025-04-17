import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X, Globe, ChevronDown, Sparkles, ArrowRight, Headphones, Book, Briefcase, Monitor, Server, Recycle, Share2, HelpCircle, Building, FileText, Cpu } from "lucide-react";
import { 
  NavigationMenu, 
  NavigationMenuContent, 
  NavigationMenuItem, 
  NavigationMenuLink, 
  NavigationMenuList, 
  NavigationMenuTrigger 
} from "@/components/ui/navigation-menu";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";

const PublicHeader = () => {
  const { cartCount } = useCart();
  const navigate = useNavigate();
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
  
  const solutionsMenu = [
    { label: "Location d'équipement", href: "/solutions#location", icon: <Monitor className="h-4 w-4 text-[#48b5c3]" />, description: "Matériel informatique haute performance en location flexible" },
    { label: "Gestion de parc", href: "/solutions#gestion-parc", icon: <Server className="h-4 w-4 text-[#48b5c3]" />, description: "Solutions complètes pour gérer votre infrastructure informatique" },
    { label: "Services cloud", href: "/solutions#cloud", icon: <Globe className="h-4 w-4 text-[#48b5c3]" />, description: "Infrastructure cloud sécurisée et évolutive" },
    { label: "Reconditionnement", href: "/solutions#reconditionnement", icon: <Recycle className="h-4 w-4 text-[#48b5c3]" />, description: "Équipements reconditionnés et certifiés écologiques" },
  ];

  const servicesMenu = [
    { label: "Pour entreprises", href: "/services#entreprises", icon: <Building className="h-4 w-4 text-[#48b5c3]" />, description: "Solutions adaptées aux besoins des entreprises" },
    { label: "Pour professionnels", href: "/services#professionnels", icon: <Briefcase className="h-4 w-4 text-[#48b5c3]" />, description: "Offres spéciales pour indépendants et professionnels" },
    { label: "Hub iTakecare", href: "/hub", icon: <Cpu className="h-4 w-4 text-[#48b5c3]" />, description: "Votre espace personnel de gestion informatique" },
    { label: "Support technique", href: "/services#support", icon: <HelpCircle className="h-4 w-4 text-[#48b5c3]" />, description: "Assistance technique dédiée et réactive" },
  ];
  
  const durabiliteMenu = [
    { label: "Notre engagement", href: "/durabilite#engagement", icon: <Share2 className="h-4 w-4 text-[#48b5c3]" />, description: "Notre mission pour un numérique responsable" },
    { label: "Économie circulaire", href: "/durabilite#economie-circulaire", icon: <Recycle className="h-4 w-4 text-[#48b5c3]" />, description: "Comment nous contribuons à l'économie circulaire" },
    { label: "Impact environnemental", href: "/durabilite#impact", icon: <Globe className="h-4 w-4 text-[#48b5c3]" />, description: "Nos actions pour réduire l'empreinte environnementale" },
  ];
  
  return (
    <header className={cn(
      "sticky top-0 z-30 transition-all duration-300",
      scrolled ? "bg-white/95 backdrop-blur-sm shadow-md" : "bg-white border-b"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="text-xl md:text-2xl font-bold text-[#33638E] flex items-center group"
            >
              <Logo showText={false} className="mr-2 transition-transform duration-300 group-hover:scale-110" />
              <span className="bg-gradient-to-r from-[#33638E] to-[#48b5c3] bg-clip-text text-transparent">
                iTakecare
              </span>
            </Link>
            
            <NavigationMenu className="hidden md:flex ml-10">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className="text-sm font-medium text-gray-700 hover:text-[#33638E] transition-colors"
                  >
                    Solutions
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[500px] gap-3 p-6 md:grid-cols-2">
                      <li className="col-span-2">
                        <div className="mb-2 text-sm font-medium text-[#33638E]">
                          Nos solutions d'équipement innovantes
                        </div>
                      </li>
                      {solutionsMenu.map((item, index) => (
                        <ListItem
                          key={index}
                          href={item.href}
                          title={item.label}
                          icon={item.icon}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                      <li className="col-span-2 mt-3 pt-3 border-t border-gray-100">
                        <Link 
                          to="/solutions" 
                          className="flex items-center text-sm font-medium text-[#33638E] hover:text-[#48b5c3]"
                        >
                          Toutes nos solutions
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className="text-sm font-medium text-gray-700 hover:text-[#33638E] transition-colors"
                  >
                    Services
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[500px] gap-3 p-6 md:grid-cols-2">
                      <li className="col-span-2">
                        <div className="mb-2 text-sm font-medium text-[#33638E]">
                          Nos services pour votre entreprise
                        </div>
                      </li>
                      {servicesMenu.map((item, index) => (
                        <ListItem
                          key={index}
                          href={item.href}
                          title={item.label}
                          icon={item.icon}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className="text-sm font-medium text-gray-700 hover:text-[#33638E] transition-colors"
                  >
                    Durabilité
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-6">
                      {durabiliteMenu.map((item, index) => (
                        <ListItem
                          key={index}
                          href={item.href}
                          title={item.label}
                          icon={item.icon}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <Link
                    to="/a-propos" 
                    className={cn(
                      "flex select-none items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      location.pathname === "/a-propos"
                        ? "text-[#33638E]" 
                        : "text-gray-700 hover:text-[#33638E]"
                    )}
                  >
                    À propos
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link
                    to="/catalogue" 
                    className={cn(
                      "flex select-none items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      location.pathname === "/catalogue" || location.pathname.startsWith("/produits")
                        ? "text-[#33638E]" 
                        : "text-gray-700 hover:text-[#33658E]"
                    )}
                  >
                    Catalogue
                  </Link>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <Link
                    to="/contact" 
                    className={cn(
                      "flex select-none items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      location.pathname === "/contact"
                        ? "text-[#33638E]" 
                        : "text-gray-700 hover:text-[#33638E]"
                    )}
                  >
                    Contact
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              to="/panier"
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Voir le panier"
            >
              <ShoppingCart className="h-5 w-5 text-gray-700" />
              {cartCount > 0 && (
                <span className={cn(
                  "absolute -top-1 -right-1 bg-[#33638E] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center",
                  cartCount > 0 && "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                )}>
                  {cartCount}
                </span>
              )}
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden sm:flex items-center p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Globe className="h-5 w-5 text-gray-700" />
                <span className="ml-1 text-xs font-medium text-gray-700">FR</span>
                <ChevronDown className="ml-1 h-3 w-3 text-gray-700" />
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
            
            <div className="hidden md:block">
              <Button 
                variant="outline" 
                className="rounded-[20px] text-sm border-gray-300 hover:border-[#33638E] hover:text-[#33638E]"
                onClick={() => navigate('/login')}
              >
                Se connecter
              </Button>
            </div>
            
            <div className="hidden md:block">
              <Button 
                className="rounded-[20px] text-sm bg-[#48b5c3] hover:bg-[#33638E] transition-colors"
                onClick={() => navigate('/signup')}
              >
                S'inscrire
              </Button>
            </div>
            
            <button 
              className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            <nav className="flex flex-col space-y-1">
              <div className="px-4 py-2 text-sm font-medium text-[#33638E]">Solutions</div>
              {solutionsMenu.map((item, index) => (
                <Link 
                  key={index}
                  to={item.href} 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Link>
              ))}
              
              <div className="px-4 py-2 text-sm font-medium text-[#33638E] mt-2">Services</div>
              {servicesMenu.map((item, index) => (
                <Link 
                  key={index}
                  to={item.href} 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Link>
              ))}
              
              <div className="px-4 py-2 text-sm font-medium text-[#33638E] mt-2">Durabilité</div>
              {durabiliteMenu.map((item, index) => (
                <Link 
                  key={index}
                  to={item.href} 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Link>
              ))}
              
              <div className="border-t my-2"></div>
              
              <Link 
                to="/a-propos" 
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                À propos
              </Link>
              
              <Link 
                to="/catalogue" 
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Catalogue
              </Link>
              
              <Link 
                to="/contact" 
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              
              <div className="border-t pt-3 mt-3 flex flex-col space-y-2 px-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-center rounded-[20px]"
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                >
                  Se connecter
                </Button>
                <Button 
                  className="w-full justify-center rounded-[20px] bg-[#48b5c3] hover:bg-[#33638E]"
                  onClick={() => {
                    navigate('/signup');
                    setMobileMenuOpen(false);
                  }}
                >
                  S'inscrire
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string, icon?: React.ReactNode }
>(({ className, title, children, icon, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-50 hover:text-[#33638E]",
            className
          )}
          {...props}
        >
          <div className="flex items-center text-sm font-medium leading-none">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </div>
          <p className="line-clamp-2 text-xs leading-snug text-gray-500 pt-1">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export default PublicHeader;
