
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Container from "./Container";
import { Button } from "@/components/ui/button";
import { Layers, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const { user } = useAuth();
  
  // Animation variants
  const logoVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

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
          
          <div className="flex items-center gap-2">
            {!user && (
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
