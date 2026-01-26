
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface NavbarUserProfileProps {
  user: any;
  avatarUrl: string | null;
  getUserInitials: () => string;
  darkMode?: boolean;
}

const NavbarUserProfile = ({ user, avatarUrl, getUserInitials, darkMode = false }: NavbarUserProfileProps) => {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "text-sm font-medium",
        darkMode ? "text-white" : "text-foreground"
      )}>
        {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.email}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
        <AvatarFallback className={cn(
          "text-xs",
          darkMode ? "bg-white/10 text-white" : "bg-primary/20 text-primary"
        )}>
          {getUserInitials()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

export default NavbarUserProfile;
