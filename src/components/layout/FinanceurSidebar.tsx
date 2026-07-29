import React from 'react';
import { useLocation } from "react-router";
import { useFinanceurContext } from '@/context/FinanceurContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  Handshake,
  Grid3X3,
  PenLine,
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

const FinanceurSidebar: React.FC = () => {
  const { financeur, financeurSlug } = useFinanceurContext();
  const location = useLocation();

  if (!financeur || !financeurSlug) return null;

  const basePrefix = `/${financeurSlug}/financeur`;

  const menuItems: MenuItem[] = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: `${basePrefix}/dashboard`
    },
    {
      icon: FileText,
      label: "Demandes",
      href: `${basePrefix}/offers`
    },
    {
      icon: Users,
      label: "Clients",
      href: `${basePrefix}/clients`
    },
    {
      icon: FileCheck,
      label: "Contrats",
      href: `${basePrefix}/contracts`
    },
    {
      icon: Handshake,
      label: "Partenaires",
      href: `${basePrefix}/partners`
    },
    {
      icon: Grid3X3,
      label: "Grilles de coefficients",
      href: `${basePrefix}/grids`
    },
    {
      icon: PenLine,
      label: "Signataires",
      href: `${basePrefix}/signers`
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
            <h1 className="text-sm font-semibold text-white">{financeur.name || 'Financeur'}</h1>
            <p className="text-xs text-sidebar-foreground/60">Espace Financeur</p>
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

export default FinanceurSidebar;
