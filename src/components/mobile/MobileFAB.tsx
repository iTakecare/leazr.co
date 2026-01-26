import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ClipboardList, Camera, Search, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FabAction {
  id: string;
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  color?: 'primary' | 'secondary';
}

interface MobileFABProps {
  actions?: FabAction[];
  primaryAction?: FabAction;
  className?: string;
}

const MobileFAB: React.FC<MobileFABProps> = ({
  actions,
  primaryAction,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract company slug from path
  const getCompanySlug = () => {
    const pathMatch = location.pathname.match(/^\/([^\/]+)\/(admin|client|ambassador)/);
    return pathMatch?.[1] || null;
  };

  const companySlug = getCompanySlug();
  const basePrefix = companySlug ? `/${companySlug}` : '';

  // Default actions
  const defaultActions: FabAction[] = actions || [
    {
      id: 'new-offer',
      icon: ClipboardList,
      label: 'Nouvelle offre',
      href: `${basePrefix}/admin/create-offer`,
    },
    {
      id: 'scan',
      icon: Camera,
      label: 'Scanner document',
      onClick: () => {
        // TODO: Implement scanner
        console.log('Open scanner');
      },
    },
    {
      id: 'search',
      icon: Search,
      label: 'Recherche',
      onClick: () => {
        // TODO: Open search
        console.log('Open search');
      },
    },
  ];

  const handleActionClick = (action: FabAction) => {
    if (action.href) {
      navigate(action.href);
    } else if (action.onClick) {
      action.onClick();
    }
    setIsExpanded(false);
  };

  const handleMainClick = () => {
    if (primaryAction) {
      handleActionClick(primaryAction);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className={cn(
        "fixed right-4 z-50",
        // Position above bottom nav
        "bottom-24",
        className
      )}>
        {/* Action Buttons */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-end gap-3 mb-4"
            >
              {defaultActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      transition: { delay: index * 0.05 }
                    }}
                    exit={{ 
                      opacity: 0, 
                      x: 20,
                      transition: { delay: (defaultActions.length - index) * 0.03 }
                    }}
                    onClick={() => handleActionClick(action)}
                    className="flex items-center gap-3"
                  >
                    <span className="text-sm font-medium bg-card shadow-lg px-3 py-2 rounded-lg">
                      {action.label}
                    </span>
                    <div className={cn(
                      "h-12 w-12 rounded-full shadow-lg flex items-center justify-center",
                      action.color === 'secondary' 
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-primary text-primary-foreground"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleMainClick}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg flex items-center justify-center",
            "bg-primary text-primary-foreground"
          )}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {primaryAction ? (
              <primaryAction.icon className="h-6 w-6" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </motion.div>
        </motion.button>
      </div>
    </>
  );
};

export default MobileFAB;
