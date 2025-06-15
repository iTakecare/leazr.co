
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Package, 
  Calculator,
  CreditCard,
  LogOut
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import Logo from "./Logo";

const AppSidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navigationItems = [
    { 
      title: "Tableau de bord", 
      href: "/dashboard", 
      icon: LayoutDashboard 
    },
    { 
      title: "CRM", 
      href: "/crm", 
      icon: Users 
    },
    { 
      title: "Offres", 
      href: "/admin/offers", 
      icon: FileText 
    },
    { 
      title: "Calculateur", 
      href: "/admin/calculator", 
      icon: Calculator 
    },
    { 
      title: "Contrats", 
      href: "/admin/contracts", 
      icon: CreditCard 
    },
    { 
      title: "Catalogue", 
      href: "/admin/catalog", 
      icon: Package 
    },
    { 
      title: "Paramètres", 
      href: "/admin/settings", 
      icon: Settings 
    }
  ];

  const handleLogout = async () => {
    try {
      console.log("Début de la déconnexion...");
      await logout();
      console.log("Déconnexion réussie, redirection vers /login");
      toast.success("Déconnexion réussie");
      navigate("/login");
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <Sidebar className="border-r border-gray-100 bg-white">
      <SidebarHeader className="px-6 py-8 border-b border-gray-100">
        <Link to="/dashboard" className="flex items-center space-x-3">
          <Logo logoSize="lg" showText={true} />
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.href)}
                    className={`
                      h-12 px-4 rounded-xl transition-all duration-200 
                      hover:bg-blue-50 hover:text-blue-700
                      data-[state=active]:bg-blue-600 
                      data-[state=active]:text-white 
                      data-[state=active]:shadow-lg
                      data-[state=active]:shadow-blue-600/20
                    `}
                  >
                    <Link to={item.href} className="flex items-center gap-3 w-full">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="px-6 py-6 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-50">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
            {getUserInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.first_name && user?.last_name 
                ? `${user.first_name} ${user.last_name}` 
                : user?.email
              }
            </p>
            <p className="text-xs text-gray-500">Administrateur</p>
          </div>
        </div>
        <SidebarMenuButton 
          onClick={handleLogout}
          className="w-full h-10 justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span>Déconnexion</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
