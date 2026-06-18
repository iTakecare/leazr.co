import React, { useState, memo, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useSiteSettingsByCompanyId } from "@/hooks/useSiteSettings";
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
  Receipt,
  LogOut,
  ChevronLeft,
  ChevronRight,
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
const COLLAPSE_KEY = "leazr_client_sidebar_collapsed";

const ClientSidebar = memo(({ onLinkClick }: SidebarProps) => {
  const { user, logout } = useAuth();
  const { companyId } = useMultiTenant();
  const { settings } = useSiteSettingsByCompanyId(companyId);
  const location = useLocation();
  const navigate = useNavigate();
  const { navigateToClient, companySlug } = useRoleNavigation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });
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
          { icon: Receipt, label: "Factures", href: "invoices" },
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

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((v) => {
      const nv = !v;
      try { localStorage.setItem(COLLAPSE_KEY, nv ? "1" : "0"); } catch { /* */ }
      return nv;
    });
  }, []);

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
  // Tuile carrée : on privilégie la favicon (icône carrée), sinon le logo.
  const tileImg = settings?.favicon_url || settings?.logo_url || null;

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

  // Pastille logo de la société (vrai logo si dispo, sinon tuile dégradée).
  const LogoTile = (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: tileImg ? "#fff" : "linear-gradient(140deg,#3D6BFF,#2D55E5)",
        boxShadow: "0 6px 16px rgba(45,85,229,.35)",
      }}
    >
      {tileImg ? (
        <img
          src={tileImg}
          alt={companyName}
          style={{ width: "100%", height: "100%", objectFit: "contain", padding: 3 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 16, lineHeight: 1 }}>
          {companyName?.[0]?.toUpperCase() || "L"}
        </span>
      )}
    </div>
  );

  const Content = (
    <aside
      style={{
        width: isCollapsed ? 76 : 256,
        flex: "none",
        height: "100%",
        background: NAV,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,.06)",
        transition: "width .2s ease",
      }}
    >
      {/* Header */}
      <div style={{ padding: isCollapsed ? "18px 0" : "20px 18px 18px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, justifyContent: isCollapsed ? "center" : "flex-start" }}>
          {LogoTile}
          {!isCollapsed && (
            <>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em", color: "#fff", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {companyName}
                </div>
                <div style={{ fontSize: 11, color: "#7E8CA6", fontWeight: 500, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Espace client{clientData?.name ? ` · ${clientData.name}` : ""}
                </div>
              </div>
              <button
                onClick={toggleCollapsed}
                title="Réduire le menu"
                className="hidden lg:flex"
                style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}
              >
                <ChevronLeft size={15} color="#9AA7BD" />
              </button>
            </>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={toggleCollapsed}
            title="Agrandir le menu"
            className="hidden lg:flex"
            style={{ width: 30, height: 26, margin: "12px auto 0", borderRadius: 7, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <ChevronRight size={15} color="#9AA7BD" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="lzr-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: isCollapsed ? "12px 10px" : "14px 12px" }}>
        {groups.map((group) => (
          <React.Fragment key={group.title}>
            {isCollapsed ? (
              <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "10px 6px" }} />
            ) : (
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "#5B687F", padding: "6px 10px 8px" }}>
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  title={isCollapsed ? item.label : undefined}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: isCollapsed ? 0 : 12,
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    width: "100%",
                    padding: isCollapsed ? "10px 0" : "9px 11px",
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
                  {!isCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  {item.badge && (
                    <span
                      style={{
                        ...(isCollapsed
                          ? { position: "absolute" as const, top: 4, right: 10, minWidth: 16, height: 16, padding: "0 4px" }
                          : { minWidth: 18, height: 18, padding: "0 6px" }),
                        borderRadius: 20,
                        background: "#EA580C",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: isCollapsed ? `2px solid ${NAV}` : "0",
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
      <div style={{ padding: isCollapsed ? "10px 8px" : 12, borderTop: "1px solid rgba(255,255,255,.07)" }}>
        <div
          style={{
            display: "flex",
            flexDirection: isCollapsed ? "column" : "row",
            alignItems: "center",
            gap: isCollapsed ? 8 : 11,
            padding: isCollapsed ? "8px 0" : "9px 10px",
            borderRadius: 12,
            background: "rgba(255,255,255,.04)",
          }}
        >
          <div
            title={isCollapsed ? userName : undefined}
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
          {!isCollapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#EAEFF7", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {userName}
              </div>
              <div style={{ fontSize: 11, color: "#7E8CA6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {(user as any)?.role === "client" ? "Client" : user?.email}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            style={{ width: 30, height: 30, borderRadius: 8, border: 0, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}
          >
            <LogOut size={16} color="#7E8CA6" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile toggle — flex/centrage via classes (PAS en inline, sinon
          le display écrase le lg:hidden et le bouton reste visible sur desktop). */}
      <button
        onClick={() => setIsMobileOpen((v) => !v)}
        className="lg:hidden flex items-center justify-center"
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
