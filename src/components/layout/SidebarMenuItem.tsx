
import React, { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
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
    color?: string;
    badge?: string;
    isNew?: boolean;
  };
  isActive: (href: string) => boolean;
  collapsed: boolean;
  onLinkClick?: (href?: string) => void;
  variant?: "dark" | "light";
}

const SidebarMenuItem = memo(({ item, isActive, collapsed, onLinkClick, variant = "dark" }: SidebarMenuItemProps) => {
  const navigate = useNavigate();
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (item.href.startsWith('/')) {
      navigate(item.href);
    } else if (onLinkClick) {
      onLinkClick(item.href);
    }
  }, [navigate, onLinkClick, item.href]);

  const active = isActive(item.href);

  const colors = variant === "light" ? {
    button: active
      ? "bg-primary/10 text-primary"
      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
    icon: active ? "text-primary" : "text-gray-500",
    badge: "bg-primary/10 text-primary",
    badgeCollapsed: "bg-primary",
  } : {
    button: active
      ? "bg-primary/20 text-white"
      : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white",
    icon: active ? "text-white" : "text-sidebar-foreground/70",
    badge: "bg-primary/30 text-white",
    badgeCollapsed: "bg-primary",
  };
  
  return (
    <li>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                collapsed ? "justify-center" : "justify-start",
                colors.button
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon 
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  colors.icon
                )} 
              />
              
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">
                    {item.label}
                  </span>
                  {item.badge && (
                    <Badge className={cn("ml-auto text-[10px] px-1.5 py-0.5", colors.badge)}>
                      {item.badge}
                    </Badge>
                  )}
                  {item.isNew && !item.badge && (
                    <Badge variant="outline" className="ml-auto text-[10px] border-primary/30 text-primary">
                      New
                    </Badge>
                  )}
                </>
              )}
              {collapsed && item.badge && (
                <Badge className={cn("absolute top-0 right-0 transform translate-x-1 -translate-y-1 w-4 h-4 p-0 flex items-center justify-center text-[10px]", colors.badgeCollapsed)}>
                  {item.badge}
                </Badge>
              )}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium bg-popover border-border">
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
