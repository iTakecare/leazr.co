
import React from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
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
}

const SidebarMenuItem = ({ item, isActive, collapsed }: SidebarMenuItemProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            className={cn(
              "flex items-center py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
              collapsed ? "justify-center px-2" : "px-3",
              isActive(item.href)
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-y-[-2px]" 
                : "hover:bg-primary/10 hover:text-primary hover:translate-y-[-2px]"
            )}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <item.icon 
              className={cn(
                "h-5 w-5 flex-shrink-0", 
                collapsed ? "" : "mr-3",
                isActive(item.href) && "stroke-[2.5px]"
              )} 
            />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="font-medium">
            <p>{item.label}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default SidebarMenuItem;
