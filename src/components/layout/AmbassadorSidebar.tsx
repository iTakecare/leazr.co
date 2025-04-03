
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart,
  Users,
  Calculator,
  Package,
  LogOut,
  Settings,
  Mail,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

const AmbassadorSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const ambassadorId = user?.ambassador_id;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
      console.error("Erreur de déconnexion:", error);
    }
  };

  const routes = [
    {
      title: "Tableau de bord",
      icon: BarChart,
      href: `/ambassador/dashboard`,
      active: pathname === "/ambassador/dashboard",
    },
    {
      title: "Clients",
      icon: Users,
      href: `/ambassador/clients`,
      active: pathname === "/ambassador/clients" || pathname.startsWith("/ambassador/clients/"),
    },
    {
      title: "Calculateur",
      icon: Calculator,
      href: `/ambassador/create-offer`,
      active: pathname === "/ambassador/create-offer",
    },
    {
      title: "Offres",
      icon: FileText,
      href: `/ambassador/offers`,
      active: pathname === "/ambassador/offers" || pathname.startsWith("/ambassador/offers/"),
    },
    {
      title: "Catalogue",
      icon: Package,
      href: `/ambassador/catalog`,
      active: pathname === "/ambassador/catalog",
    },
  ];

  return (
    <div className="fixed inset-y-0 left-0 z-20 hidden h-full w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/ambassador/dashboard" className="flex items-center gap-2 font-bold">
          <span className="text-primary">I Take Care</span>
          <span className="text-muted-foreground">Ambassadeur</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="grid gap-2">
          {routes.map((route, i) => (
            <Button
              key={i}
              variant={route.active ? "default" : "ghost"}
              className={cn(
                "justify-start gap-2",
                route.active && "bg-primary text-primary-foreground"
              )}
              onClick={() => navigate(route.href)}
            >
              <route.icon className="h-4 w-4" />
              {route.title}
            </Button>
          ))}
        </nav>
      </ScrollArea>
      <div className="flex flex-col gap-2 border-t p-4">
        <Button
          variant="outline"
          className="justify-start gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
};

export default AmbassadorSidebar;
