
import React from "react";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const MainNavigation = () => {
  const { cartCount } = useCart();
  
  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/f8518705-8c32-4cb9-bbd1-5576aaa1e330.png" 
                alt="iTakecare Logo" 
                className="h-10"
              />
            </Link>
            
            <NavigationMenu className="hidden md:flex ml-10">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link to="/" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#48B5C3]">
                    Accueil
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/catalogue" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#48B5C3]">
                    Catalogue
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/logiciel-de-gestion" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#48B5C3]">
                    Logiciel de gestion
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/blog" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#48B5C3]">
                    Blog
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/contact" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#48B5C3]">
                    Contact
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/panier" className="relative" aria-label="Voir le panier">
              <ShoppingCart className="h-6 w-6 text-gray-700" />
              {cartCount > 0 && (
                <span className={cn(
                  "absolute -top-2 -right-2 bg-[#48B5C3] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center",
                  cartCount > 0 && "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                )}>
                  {cartCount}
                </span>
              )}
            </Link>
            
            <Link to="/login">
              <Button variant="outline" className="mr-2">Se connecter</Button>
            </Link>
            
            <Link to="/catalogue">
              <Button className="bg-[#48B5C3] hover:bg-[#3a9ba8] text-white">Catalogue</Button>
            </Link>
            
            <Button variant="ghost" className="ml-2 p-0">
              <img 
                src="/lovable-uploads/50645589-a085-4692-8c84-8240f3fe62f8.png" 
                alt="Français" 
                className="h-6 w-6 rounded-full"
              />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainNavigation;
