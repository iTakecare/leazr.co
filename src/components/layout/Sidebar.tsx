
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Layers, LayoutDashboard, PlusCircle, ListOrdered, LogOut } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const sidebarItems = [
    { 
      path: "/dashboard", 
      label: "Tableau de bord", 
      icon: <LayoutDashboard className="h-5 w-5" /> 
    },
    { 
      path: "/create-offer", 
      label: "Créer une offre", 
      icon: <PlusCircle className="h-5 w-5" /> 
    },
    { 
      path: "/offers", 
      label: "Mes offres", 
      icon: <ListOrdered className="h-5 w-5" /> 
    },
  ];

  // Initial entrance animation variants
  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        staggerChildren: 0.1,
        when: "beforeChildren" 
      } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  if (!user) return null;

  return (
    <motion.div 
      className="fixed left-0 top-0 bottom-0 z-40 w-16 bg-background/80 backdrop-blur-lg border-r border-border/40 flex flex-col items-center py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Link to="/" className="mb-8">
        <Layers className="h-6 w-6 text-primary" />
      </Link>

      <div className="flex flex-col items-center space-y-6 flex-1">
        {sidebarItems.map((item, index) => (
          <motion.div key={item.path} variants={itemVariants}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    className={`p-2 rounded-md transition-colors flex items-center justify-center ${
                      location.pathname === item.path
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {item.icon}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        ))}
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={logout}
              className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mt-auto"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Déconnexion</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
};

export default Sidebar;
