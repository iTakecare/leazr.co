
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  LayoutDashboard, 
  Settings, 
  PlusCircle, 
  Calculator, 
  ShoppingCart, 
  Users, 
  LogOut, 
  LogIn, 
  UserPlus 
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const sidebarVariants = {
    open: { x: 0, opacity: 1 },
    closed: { x: '-100%', opacity: 0 },
  };

  const overlayVariants = {
    open: { opacity: 1 },
    closed: { opacity: 0 },
  };

  const handleSignOut = () => {
    signOut?.();
    if (isMobile) {
      onClose();
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    
    if (!firstName && !lastName) return "U";
    
    return `${firstName.charAt(0)}${lastName.charAt(0) || ''}`;
  };

  return (
    <>
      {isMobile && isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-40"
          initial="closed"
          animate={isOpen ? 'open' : 'closed'}
          variants={overlayVariants}
          onClick={onClose}
        />
      )}

      <motion.div
        className={`fixed left-0 top-0 bottom-0 z-50 w-16 bg-background border-r p-2 overflow-y-auto flex flex-col items-center ${
          isMobile ? '' : 'lg:z-30'
        }`}
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex flex-col items-center gap-2 py-4 h-full w-full">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-10 w-10 items-center justify-center rounded-md p-0">
                  <Avatar>
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Profil' : 'Non connecté'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator className="my-2 w-10" />

          {user ? (
            <>
              <div className="flex flex-col items-center gap-3 w-full">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                          `flex h-10 w-10 items-center justify-center rounded-md p-2 transition-colors ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'transparent hover:bg-accent/50'
                          }`
                        }
                        onClick={isMobile ? onClose : undefined}
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        <span className="sr-only">Tableau de bord</span>
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Tableau de bord</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/clients"
                        className={({ isActive }) =>
                          `flex h-10 w-10 items-center justify-center rounded-md p-2 transition-colors ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'transparent hover:bg-accent/50'
                          }`
                        }
                        onClick={isMobile ? onClose : undefined}
                      >
                        <Users className="h-5 w-5" />
                        <span className="sr-only">Gestion des clients</span>
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Gestion des clients</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/create-offer"
                        className={({ isActive }) =>
                          `flex h-10 w-10 items-center justify-center rounded-md p-2 transition-colors ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'transparent hover:bg-accent/50'
                          }`
                        }
                        onClick={isMobile ? onClose : undefined}
                      >
                        <PlusCircle className="h-5 w-5" />
                        <span className="sr-only">Nouvelle offre</span>
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Nouvelle offre</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/offers"
                        className={({ isActive }) =>
                          `flex h-10 w-10 items-center justify-center rounded-md p-2 transition-colors ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'transparent hover:bg-accent/50'
                          }`
                        }
                        onClick={isMobile ? onClose : undefined}
                      >
                        <Calculator className="h-5 w-5" />
                        <span className="sr-only">Mes offres</span>
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Mes offres</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/catalog"
                        className={({ isActive }) =>
                          `flex h-10 w-10 items-center justify-center rounded-md p-2 transition-colors ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'transparent hover:bg-accent/50'
                          }`
                        }
                        onClick={isMobile ? onClose : undefined}
                      >
                        <ShoppingCart className="h-5 w-5" />
                        <span className="sr-only">Catalogue produits</span>
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Catalogue produits</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                          `flex h-10 w-10 items-center justify-center rounded-md p-2 transition-colors ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'transparent hover:bg-accent/50'
                          }`
                        }
                        onClick={isMobile ? onClose : undefined}
                      >
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Paramètres</span>
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Paramètres</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-auto mb-4">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="sr-only">Se déconnecter</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Se déconnecter</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </>
          ) : (
            <div className="mt-auto mb-4 flex flex-col gap-3">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/login"
                      className={({ isActive }) =>
                        `flex h-10 w-10 items-center justify-center rounded-md p-2 transition-colors ${
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'transparent hover:bg-accent/50'
                        }`
                      }
                      onClick={isMobile ? onClose : undefined}
                    >
                      <LogIn className="h-5 w-5" />
                      <span className="sr-only">Se connecter</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Se connecter</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to="/signup"
                      className={({ isActive }) =>
                        `flex h-10 w-10 items-center justify-center rounded-md p-2 transition-colors ${
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'transparent hover:bg-accent/50'
                        }`
                      }
                      onClick={isMobile ? onClose : undefined}
                    >
                      <UserPlus className="h-5 w-5" />
                      <span className="sr-only">Créer un compte</span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Créer un compte</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
