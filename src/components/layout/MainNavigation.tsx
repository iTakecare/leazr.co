
import React from "react";
import { ShoppingCartIcon, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const MainNavigation = () => {
  // Navigation menu items
  const navItems = [
    { label: "Accueil", href: "/" },
    { label: "Catalogue", href: "/catalogue" },
    { label: "Logiciel de gestion", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ];

  return (
    <div className="relative w-full max-w-[1320px] mx-auto h-[82px] bg-[#f8f8f6] rounded-[50px] border-2 border-solid border-[#e1e1e1] flex items-center justify-between px-5">
      <div className="flex items-center">
        <Link to="/">
          <img
            className="w-[201px] h-[41px] object-contain"
            alt="iTakecare Logo"
            src="/lovable-uploads/3a4ae1ec-2b87-4a07-a178-b3bc5d86594b.png"
          />
        </Link>

        <nav className="ml-[75px]">
          <ul className="flex space-x-[30px]">
            {navItems.map((item, index) => (
              <li key={index}>
                <Link
                  to={item.href}
                  className="font-normal text-[#222222] text-lg"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <ShoppingCartIcon className="w-6 h-6" />
          <Badge className="absolute -top-1 -right-2 w-5 h-5 bg-[#48b5c3] rounded-[10px] flex items-center justify-center p-0">
            <span className="font-bold text-white text-xs">0</span>
          </Badge>
        </div>

        <Link to="/login">
          <Button
            variant="outline"
            className="rounded-[50px] font-bold text-lg"
          >
            Se connecter
          </Button>
        </Link>

        <Link to="/catalogue">
          <Button className="bg-[#48b5c3] hover:bg-[#3da6b4] rounded-[50px] font-bold text-lg">
            Catalogue
          </Button>
        </Link>

        <div className="flex items-center ml-4">
          <img className="w-8 h-8" alt="Langue" src="/langue.png" />
          <ChevronDown className="w-[13px] h-[7px] ml-2" />
        </div>
      </div>
    </div>
  );
};

export default MainNavigation;
