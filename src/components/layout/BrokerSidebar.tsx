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
  color: string;
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
      href: `${basePrefix}/dashboard`, 
      color: "blue" 
    },
    { 
      icon: Users, 
      label: "Clients", 
      href: `${basePrefix}/clients`, 
      color: "green" 
    },
    { 
      icon: Calculator, 
      label: "Calculateur", 
      href: `${basePrefix}/create-offer`, 
      color: "purple" 
    },
    { 
      icon: FileText, 
      label: "Demandes", 
      href: `${basePrefix}/offers`, 
      color: "orange" 
    },
    { 
      icon: FileCheck, 
      label: "Contrats", 
      href: `${basePrefix}/contracts`, 
      color: "red" 
    },
    { 
      icon: BarChart3, 
      label: "Analytics", 
      href: `${basePrefix}/analytics`, 
      color: "indigo" 
    },
    { 
      icon: Settings, 
      label: "Paramètres", 
      href: `${basePrefix}/settings`, 
      color: "gray" 
    },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <CompanyLogo 
          logoSize="md"
          showText={true}
        />
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <SidebarMenuItem
            key={item.href}
            item={{ icon: item.icon, label: item.label, href: item.href, color: item.color }}
            isActive={isActive}
            collapsed={false}
          />
        ))}
      </nav>

      <SidebarUserSection />
    </aside>
  );
};

export default BrokerSidebar;
