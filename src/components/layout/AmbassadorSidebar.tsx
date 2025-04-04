
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart,
  Users,
  Calculator,
  Package,
  LogOut,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import Logo from "./Logo";

const AmbassadorSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
      console.error("Erreur de déconnexion:", error);
    }
  };

  const routes = [
    {
      title: "Tableau de bord",
      icon: BarChart,
      href: `/ambassador/dashboard`,
      active: pathname === "/ambassador/dashboard",
    },
    {
      title: "Clients",
      icon: Users,
      href: `/ambassador/clients`,
      active: pathname === "/ambassador/clients" || pathname.startsWith("/ambassador/clients/"),
    },
    {
      title: "Calculateur",
      icon: Calculator,
      href: `/ambassador/create-offer`,
      active: pathname === "/ambassador/create-offer",
    },
    {
      title: "Offres",
      icon: FileText,
      href: `/ambassador/offers`,
      active: pathname === "/ambassador/offers" || pathname.startsWith("/ambassador/offers/"),
    },
    {
      title: "Catalogue",
      icon: Package,
      href: `/ambassador/catalog`,
      active: pathname === "/ambassador/catalog" || pathname.startsWith("/ambassador/catalog/"),
    },
  ];

  const getUserInitials = () => {
    if (!user) return "IT";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "IT";
  };

  const getUserDisplayName = () => {
    if (!user) return "Espace Ambassadeur";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.email) {
      return user.email;
    }
    return "Espace Ambassadeur";
  };
  
  const getUserRole = () => {
    return "Ambassadeur";
  };

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 transition-all duration-500 border-r border-r-primary/5 shadow-xl shadow-primary/5 bg-gradient-to-br from-background via-background/95 to-primary/5",
        collapsed ? "w-[80px]" : "w-[280px]"
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn(
          "flex items-center p-4 mb-2 transition-all duration-300",
          collapsed ? "justify-center" : "px-6 justify-between"
        )}>
          <Logo showText={!collapsed} />
          
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCollapsed(true)} 
              className="rounded-full hover:bg-primary/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {routes.map((item) => (
              <li key={item.href}>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                          collapsed ? "justify-center px-2" : "px-3",
                          item.active
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-y-[-2px]" 
                            : "hover:bg-primary/10 hover:text-primary hover:translate-y-[-2px]"
                        )}
                        aria-current={item.active ? "page" : undefined}
                      >
                        <item.icon 
                          className={cn(
                            "h-5 w-5 flex-shrink-0", 
                            collapsed ? "" : "mr-3",
                            item.active && "stroke-[2.5px]"
                          )} 
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" className="font-medium">
                        <p>{item.title}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className={cn(
          "p-4 transition-all duration-300 mt-auto mx-2 mb-4 border-t border-t-primary/10 pt-4",
          collapsed ? "px-2" : ""
        )}>
          {!collapsed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
                  <AvatarFallback className="bg-primary/20 text-primary">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{getUserDisplayName()}</p>
                  <p className="text-xs text-muted-foreground">{getUserRole()}</p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:shadow"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSignOut}
                    className="w-full h-10 flex justify-center text-destructive/80 hover:bg-destructive/10 hover:text-destructive rounded-xl"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Déconnexion</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Déconnexion</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {collapsed && (
          <div className="p-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCollapsed(false)} 
              className="w-full flex justify-center items-center h-10 rounded-xl hover:bg-primary/10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AmbassadorSidebar;
