import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useClientData } from "@/hooks/useClientData";
import {
  CreditCard, Package, FileText, Clock, Settings, Eye,
  AlertCircle, Bell, ChevronRight, Plus, Headphones, CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import MiniWorkflowStepper from "@/components/client/MiniWorkflowStepper";
import DocumentAlertBanner from "@/components/client/DocumentAlertBanner";
import {
  ClientPage, ClientCard, KpiCard, clientColors, badgeStyle,
} from "@/components/client/clientUi";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { clientData, recentActivity, clientStats, notifications, loading, error } = useClientData();
  const { navigateToClient } = useRoleNavigation();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), "dd MMM yyyy", { locale: fr }); }
    catch { return "—"; }
  };

  if (loading) {
    return (
      <ClientPage>
        <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ height: 130, borderRadius: 20, background: "#E6E9EF" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 110, borderRadius: 16, background: "#E6E9EF" }} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
            <div style={{ height: 200, borderRadius: 16, background: "#E6E9EF" }} />
            <div style={{ height: 200, borderRadius: 16, background: "#E6E9EF" }} />
          </div>
        </div>
      </ClientPage>
    );
  }

  if (error) {
    return (
      <ClientPage>
        <ClientCard pad={20} style={{ border: "1px solid #F5C2C2", background: "#FEF2F2", display: "flex", alignItems: "center", gap: 12, color: "#B91C1C" }}>
          <AlertCircle size={20} />
          <p style={{ fontSize: 13, margin: 0 }}>{error}</p>
        </ClientCard>
      </ClientPage>
    );
  }

  const displayName = clientData?.name || user?.first_name || user?.email?.split("@")[0] || "";
  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  const urgent = notifications.filter((n) => n.urgent);
  const headline = urgent.length > 0
    ? urgent[0].title
    : clientStats.pendingRequests > 0
      ? `${clientStats.pendingRequests} demande${clientStats.pendingRequests > 1 ? "s" : ""} en cours de traitement.`
      : "Votre parc est à jour.";

  const kpis = [
    { label: "Mensualité totale", value: <>{clientStats.totalMonthly.toFixed(0)} €<span style={{ fontSize: 13, fontWeight: 600, color: clientColors.faint }}>/mois</span></>, icon: <CreditCard size={19} color={clientColors.indigo} />, iconBg: "#EAF0FF" },
    { label: "Équipements actifs", value: clientStats.activeEquipment, icon: <Package size={19} color={clientColors.emerald} />, iconBg: "#E7F6F0" },
    { label: "Demandes en cours", value: clientStats.pendingRequests, icon: <Clock size={19} color={clientColors.orange} />, iconBg: "#FFF0E6" },
    { label: "Prochain renouvellement", value: clientStats.nextRenewal ? formatDate(clientStats.nextRenewal) : "—", icon: <CalendarClock size={19} color={clientColors.violet} />, iconBg: "#F2EBFE" },
  ];

  const shortcuts = [
    { title: "Mon équipement", icon: Package, href: "equipment", color: clientColors.indigo, hover: "#F5F8FF", border: clientColors.indigo },
    { title: "Voir mes contrats", icon: FileText, href: "contracts", color: clientColors.emerald, hover: "#F2FBF7", border: clientColors.emerald },
    { title: "Parcourir le catalogue", icon: Eye, href: "products", color: clientColors.violet, hover: "#F8F5FF", border: clientColors.violet },
    { title: "Contacter le support", icon: Headphones, href: "support", color: clientColors.pink, hover: "#FEF4F9", border: clientColors.pink },
  ];

  const pendingOffers = recentActivity.filter((a) => a.type === "offer" && a.status && ["pending", "sent", "approved"].includes(a.status));

  const statusBadge = (status?: string) => {
    const map: Record<string, { label: string; bg: string; fg: string }> = {
      pending: { label: "En attente", bg: "#FFF0E6", fg: "#C2540B" },
      approved: { label: "Approuvée", bg: "#E7F6F0", fg: "#047857" },
      rejected: { label: "Refusée", bg: "#FEEFEF", fg: "#B91C1C" },
      sent: { label: "Envoyée", bg: "#EAF0FF", fg: "#1D4ED8" },
      active: { label: "Actif", bg: "#E7F6F0", fg: "#047857" },
      completed: { label: "Terminé", bg: "#EEF0F4", fg: "#667085" },
      contract_sent: { label: "À signer", bg: "#FEF3C7", fg: "#B45309" },
      equipment_ordered: { label: "Commandé", bg: "#E8EBFD", fg: "#4338CA" },
    };
    const m = map[status || ""];
    if (!m) return null;
    return <span style={badgeStyle(m.bg, m.fg)}>{m.label}</span>;
  };

  const activityTone = (type: string, status?: string) => {
    if (type === "offer") return status === "approved" ? clientColors.emerald : clientColors.orange;
    return clientColors.indigo;
  };

  return (
    <ClientPage>
      {/* ── Welcome banner ── */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          background: "linear-gradient(125deg,#16243F 0%,#101B30 45%,#1A2C5C 100%)",
          padding: "30px 32px",
          color: "#fff",
          marginBottom: 22,
        }}
      >
        <div style={{ position: "absolute", right: -40, top: -50, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(61,107,255,.45),transparent 70%)", filter: "blur(8px)" }} />
        <div style={{ position: "absolute", right: 120, bottom: -60, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,.32),transparent 70%)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: 500, marginBottom: 6, textTransform: "capitalize" }}>
              {getGreeting()} {displayName} 👋 · {today}
            </div>
            <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.15 }}>
              {headline}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => navigateToClient("products")}
              style={{ display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px", border: 0, borderRadius: 12, background: "#fff", color: "#16243F", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
            >
              <Plus size={16} /> Nouvelle demande
            </button>
            <button
              onClick={() => navigateToClient("support")}
              style={{ display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px", border: "1px solid rgba(255,255,255,.22)", borderRadius: 12, background: "rgba(255,255,255,.08)", color: "#fff", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
            >
              <Headphones size={16} /> Support
            </button>
          </div>
        </div>
      </div>

      {/* ── Document alert banners ── */}
      {urgent.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <DocumentAlertBanner alerts={urgent} onNavigate={navigateToClient} />
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 22 }} className="max-md:!grid-cols-2">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} iconBg={kpi.iconBg} value={kpi.value} label={kpi.label} />
        ))}
      </div>

      {/* ── Bento: notifications + shortcuts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, marginBottom: 22 }} className="max-lg:!grid-cols-1">
        {/* Notifications */}
        <ClientCard style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 18px 12px" }}>
            <Bell size={17} color={clientColors.orange} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Notifications</span>
            {notifications.length > 0 && (
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#fff", background: clientColors.orange, padding: "2px 8px", borderRadius: 20 }}>
                {notifications.length}
              </span>
            )}
          </div>
          <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            {notifications.length > 0 ? notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => n.actionHref && navigateToClient(n.actionHref)}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 12px", border: 0, background: "transparent", borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%" }}
              >
                <span style={{ marginTop: 5, width: 8, height: 8, borderRadius: "50%", flex: "none", background: n.type === "action" ? clientColors.orange : n.type === "warning" ? "#D97706" : clientColors.indigo }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#1A2233" }}>{n.title}</span>
                  <span style={{ display: "block", fontSize: 12.5, color: clientColors.muted, marginTop: 1 }}>{n.description}</span>
                </span>
                {n.actionLabel && <ChevronRight size={15} color="#C2C9D6" style={{ marginTop: 3, flex: "none" }} />}
              </button>
            )) : (
              <div style={{ textAlign: "center", padding: "32px 12px", color: clientColors.faint }}>
                <AlertCircle size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p style={{ fontSize: 13, margin: 0 }}>Aucune notification</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Tout est à jour !</p>
              </div>
            )}
          </div>
        </ClientCard>

        {/* Shortcuts */}
        <ClientCard pad="16px 18px">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Accès rapides</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {shortcuts.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.href}
                  onClick={() => navigateToClient(s.href)}
                  style={{ display: "flex", flexDirection: "column", gap: 9, padding: 15, border: "1px solid #EEF0F4", background: "#FAFBFC", borderRadius: 13, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.background = s.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#EEF0F4"; e.currentTarget.style.background = "#FAFBFC"; }}
                >
                  <Icon size={20} color={s.color} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1A2233" }}>{s.title}</span>
                </button>
              );
            })}
          </div>
        </ClientCard>
      </div>

      {/* ── Detailed workflow stepper ── */}
      {pendingOffers.length > 0 && (
        <ClientCard pad={18} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Suivi détaillé de vos demandes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {pendingOffers.slice(0, 3).map((offer) => (
              <div key={offer.id} style={{ padding: 16, borderRadius: 12, background: "#FAFBFC", border: "1px solid #EEF0F4" }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, margin: "0 0 14px" }}>{offer.description}</p>
                <MiniWorkflowStepper
                  currentStatus={offer.workflow_status || offer.status || "draft"}
                  offerType={offer.offer_type}
                  workflowTemplateId={offer.workflow_template_id}
                  companyId={offer.company_id}
                />
              </div>
            ))}
          </div>
        </ClientCard>
      )}

      {/* ── Recent activity ── */}
      <ClientCard pad={18}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Activité récente</div>
        {recentActivity.length > 0 ? (
          <div style={{ position: "relative", paddingLeft: 6 }}>
            <div style={{ position: "absolute", left: 21, top: 14, bottom: 14, width: 2, background: "#EEF0F4" }} />
            {recentActivity.map((activity) => {
              const Icon = activity.type === "offer" ? Clock : FileText;
              return (
                <div
                  key={activity.id}
                  onClick={() => navigateToClient(activity.type === "offer" ? "requests" : "contracts")}
                  style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 14, padding: "11px 4px", cursor: "pointer", borderRadius: 8 }}
                >
                  <div style={{ position: "relative", zIndex: 1, width: 32, height: 32, borderRadius: "50%", background: "#fff", border: "2px solid #EAECF1", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: activityTone(activity.type, activity.status) }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1A2233" }}>{activity.title}</span>
                      {statusBadge(activity.status)}
                    </div>
                    <div style={{ fontSize: 12.5, color: clientColors.muted, marginTop: 2 }}>{activity.description}</div>
                    <div style={{ fontSize: 11.5, color: "#9AA4B4", marginTop: 3 }}>{formatDate(activity.date)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 12px", color: clientColors.faint }}>
            <Package size={40} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Vous n'avez pas encore d'activité</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Vos contrats et demandes apparaîtront ici.</p>
          </div>
        )}
      </ClientCard>
    </ClientPage>
  );
};

export default ClientDashboard;
