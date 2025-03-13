
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Container from "./Container";
import { Button } from "@/components/ui/button";
import { Layers, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // Animation variants
  const logoVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };
  
  const navItemVariants = {
    initial: { opacity: 0, y: -10 },
    animate: (i: number) => ({ 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.3, delay: 0.1 * i } 
    }),
  };

  const navItems = [
    { path: "/dashboard", label: "Tableau de bord" },
    { path: "/create-offer", label: "Créer une offre" },
    { path: "/offers", label: "Mes offres" },
  ];
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur-lg bg-background/80 supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <motion.div 
            className="flex items-center gap-2" 
            variants={logoVariants}
            initial="initial"
            animate="animate"
          >
            <Link to="/" className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-foreground">
                iTakecare
              </span>
            </Link>
          </motion.div>
          
          <nav className="hidden md:flex items-center gap-6">
            {user && navItems.map((item, i) => (
              <motion.div
                key={item.path}
                custom={i}
                variants={navItemVariants}
                initial="initial"
                animate="animate"
              >
                <Link
                  to={item.path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <span>Déconnexion</span>
                <LogOut className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button asChild>
                <Link to="/login" className="flex items-center gap-1">
                  <span>Connexion</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Navbar;
