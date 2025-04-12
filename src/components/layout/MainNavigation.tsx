
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
                <li className="relative group">
                  <div className="flex items-center text-gray-800 hover:text-[#42B6C5] transition-colors font-medium cursor-pointer">
                    Solutions
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </div>
                  <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-md p-2 hidden group-hover:block z-50">
                    <Link to="/solutions/location" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                      Location d'équipement
                    </Link>
                    <Link to="/solutions/entreprise" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                      Solutions entreprise
                    </Link>
                    <Link to="/solutions/flotte" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                      Gestion de flotte
                    </Link>
                  </div>
                </li>
                <li>
                  <Link to="/pourquoi" className="text-gray-800 hover:text-[#42B6C5] transition-colors font-medium">
                    Pourquoi iTakecare ?
                  </Link>
                </li>
                <li>
                  <Link to="/mon-compte" className="text-gray-800 hover:text-[#42B6C5] transition-colors font-medium">
                    MyiTakecare
                  </Link>
                </li>
                <li>
                  <Link to="/catalogue" className="text-gray-800 hover:text-[#42B6C5] transition-colors font-medium">
                    Catalogue
                  </Link>
                </li>
                <li>
                  <Link to="/ressources" className="text-gray-800 hover:text-[#42B6C5] transition-colors font-medium">
                    Ressources
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
                Connexion
              </Button>
            </div>
            
            <Button 
              className="bg-[#42B6C5] hover:bg-[#389aa7] text-white rounded-full px-6 hidden md:flex"
              onClick={() => navigate("/signup")}
            >
              S'inscrire
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainNavigation;
