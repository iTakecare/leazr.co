
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

interface NavbarUserProfileProps {
  user: any;
  avatarUrl: string | null;
  getUserInitials: () => string;
}

const NavbarUserProfile = ({ user, avatarUrl, getUserInitials }: NavbarUserProfileProps) => {
  return (
    <Link to="/settings?tab=profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
      <div className="text-sm font-medium">
        {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.email}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
        <AvatarFallback className="bg-primary/20 text-primary text-xs">
          {getUserInitials()}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
};

export default NavbarUserProfile;
