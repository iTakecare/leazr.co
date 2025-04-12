
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const MainNavigation = () => {
  const { cartCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("MainNavigation mounted");
  }, []);
  
  console.log("Rendering MainNavigation"); // Ajout d'un log pour le débogage
  
  return (
    <header className="bg-transparent w-full py-4 z-50">
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
                  <Link to="/" className="text-gray-800 hover:text-[#42B6C5] transition-colors">
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link to="/catalogue" className="text-gray-800 hover:text-[#42B6C5] transition-colors">
                    Catalogue
                  </Link>
                </li>
                <li>
                  <Link to="/logiciel-de-gestion" className="text-gray-800 hover:text-[#42B6C5] transition-colors">
                    Logiciel de gestion
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-gray-800 hover:text-[#42B6C5] transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-800 hover:text-[#42B6C5] transition-colors">
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
              <ShoppingCart className="h-6 w-6 text-gray-700" />
              {cartCount > 0 && (
                <span className={cn(
                  "absolute -top-2 -right-2 bg-[#42B6C5] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center",
                  cartCount > 0 && "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                )}>
                  {cartCount}
                </span>
              )}
            </button>
            
            <div className="hidden md:block">
              {user ? (
                <Button 
                  variant="outline" 
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full"
                  onClick={() => {
                    if (user.role === 'admin') navigate('/dashboard');
                    else if (user.role === 'client') navigate('/client/dashboard');
                    else if (user.role === 'partner') navigate('/partner/dashboard');
                    else if (user.role === 'ambassador') navigate('/ambassador/dashboard');
                    else navigate('/client/dashboard');
                  }}
                >
                  Mon compte
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-full"
                  onClick={() => navigate('/login')}
                >
                  Se connecter
                </Button>
              )}
            </div>
            
            <Button 
              className="bg-[#42B6C5] hover:bg-[#389aa7] text-white rounded-full hidden md:flex"
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
