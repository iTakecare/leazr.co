
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  NavigationMenu, 
  NavigationMenuContent, 
  NavigationMenuItem, 
  NavigationMenuLink, 
  NavigationMenuList, 
  NavigationMenuTrigger 
} from '@/components/ui/navigation-menu';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ArrowRight, Menu, X, ChevronDown, Globe, 
         Users, BarChart, Shield, Zap, Building, 
         Headphones, Book, Briefcase, Monitor, 
         Server, Recycle, Share2, HelpCircle, Target, Calculator, Box } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Logo from '@/components/layout/Logo';

const LandingHeader = () => {
  const navigate = useNavigate();
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
    { 
      label: "🎯 Vue d'ensemble", 
      href: "/solutions", 
      icon: <Target className="h-4 w-4 text-blue-600" />, 
      description: "Découvrez toute notre suite de solutions" 
    },
    { 
      label: "🤝 CRM Intégré", 
      href: "/solutions#crm", 
      icon: <Users className="h-4 w-4 text-blue-600" />, 
      description: "Gérez vos clients et prospects efficacement" 
    },
    { 
      label: "🧮 Calculateur Intelligent", 
      href: "/solutions#calculateur", 
      icon: <Calculator className="h-4 w-4 text-emerald-600" />, 
      description: "Automatisez vos calculs de leasing" 
    },
    { 
      label: "📝 Contrats Digitaux", 
      href: "/solutions#contrats", 
      icon: <Shield className="h-4 w-4 text-purple-600" />, 
      description: "Signature électronique sécurisée" 
    },
    { 
      label: "📦 Catalogue Produits", 
      href: "/solutions#catalogue", 
      icon: <Box className="h-4 w-4 text-orange-600" />, 
      description: "Gestion centralisée de vos équipements" 
    },
  ];

  const servicesMenu = [
    { 
      label: "🏢 Pour entreprises", 
      href: "/services/entreprises", 
      icon: <Building className="h-4 w-4 text-blue-600" />, 
      description: "Solutions adaptées aux besoins des entreprises" 
    },
    { 
      label: "💼 Pour professionnels", 
      href: "/services/professionnels", 
      icon: <Briefcase className="h-4 w-4 text-emerald-600" />, 
      description: "Offres spéciales pour indépendants" 
    },
    { 
      label: "🆘 Support technique", 
      href: "/services/support", 
      icon: <Headphones className="h-4 w-4 text-purple-600" />, 
      description: "Assistance technique dédiée et réactive" 
    },
    { 
      label: "📚 Formation", 
      href: "/services/formation", 
      icon: <Book className="h-4 w-4 text-orange-600" />, 
      description: "Formation complète à l'utilisation de Leazr" 
    },
  ];

  const ressourcesMenu = [
    { 
      label: "📚 Documentation", 
      href: "/ressources/documentation", 
      icon: <Book className="h-4 w-4 text-blue-600" />, 
      description: "Guides complets et tutoriels" 
    },
    { 
      label: "📝 Blog", 
      href: "/ressources/blog", 
      icon: <Share2 className="h-4 w-4 text-emerald-600" />, 
      description: "Actualités et conseils sectoriels" 
    },
    { 
      label: "❓ FAQ", 
      href: "/ressources/faq", 
      icon: <HelpCircle className="h-4 w-4 text-purple-600" />, 
      description: "Réponses aux questions fréquentes" 
    },
    { 
      label: "🎓 Webinaires", 
      href: "/ressources/webinaires", 
      icon: <Monitor className="h-4 w-4 text-orange-600" />, 
      description: "Sessions de formation en ligne" 
    },
  ];

  return (
    <header className={cn(
      "sticky top-0 z-50 transition-all duration-500",
      scrolled 
        ? "bg-white/95 backdrop-blur-sm shadow-lg h-20" 
        : "bg-transparent h-32"
    )}>
      <div className="container mx-auto px-6">
        <div className={cn(
          "flex items-center justify-between transition-all duration-500",
          scrolled ? "h-20" : "h-32"
        )}>
          {/* Logo avec transition de taille */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <Logo 
                variant="full" 
                showText={false} 
                className={cn(
                  "mr-4 transition-all duration-500 group-hover:scale-105",
                  scrolled ? "scale-75" : "scale-125"
                )} 
              />
            </Link>
            
            {/* Navigation principale pour desktop */}
            <NavigationMenu className="hidden lg:flex ml-8">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={cn(
                    "text-sm font-medium transition-colors",
                    scrolled 
                      ? "text-slate-700 hover:text-blue-600" 
                      : "text-slate-800 hover:text-blue-600"
                  )}>
                    💡 Solutions
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[600px] gap-3 p-6 md:grid-cols-2">
                      <li className="col-span-2">
                        <div className="mb-2 text-sm font-medium text-blue-600">
                          🚀 Nos solutions d'automatisation innovantes
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
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={cn(
                    "text-sm font-medium transition-colors",
                    scrolled 
                      ? "text-slate-700 hover:text-blue-600" 
                      : "text-slate-800 hover:text-blue-600"
                  )}>
                    🛠️ Services
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[600px] gap-3 p-6 md:grid-cols-2">
                      <li className="col-span-2">
                        <div className="mb-2 text-sm font-medium text-blue-600">
                          🎯 Services sur mesure pour votre réussite
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
                  <NavigationMenuTrigger className={cn(
                    "text-sm font-medium transition-colors",
                    scrolled 
                      ? "text-slate-700 hover:text-blue-600" 
                      : "text-slate-800 hover:text-blue-600"
                  )}>
                    📚 Ressources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[500px] gap-3 p-6 md:grid-cols-2">
                      {ressourcesMenu.map((item, index) => (
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
                    to="/tarifs" 
                    className={cn(
                      "flex select-none items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      scrolled 
                        ? "text-slate-700 hover:text-blue-600" 
                        : "text-slate-800 hover:text-blue-600"
                    )}
                  >
                    💰 Tarifs
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link
                    to="/contact" 
                    className={cn(
                      "flex select-none items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      scrolled 
                        ? "text-slate-700 hover:text-blue-600" 
                        : "text-slate-800 hover:text-blue-600"
                    )}
                  >
                    📞 Contact
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          
          {/* Actions à droite */}
          <div className="flex items-center space-x-4">
            {/* Sélecteur de langue */}
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(
                "hidden sm:flex items-center p-2 rounded-full transition-colors",
                scrolled 
                  ? "hover:bg-slate-100" 
                  : "hover:bg-white/10"
              )}>
                <Globe className={cn(
                  "h-4 w-4 transition-colors",
                  scrolled ? "text-slate-600" : "text-slate-700"
                )} />
                <span className={cn(
                  "ml-1 text-xs font-medium transition-colors",
                  scrolled ? "text-slate-600" : "text-slate-700"
                )}>FR</span>
                <ChevronDown className={cn(
                  "ml-1 h-3 w-3 transition-colors",
                  scrolled ? "text-slate-600" : "text-slate-700"
                )} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem className="cursor-pointer">🇫🇷 Français</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">🇬🇧 English</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">🇪🇸 Español</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Boutons d'action */}
            <div className="hidden md:flex items-center space-x-3">
              <Button 
                variant="ghost" 
                className={cn(
                  "transition-colors",
                  scrolled 
                    ? "text-slate-700 hover:text-blue-600 hover:bg-blue-50" 
                    : "text-slate-800 hover:text-blue-600 hover:bg-white/10"
                )}
                onClick={() => navigate('/login')}
              >
                🔐 Connexion
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all" 
                onClick={() => navigate('/signup')}
              >
                🚀 Essai gratuit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {/* Menu mobile */}
            <button 
              className={cn(
                "lg:hidden p-2 rounded-full transition-colors",
                scrolled 
                  ? "hover:bg-slate-100" 
                  : "hover:bg-white/10"
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileMenuOpen ? 
                <X className={cn("h-5 w-5", scrolled ? "text-slate-700" : "text-slate-800")} /> : 
                <Menu className={cn("h-5 w-5", scrolled ? "text-slate-700" : "text-slate-800")} />
              }
            </button>
          </div>
        </div>
        
        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className={cn(
            "lg:hidden py-6 border-t animate-fade-in",
            scrolled ? "border-slate-200 bg-white/95" : "border-slate-300 bg-white/10 backdrop-blur-sm"
          )}>
            <nav className="flex flex-col space-y-4">
              <div className="space-y-3">
                <div className={cn(
                  "px-4 py-2 text-sm font-medium",
                  scrolled ? "text-blue-600" : "text-slate-800"
                )}>💡 Solutions</div>
                {solutionsMenu.map((item, index) => (
                  <Link 
                    key={index}
                    to={item.href} 
                    className={cn(
                      "flex items-center px-4 py-2 text-sm rounded-md transition-colors",
                      scrolled 
                        ? "text-slate-700 hover:bg-slate-100" 
                        : "text-slate-800 hover:bg-white/10"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                ))}
              </div>
              
              <div className="space-y-3">
                <div className={cn(
                  "px-4 py-2 text-sm font-medium",
                  scrolled ? "text-blue-600" : "text-slate-800"
                )}>🛠️ Services</div>
                {servicesMenu.map((item, index) => (
                  <Link 
                    key={index}
                    to={item.href} 
                    className={cn(
                      "flex items-center px-4 py-2 text-sm rounded-md transition-colors",
                      scrolled 
                        ? "text-slate-700 hover:bg-slate-100" 
                        : "text-slate-800 hover:bg-white/10"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="space-y-3">
                <div className={cn(
                  "px-4 py-2 text-sm font-medium",
                  scrolled ? "text-blue-600" : "text-slate-800"
                )}>📚 Ressources</div>
                {ressourcesMenu.map((item, index) => (
                  <Link 
                    key={index}
                    to={item.href} 
                    className={cn(
                      "flex items-center px-4 py-2 text-sm rounded-md transition-colors",
                      scrolled 
                        ? "text-slate-700 hover:bg-slate-100" 
                        : "text-slate-800 hover:bg-white/10"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-3">
                <Link 
                  to="/tarifs" 
                  className={cn(
                    "block px-4 py-2 text-sm rounded-md transition-colors",
                    scrolled 
                      ? "text-slate-700 hover:bg-slate-100" 
                      : "text-slate-800 hover:bg-white/10"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  💰 Tarifs
                </Link>
                <Link 
                  to="/contact" 
                  className={cn(
                    "block px-4 py-2 text-sm rounded-md transition-colors",
                    scrolled 
                      ? "text-slate-700 hover:bg-slate-100" 
                      : "text-slate-800 hover:bg-white/10"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  📞 Contact
                </Link>
              </div>
              
              <div className="border-t pt-4 flex flex-col space-y-3 px-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-center"
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                >
                  🔐 Connexion
                </Button>
                <Button 
                  className="w-full justify-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => {
                    navigate('/signup');
                    setMobileMenuOpen(false);
                  }}
                >
                  🚀 Essai gratuit
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
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-50 hover:text-blue-600",
            className
          )}
          {...props}
        >
          <div className="flex items-center text-sm font-medium leading-none">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </div>
          <p className="line-clamp-2 text-xs leading-snug text-slate-500 pt-1">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export default LandingHeader;
