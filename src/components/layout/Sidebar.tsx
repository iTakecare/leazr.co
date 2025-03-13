import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, PlusCircle, ListOrdered, Folders, Settings, LogOut, User } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "../ui/button";
import { toast } from "sonner";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Get initials from user's name for avatar fallback
  const getInitials = () => {
    if (!user) return "U";
    return `${user.first_name?.charAt(0) || ""}${user.last_name?.charAt(0) || ""}`.toUpperCase() || "U";
  };

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      console.log("Déconnexion réussie:", result);
      toast.success("Déconnexion réussie");
      // Forcer un délai pour s'assurer que la déconnexion est bien effectuée
      setTimeout(() => {
        navigate("/login");
        // Forcer le rechargement de la page pour s'assurer que toutes les données de session sont effacées
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

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
    { 
      path: "/catalog", 
      label: "Catalogue", 
      icon: <Folders className="h-5 w-5" /> 
    },
    { 
      path: "/settings", 
      label: "Paramètres", 
      icon: <Settings className="h-5 w-5" /> 
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

  return (
    <motion.div 
      className="fixed left-0 top-0 bottom-0 z-40 w-16 bg-background/80 backdrop-blur-lg border-r border-border/40 flex flex-col items-center py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Avatar remplace le lien vers l'index */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/settings" className="mb-8">
              <Avatar>
                <AvatarImage src={user?.avatar_url || ""} alt={user?.first_name || "User"} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-muted-foreground">{user?.role === 'admin' ? 'Administrateur' : 
                     user?.role === 'partner' ? 'Partenaire' : 'Client'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex flex-col items-center space-y-6 flex-1">
        {sidebarItems.map((item) => (
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

      <AlertDialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <button
                  className="p-2 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors mt-auto"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Déconnexion</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter de l'application ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Déconnexion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Sidebar;
