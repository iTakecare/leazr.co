
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import CartNotification from '../cart/CartNotification';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const MainNavigation: React.FC = () => {
  return (
    <nav className="flex justify-between items-center w-full">
      <Link to="/" className="font-bold text-xl">iTakecare</Link>
      
      <div className="hidden md:flex items-center space-x-6">
        <NavLink href="/">Accueil</NavLink>
        <NavLink href="/a-propos">À propos</NavLink>
        <NavLink href="/catalogue">Catalogue</NavLink>
        <NavLink href="/client/requests">Mes demandes</NavLink>
      </div>
      
      <div className="flex items-center space-x-4">
        <CartNotification />
        <Link to="/login" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          Connexion
        </Link>
      </div>
    </nav>
  );
};

const NavLink: React.FC<NavLinkProps> = ({ href, children, className }) => {
  const location = useLocation();
  const isActive = location.pathname === href;
  
  return (
    <Link
      to={href}
      className={cn(
        "text-sm font-medium transition-colors hover:text-primary",
        isActive ? "text-primary" : "text-muted-foreground",
        className
      )}
    >
      {children}
    </Link>
  );
};

export default MainNavigation;
