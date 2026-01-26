import React from 'react';
import { useLocation } from 'react-router-dom';
import { useBrokerContext } from '@/context/BrokerContext';
import { 
  LayoutDashboard, 
  Users, 
  Calculator,
  FileText, 
  FileCheck,
  BarChart3,
  Settings,
  type LucideIcon 
} from 'lucide-react';
import SidebarMenuItem from './SidebarMenuItem';
import SidebarUserSection from './SidebarUserSection';
import CompanyLogo from './CompanyLogo';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

const BrokerSidebar: React.FC = () => {
  const { broker, brokerSlug } = useBrokerContext();
  const location = useLocation();

  if (!broker || !brokerSlug) return null;

  const basePrefix = `/${brokerSlug}/broker`;

  const menuItems: MenuItem[] = [
    { 
      icon: LayoutDashboard, 
      label: "Dashboard", 
      href: `${basePrefix}/dashboard`
    },
    { 
      icon: Users, 
      label: "Clients", 
      href: `${basePrefix}/clients`
    },
    { 
      icon: Calculator, 
      label: "Calculateur", 
      href: `${basePrefix}/create-offer`
    },
    { 
      icon: FileText, 
      label: "Demandes", 
      href: `${basePrefix}/offers`
    },
    { 
      icon: FileCheck, 
      label: "Contrats", 
      href: `${basePrefix}/contracts`
    },
    { 
      icon: BarChart3, 
      label: "Analytics", 
      href: `${basePrefix}/analytics`
    },
    { 
      icon: Settings, 
      label: "Paramètres", 
      href: `${basePrefix}/settings`
    },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <CompanyLogo logoSize="sm" className="w-8 h-8" />
          <div>
            <h1 className="text-sm font-semibold text-white">{broker.name || 'Broker'}</h1>
            <p className="text-xs text-sidebar-foreground/60">Espace Courtier</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase text-sidebar-foreground/40 px-3 mb-2">
          Navigation
        </p>
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <SidebarMenuItem
              key={item.href}
              item={{ icon: item.icon, label: item.label, href: item.href }}
              isActive={isActive}
              collapsed={false}
            />
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border">
        <SidebarUserSection darkMode />
      </div>
    </aside>
  );
};

export default BrokerSidebar;
