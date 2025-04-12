
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const MainNavigation = () => {
  const { cartCount } = useCart();
  const navigate = useNavigate();
  
  return (
    <header className="bg-white w-full py-4 rounded-full shadow-sm mx-auto my-4 max-w-[1320px]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold flex items-center">
              <img
                src="/lovable-uploads/f7574869-dbb7-4c4e-a51e-a5e14608acb2.png"
                alt="iTakecare Logo"
                className="w-24 h-auto"
              />
            </Link>
            
            <nav className="hidden md:flex ml-10">
              <ul className="flex space-x-8">
                <li>
                  <Link to="/" className="text-gray-800 hover:text-[#42B6C5] transition-colors font-medium">
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link to="/catalogue" className="text-gray-800 hover:text-[#42B6C5] transition-colors font-medium">
                    Catalogue
                  </Link>
                </li>
                <li>
                  <Link to="/logiciel-de-gestion" className="text-gray-800 hover:text-[#42B6C5] transition-colors font-medium">
                    Logiciel de gestion
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-gray-800 hover:text-[#42B6C5] transition-colors font-medium">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-800 hover:text-[#42B6C5] transition-colors font-medium">
                    Contact
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              className="relative" 
              onClick={() => navigate('/panier')}
              aria-label="Voir le panier"
            >
              <div className="bg-white rounded-full p-2 flex items-center">
                <ShoppingCart className="h-6 w-6 text-gray-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#42B6C5] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount || 0}
                  </span>
                )}
              </div>
            </button>
            
            <div className="hidden md:block">
              <Button 
                variant="outline" 
                className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full px-6"
                onClick={() => navigate('/login')}
              >
                Se connecter
              </Button>
            </div>
            
            <Button 
              className="bg-[#42B6C5] hover:bg-[#389aa7] text-white rounded-full px-6 hidden md:flex"
              onClick={() => navigate("/catalogue")}
            >
              Catalogue
            </Button>
            
            <div className="flex items-center ml-2">
              <img 
                src="https://flagcdn.com/fr.svg" 
                alt="Français" 
                className="h-5 w-auto"
              />
              <ChevronDown className="h-4 w-4 ml-1 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainNavigation;
