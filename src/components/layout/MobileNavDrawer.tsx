
import React from "react";
import { 
  Drawer, 
  DrawerTrigger, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerFooter 
} from "@/components/ui/drawer";
import { X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "./Logo";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface MobileNavDrawerProps {
  items: NavItem[];
  userAvatar?: string;
  userName?: string;
  userInitials?: string;
  onLogout?: () => void;
}

const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  items,
  userAvatar,
  userName,
  userInitials = "U",
  onLogout
}) => {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const isActive = (href: string) => location.pathname === href;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="md:hidden fixed top-4 left-4 z-50 rounded-full shadow-sm"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[85%] rounded-t-xl">
        <div className="flex flex-col h-full">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="px-4 py-2 flex-1 overflow-auto">
            <nav className="flex flex-col gap-1 py-2">
              {items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {userName && (
            <DrawerFooter className="border-t">
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-medium">{userName}</div>
                </div>
                {onLogout && (
                  <Button variant="ghost" size="sm" onClick={onLogout}>
                    Déconnexion
                  </Button>
                )}
              </div>
            </DrawerFooter>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileNavDrawer;
