
import React, { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
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
    
    navigate(item.href);
  }, [navigate, item.href, onLinkClick]);

  const active = isActive(item.href);
  
  return (
    <li key={item.href}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={item.href}
              onClick={handleClick}
              className={cn(
                "flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                collapsed ? "justify-center px-2" : "px-3",
                active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-y-[-2px]" 
                  : "hover:bg-primary/10 hover:text-primary hover:translate-y-[-2px]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 flex-shrink-0", 
                  collapsed ? "" : "mr-3",
                  active && "stroke-[2.5px]"
                )} 
              />
              {!collapsed && <span>{item.label}</span>}
            </a>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium">
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
