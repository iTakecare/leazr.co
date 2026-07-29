import React, { createContext, useContext } from 'react';
import { Outlet, useLocation } from "react-router";
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  type LucideIcon
} from 'lucide-react';
import SidebarMenuItem from './SidebarMenuItem';
import SidebarUserSection from './SidebarUserSection';
import CompanyLogo from './CompanyLogo';
import { Financeur, FinancingPartner } from '@/types/financeur';

// ─── Contexte partenaire ───
interface FinancingPartnerContextType {
  partner: FinancingPartner;
  financeur: Financeur;
  basePrefix: string;
}

const FinancingPartnerContext = createContext<FinancingPartnerContextType | undefined>(undefined);

export const FinancingPartnerProvider: React.FC<{
  children: React.ReactNode;
  partner: FinancingPartner;
  financeur: Financeur;
}> = ({ children, partner, financeur }) => (
  <FinancingPartnerContext.Provider
    value={{ partner, financeur, basePrefix: `/${financeur.slug}/partenaire` }}
  >
    {children}
  </FinancingPartnerContext.Provider>
);

export const useFinancingPartner = () => {
  const ctx = useContext(FinancingPartnerContext);
  if (!ctx) throw new Error('useFinancingPartner must be used within FinancingPartnerProvider');
  return ctx;
};

// ─── Layout ───
const FinancingPartnerLayout: React.FC = () => {
  const { partner, financeur, basePrefix } = useFinancingPartner();
  const location = useLocation();

  const menuItems: { icon: LucideIcon; label: string; href: string }[] = [
    { icon: LayoutDashboard, label: "Mes demandes", href: `${basePrefix}/requests` },
    { icon: FilePlus2, label: "Nouvelle demande", href: `${basePrefix}/new-request` },
  ];

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <CompanyLogo logoSize="sm" className="w-8 h-8" />
            <div>
              <h1 className="text-sm font-semibold text-white">{financeur.name}</h1>
              <p className="text-xs text-sidebar-foreground/60">
                {partner.partner_type === 'broker' ? 'Espace Broker' : 'Espace Partenaire'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
            <FileText className="h-3.5 w-3.5" />
            <span className="truncate">{partner.name}</span>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
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
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default FinancingPartnerLayout;
