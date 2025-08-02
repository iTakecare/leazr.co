
import React, { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface SidebarMenuItemProps {
  item: {
    label: string;
    icon: React.ElementType;
    href: string;
    color: string;
    badge?: string;
    isNew?: boolean;
  };
  isActive: (href: string) => boolean;
  collapsed: boolean;
  onLinkClick?: () => void;
}

const SidebarMenuItem = memo(({ item, isActive, collapsed, onLinkClick }: SidebarMenuItemProps) => {
  const navigate = useNavigate();
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (onLinkClick) {
      onLinkClick();
    }
  }, [onLinkClick]);

  const active = isActive(item.href);

  // Mapping des couleurs pour les accents visuels
  const colorClasses = {
    blue: {
      active: "bg-blue-500 text-white shadow-lg shadow-blue-500/25 border-l-4 border-blue-600",
      hover: "hover:bg-blue-50 hover:text-blue-700 hover:border-l-4 hover:border-blue-300",
      icon: active ? "text-white" : "text-blue-600"
    },
    orange: {
      active: "bg-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600",
      hover: "hover:bg-orange-50 hover:text-orange-700 hover:border-l-4 hover:border-orange-300",
      icon: active ? "text-white" : "text-orange-600"
    },
    red: {
      active: "bg-red-500 text-white shadow-lg shadow-red-500/25 border-l-4 border-red-600",
      hover: "hover:bg-red-50 hover:text-red-700 hover:border-l-4 hover:border-red-300",
      icon: active ? "text-white" : "text-red-600"
    },
    indigo: {
      active: "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border-l-4 border-indigo-600",
      hover: "hover:bg-indigo-50 hover:text-indigo-700 hover:border-l-4 hover:border-indigo-300",
      icon: active ? "text-white" : "text-indigo-600"
    },
    pink: {
      active: "bg-pink-500 text-white shadow-lg shadow-pink-500/25 border-l-4 border-pink-600",
      hover: "hover:bg-pink-50 hover:text-pink-700 hover:border-l-4 hover:border-pink-300",
      icon: active ? "text-white" : "text-pink-600"
    },
    emerald: {
      active: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border-l-4 border-emerald-600",
      hover: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-l-4 hover:border-emerald-300",
      icon: active ? "text-white" : "text-emerald-600"
    },
    violet: {
      active: "bg-violet-500 text-white shadow-lg shadow-violet-500/25 border-l-4 border-violet-600",
      hover: "hover:bg-violet-50 hover:text-violet-700 hover:border-l-4 hover:border-violet-300",
      icon: active ? "text-white" : "text-violet-600"
    },
    gray: {
      active: "bg-gray-600 text-white shadow-lg shadow-gray-600/25 border-l-4 border-gray-700",
      hover: "hover:bg-gray-50 hover:text-gray-700 hover:border-l-4 hover:border-gray-300",
      icon: active ? "text-white" : "text-gray-600"
    }
  };

  const currentColor = colorClasses[item.color as keyof typeof colorClasses] || colorClasses.gray;
  
  // Ajouter les couleurs slate si nécessaire
  const extendedColorClasses = {
    ...colorClasses,
    slate: {
      active: "bg-slate-600 text-white shadow-lg shadow-slate-600/25 border-l-4 border-slate-700",
      hover: "hover:bg-slate-50 hover:text-slate-700 hover:border-l-4 hover:border-slate-300",
      icon: active ? "text-white" : "text-slate-600"
    }
  };
  
  const finalColor = extendedColorClasses[item.color as keyof typeof extendedColorClasses] || extendedColorClasses.gray;
  
  return (
    <li>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              className={cn(
                "w-full",
                "flex items-center py-3 px-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative",
                collapsed ? "justify-start" : "justify-start", // Force left alignment
                active
                  ? finalColor.active
                  : cn(
                      "text-gray-700 bg-white/60 hover:bg-white/80 hover:shadow-md hover:scale-[1.02]",
                      finalColor.hover
                    )
              )}
              aria-current={active ? "page" : undefined}
            >
              {/* Indicateur visuel gauche pour l'état actif */}
              {!collapsed && (
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-300",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                )} />
              )}
              
              <item.icon 
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-all duration-300", 
                  collapsed ? "" : "mr-3",
                  active ? "stroke-[2.5px]" : "stroke-[2px]",
                  finalColor.icon
                )} 
              />
              
              {!collapsed && (
                <>
                  <span className="flex-1 font-medium tracking-wide text-left">
                    {item.label}
                  </span>
                  {item.badge && (
                    <Badge className="ml-auto bg-primary/20 text-primary hover:bg-primary/30">
                      {item.badge}
                    </Badge>
                  )}
                  {item.isNew && !item.badge && (
                    <Badge variant="outline" className="ml-auto text-xs border-primary/30 text-primary">
                      New
                    </Badge>
                  )}
                </>
              )}
              {collapsed && item.badge && (
                <Badge className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 w-4 h-4 p-0 flex items-center justify-center text-[10px]">
                  {item.badge}
                </Badge>
              )}

              {/* Effet lumineux pour l'élément actif */}
              {active && !collapsed && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-xl opacity-50" />
              )}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-semibold bg-white/95 backdrop-blur-sm border-gray-200/60">
              <p>{item.label}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </li>
  );
});

SidebarMenuItem.displayName = 'SidebarMenuItem';

export default SidebarMenuItem;
