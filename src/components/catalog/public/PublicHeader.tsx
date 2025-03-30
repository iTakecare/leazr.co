
import React from "react";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";
import { motion } from "framer-motion";

const PublicHeader = () => {
  const { totalItems, isCartAnimating } = useCart();
  
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
            <Link to="/panier" className="relative">
              <motion.div
                animate={isCartAnimating ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                <ShoppingCart className="h-6 w-6 text-gray-700" />
                {totalItems > 0 && (
                  <motion.span 
                    key={totalItems}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </motion.div>
            </Link>
            <div className="hidden md:block">
              <Button variant="outline" className="mr-2" asChild>
                <Link to="/login">Connexion</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">S'inscrire</Link>
              </Button>
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
