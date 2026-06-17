import React, { useState, memo, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLocation, useNavigate } from "react-router-dom";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { useClientRequestsCount } from "@/hooks/useClientRequests";
import { useTicketReplyNotifications } from "@/hooks/useTicketReplyNotifications";
import { useClientData } from "@/hooks/useClientData";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileText,
  Laptop,
  Clock,
  Package,
  Download,
  Menu,
  X,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  onLinkClick?: () => void;
}

type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
};

type NavGroup = { title: string; items: NavItem[] };

const NAV = "#0E1A30";

const ClientSidebar = memo(({ onLinkClick }: SidebarProps) => {
  const { user, logout } = useAuth();
  const { companyId } = useMultiTenant();
  const { settings } = useSiteSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const { navigateToClient, companySlug } = useRoleNavigation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { count: requestsCount } = useClientRequestsCount();
  const { clientData } = useClientData();
  const { unreadCount: supportUnreadCount } = useTicketReplyNotifications({
    role: "client",
    clientId: clientData?.id,
  });

  const groups: NavGroup[] = useMemo(
    () => [
      {
        title: "Pilotage",
        items: [
          { icon: LayoutDashboard, label: "Tableau de bord", href: "dashboard" },
          { icon: FileText, label: "Contrats", href: "contracts" },
          { icon: Laptop, label: "Équipements", href: "equipment" },
        ],
      },
      {
        title: "Demandes",
        items: [
          { icon: Package, label: "Catalogue", href: "products" },
          { icon: Download, label: "Logiciels", href: "software" },
          {
            icon: Clock,
            label: "Mes demandes",
            href: "requests",
            badge: requestsCount > 0 ? String(requestsCount) : undefined,
          },
        ],
      },
      {
        title: "Assistance",
        items: [
          {
            icon: HelpCircle,
            label: "Support",
            href: "support",
            badge: supportUnreadCount > 0 ? String(supportUnreadCount) : undefined,
          },
          { icon: Settings, label: "Paramètres", href: "settings" },
        ],
      },
    ],
    [requestsCount, supportUnreadCount]
  );

  const isActive = useCallback(
    (href: string) => {
      if (!companySlug) return false;
      const base = `/${companySlug}/client/${href}`;
      return location.pathname === base || location.pathname.startsWith(base + "/");
    },
    [location.pathname, companySlug]
  );

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  const handleNavigation = useCallback(
    (href: string) => {
      navigateToClient(href);
      onLinkClick?.();
      closeMobile();
    },
    [navigateToClient, onLinkClick, closeMobile]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success("Déconnexion réussie");
      navigate("/login");
    } catch {
      toast.error("Erreur lors de la déconnexion");
    }
  }, [logout, navigate]);

  const companyName = settings?.company_name || "Leazr";

  const userInitials = useMemo(() => {
    if (user?.first_name && user?.last_name)
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    return user?.email?.[0]?.toUpperCase() || "U";
  }, [user]);

  const userName = useMemo(() => {
    if (user?.first_name || user?.last_name)
      return [user?.first_name, user?.last_name].filter(Boolean).join(" ");
    return user?.email || "";
  }, [user]);

  if (!user || !companyId) return null;

  const Content = (
    <aside
      style={{
        width: 256,
        flex: "none",
        height: "100%",
        background: NAV,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,.06)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 18px 18px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(140deg,#3D6BFF,#2D55E5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(45,85,229,.45)",
              flex: "none",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h11M4 18h7" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em", color: "#fff", lineHeight: 1.1 }}>
              {companyName.toLowerCase()}
            </div>
            <div style={{ fontSize: 11, color: "#7E8CA6", fontWeight: 500, marginTop: 1 }}>
              Espace client{clientData?.name ? ` · ${clientData.name}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="lzr-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>
        {groups.map((group) => (
          <React.Fragment key={group.title}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: ".09em",
                textTransform: "uppercase",
                color: "#5B687F",
                padding: "6px 10px 8px",
              }}
            >
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "9px 11px",
                    border: 0,
                    borderRadius: 10,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13.5,
                    fontWeight: 600,
                    marginBottom: 3,
                    textAlign: "left",
                    transition: "background .14s, color .14s",
                    background: active
                      ? "linear-gradient(100deg,rgba(61,107,255,.22),rgba(45,85,229,.12))"
                      : "transparent",
                    color: active ? "#FFFFFF" : "#9AA7BD",
                    boxShadow: active ? "inset 0 0 0 1px rgba(91,130,255,.25)" : "none",
                  }}
                >
                  <Icon size={18} style={{ flex: "none" }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        minWidth: 18,
                        height: 18,
                        padding: "0 6px",
                        borderRadius: 20,
                        background: "#EA580C",
                        color: "#fff",
                        fontSize: 10.5,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,.07)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "9px 10px",
            borderRadius: 12,
            background: "rgba(255,255,255,.04)",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(140deg,#7C3AED,#2D55E5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              flex: "none",
            }}
          >
            {userInitials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#EAEFF7",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {userName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#7E8CA6",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {(user as any)?.role === "client" ? "Client" : user?.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 0,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flex: "none",
            }}
          >
            <LogOut size={16} color="#7E8CA6" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen((v) => !v)}
        className="lg:hidden"
        style={{
          position: "fixed",
          top: 14,
          left: 14,
          zIndex: 50,
          width: 42,
          height: 42,
          borderRadius: 12,
          background: "rgba(255,255,255,.95)",
          backdropFilter: "blur(6px)",
          border: "1px solid #E6E9EF",
          boxShadow: "0 4px 12px rgba(16,24,40,.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isMobileOpen ? <X size={20} color="#334155" /> : <Menu size={20} color="#334155" />}
      </button>

      {/* Desktop */}
      <div className="hidden lg:flex">{Content}</div>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="lg:hidden" style={{ position: "fixed", inset: 0, zIndex: 40 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)", backdropFilter: "blur(2px)" }}
            onClick={closeMobile}
          />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0 }}>{Content}</div>
        </div>
      )}
    </>
  );
});

ClientSidebar.displayName = "ClientSidebar";

export default ClientSidebar;
