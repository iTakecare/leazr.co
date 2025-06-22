
import React from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface UnifiedNavigationProps {
  className?: string;
}

const UnifiedNavigation: React.FC<UnifiedNavigationProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const { user, isClient, isPartner, isAmbassador, isAdmin } = useAuth();

  const handleGetStarted = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isClient) {
      navigate('/client/dashboard');
    } else if (isAmbassador) {
      navigate('/ambassador/dashboard');
    } else if (isPartner) {
      navigate('/partner/dashboard');
    } else if (isAdmin) {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <nav className={`flex items-center space-x-6 ${className}`}>
      <Link to="/solutions" className="text-gray-700 hover:text-blue-600 transition-colors">
        Solutions
      </Link>
      <Link to="/services" className="text-gray-700 hover:text-blue-600 transition-colors">
        Services
      </Link>
      <Link to="/ressources" className="text-gray-700 hover:text-blue-600 transition-colors">
        Ressources
      </Link>
      <Link to="/tarifs" className="text-gray-700 hover:text-blue-600 transition-colors">
        Tarifs
      </Link>
      
      {user ? (
        <Button onClick={handleGetStarted} size="sm">
          Mon tableau de bord
        </Button>
      ) : (
        <div className="flex items-center space-x-3">
          <Link to="/login" className="text-gray-700 hover:text-blue-600 transition-colors">
            Connexion
          </Link>
          <Button onClick={handleGetStarted} size="sm">
            Essai gratuit
          </Button>
        </div>
      )}
    </nav>
  );
};

export default UnifiedNavigation;
