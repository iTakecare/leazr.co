
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";

const PublicHeader = () => {
  const { cartCount } = useCart();
  const navigate = useNavigate();
  
  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-indigo-600 flex items-center">
              <Logo showText={false} className="mr-2" />
              iTakecare
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
                <NavigationMenuItem>
                  <Link to="/pourquoi" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600">
                    Pourquoi iTakecare ?
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/mon-compte" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600">
                    MyiTakecare
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/catalogue" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600">
                    Catalogue
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/ressources" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600">
                    Ressources
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              className="relative" 
              onClick={() => navigate('/panier')}
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
              <Button variant="outline" className="mr-2">Connexion</Button>
              <Button>S'inscrire</Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

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

export default PublicHeader;
