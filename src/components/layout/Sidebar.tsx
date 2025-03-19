
import React from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  Calculator,
  Shield
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const Sidebar = ({ className, onLinkClick }: SidebarProps) => {
  const location = useLocation();
  
  // Fix the dashboard path to use the root route instead of "/dashboard"
  const menuItems: MenuItem[] = [
    { label: "Tableau de bord", icon: LayoutDashboard, href: "/" },
    { label: "Clients", icon: Users, href: "/clients" },
    { label: "Offres", icon: FileText, href: "/offers" },
    { label: "Contrats", icon: FileText, href: "/contracts" },
    { label: "Catalogue", icon: Package, href: "/catalog" },
    { label: "iTakecare", icon: Shield, href: "/i-take-care" },
    { label: "Calculateur", icon: Calculator, href: "/calculator" },
    { label: "Paramètres", icon: Settings, href: "/settings" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location.pathname === "/") {
      return true;
    }
    return location.pathname.startsWith(href) && href !== "/"
  };

  return (
    <aside
      className={cn(
        "min-h-screen w-64 flex-shrink-0 border-r overflow-y-auto py-6",
        className
      )}
    >
      <div className="px-4 py-2 mb-6">
        <h1 className="text-2xl font-bold">iTakecare</h1>
        <p className="text-sm text-muted-foreground">Hub de gestion</p>
      </div>
      <nav className="px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
