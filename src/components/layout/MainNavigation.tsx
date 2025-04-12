
import React from "react";
import { Link } from "react-router-dom";
import { Menu, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink, NavigationMenuTrigger, NavigationMenuContent } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string }
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

const MainNavigation = () => {
  const { cartCount } = useCart();
  
  const navItems = [
    { label: "Accueil", href: "/" },
    { label: "Pourquoi iTakecare ?", href: "/pourquoi" },
    { label: "MyiTakecare", href: "/mon-compte" },
    { label: "Ressources", href: "/ressources" },
  ];

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-indigo-600 flex items-center">
              <img
                src="/lovable-uploads/64ed01eb-d038-47cb-af69-5cf04444e378.png"
                alt="iTakecare Logo"
                className="h-10 mr-2"
              />
            </Link>
            
            <NavigationMenu className="hidden md:flex ml-10">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      <ListItem href="#" title="Location d'équipement">
                        Équipez vos équipes avec du matériel performant
                      </ListItem>
                      <ListItem href="#" title="Solutions entreprise">
                        Services adaptés à tous les types d'entreprises
                      </ListItem>
                      <ListItem href="#" title="Gestion de flotte">
                        Gestion simplifiée de votre parc informatique
                      </ListItem>
                      <ListItem href="#" title="Services cloud">
                        Solutions cloud sécurisées pour votre entreprise
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                
                {navItems.map((item, index) => (
                  <NavigationMenuItem key={index}>
                    <Link to={item.href} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600">
                      {item.label}
                    </Link>
                  </NavigationMenuItem>
                ))}
                
                <NavigationMenuItem>
                  <Link to="/catalogue" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600">
                    Catalogue
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              className="relative" 
              onClick={() => window.location.href = '/panier'}
              aria-label="Voir le panier"
            >
              <ShoppingCart className="h-6 w-6 text-gray-700" />
              {cartCount > 0 && (
                <span className={cn(
                  "absolute -top-2 -right-2 bg-[#2d618f] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center",
                  cartCount > 0 && "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                )}>
                  {cartCount}
                </span>
              )}
            </button>
            <div className="hidden md:block">
              <Link to="/login">
                <Button variant="outline" className="mr-2">Connexion</Button>
              </Link>
              <Link to="/signup">
                <Button>S'inscrire</Button>
              </Link>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainNavigation;
