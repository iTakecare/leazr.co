
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { useMobile } from '@/hooks/use-mobile';
import { LucideIcon, LayoutDashboard, Settings, PlusCircle, Calculator, ShoppingCart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

const NavItem = ({ to, label, icon: Icon, onClick }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'transparent hover:bg-accent/50'
        }`
      }
      onClick={onClick}
    >
      <Icon className="mr-2 h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isAuthenticated, user } = useAuth();
  const isMobile = useMobile();

  // Animation variants
  const sidebarVariants = {
    open: { x: 0, opacity: 1 },
    closed: { x: '-100%', opacity: 0 },
  };

  const overlayVariants = {
    open: { opacity: 1 },
    closed: { opacity: 0 },
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-40"
          initial="closed"
          animate={isOpen ? 'open' : 'closed'}
          variants={overlayVariants}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.div
        className={`fixed left-0 top-0 bottom-0 z-50 w-64 bg-background border-r p-4 overflow-y-auto ${
          isMobile ? '' : 'lg:z-30'
        }`}
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex flex-col h-full">
          <div className="py-2">
            <h2 className="text-xl font-bold mb-2">LeasingTools</h2>
            <p className="text-muted-foreground text-sm">
              Calculez et gérez vos offres de leasing
            </p>
          </div>

          <Separator className="my-4" />

          {isAuthenticated ? (
            <>
              <div className="space-y-1">
                <NavItem
                  to="/dashboard"
                  label="Tableau de bord"
                  icon={LayoutDashboard}
                  onClick={isMobile ? onClose : undefined}
                />
                
                <NavItem
                  to="/clients"
                  label="Gestion des clients"
                  icon={Users}
                  onClick={isMobile ? onClose : undefined}
                />

                <NavItem
                  to="/create-offer"
                  label="Nouvelle offre"
                  icon={PlusCircle}
                  onClick={isMobile ? onClose : undefined}
                />

                <NavItem
                  to="/offers"
                  label="Mes offres"
                  icon={Calculator}
                  onClick={isMobile ? onClose : undefined}
                />

                <NavItem
                  to="/catalog"
                  label="Catalogue produits"
                  icon={ShoppingCart}
                  onClick={isMobile ? onClose : undefined}
                />

                <NavItem
                  to="/settings"
                  label="Paramètres"
                  icon={Settings}
                  onClick={isMobile ? onClose : undefined}
                />
              </div>

              <div className="mt-auto pt-4">
                {!isMobile && (
                  <div className="rounded-lg border p-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2 mt-auto">
              <Button
                className="w-full"
                asChild
                onClick={isMobile ? onClose : undefined}
              >
                <NavLink to="/login">Se connecter</NavLink>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                asChild
                onClick={isMobile ? onClose : undefined}
              >
                <NavLink to="/signup">Créer un compte</NavLink>
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
