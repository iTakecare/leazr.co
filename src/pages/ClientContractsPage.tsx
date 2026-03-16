import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, AlertCircle, RefreshCw, Calendar, Rocket, PartyPopper, Clock, CheckCircle2, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useClientContracts } from "@/hooks/useClientContracts";
import { useClientData } from "@/hooks/useClientData";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { motion } from "framer-motion";
import { differenceInMonths, parseISO, format, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import RenewalRequestModal from "@/components/client/RenewalRequestModal";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const ClientContractsPage = () => {
  const { user } = useAuth();
  const { navigateToClient } = useRoleNavigation();
  const { clientData } = useClientData();
  const { contracts, loading, error } = useClientContracts(user?.email, clientData?.id);
  const [renewalContract, setRenewalContract] = useState<any>(null);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatEquipmentDescription = (description?: string) => {
    if (!description) return 'Équipement non spécifié';
    try {
      const equipmentData = JSON.parse(description);
      if (Array.isArray(equipmentData) && equipmentData.length > 0) {
        const titles = equipmentData.map(item => item.title).filter(Boolean);
        if (titles.length > 0) {
          return titles.length > 1
            ? `${titles[0]} et ${titles.length - 1} autre(s) équipement(s)`
            : titles[0];
        }
      }
    } catch {
      return description;
    }
    return description;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-full">Actif</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="rounded-full">Terminé</Badge>;
      case 'contract_sent':
        return <Badge className="bg-blue-100 text-blue-700 border-0 rounded-full">Contrat envoyé</Badge>;
      case 'contract_signed':
        return <Badge className="bg-violet-100 text-violet-700 border-0 rounded-full">✍️ Signé</Badge>;
      case 'signed':
        return <Badge className="bg-violet-100 text-violet-700 border-0 rounded-full">✍️ Signé</Badge>;
      case 'equipment_ordered':
        return <Badge className="bg-violet-100 text-violet-700 border-0 rounded-full">Équipement commandé</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-0 rounded-full">En attente</Badge>;
      default:
        return <Badge variant="secondary" className="rounded-full">{status}</Badge>;
    }
  };

  const getContractTimeline = (contract: any) => {
    const startDate = contract.contract_start_date ? parseISO(contract.contract_start_date) : null;
    const duration = contract.contract_duration || 36;

    // For signed contracts without start date, use created_at as reference
    const effectiveStart = startDate || parseISO(contract.created_at);
    const now = new Date();
    const monthsElapsed = differenceInMonths(now, effectiveStart);
    const monthsRemaining = Math.max(0, duration - monthsElapsed);
    const progress = Math.min(100, Math.max(0, Math.round((monthsElapsed / duration) * 100)));
    const canRenew = monthsElapsed >= 18;
    const endDate = addMonths(effectiveStart, duration);

    return { monthsElapsed, monthsRemaining, progress, duration, canRenew, startDate: effectiveStart, endDate };
  };

  // Milestones on the timeline
  const getMilestones = (duration: number) => [
    { at: 0, emoji: "🚀", label: "Début" },
    { at: Math.round(duration * 0.25), emoji: "📦", label: `${Math.round(duration * 0.25)} mois` },
    { at: 18, emoji: "🔄", label: "Renouvellement possible" },
    { at: Math.round(duration * 0.75), emoji: "⏳", label: `${Math.round(duration * 0.75)} mois` },
    { at: duration, emoji: "🎉", label: "Fin" },
  ];

  const showTimeline = (status: string) =>
    ['active', 'signed', 'contract_signed', 'equipment_ordered'].includes(status);

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-2xl w-1/3" />
          <div className="h-4 bg-muted rounded-2xl w-1/2" />
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-48 bg-muted rounded-2xl" />)}
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
            <p className="text-sm">Erreur lors du chargement des contrats : {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight">Mes Contrats</h1>
        <p className="text-muted-foreground">
          Consultez et gérez vos contrats de financement
        </p>
      </motion.div>

      <div className="grid gap-4">
        {contracts.map((contract) => {
          const timeline = getContractTimeline(contract);
          const milestones = getMilestones(timeline.duration);
          return (
            <motion.div key={contract.id} variants={itemVariants}>
              <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {[contract.leaser_name, contract.contract_number].filter(Boolean).join(' - ') || 'Contrat'}
                        </CardTitle>
                        <CardDescription>
                          {contract.contract_number ? `N° ${contract.contract_number} · ` : ""}
                          Créé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(contract.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">Mensualité</p>
                      <p className="text-lg font-semibold">{formatAmount(contract.monthly_payment)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">Bailleur</p>
                      <p className="text-sm font-medium">{contract.leaser_name || 'Non spécifié'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">Statut livraison</p>
                      <p className="text-sm font-medium">
                        {contract.delivery_status 
                          ? ({ en_attente: 'En attente', expedie: 'Expédié', livre: 'Livré', delivered: 'Livré' }[contract.delivery_status] || contract.delivery_status)
                          : (contract.status === 'active' ? 'Livré' : 'En attente')}
                      </p>
                    </div>
                    <div className="flex items-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-xl"
                        onClick={() => navigateToClient(`contracts/${contract.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        Voir
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  </div>

                  {/* 🎯 Fun Contract Timeline */}
                  {timeline && showTimeline(contract.status) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      className="relative p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-violet-50 to-pink-50 dark:from-blue-950/30 dark:via-violet-950/30 dark:to-pink-950/30 border border-blue-100/60 dark:border-blue-800/30 space-y-4"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                          >
                            <Rocket className="h-5 w-5 text-violet-500" />
                          </motion.div>
                          <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                            Votre parcours contrat
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/50">
                          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-bold text-foreground">
                            {timeline.monthsRemaining} mois restant{timeline.monthsRemaining > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Timeline track */}
                      <div className="relative pt-6 pb-2">
                        {/* Milestone markers */}
                        <div className="absolute top-0 left-0 right-0 flex justify-between px-1">
                          {milestones.map((m, i) => {
                            const pos = (m.at / timeline.duration) * 100;
                            const isPast = timeline.monthsElapsed >= m.at;
                            const isCurrent = Math.abs(timeline.monthsElapsed - m.at) <= 1;
                            return (
                              <motion.div
                                key={i}
                                className="flex flex-col items-center"
                                style={{ position: 'absolute', left: `${pos}%`, transform: 'translateX(-50%)' }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 200 }}
                              >
                                <motion.span
                                  className="text-lg"
                                  animate={isCurrent ? { scale: [1, 1.3, 1] } : {}}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                  {m.emoji}
                                </motion.span>
                              </motion.div>
                            );
                          })}
                        </div>

                        {/* Track background */}
                        <div className="h-3 bg-white/60 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 relative"
                            initial={{ width: 0 }}
                            animate={{ width: `${timeline.progress}%` }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                          >
                            {/* Shine effect */}
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 3 }}
                            />
                          </motion.div>
                        </div>

                        {/* Current position indicator */}
                        <motion.div
                          className="absolute top-[18px]"
                          style={{ left: `${timeline.progress}%`, transform: 'translateX(-50%)' }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1, type: "spring" }}
                        >
                          <motion.div
                            className="w-5 h-5 rounded-full bg-white border-[3px] border-violet-500 shadow-lg shadow-violet-500/30"
                            animate={{ boxShadow: ['0 0 0 0 rgba(139,92,246,0.3)', '0 0 0 8px rgba(139,92,246,0)', '0 0 0 0 rgba(139,92,246,0.3)'] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          />
                        </motion.div>

                        {/* Date labels */}
                        <div className="flex justify-between mt-3 px-0.5">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {format(timeline.startDate, "MMM yyyy", { locale: fr })}
                          </span>
                          <motion.span
                            className="text-[11px] font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent"
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          >
                            {timeline.monthsElapsed}/{timeline.duration} mois · {timeline.progress}%
                          </motion.span>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {format(timeline.endDate, "MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      </div>

                      {/* Renewal section */}
                      {timeline.canRenew && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.2 }}
                        >
                          <Button
                            size="sm"
                            className="w-full gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 hover:from-blue-700 hover:via-violet-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-violet-500/20 h-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenewalContract(contract);
                            }}
                          >
                            <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                              <RefreshCw className="h-4 w-4" />
                            </motion.div>
                            <span className="font-semibold">Renouveler mon matériel</span>
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}

                      {/* Pre-renewal hint */}
                      {!timeline.canRenew && timeline.monthsElapsed >= 12 && (
                        <p className="text-[11px] text-center text-muted-foreground">
                          🔓 Renouvellement disponible dans {18 - timeline.monthsElapsed} mois
                        </p>
                      )}
                    </motion.div>
                  )}

                  {contract.tracking_number && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Numéro de suivi : {contract.tracking_number}
                      </p>
                      {contract.delivery_carrier && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          Transporteur : {contract.delivery_carrier}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {contracts.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
              <h3 className="text-lg font-semibold mb-2">Aucun contrat</h3>
              <p className="text-muted-foreground text-center text-sm">
                Vous n'avez pas encore de contrats de financement.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Renewal Modal */}
      {renewalContract && clientData && (
        <RenewalRequestModal
          open={!!renewalContract}
          onOpenChange={(open) => !open && setRenewalContract(null)}
          contract={renewalContract}
          clientId={clientData.id}
          companyId={(clientData as any).company_id || ""}
        />
      )}
    </motion.div>
  );
};

export default ClientContractsPage;
