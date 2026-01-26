
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
}

const SidebarMenuItem = memo(({ item, isActive, collapsed, onLinkClick }: SidebarMenuItemProps) => {
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
                active
                  ? "bg-primary/20 text-white"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon 
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  active ? "text-white" : "text-sidebar-foreground/70"
                )} 
              />
              
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">
                    {item.label}
                  </span>
                  {item.badge && (
                    <Badge className="ml-auto bg-primary/30 text-white text-[10px] px-1.5 py-0.5">
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
                <Badge className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 w-4 h-4 p-0 flex items-center justify-center text-[10px] bg-primary">
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
