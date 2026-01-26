import React from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  ClipboardList, 
  Plus, 
  FileText, 
  User 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isAction?: boolean;
}

interface MobileBottomNavProps {
  companySlug?: string | null;
  userRole?: 'admin' | 'client' | 'ambassador';
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  companySlug, 
  userRole = 'admin' 
}) => {
  const location = useLocation();
  
  const basePrefix = companySlug ? `/${companySlug}` : '';
  
  const adminItems: NavItem[] = [
    { 
      icon: LayoutDashboard, 
      label: "Accueil", 
      href: `${basePrefix}/admin/dashboard` 
    },
    { 
      icon: ClipboardList, 
      label: "Demandes", 
      href: `${basePrefix}/admin/offers` 
    },
    { 
      icon: Plus, 
      label: "Créer", 
      href: `${basePrefix}/admin/create-offer`,
      isAction: true 
    },
    { 
      icon: FileText, 
      label: "Contrats", 
      href: `${basePrefix}/admin/contracts` 
    },
    { 
      icon: User, 
      label: "Profil", 
      href: `${basePrefix}/admin/settings` 
    },
  ];

  const clientItems: NavItem[] = [
    { 
      icon: LayoutDashboard, 
      label: "Accueil", 
      href: `${basePrefix}/client/dashboard` 
    },
    { 
      icon: ClipboardList, 
      label: "Demandes", 
      href: `${basePrefix}/client/requests` 
    },
    { 
      icon: Plus, 
      label: "Nouveau", 
      href: `${basePrefix}/client/catalog`,
      isAction: true 
    },
    { 
      icon: FileText, 
      label: "Contrats", 
      href: `${basePrefix}/client/contracts` 
    },
    { 
      icon: User, 
      label: "Profil", 
      href: `${basePrefix}/client/profile` 
    },
  ];

  const ambassadorItems: NavItem[] = [
    { 
      icon: LayoutDashboard, 
      label: "Accueil", 
      href: `${basePrefix}/ambassador/dashboard` 
    },
    { 
      icon: ClipboardList, 
      label: "Filleuls", 
      href: `${basePrefix}/ambassador/referrals` 
    },
    { 
      icon: Plus, 
      label: "Créer", 
      href: `${basePrefix}/ambassador/create-offer`,
      isAction: true 
    },
    { 
      icon: FileText, 
      label: "Commissions", 
      href: `${basePrefix}/ambassador/commissions` 
    },
    { 
      icon: User, 
      label: "Profil", 
      href: `${basePrefix}/ambassador/profile` 
    },
  ];

  const getItems = () => {
    switch (userRole) {
      case 'client':
        return clientItems;
      case 'ambassador':
        return ambassadorItems;
      default:
        return adminItems;
    }
  };

  const items = getItems();

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-bottom overflow-visible">
      <div className="flex items-center justify-around h-16 px-2 overflow-visible">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          
          if (item.isAction) {
            return (
              <Link
                key={item.href}
                to={item.href}
                className="relative flex items-center justify-center -mt-8"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white shadow-2xl border-[5px] border-white"
                  style={{ boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)' }}
                >
                  <Icon className="h-7 w-7" />
                </motion.div>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center justify-center flex-1 py-2 touch-target"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-8 rounded-full transition-colors",
                    active 
                      ? "bg-primary/10" 
                      : "bg-transparent"
                  )}
                >
                  <Icon 
                    className={cn(
                      "h-5 w-5 transition-colors",
                      active 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    )} 
                  />
                </div>
                <span 
                  className={cn(
                    "text-[10px] mt-1 font-medium transition-colors",
                    active 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
