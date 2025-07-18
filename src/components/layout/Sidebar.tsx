
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useLocation, Link } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Calendar, 
  CreditCard, 
  Settings, 
  Menu, 
  X,
  ChevronRight,
  Building2,
  UserCheck,
  ClipboardList,
  Calculator,
  Package,
  TrendingUp,
  HelpCircle,
  Mail
} from "lucide-react";
import CompanyLogo from "./CompanyLogo";
import SidebarUserSection from "./SidebarUserSection";

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const { user } = useAuth();
  const { companyId } = useMultiTenant();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user || !companyId) return null;

  const menuItems = [
    { icon: BarChart3, label: "Dashboard", href: "/admin/dashboard", color: "text-blue-600" },
    { icon: UserCheck, label: "Clients", href: "/admin/clients", color: "text-orange-600" },
    { icon: FileText, label: "Contrats", href: "/admin/contracts", color: "text-red-600" },
    { icon: ClipboardList, label: "Devis", href: "/admin/offers", color: "text-indigo-600" },
    { icon: Calculator, label: "Factures", href: "/admin/invoicing", color: "text-pink-600" },
    { icon: Package, label: "Catalogue", href: "/admin/catalog", color: "text-emerald-600" },
    { icon: Users, label: "Ambassadeurs", href: "/ambassadors", color: "text-green-600" },
    { icon: Mail, label: "Chat Admin", href: "/admin/chat", color: "text-violet-600" },
    { icon: Settings, label: "Paramètres", href: "/admin/settings", color: "text-gray-600" },
  ];

  const isActive = (href: string) => location.pathname === href;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-xl">
      {/* Header avec logo */}
      <div className={cn(
        "p-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50",
        isCollapsed ? "px-2" : "px-4"
      )}>
        <div className="flex items-center gap-3">
          <CompanyLogo 
            logoSize="sm"
            className={cn(
              "transition-all duration-300",
              isCollapsed ? "mx-auto" : ""
            )}
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-gray-900 truncate">Leazr</h1>
              <p className="text-xs text-gray-500 truncate">Administration</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden",
                    active 
                      ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 shadow-sm border border-blue-200/50" 
                      : "text-gray-600 hover:bg-gray-50/80 hover:text-gray-900",
                    isCollapsed ? "justify-center px-2" : ""
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full" />
                  )}
                  
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                    active ? item.color : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1">{item.label}</span>
                      {active && (
                        <ChevronRight className="h-4 w-4 text-blue-500 opacity-60" />
                      )}
                    </>
                  )}
                  
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-blue-50/50">
        <SidebarUserSection />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
        className
      )}>
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 z-10 p-1.5 bg-white border border-gray-200 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
        >
          <ChevronRight className={cn(
            "h-4 w-4 text-gray-600 transition-transform duration-200",
            isCollapsed ? "rotate-0" : "rotate-180"
          )} />
        </button>
        
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 transform transition-transform duration-300">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
