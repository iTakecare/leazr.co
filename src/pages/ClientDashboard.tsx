import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useClientData } from "@/hooks/useClientData";
import {
  CreditCard, Package, FileText, Clock, Settings, Eye,
  AlertCircle, Bell, ArrowRight, Plus, Headphones,
  CalendarClock, CheckCircle2, CircleDot, Circle,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";




const ClientDashboard = () => {
  const { user } = useAuth();
  const { clientData, recentActivity, clientStats, notifications, loading, error } = useClientData();
  const { navigateToClient } = useRoleNavigation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

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
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-36 rounded-2xl bg-muted" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-muted" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48 rounded-2xl bg-muted" />
            <div className="h-48 rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/5 rounded-2xl">
          <CardContent className="pt-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = clientData?.name || user?.first_name || user?.email?.split("@")[0] || "";

  const kpis = [
    { label: "Mensualité totale", value: `${clientStats.totalMonthly.toFixed(0)} €/mois`, icon: CreditCard, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400" },
    { label: "Équipements actifs", value: clientStats.activeEquipment.toString(), icon: Package, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400" },
    { label: "Demandes en attente", value: clientStats.pendingRequests.toString(), icon: Clock, color: "text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-400" },
    { label: "Prochain renouvellement", value: clientStats.nextRenewal ? formatDate(clientStats.nextRenewal) : "—", icon: CalendarClock, color: "text-violet-600 bg-violet-100 dark:bg-violet-900/40 dark:text-violet-400" },
  ];

  const shortcuts = [
    { title: "Mon Équipement", icon: Package, href: "equipment", color: "text-blue-600" },
    { title: "Mes Contrats", icon: FileText, href: "contracts", color: "text-emerald-600" },
    { title: "Catalogue", icon: Eye, href: "products", color: "text-violet-600" },
    { title: "Paramètres", icon: Settings, href: "settings", color: "text-muted-foreground" },
  ];

  // Build request timeline from pending offers
  const pendingOffers = recentActivity.filter(a => a.type === "offer" && a.status && ["pending", "sent", "approved"].includes(a.status));

  const statusBadge = (status?: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "⏳ En attente", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
      approved: { label: "✅ Approuvée", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
      rejected: { label: "❌ Refusée", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
      sent: { label: "📤 Envoyée", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
      active: { label: "🔥 Actif", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
      completed: { label: "✔️ Terminé", cls: "bg-muted text-muted-foreground" },
      contract_sent: { label: "📝 À signer", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
      equipment_ordered: { label: "📦 Commandé", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
    };
    const m = map[status || ""];
    if (!m) return null;
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${m.cls}`}>{m.label}</span>;
  };

  return (
    <motion.div
      className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Welcome Banner ── */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 p-6 md:p-8 text-white">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-violet-500/15 blur-xl" />
          <div className="absolute right-8 bottom-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-lg" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{getGreeting()}, {displayName} 👋</h1>
              <p className="mt-1 text-white/70 text-sm md:text-base">
                Bienvenue dans l'espace de gestion de vos contrats
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                size="sm"
                className="gap-2 rounded-xl bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                onClick={() => navigateToClient("catalog")}
              >
                <Plus className="h-4 w-4" /> Nouvelle demande
              </Button>
              <Button
                size="sm"
                className="gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm"
                onClick={() => navigateToClient("support")}
              >
                <Headphones className="h-4 w-4" /> Support
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── KPIs ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-xl font-semibold mt-0.5 truncate">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ── Bento: Notifications + Shortcuts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Notifications */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="border-0 shadow-sm rounded-2xl h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Bell className="h-4 w-4 text-orange-500" />
                Notifications
                {notifications.length > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px] h-5 px-1.5 rounded-full">
                    {notifications.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length > 0 ? notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() => n.actionHref && navigateToClient(n.actionHref)}
                >
                  <div className={`mt-0.5 shrink-0 h-2 w-2 rounded-full ${n.type === "action" ? "bg-orange-500" : n.type === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.description}</p>
                  </div>
                  {n.actionLabel && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucune notification</p>
                  <p className="text-xs mt-1">Tout est à jour !</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Shortcuts */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-sm rounded-2xl h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Accès rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {shortcuts.map((s) => (
                  <button
                    key={s.href}
                    onClick={() => navigateToClient(s.href)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <s.icon className={`h-6 w-6 ${s.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-xs font-medium text-center">{s.title}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Detailed Workflow Stepper ── */}
      {pendingOffers.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Suivi détaillé de vos demandes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {pendingOffers.slice(0, 3).map((offer) => {
                const currentIdx = getStepIndex(offer.workflow_status, offer.status);
                return (
                  <div key={offer.id} className="p-4 rounded-xl bg-muted/40">
                    <p className="text-sm font-medium mb-4 truncate">{offer.description}</p>
                    <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
                      {WORKFLOW_STEPS.map((step, i) => {
                        const isDone = i < currentIdx;
                        const isActive = i === currentIdx;
                        const isUpcoming = i > currentIdx;
                        return (
                          <React.Fragment key={step.key}>
                            <div className="flex flex-col items-center gap-1.5 min-w-[60px] flex-shrink-0">
                              {isDone ? (
                                <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                </div>
                              ) : isActive ? (
                                <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                                  <CircleDot className="h-4 w-4 text-white" />
                                </div>
                              ) : (
                                <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                                  <Circle className="h-3 w-3 text-muted-foreground/30" />
                                </div>
                              )}
                              <span className={`text-[9px] leading-tight text-center ${isUpcoming ? "text-muted-foreground/40" : isDone ? "text-emerald-600 font-medium" : "text-blue-600 font-semibold"}`}>
                                {step.label}
                              </span>
                            </div>
                            {i < WORKFLOW_STEPS.length - 1 && (
                              <div className={`h-0.5 flex-1 min-w-[12px] rounded-full -mt-5 ${isDone ? "bg-emerald-400" : "bg-muted-foreground/15"}`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Recent Activity ── */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="relative space-y-0">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                {recentActivity.map((activity) => {
                  const Icon = activity.type === "offer" ? Clock : FileText;
                  return (
                    <div
                      key={activity.id}
                      className="relative flex items-start gap-4 py-3 pl-2 cursor-pointer hover:bg-muted/40 rounded-lg transition-colors -mx-2 px-2"
                      onClick={() => navigateToClient(activity.type === "offer" ? "requests" : "contracts")}
                    >
                      <div className="relative z-10 shrink-0 h-8 w-8 rounded-full bg-card border-2 border-border flex items-center justify-center">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{activity.title}</p>
                          {statusBadge(activity.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{activity.description}</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">{formatDate(activity.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Vous n'avez pas encore d'activité</p>
                <p className="text-xs mt-1">Vos contrats et demandes apparaîtront ici.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ClientDashboard;
