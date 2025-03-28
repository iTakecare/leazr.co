
import React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

interface SidebarUserSectionProps {
  collapsed: boolean;
  avatarUrl: string | null;
  getUserInitials: () => string;
  getUserDisplayName: () => string;
  getUserRole: () => string;
  handleLogout: () => void;
}

const SidebarUserSection = ({
  collapsed,
  avatarUrl,
  getUserInitials,
  getUserDisplayName,
  getUserRole,
  handleLogout
}: SidebarUserSectionProps) => {
  return (
    <div className={cn(
      "p-4 transition-all duration-300 mt-auto mx-2 mb-4 border-t border-t-primary/10 pt-4",
      collapsed ? "px-2" : ""
    )}>
      {!collapsed ? (
        <div className="space-y-4">
          <Link to="/settings?tab=profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Avatar>
              <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
              <AvatarFallback className="bg-primary/20 text-primary">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{getUserDisplayName()}</p>
              <p className="text-xs text-muted-foreground">{getUserRole()}</p>
            </div>
          </Link>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:shadow"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      ) : (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center gap-2">
                <Link to="/settings?tab=profile">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleLogout}
                  className="w-full h-10 flex justify-center text-destructive/80 hover:bg-destructive/10 hover:text-destructive rounded-xl"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Déconnexion</span>
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Profil et déconnexion</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default SidebarUserSection;
