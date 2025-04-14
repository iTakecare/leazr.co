
import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const MobileHeader: React.FC = () => {
  const { user } = useAuth();

  const getUserInitials = () => {
    if (!user) return "IT";
    
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "IT";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm h-16 flex items-center justify-between px-4">
      <Button variant="ghost" size="icon">
        <Menu className="h-6 w-6" />
      </Button>
      
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src="" alt="User avatar" />
          <AvatarFallback>{getUserInitials()}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default MobileHeader;
